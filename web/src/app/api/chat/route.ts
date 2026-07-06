/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { anthropic } from "@ai-sdk/anthropic";
import { streamText, generateText as generateTextNoStream } from "ai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { embed, cosineSim, parseEmbedding } from "@/lib/ai/embeddings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* eslint-disable @typescript-eslint/no-explicit-any */

const BASE_SYSTEM = `Você é o Naninne — o "segundo cérebro digital" do Robert. Você é um assistente pessoal inteligente que:

1. **Entende o contexto**: olha o que Robert já fez, quais projetos ele tem, qual o tom que ele usa.
2. **É direto**: fala português brasileiro, sem floreio. Respostas claras e úteis.
3. **Pensa antes de agir**: quando recebe um pedido, primeiro entende a intenção e o escopo, depois age.
4. **Admite limites**: se não sabe, fala. Se precisa de mais info, pergunta.
5. **Cita fontes**: quando usa contexto da biblioteca ou notas, cite como [1], [2] etc. NUNCA invente informações.

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

const REVISOR_SYSTEM = `Você é o Revisor de qualidade do Naninne. Audite a resposta do Orquestrador.

Critérios:
1. **Aderência**: a resposta atende ao que foi pedido?
2. **Precisão**: as informações têm base no contexto fornecido, ou há alucinações?
3. **Citações**: se usou contexto, citou como [1], [2] etc?
4. **Tom**: o tom está adequado?

Responda em JSON:
{
  "approved": true|false,
  "issues": ["lista de problemas concretos"],
  "summary": "1 frase sobre a qualidade"
}

Se a resposta for boa, aprovado=true. Seja exigente mas justo.`;

const AGENTS = ["memoria", "bibliotecario", "notas", "leitor", "orchestrator", "revisor"] as const;
type AgentName = (typeof AGENTS)[number];

function sseEvent(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}
function encodeSSE(data: object): Uint8Array {
  return new TextEncoder().encode(sseEvent(data));
}

function buildInitialSteps() {
  return [
    { id: "s1", agent: "memoria" as AgentName, label: "Memória", state: "pending" as const },
    { id: "s2", agent: "bibliotecario" as AgentName, label: "Bibliotecário", state: "pending" as const },
    { id: "s3", agent: "notas" as AgentName, label: "Notas", state: "pending" as const },
    { id: "s4", agent: "leitor" as AgentName, label: "Leitor", state: "pending" as const },
    { id: "s5", agent: "orchestrator" as AgentName, label: "Compondo resposta", state: "pending" as const },
    { id: "s6", agent: "revisor" as AgentName, label: "Auditoria", state: "pending" as const },
  ];
}

async function runMemoryAgent(userId: string) {
  try {
    const supabase = await createClient();
    const { data: memories } = await supabase
      .from("memories")
      .select("fact, category")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(15);
    if (!memories || memories.length === 0) return { context: "", count: 0 };
    const lines = memories.map((m) => `- [${m.category}] ${m.fact}`);
    return {
      context: `\n\n# Memórias persistentes sobre o Robert\n\n${lines.join("\n")}`,
      count: memories.length,
    };
  } catch {
    return { context: "", count: 0 };
  }
}

async function runBibliotecarioAgent(userId: string, query: string) {
  if (!query || query.length < 4) return { context: "", count: 0, sources: [] };
  try {
    const supabase = await createClient();
    const queryEmbedding = await embed(query);
    const { data: rpcData, error } = await supabase.rpc("match_document_chunks", {
      query_embedding: queryEmbedding,
      match_count: 5,
      filter_user_id: userId,
      filter_project_id: null,
    });
    let chunks: any[] = [];
    if (!error && rpcData) {
      chunks = rpcData as any[];
    } else {
      const { data: allChunks } = await supabase
        .from("document_chunks")
        .select("id, content, library_item_id, embedding")
        .eq("user_id", userId)
        .limit(200);
      if (allChunks) {
        chunks = (allChunks as any[])
          .filter((c) => c.embedding)
          .map((c) => ({
            id: c.id,
            content: c.content,
            library_item_id: c.library_item_id,
            similarity: cosineSim(queryEmbedding, parseEmbedding(c.embedding)),
          }))
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 5);
      }
    }
    if (chunks.length === 0) return { context: "", count: 0, sources: [] };
    const itemIds = Array.from(new Set(chunks.map((c) => c.library_item_id).filter(Boolean)));
    const { data: items } = await supabase
      .from("library_items")
      .select("id, title")
      .in("id", itemIds);
    const itemMap = new Map((items ?? []).map((i: any) => [i.id, i.title]));
    const formatted = chunks
      .map(
        (c, i) =>
          `[${i + 1}] (de "${itemMap.get(c.library_item_id) ?? "desconhecido"}", similaridade ${((c.similarity ?? 0) * 100).toFixed(0)}%): ${c.content.slice(0, 600)}`
      )
      .join("\n\n");
    const sources = chunks.map((c) => ({
      library_item_id: c.library_item_id,
      title: itemMap.get(c.library_item_id) ?? "Desconhecido",
      similarity: c.similarity,
    }));
    return {
      context: `\n\n# Contexto da biblioteca (cite [1], [2] etc)\n\n${formatted}`,
      count: chunks.length,
      sources,
    };
  } catch {
    return { context: "", count: 0, sources: [] };
  }
}

