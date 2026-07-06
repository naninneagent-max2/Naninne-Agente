/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const body = await request.json();
    const current = body.current_password as string;
    const newPwd = body.new_password as string;

    if (!current || !newPwd) {
      return NextResponse.json({ error: "Preencha senha atual e nova senha" }, { status: 400 });
    }
    if (newPwd.length < 6) {
      return NextResponse.json({ error: "Nova senha deve ter pelo menos 6 caracteres" }, { status: 400 });
    }

    // Validate current password by re-authenticating
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: current,
    });
    if (signInErr) {
      return NextResponse.json({ error: "Senha atual incorreta" }, { status: 401 });
    }

    // Update password
    const { error: updErr } = await supabase.auth.updateUser({ password: newPwd });
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
