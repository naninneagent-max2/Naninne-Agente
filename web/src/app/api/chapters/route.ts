/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ chapters: [] });
    }
    const { data: chapters, error } = await supabase
      .from("chapters")
      .select("id, title, content, position, status, word_count, project_id, created_at, updated_at")
      .eq("user_id", user.id)
      .order("position");
    if (error) {
      return NextResponse.json({ chapters: [], error: error.message });
    }
    return NextResponse.json({ chapters: chapters ?? [] });
  } catch (_err) {
    return NextResponse.json({ chapters: [] });
  }
}

type PostBody = {
  action?: "create" | "update" | "delete";
  id?: string;
  title?: string;
  content?: string;
  position?: number;
  status?: string;
  project_id?: string | null;
};

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
        .from("chapters")
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
      const wordCount = body.content ? body.content.split(/\s+/).filter(Boolean).length : 0;
      const { data, error } = await supabase
        .from("chapters")
        .update({
          ...(body.title !== undefined && { title: body.title }),
          ...(body.content !== undefined && { content: body.content, word_count: wordCount }),
          ...(body.position !== undefined && { position: body.position }),
          ...(body.status !== undefined && { status: body.status }),
          ...(body.project_id !== undefined && { project_id: body.project_id }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.id)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, chapter: data });
    }

    // create
    const wordCount = body.content ? body.content.split(/\s+/).filter(Boolean).length : 0;
    const { data, error } = await supabase
      .from("chapters")
      .insert({
        user_id: user.id,
        title: body.title ?? "Novo capítulo",
        content: body.content ?? "",
        position: body.position ?? 0,
        status: body.status ?? "rascunho",
        project_id: body.project_id ?? null,
        word_count: wordCount,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, chapter: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