async function runNotasAgent(userId: string, query: string) {
  if (!query || query.length < 4) return { context: "", count: 0, sources: [] };
  try {
    const supabase = await createClient();
    const queryEmbedding = await embed(query);
    const { data, error } = await supabase.rpc("match_notes", {
      query_embedding: queryEmbedding,
      match_count: 5,
      filter_user_id: userId,
      filter_library_item_id: null,
    });
    const notes: any[] = data ?? [];
    if (error || notes.length === 0) return { context: "", count: 0, sources: [] };
    const formatted = notes
      .map(
        (n, i) =>
          `[nota ${i + 1}] (similaridade ${((n.similarity ?? 0) * 100).toFixed(0)}%${n.page_reference ? `, ref: ${n.page_reference}` : ""}, tags: ${(n.tags ?? []).join(", ") || "nenhuma"}): ${n.content.slice(0, 400)}`
      )
      .join("\n\n");
    const sources = notes.map((n) => ({
      title: `Nota: ${n.content.slice(0, 60)}`,
      similarity: n.similarity,
    }));
    return {
      context: `\n\n# Notas suas relevantes (use para personalizar)\n\n${formatted}`,
      count: notes.length,
      sources,
    };
  } catch {
    return { context: "", count: 0, sources: [] };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages: Array<{ role: "user" | "assistant"; content: string }> = body.messages ?? [];
    const projectId: string | null = body.project_id ?? null;
    let conversationId: string | null = body.conversation_id ?? null;
    if (messages.length === 0) {
      return new Response("Mensagens vazias", { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isLoggedIn = !!user;
    const userName = isLoggedIn ? user!.user_metadata?.display_name ?? user!.email : null;
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

    const stream = new ReadableStream({
      async start(controller) {
        let totalTokensIn = 0;
        let totalTokensOut = 0;
        let totalCost = 0;
        const send = (data: object) => controller.enqueue(encodeSSE(data));

        send({ type: "init", steps: buildInitialSteps() });

        // Memoria
        send({ type: "agent_start", agent: "memoria" });
        const memResult = isLoggedIn ? await runMemoryAgent(user!.id) : { context: "", count: 0 };
        send({ type: "step", stepId: "s1", state: "done", detail: memResult.count > 0 ? `${memResult.count} memórias` : "Nenhuma" });

        // Bibliotecario
        send({ type: "agent_start", agent: "bibliotecario" });
        const bibResult = isLoggedIn ? await runBibliotecarioAgent(user!.id, lastUserMessage) : { context: "", count: 0, sources: [] };
        send({ type: "step", stepId: "s2", state: "done", detail: bibResult.count > 0 ? `${bibResult.count} trechos` : "Nada relevante" });

        // Notas
        send({ type: "agent_start", agent: "notas" });
        const notasResult = isLoggedIn ? await runNotasAgent(user!.id, lastUserMessage) : { context: "", count: 0, sources: [] };
        send({ type: "step", stepId: "s3", state: "done", detail: notasResult.count > 0 ? `${notasResult.count} notas` : "Nenhuma" });

        // Leitor (no-op)
        send({ type: "agent_start", agent: "leitor" });
        await new Promise((r) => setTimeout(r, 150));
        const totalBib = bibResult.count + notasResult.count;
        send({ type: "step", stepId: "s4", state: "done", detail: totalBib > 0 ? `${totalBib} trechos lidos` : "Nenhum trecho" });

        // Orquestrador
        send({ type: "agent_start", agent: "orchestrator" });
        const greetingContext = userName
          ? `\n\n[Usuário logado: ${userName}. Cumprimente pelo nome na primeira resposta se for o início da conversa.]`
          : "";
        const systemPrompt = BASE_SYSTEM + greetingContext + memResult.context + bibResult.context + notasResult.context;
        let fullResponse = "";
        try {
          const result = streamText({
            model: anthropic("claude-sonnet-4-5"),
            system: systemPrompt,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            maxOutputTokens: 2000,
            temperature: 0.7,
            onFinish: ({ usage }) => {
              if (usage) {
                totalTokensIn += usage.inputTokens ?? 0;
                totalTokensOut += usage.outputTokens ?? 0;
                totalCost += ((usage.inputTokens ?? 0) * 3 + (usage.outputTokens ?? 0) * 15) / 1_000_000;
              }
            },
          });
          for await (const chunk of result.textStream) {
            fullResponse += chunk;
            send({ type: "text", content: chunk });
          }
        } catch (streamErr) {
          console.error("[chat] stream error:", streamErr);
          send({ type: "error", message: "Erro ao gerar resposta" });
        }
        send({ type: "step", stepId: "s5", state: "done", detail: `${fullResponse.length} caracteres` });

        // Revisor
        send({ type: "agent_start", agent: "revisor" });
        let revisorSummary = "OK";
        try {
          const review = await generateTextNoStream({
            model: anthropic("claude-sonnet-4-5"),
            system: REVISOR_SYSTEM,
            prompt: `Pedido: ${lastUserMessage}\n\nResposta:\n\n${fullResponse}\n\nAudite.`,
            maxOutputTokens: 400,
            temperature: 0,
          });
          if (review.usage) {
            totalTokensIn += review.usage.inputTokens ?? 0;
            totalTokensOut += review.usage.outputTokens ?? 0;
            totalCost += ((review.usage.inputTokens ?? 0) * 3 + (review.usage.outputTokens ?? 0) * 15) / 1_000_000;
          }
          const match = review.text.match(/\{[\s\S]*\}/);
          if (match) {
            try {
              const parsed = JSON.parse(match[0]);
              revisorSummary = parsed.approved
                ? "✓ Aprovado"
                : `⚠️ ${(parsed.issues ?? []).length} questão(ões)`;
            } catch { revisorSummary = "Auditado"; }
          }
        } catch { revisorSummary = "Erro na auditoria"; }
        send({ type: "step", stepId: "s6", state: "done", detail: revisorSummary });

        // Save document + conversation
        let documentId: string | null = null;
        if (isLoggedIn && fullResponse.length > 0) {
          try {
            // Create admin client for inserts (bypasses RLS for user_id setting)
            const adminClient = createAdminClient();
            console.log("[chat] admin client env check", {
              hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
              hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
              urlVal: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30),
            });
            console.log("[chat] user.id", user?.id?.slice(0, 8));
            console.log("[chat] conversationId before conv insert", conversationId);
            
            // Create conversation if needed
            if (!conversationId) {
              const { data: conv } = await adminClient
                .from("conversations")
                .insert({
                  user_id: user!.id,
                  project_id: projectId,
                  title: lastUserMessage.slice(0, 80).trim() || "Nova conversa",
                  message_count: 2,
                  last_message_at: new Date().toISOString(),
                })
                .select("id")
                .single();
              if (conv) conversationId = conv.id;
            }

            // Save document
            const { data: doc } = await adminClient
              .from("generated_documents")
              .insert({
                user_id: user!.id,
                project_id: projectId,
                title: lastUserMessage.slice(0, 100) || "Conversa",
                description: "Resposta do chat Naninne",
                format: "markdown",
                status: "approved",
                content: fullResponse,
                metadata: {
                  tokens_in: totalTokensIn,
                  tokens_out: totalTokensOut,
                  cost_usd: totalCost,
                  sources: [...(bibResult.sources ?? []), ...(notasResult.sources ?? [])],
                  agent_used: ["memoria", "bibliotecario", "notas", "leitor", "orchestrator", "revisor"],
                },
              })
              .select("id")
              .single();
            if (doc) documentId = doc.id;

            // Save messages to the conversation
            if (conversationId) {
              const { error: msgErr } = await adminClient.from("messages").insert([
                {
                  user_id: user!.id,
                  conversation_id: conversationId,
                  project_id: projectId,
                  role: "user",
                  content: lastUserMessage,
                },
                {
                  user_id: user!.id,
                  conversation_id: conversationId,
                  project_id: projectId,
                  role: "assistant",
                  content: fullResponse,
                  agent_used: "orchestrator",
                  sources: [...(bibResult.sources ?? []), ...(notasResult.sources ?? [])],
                  tokens_input: totalTokensIn,
                  tokens_output: totalTokensOut,
                  cost_usd: totalCost,
                  model_used: "claude-sonnet-4-5",
                },
              ]);
              if (msgErr) {
                console.error("[chat] messages insert error:", msgErr);
              } else {
                console.log("[chat] messages inserted successfully for", conversationId);
              }
              // Update conversation last_message_at
              await adminClient
                .from("conversations")
                .update({
                  last_message_at: new Date().toISOString(),
                  message_count: 2,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", conversationId);
            }
          } catch (e) {
            console.error("[chat] save error:", e);
          }
        }

        send({
          type: "done",
          document_id: documentId,
          conversation_id: conversationId,
          tokens_in: totalTokensIn,
          tokens_out: totalTokensOut,
          cost_usd: totalCost,
          sources: [...(bibResult.sources ?? []), ...(notasResult.sources ?? [])],
        });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[/api/chat] error:", err);
    return new Response(`Erro: ${err instanceof Error ? err.message : "Erro"}`, { status: 500 });
  }
}
