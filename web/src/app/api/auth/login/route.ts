/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: "Credenciais inválidas ou erro de autenticação" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: { id: data.user?.id, email: data.user?.email },
      session: { access_token: data.session?.access_token, expires_at: data.session?.expires_at },
    });
  } catch (_err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
