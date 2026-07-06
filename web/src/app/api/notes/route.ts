/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { embed } from "@/lib/ai/embeddings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/* eslint-disable @typescript-eslint/no-explicit-any */

type PostBody = {
  action: "list" | "create" | "update" | "delete";
  id?: string;
  content?: string;
  page_reference?: string;
  tags?: string[];
  project_id?: string | null;
  library_item_id?: string;
  chunk_id?: string;
};

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ notes: [] });
    }
    const url = new URL(request.url);
    const libraryItemId = url.searchParams.get("library_item_id");
    let q = supabase
      .from("notes")
      .select("id, content, page_reference, tags, library_item_id, chunk_id, project_id, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (libraryItemId) q = q.eq("library_item_id", libraryItemId);
    const { data, error } = await q.limit(500);
    if (error) {
      return NextResponse.json({ notes: [], error: error.message });
    }
    return NextResponse.json({ notes: data ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const body: PostBody = await request.json();
    const action = body.action ?? "create";

    if (action === "delete") {
      if (!body.id) {
        return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
      }
      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", body.id)
        .eq("user_id", user.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (action === "update") {
      if (!body.id) {
        return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
      }
      const updates: any = { updated_at: new Date().toISOString() };
      if (body.content !== undefined) {
        updates.content = body.content;
        updates.embedding = await embed(body.content);
      }
      if (body.page_reference !== undefined) updates.page_reference = body.page_reference;
      if (body.tags !== undefined) updates.tags = body.tags;
      const { data, error } = await supabase
        .from("notes")
        .update(updates)
        .eq("id", body.id)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, note: data });
    }

    // create
    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json({ error: "content obrigatório" }, { status: 400 });
    }
    const embedding = await embed(body.content);
    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        content: body.content,
        page_reference: body.page_reference ?? null,
        tags: body.tags ?? [],
        library_item_id: body.library_item_id ?? null,
        chunk_id: body.chunk_id ?? null,
        project_id: body.project_id ?? null,
        embedding,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, note: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
