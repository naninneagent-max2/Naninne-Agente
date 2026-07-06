/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IncomingMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  agent_used?: string;
  model_used?: string;
  tokens_input?: number;
  tokens_output?: number;
  cost_usd?: number;
  sources?: Array<{ library_item_id?: string; title?: string; similarity?: number }>;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const body = await request.json();
    const messages: IncomingMessage[] = Array.isArray(body.messages) ? body.messages : [];
    const projectId: string | null = body.project_id ?? null;

    if (messages.length === 0) {
      return NextResponse.json({ error: "Nenhuma mensagem" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: conv, error: convErr } = await admin
      .from("conversations")
      .select("id, user_id, message_count")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .single();
    if (convErr || !conv) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
    }

    const rows = messages.map((m) => ({
      user_id: user.id,
      conversation_id: conversationId,
      project_id: projectId,
      role: m.role,
      content: m.content,
      agent_used: m.agent_used ?? null,
      model_used: m.model_used ?? null,
      tokens_input: m.tokens_input ?? null,
      tokens_output: m.tokens_output ?? null,
      cost_usd: m.cost_usd ?? null,
      sources: m.sources ?? [],
    }));

    const { data: inserted, error: insertErr } = await admin
      .from("messages")
      .insert(rows)
      .select("id, role, created_at");

    if (insertErr) {
      return NextResponse.json(
        { error: "Falha ao inserir mensagens", details: insertErr },
        { status: 500 }
      );
    }

    const lastMessage = messages[messages.length - 1];
    const userMsgCount = messages.filter((m) => m.role === "user").length;
    const lastTokens = messages.reduce(
      (acc, m) => ({
        input: acc.input + (m.tokens_input ?? 0),
        output: acc.output + (m.tokens_output ?? 0),
        cost: acc.cost + (m.cost_usd ?? 0),
      }),
      { input: 0, output: 0, cost: 0 }
    );

    const { error: updateErr } = await admin
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        message_count: (conv.message_count ?? 0) + userMsgCount,
        metadata: {
          last_tokens_input: lastTokens.input,
          last_tokens_output: lastTokens.output,
          last_cost_usd: lastTokens.cost,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    if (updateErr) {
      console.error("[conversations/messages] update conv error:", updateErr);
    }

    return NextResponse.json({
      ok: true,
      inserted: inserted?.length ?? 0,
      conversation_id: conversationId,
      last_content: lastMessage?.content?.slice(0, 80),
    });
  } catch (err) {
    const m = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: m }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ messages: [] });
    }

    const admin = createAdminClient();
    const { data: messages, error } = await admin
      .from("messages")
      .select("id, role, content, agent_used, model_used, tokens_input, tokens_output, cost_usd, sources, created_at")
      .eq("conversation_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ messages: messages ?? [] });
  } catch (err) {
    const m = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: m }, { status: 500 });
  }
}
