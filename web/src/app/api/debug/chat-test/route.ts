import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userMessage = body.user_message ?? "Debug test message";
    const assistantMessage = body.assistant_message ?? "Debug response";
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    
    const admin = createAdminClient();
    
    let conversationId = body.conversation_id;
    if (!conversationId) {
      const { data: conv, error: convErr } = await admin
        .from("conversations")
        .insert({
          user_id: user.id,
          title: userMessage.slice(0, 80).trim() || "Debug",
          message_count: 2,
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (convErr) return NextResponse.json({ error: "conv failed", details: convErr }, { status: 500 });
      conversationId = conv.id;
    }
    
    const { data: msg, error: msgErr } = await admin
      .from("messages")
      .insert([
        {
          user_id: user.id,
          conversation_id: conversationId,
          role: "user",
          content: userMessage,
        },
        {
          user_id: user.id,
          conversation_id: conversationId,
          role: "assistant",
          content: assistantMessage,
          agent_used: "orchestrator",
          model_used: "claude-sonnet-4-5",
          tokens_input: 100,
          tokens_output: 50,
          cost_usd: 0.001,
        },
      ])
      .select();
    
    if (msgErr) {
      return NextResponse.json({ error: "msg failed", conversation_id: conversationId, details: msgErr }, { status: 500 });
    }
    
    return NextResponse.json({ ok: true, conversation_id: conversationId, messages: msg });
  } catch (err) {
    const m = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: m }, { status: 500 });
  }
}
