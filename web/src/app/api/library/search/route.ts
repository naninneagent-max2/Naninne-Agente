/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { embed } from "@/lib/ai/embeddings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/* eslint-disable @typescript-eslint/no-explicit-any */

type Body = {
  query: string;
  project_id?: string;
  top_k?: number;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body: Body = await request.json();
    const query = (body.query ?? "").trim();
    if (!query) {
      return NextResponse.json({ error: "Query vazia" }, { status: 400 });
    }

    const topK = Math.min(Math.max(body.top_k ?? 5, 1), 20);
    const projectId = body.project_id ?? null;

    // 1) Embed the query
    const queryEmbedding = await embed(query);

    // 2) Cosine similarity search via pgvector RPC.
    //    We'll use a raw query through the management SQL endpoint is not available,
    //    so we use Supabase RPC if it exists; otherwise use the REST call with a custom function.
    //    The schema already has pgvector + cosine distance. We use the `<=>` operator.

    // Build a small RPC call through the postgres function. If function doesn't exist,
    // fall back to fetching chunks and computing similarity in app (slow but works).
    const { data: rpcData, error: rpcErr } = await supabase.rpc("match_document_chunks", {
      query_embedding: queryEmbedding,
      match_count: topK,
      filter_project_id: projectId,
      filter_user_id: user.id,
    });

    if (rpcErr) {
      // Fallback: fetch all chunks for this user and compute in JS
      console.warn("[search] RPC failed, using JS fallback:", rpcErr.message);
      return await jsFallbackSearch(supabase, user.id, queryEmbedding, topK, projectId);
    }

    // Fetch library_item info for each result
    const itemIds = Array.from(new Set((rpcData ?? []).map((r: any) => r.library_item_id).filter(Boolean)));
    const { data: items } = await supabase
      .from("library_items")
      .select("id, title, format, mime_type")
      .in("id", itemIds);

    const itemMap = new Map((items ?? []).map((i: any) => [i.id, i]));
    const results = (rpcData ?? []).map((r: any) => ({
      chunk_id: r.id,
      library_item_id: r.library_item_id,
      content: r.content,
      similarity: r.similarity,
      item: itemMap.get(r.library_item_id) ?? null,
    }));

    return NextResponse.json({ ok: true, results, query, count: results.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function jsFallbackSearch(
  supabase: any,
  userId: string,
  queryEmbedding: number[],
  topK: number,
  projectId: string | null
) {
  // Fetch all chunks (limit 500 for performance)
  let q = supabase
    .from("document_chunks")
    .select("id, library_item_id, content, embedding, project_id")
    .eq("user_id", userId)
    .limit(500);
  if (projectId) q = q.eq("project_id", projectId);
  const { data: chunks, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!chunks || chunks.length === 0) {
    return NextResponse.json({ ok: true, results: [], query: "", count: 0 });
  }

  // Compute cosine similarity
  const scored = chunks
    .filter((c: any) => c.embedding)
    .map((c: any) => ({
      ...c,
      similarity: cosineSim(queryEmbedding, c.embedding),
    }))
    .sort((a: any, b: any) => b.similarity - a.similarity)
    .slice(0, topK);

  const itemIds = Array.from(new Set(scored.map((s: any) => s.library_item_id).filter(Boolean)));
  const { data: items } = await supabase
    .from("library_items")
    .select("id, title, format, mime_type")
    .in("id", itemIds);
  const itemMap = new Map((items ?? []).map((i: any) => [i.id, i]));

  const results = scored.map((s: any) => ({
    chunk_id: s.id,
    library_item_id: s.library_item_id,
    content: s.content,
    similarity: s.similarity,
    item: itemMap.get(s.library_item_id) ?? null,
  }));

  return NextResponse.json({ ok: true, results, count: results.length });
}

function cosineSim(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}
