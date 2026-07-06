import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Get user via server client
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    
    // Try admin client insert
    const admin = createAdminClient();
    
    const { data: conv, error: convErr } = await admin
      .from("conversations")
      .insert({
        user_id: user.id,
        title: "Debug test " + Date.now(),
        message_count: 0,
      })
      .select("id")
      .single();
    
    if (convErr) {
      return NextResponse.json({ error: "conv insert failed", details: convErr }, { status: 500 });
    }
    
    const { data: msg, error: msgErr } = await admin
      .from("messages")
      .insert({
        user_id: user.id,
        conversation_id: conv.id,
        role: "user",
        content: body.content ?? "Debug message",
      })
      .select("id")
      .single();
    
    if (msgErr) {
      return NextResponse.json({ error: "msg insert failed", details: msgErr, conversation_id: conv.id }, { status: 500 });
    }
    
    return NextResponse.json({ ok: true, conversation_id: conv.id, message_id: msg.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
