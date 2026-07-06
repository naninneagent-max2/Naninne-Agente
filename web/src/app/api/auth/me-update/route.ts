/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const body = await request.json();
    const updates: any = {};
    if (typeof body.display_name === "string") {
      const trimmed = body.display_name.trim().slice(0, 80);
      if (trimmed.length === 0) {
        return NextResponse.json({ error: "Nome não pode estar vazio" }, { status: 400 });
      }
      updates.user_metadata = { ...(user.user_metadata ?? {}), display_name: trimmed };
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
    }
    const { data, error } = await supabase.auth.updateUser(updates);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      user: { id: data.user.id, email: data.user.email, display_name: (data.user.user_metadata as any)?.display_name },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
