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
      return NextResponse.json({ chapters: [] });
    }
    const { data: chapters, error } = await supabase
      .from("chapters")
      .select("id, position, title, status, word_count, updated_at")
      .eq("user_id", user.id)
      .order("position");
    if (error) {
      return NextResponse.json({ chapters: [] });
    }
    const list = (chapters ?? []).map((c: any) => ({
      id: c.id,
      num: c.position,
      title: c.title,
      status: c.status ?? "pendente",
      words: c.word_count ?? 0,
      updated: c.updated_at,
    }));
    return NextResponse.json({ chapters: list });
  } catch (_err) {
    return NextResponse.json({ chapters: [] });
  }
}
