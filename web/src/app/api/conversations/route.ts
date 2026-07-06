import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ conversations: [] });
    }
    const url = new URL(request.url);
    const conversationId = url.searchParams.get("id");
    
    if (conversationId) {
      // Return single conversation + messages
      const { data: conv, error: convError } = await supabase
        .from("conversations")
        .select("id, title, project_id, message_count, last_message_at, created_at, updated_at")
        .eq("id", conversationId)
        .eq("user_id", user.id)
        .single();
      if (convError || !conv) {
        return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
      }
      const { data: messages, error: msgError } = await supabase
        .from("messages")
        .select("id, role, content, agent_used, sources, tokens_input, tokens_output, cost_usd, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (msgError) {
        return NextResponse.json({ error: msgError.message }, { status: 500 });
      }
      return NextResponse.json({ conversation: conv, messages: messages ?? [] });
    }
    
    // List all conversations
    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("id, title, project_id, message_count, last_message_at, created_at, updated_at")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("last_message_at", { ascending: false })
      .limit(20);
    if (error) {
      return NextResponse.json({ conversations: [], error: error.message });
    }
    return NextResponse.json({ conversations: conversations ?? [] });
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
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    }
    const { error } = await supabase
      .from("conversations")
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
