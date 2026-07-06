import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns a 1-hour signed URL for inline viewing of the original file.
 * Different from /download which is optimized for browser save dialog.
 */
export async function GET(
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
    const { data: item, error } = await supabase
      .from("library_items")
      .select("storage_path, title, mime_type, file_size_bytes, format")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (error || !item) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
    if (!item.storage_path) {
      return NextResponse.json({ error: "Arquivo original não está no storage" }, { status: 400 });
    }
    // 1 hour signed URL — long enough to read a long PDF, short enough for security
    const { data: signed, error: signErr } = await supabase.storage
      .from("library")
      .createSignedUrl(item.storage_path, 3600, {
        download: false, // inline display, not download
      });
    if (signErr || !signed) {
      return NextResponse.json({ error: signErr?.message ?? "Falha ao gerar URL" }, { status: 500 });
    }
    return NextResponse.json({
      url: signed.signedUrl,
      mime_type: item.mime_type,
      format: item.format,
      filename: item.title,
      size_bytes: item.file_size_bytes,
      expires_in: 3600,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
