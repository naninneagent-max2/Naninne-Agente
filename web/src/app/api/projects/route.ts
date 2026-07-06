/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ projects: [], error: "Não autenticado" }, { status: 401 });
    }
    const { data: projects, error } = await supabase
      .from("projects")
      .select("id, slug, name, color, icon, description, sort_order")
      .eq("user_id", user.id)
      .order("sort_order");
    if (error) {
      return NextResponse.json({ projects: [], error: error.message }, { status: 400 });
    }
    return NextResponse.json({ projects: projects ?? [] });
  } catch (_err) {
    return NextResponse.json({ projects: [], error: "Erro interno" }, { status: 500 });
  }
}
