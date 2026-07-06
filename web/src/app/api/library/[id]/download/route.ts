/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
      .select("storage_path, title")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (error || !item) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
    if (!item.storage_path) {
      return NextResponse.json({ error: "Arquivo não está no storage" }, { status: 400 });
    }
    // Create signed URL valid for 60s
    const { data: signed, error: signErr } = await supabase.storage
      .from("library")
      .createSignedUrl(item.storage_path, 60);
    if (signErr || !signed) {
      return NextResponse.json({ error: signErr?.message ?? "Falha ao gerar URL" }, { status: 500 });
    }
    return NextResponse.json({ url: signed.signedUrl, filename: item.title });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
