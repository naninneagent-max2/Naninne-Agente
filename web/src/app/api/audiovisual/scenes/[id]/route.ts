/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
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

    const body = await request.json();
    const update: Record<string, any> = {};
    if (typeof body.title === "string") update.title = body.title;
    if (typeof body.cinematic_description === "string") update.cinematic_description = body.cinematic_description;
    if (typeof body.composition === "string" || body.composition === null) update.composition = body.composition;
    if (typeof body.midjourney_prompt === "string") update.midjourney_prompt = body.midjourney_prompt;
    if (Array.isArray(body.tags)) update.tags = body.tags;
    if (typeof body.style_reference === "string" || body.style_reference === null) update.style_reference = body.style_reference;
    if (typeof body.status === "string") update.status = body.status;
    update.updated_at = new Date().toISOString();

    const { data: scene, error } = await supabase
      .from("audiovisual_scenes")
      .update(update)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ scene });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const { error } = await supabase
      .from("audiovisual_scenes")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
