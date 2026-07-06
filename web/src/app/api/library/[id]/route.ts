import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      .select("id, user_id, project_id, title, description, mime_type, format, file_size_bytes, file_hash_sha256, language, status, error_message, metadata, storage_path, indexed_at, created_at, updated_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (error || !item) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
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
    const { data: item, error: getErr } = await supabase
      .from("library_items")
      .select("storage_path")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (getErr || !item) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
    // Delete chunks
    await supabase.from("document_chunks").delete().eq("library_item_id", id);
    // Delete item
    const { error: delErr } = await supabase
      .from("library_items")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
    // Delete storage
    if (item.storage_path) {
      await supabase.storage.from("library").remove([item.storage_path]);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
