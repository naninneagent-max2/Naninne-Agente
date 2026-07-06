import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractText, chunkText } from "@/lib/text/extract";
import { embedBatch } from "@/lib/ai/embeddings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/library/[id]/reprocess
 * Re-run extract+chunk+embed for a failed (or stuck) library item.
 * Reuses the file already stored in Supabase storage.
 *
 * Useful when an upload hit a transient quota error (Gemini 429) — the fix
 * (batchEmbedContents + retry/backoff in lib/ai/embeddings.ts) usually
 * succeeds on retry without needing re-upload.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Fetch item, must belong to user
    const { data: item, error: itemErr } = await supabase
      .from("library_items")
      .select("id, user_id, project_id, status, storage_path, mime_type, file_size_bytes, metadata")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (itemErr || !item) {
      return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
    }
    if (!item.storage_path) {
      return NextResponse.json(
        { error: "Arquivo original não está mais disponível para reprocessamento." },
        { status: 400 }
      );
    }

    // If it has already indexed, refuse to re-run (would dupe chunks)
    if (item.status === "ready") {
      return NextResponse.json(
        { ok: true, already_ready: true, message: "Já está indexado. Nada a fazer." },
        { status: 200 }
      );
    }

    // Mark as processing
    await supabase
      .from("library_items")
      .update({
        status: "processing",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Download the original file from storage
    const { data: blob, error: downloadErr } = await supabase.storage
      .from("library")
      .download(item.storage_path);
    if (downloadErr || !blob) {
      const msg = downloadErr?.message || "Falha ao baixar arquivo";
      await supabase
        .from("library_items")
        .update({
          status: "failed",
          error_message: `Reprocess: ${msg}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const buffer = Buffer.from(await blob.arrayBuffer());

    // Extract + chunk + embed (same path as upload)
    const { text, pages } = await extractText(buffer, item.mime_type);
    const cleanedText = text.trim();
    if (cleanedText.length === 0) {
      const msg = "Nenhum texto extraído (pode ser escaneado ou protegido)";
      await supabase
        .from("library_items")
        .update({ status: "failed", error_message: msg, updated_at: new Date().toISOString() })
        .eq("id", id);
      return NextResponse.json({ error: msg }, { status: 422 });
    }
    const chunks = chunkText(cleanedText);
    if (chunks.length === 0) {
      const msg = "Falha ao dividir texto em chunks";
      await supabase
        .from("library_items")
        .update({ status: "failed", error_message: msg, updated_at: new Date().toISOString() })
        .eq("id", id);
      return NextResponse.json({ error: msg }, { status: 422 });
    }

    const embeddings = await embedBatch(chunks);

    // Clear any old chunks (from prior partial embedding runs)
    await supabase.from("document_chunks").delete().eq("library_item_id", id);

    // Insert chunks in batches of 50
    const chunkRows = chunks.map((content, i) => ({
      user_id: user.id,
      library_item_id: id,
      project_id: item.project_id,
      chunk_index: i,
      content,
      token_count: Math.ceil(content.length / 4),
      embedding: embeddings[i],
    }));
    for (let i = 0; i < chunkRows.length; i += 50) {
      const slice = chunkRows.slice(i, i + 50);
      const { error: chunksErr } = await supabase
        .from("document_chunks")
        .insert(slice);
      if (chunksErr) {
        const msg = `Chunks insert: ${chunksErr.message}`;
        await supabase
          .from("library_items")
          .update({ status: "failed", error_message: msg, updated_at: new Date().toISOString() })
          .eq("id", id);
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    }

    // Mark ready
    await supabase
      .from("library_items")
      .update({
        status: "ready",
        indexed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          ...(item.metadata ?? {}),
          chunk_count: chunks.length,
          text_length: cleanedText.length,
          pages,
          full_text: cleanedText,
        },
      })
      .eq("id", id);

    return NextResponse.json({
      ok: true,
      reindexed: true,
      chunks: chunks.length,
      text_length: cleanedText.length,
      pages,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro no reprocessamento";
    console.error("[reprocess] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
