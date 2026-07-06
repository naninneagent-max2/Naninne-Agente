/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractText, chunkText } from "@/lib/text/extract";
import { embedBatch } from "@/lib/ai/embeddings";
import { createHash } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/* eslint-disable @typescript-eslint/no-explicit-any */

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const SUPPORTED_MIME: Record<string, { ext: string[]; label: string }> = {
  "text/plain": { ext: [".txt"], label: "Texto" },
  "text/markdown": { ext: [".md"], label: "Markdown" },
  "text/csv": { ext: [".csv"], label: "CSV" },
  "application/json": { ext: [".json"], label: "JSON" },
  "application/pdf": { ext: [".pdf"], label: "PDF" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    ext: [".docx"],
    label: "Word (DOCX)",
  },
};

function validateFile(file: File): { ok: true } | { ok: false; error: string } {
  if (file.size > MAX_FILE_SIZE) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return { ok: false, error: `Arquivo muito grande: ${mb}MB. Máximo: 50MB.` };
  }
  if (file.size === 0) {
    return { ok: false, error: "Arquivo vazio." };
  }
  const mime = file.type || "application/octet-stream";
  if (!SUPPORTED_MIME[mime]) {
    return {
      ok: false,
      error: `Tipo não suportado: ${mime}. Aceitos: PDF, DOCX, TXT, MD, CSV, JSON.`,
    };
  }
  // Verify extension matches mime
  const name = file.name.toLowerCase();
  const ext = name.match(/\.[^.]+$/)?.[0] ?? "";
  if (!SUPPORTED_MIME[mime].ext.includes(ext)) {
    return {
      ok: false,
      error: `Extensão "${ext}" não bate com tipo "${mime}". Use: ${SUPPORTED_MIME[mime].ext.join(", ")}`,
    };
  }
  return { ok: true };
}

async function deleteFromStorage(userId: string, itemId: string, fileName: string) {
  try {
    const supabase = await createClient();
    const path = `${userId}/${itemId}/${fileName}`;
    await supabase.storage.from("library").remove([path]);
  } catch (e) {
    console.error("[upload] cleanup storage failed:", e);
  }
}

