/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractText, chunkText } from "@/lib/text/extract";
import { embedBatch } from "@/lib/ai/embeddings";
import { createHash } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* eslint-disable @typescript-eslint/no-explicit-any */

const SUPPORTED_MIME = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("project_id") as string | null;
    const title = (formData.get("title") as string | null) ?? null;

    if (!file) {
      return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
    }

    const mimeType = file.type || "application/octet-stream";
    if (!SUPPORTED_MIME.includes(mimeType)) {
      return NextResponse.json(
        { error: `Tipo não suportado: ${mimeType}. Suportados: PDF, TXT, MD, CSV, JSON, DOCX` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileSize = buffer.length;
    const fileHash = createHash("sha256").update(buffer).digest("hex");

    // 1) Create library_items row with status=processing
    const finalTitle = title ?? file.name.replace(/\.[^.]+$/, "");
    const { data: item, error: itemErr } = await supabase
      .from("library_items")
      .insert({
        user_id: user.id,
        project_id: projectId || null,
        title: finalTitle,
        mime_type: mimeType,
        format: mimeType.split("/")[1] ?? mimeType,
        file_size_bytes: fileSize,
        file_hash_sha256: fileHash,
        status: "processing",
        metadata: { original_filename: file.name },
      })
      .select()
      .single();

    if (itemErr || !item) {
      return NextResponse.json(
        { error: `Erro ao criar item: ${itemErr?.message ?? "unknown"}` },
        { status: 500 }
      );
    }

    // 2) Upload to Supabase Storage
    const storagePath = `${user.id}/${item.id}/${file.name}`;
    const { error: uploadErr } = await supabase.storage
      .from("library")
      .upload(storagePath, buffer, { contentType: mimeType, upsert: true });
    if (uploadErr) {
      await supabase
        .from("library_items")
        .update({ status: "failed", error_message: `Storage: ${uploadErr.message}` })
        .eq("id", item.id);
      return NextResponse.json(
        { error: `Erro no storage: ${uploadErr.message}` },
        { status: 500 }
      );
    }

    // 3) Extract text + chunk + embed
    try {
      const { text, pages } = await extractText(buffer, mimeType);
      const chunks = chunkText(text);
      if (chunks.length === 0) {
        await supabase
          .from("library_items")
          .update({ status: "failed", error_message: "Nenhum texto extraído" })
          .eq("id", item.id);
        return NextResponse.json({ error: "Nenhum texto extraído do arquivo" }, { status: 400 });
      }

      const embeddings = await embedBatch(chunks);

      const chunkRows = chunks.map((content, i) => ({
        user_id: user.id,
        library_item_id: item.id,
        project_id: projectId || null,
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
        if (chunksErr) throw new Error(`Chunks insert: ${chunksErr.message}`);
      }

      await supabase
        .from("library_items")
        .update({
          status: "ready",
          indexed_at: new Date().toISOString(),
          storage_path: storagePath,
          metadata: {
            ...(item.metadata ?? {}),
            chunk_count: chunks.length,
            text_length: text.length,
            pages,
          },
        })
        .eq("id", item.id);

      return NextResponse.json({
        ok: true,
        item: {
          id: item.id,
          title: finalTitle,
          status: "ready",
          chunks: chunks.length,
          text_length: text.length,
        },
      });
    } catch (processErr) {
      const msg = processErr instanceof Error ? processErr.message : "Erro";
      await supabase
        .from("library_items")
        .update({ status: "failed", error_message: msg })
        .eq("id", item.id);
      return NextResponse.json({ error: `Erro ao processar: ${msg}` }, { status: 500 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
