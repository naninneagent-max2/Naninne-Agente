/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

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

    // Verify ownership
    const { data: item } = await supabase
      .from("library_items")
      .select("id, title")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (!item) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }

    const { data: chunks, error } = await supabase
      .from("document_chunks")
      .select("id, chunk_index, content, token_count, created_at")
      .eq("library_item_id", id)
      .eq("user_id", user.id)
      .order("chunk_index");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ chunks: chunks ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