export async function POST(request: Request) {
  let createdItemId: string | null = null;
  let uploadedStoragePath: string | null = null;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const projectId = (formData.get("project_id") as string | null) ?? null;
    const customTitle = (formData.get("title") as string | null) ?? null;

    if (!file) {
      return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
    }

    // === Step 1: Validate ===
    const validation = validateFile(file);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileSize = buffer.length;
    const fileHash = createHash("sha256").update(buffer).digest("hex");
    const mimeType = file.type;
    const finalTitle = customTitle ?? file.name.replace(/\.[^.]+$/, "");

    // === Step 2: DB insert first (so we have an item ID to attach storage to) ===
    // Check for duplicate hash — only block if there's a working version
    // (a failed upload can be retried with the same file)
    const { data: existingByHash } = await supabase
      .from("library_items")
      .select("id, title, status")
      .eq("user_id", user.id)
      .eq("file_hash_sha256", fileHash)
      .in("status", ["ready", "processing"])
      .maybeSingle();

    if (existingByHash) {
      return NextResponse.json(
        {
          error: `Você já tem um arquivo idêntico: "${existingByHash.title}". Abra a Biblioteca para vê-lo.`,
          duplicate_id: existingByHash.id,
        },
        { status: 409 }
      );
    }

    // If there are ONLY failed uploads with the same hash, clean them up first
    // so we don't accumulate orphan failed items.
    await supabase
      .from("library_items")
      .delete()
      .eq("user_id", user.id)
      .eq("file_hash_sha256", fileHash)
      .eq("status", "failed");

    const { data: item, error: itemErr } = await supabase
      .from("library_items")
      .insert({
        user_id: user.id,
        project_id: projectId,
        title: finalTitle,
        mime_type: mimeType,
        format: mimeType.split("/")[1] ?? mimeType,
        file_size_bytes: fileSize,
        file_hash_sha256: fileHash,
        status: "pending",
        metadata: { original_filename: file.name, upload_started_at: new Date().toISOString() },
      })
      .select()
      .single();

    if (itemErr || !item) {
      return NextResponse.json(
        { error: `Erro ao registrar arquivo: ${itemErr?.message ?? "desconhecido"}` },
        { status: 500 }
      );
    }
    createdItemId = item.id;

    // === Step 3: Mark as processing ===
    await supabase
      .from("library_items")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", item.id);

    // === Step 4: Upload to storage ===
    // Sanitize filename for Supabase Storage (alphanumeric + underscore + dash + dot only)
    const sanitizePath = (raw: string): string => {
      // Strip accents (NFD + remove combining marks)
      const normalized = raw.normalize("NFD").replace(/[̀-ͯ]/g, "");
      // Replace spaces and any non-safe chars with _
      return normalized.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 120);
    };
    const safeName = sanitizePath(file.name);
    const storagePath = `${user.id}/${item.id}/${safeName}`;
    const { error: uploadErr } = await supabase.storage
      .from("library")
      .upload(storagePath, buffer, { contentType: mimeType, upsert: true });

    if (uploadErr) {
      // Cleanup: mark failed, do not delete item (user can retry)
      await supabase
        .from("library_items")
        .update({
          status: "failed",
          error_message: `Storage: ${uploadErr.message}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);
      return NextResponse.json(
        { error: `Erro no storage: ${uploadErr.message}` },
        { status: 500 }
      );
    }
    uploadedStoragePath = storagePath;

    // Update with storage path
    await supabase
      .from("library_items")
      .update({ storage_path: storagePath, updated_at: new Date().toISOString() })
      .eq("id", item.id);

    // === Step 5: Extract + chunk + embed ===
    try {
      const { text, pages } = await extractText(buffer, mimeType);
      const cleanedText = text.trim();
      if (cleanedText.length === 0) {
        throw new Error("Nenhum texto extraído do arquivo (pode ser escaneado ou protegido)");
      }
      const chunks = chunkText(cleanedText);

      if (chunks.length === 0) {
        throw new Error("Falha ao dividir texto em chunks");
      }

      const embeddings = await embedBatch(chunks);

      const chunkRows = chunks.map((content, i) => ({
        user_id: user.id,
        library_item_id: item.id,
        project_id: projectId,
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

      // === Step 6: Mark ready ===
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
            full_text: cleanedText, // Save full text so we don't need to re-extract
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
          text_length: cleanedText.length,
          pages,
        },
      });
    } catch (processErr) {
      const msg = processErr instanceof Error ? processErr.message : "Erro";
      const isTransient = /429|quota|Too Many|ResourceExhausted/i.test(msg);
      // For transient (rate-limit) errors, KEEP the file in storage so /reprocess can retry.
      // For hard errors, clean up storage.
      if (!isTransient) {
        await deleteFromStorage(user.id, item.id, file.name);
        await supabase
          .from("library_items")
          .update({
            status: "failed",
            error_message: msg,
            storage_path: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);
      } else {
        await supabase
          .from("library_items")
          .update({
            status: "failed",
            error_message: msg,
            // Keep storage_path so user can click "Reprocessar" later
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  } catch (err) {
    // Catch-all: cleanup if anything went wrong
    const msg = err instanceof Error ? err.message : "Erro";
    if (createdItemId && uploadedStoragePath) {
      // Already in DB, just delete storage
      try {
        const supabase = await createClient();
        await supabase.storage.from("library").remove([uploadedStoragePath]);
      } catch {}
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Re-process endpoint (for retries on failed items)
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const { item_id } = await request.json();
    if (!item_id) {
      return NextResponse.json({ error: "item_id obrigatório" }, { status: 400 });
    }

    const { data: item, error: itemErr } = await supabase
      .from("library_items")
      .select("*")
      .eq("id", item_id)
      .eq("user_id", user.id)
      .single();
    if (itemErr || !item) {
      return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
    }

    if (!item.storage_path) {
      return NextResponse.json(
        { error: "Arquivo não está no storage. Re-upload necessário." },
        { status: 400 }
      );
    }

    // Download file from storage
    const { data: fileData, error: dlErr } = await supabase.storage
      .from("library")
      .download(item.storage_path);
    if (dlErr || !fileData) {
      return NextResponse.json(
        { error: `Erro ao baixar arquivo: ${dlErr?.message}` },
        { status: 500 }
      );
    }
    const buffer = Buffer.from(await fileData.arrayBuffer());

    // Mark processing
    await supabase
      .from("library_items")
      .update({ status: "processing", error_message: null, updated_at: new Date().toISOString() })
      .eq("id", item_id);

    // Delete old chunks
    await supabase.from("document_chunks").delete().eq("library_item_id", item_id);

    try {
      const { text, pages } = await extractText(buffer, item.mime_type);
      const cleanedText = text.trim();
      if (!cleanedText) throw new Error("Nenhum texto extraído");
      const chunks = chunkText(cleanedText);
      const embeddings = await embedBatch(chunks);
      const chunkRows = chunks.map((content, i) => ({
        user_id: user.id,
        library_item_id: item_id,
        project_id: item.project_id,
        chunk_index: i,
        content,
        token_count: Math.ceil(content.length / 4),
        embedding: embeddings[i],
      }));
      for (let i = 0; i < chunkRows.length; i += 50) {
        await supabase.from("document_chunks").insert(chunkRows.slice(i, i + 50));
      }
      await supabase
        .from("library_items")
        .update({
          status: "ready",
          indexed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          error_message: null,
          metadata: {
            ...(item.metadata ?? {}),
            chunk_count: chunks.length,
            text_length: cleanedText.length,
            pages,
            full_text: cleanedText,
          },
        })
        .eq("id", item_id);
      return NextResponse.json({ ok: true, item: { id: item_id, status: "ready", chunks: chunks.length } });
    } catch (procErr) {
      const msg = procErr instanceof Error ? procErr.message : "Erro";
      await supabase
        .from("library_items")
        .update({ status: "failed", error_message: msg })
        .eq("id", item_id);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
