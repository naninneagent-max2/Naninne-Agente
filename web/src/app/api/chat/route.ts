/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { embed } from "@/lib/ai/embeddings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BASE_SYSTEM = `Você é o Naninne — o "segundo cérebro digital" do Robert. Você é um assistente pessoal inteligente que:

1. **Entende o contexto**: olha o que Robert já fez, quais projetos ele tem, qual o tom que ele usa.
2. **É direto**: fala português brasileiro, sem floreio. Respostas claras e úteis.
3. **Pensa antes de agir**: quando recebe um pedido, primeiro entende a intenção e o escopo, depois age.
4. **Admite limites**: se não sabe, fala. Se precisa de mais info, pergunta.

Você tem acesso conceitual a 4 áreas:
- **Escrita Criativa** (livros, capítulos, ensaios, ficção)
- **Audiovisual** (roteiros, cenas, prompts Midjourney)
- **Mercado** (análise de dados, planilhas, apresentações executivas)
- **Tech** (desenvolvimento do próprio app, GitHub, Supabase)

Quando Robert pedir algo, adapte o tom e a profundidade ao que ele está fazendo:
- Livros/capítulos → tom literário, referenciando O Príncipe de Maquiavel quando relevante
- Roteiros/cenas → tom cinematográfico, referências visuais
- Análise de dados → tom executivo, com números e contexto
- Código → tom técnico, direto ao ponto

Seja conciso na primeira resposta. Se Robert pedir profundidade, aí você expande.`;

async function buildMemoryContext(userId: string): Promise<string> {
  try {
    const { createClient: cc } = await import("@/lib/supabase/server");
    const supabase = await cc();
    const { data: memories } = await supabase
      .from("memories")
      .select("fact, category")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(30);
    if (!memories || memories.length === 0) return "";
    const lines = memories.map((m) => `- [${m.category}] ${m.fact}`);
    return `\n\n# Memórias persistentes sobre o Robert\n\nVocê lembra o seguinte sobre ele (use para personalizar respostas):\n${lines.join("\n")}`;
  } catch {
    return "";
  }
}

async function buildLibraryContext(
  userId: string,
  userMessage: string
): Promise<string> {
  try {
    if (!userMessage || userMessage.length < 4) return "";
    const supabase = await createClient();
    const queryEmbedding = await embed(userMessage);

    // Try RPC first
    const { data: rpcData, error } = await supabase.rpc("match_document_chunks", {
      query_embedding: queryEmbedding,
      match_count: 4,
      filter_user_id: userId,
      filter_project_id: null,
    });

    let chunks: Array<{ content: string; library_item_id: string; similarity: number }> = [];
    if (!error && rpcData) {
      chunks = rpcData as any;
    } else {
      // JS fallback (simplified)
      const { data: allChunks } = await supabase
        .from("document_chunks")
        .select("content, library_item_id, embedding")
        .eq("user_id", userId)
        .limit(200);
      if (allChunks) {
        const scored = (allChunks as any[])
          .filter((c) => c.embedding)
          .map((c) => ({
            content: c.content,
            library_item_id: c.library_item_id,
            similarity: cosineSim(queryEmbedding, c.embedding),
          }))
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 4);
        chunks = scored;
      }
    }
    if (chunks.length === 0) return "";

    // Get item titles
    const itemIds = Array.from(new Set(chunks.map((c) => c.library_item_id).filter(Boolean)));
    const { data: items } = await supabase
      .from("library_items")
      .select("id, title")
      .in("id", itemIds);
    const itemMap = new Map((items ?? []).map((i: any) => [i.id, i.title]));

    const formatted = chunks
      .map(
        (c, i) =>
          `[${i + 1}] (de "${itemMap.get(c.library_item_id) ?? "desconhecido"}", similaridade ${(c.similarity * 100).toFixed(0)}%): ${c.content.slice(0, 500)}`
      )
      .join("\n\n");

    return `\n\n# Contexto relevante da biblioteca do Robert\n\nUse estes trechos para responder (cite [1], [2] etc quando usar):\n\n${formatted}`;
  } catch {
    return "";
  }
}

function cosineSim(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages: Array<{ role: "user" | "assistant"; content: string }> = body.messages ?? [];
    if (messages.length === 0) {
      return new Response("Mensagens vazias", { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isLoggedIn = !!user;

    // Build dynamic context
    const userName = isLoggedIn ? user!.user_metadata?.display_name ?? user!.email : null;
    const greetingContext = userName
      ? `\n\n[Usuário logado: ${userName}. Cumprimente pelo nome na primeira resposta se for o início da conversa.]`
      : "";

    const memoryContext = isLoggedIn ? await buildMemoryContext(user!.id) : "";
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const libraryContext = isLoggedIn ? await buildLibraryContext(user!.id, lastUserMessage) : "";

    const systemPrompt =
      BASE_SYSTEM + greetingContext + memoryContext + libraryContext;

    const result = streamText({
      model: anthropic("claude-sonnet-4-5"),
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      maxOutputTokens: 1500,
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
  } catch (err) {
    console.error("[/api/chat] error:", err);
    return new Response(
      `Erro: ${err instanceof Error ? err.message : "Erro desconhecido"}`,
      { status: 500 }
    );
  }
}
