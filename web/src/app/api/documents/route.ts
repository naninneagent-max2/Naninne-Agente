import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ documents: [] });
    }
    const url = new URL(request.url);
    const docId = url.searchParams.get("id");
    if (docId) {
      const { data: doc, error } = await supabase
        .from("generated_documents")
        .select("id, title, description, format, status, content, metadata, created_at, updated_at")
        .eq("id", docId)
        .eq("user_id", user.id)
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 404 });
      return NextResponse.json({ document: doc });
    }
    const projectId = url.searchParams.get("project_id");
    let query = supabase
      .from("generated_documents")
      .select("id, title, description, format, status, metadata, project_id, created_at, updated_at")
      .eq("user_id", user.id);
    if (projectId) {
      query = query.eq("project_id", projectId);
    }
    const { data: documents, error } = await query
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      return NextResponse.json({ documents: [], error: error.message });
    }
    return NextResponse.json({ documents: documents ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const url = new URL(request.url);
    const docId = url.searchParams.get("id");
    if (!docId) {
      return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    }
    const { error } = await supabase
      .from("generated_documents")
      .delete()
      .eq("id", docId)
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
