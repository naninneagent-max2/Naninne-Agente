/* eslint-disable @typescript-eslint/no-unused-vars */
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { embed, cosineSim, parseEmbedding } from "@/lib/ai/embeddings";
import { generateText as generateTextNoStream } from "ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* eslint-disable @typescript-eslint/no-explicit-any */

const BASE_SYSTEM = `Você é o Naninne — o "segundo cérebro digital" do Robert. Você é um assistente pessoal inteligente que:

1. **Entende o contexto**: olha o que Robert já fez, quais projetos ele tem, qual o tom que ele usa.
2. **É direto**: fala português brasileiro, sem floreio. Respostas claras e úteis.
3. **Pensa antes de agir**: quando recebe um pedido, primeiro entende a intenção e o escopo, depois age.
4. **Admite limites**: se não sabe, fala. Se precisa de mais info, pergunta.
5. **Cita fontes**: quando usa contexto da biblioteca, cite como [1], [2], etc. NUNCA invente informações.

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

const REVISOR_SYSTEM = `Você é o Revisor de qualidade do Naninne. Sua função é auditar uma resposta que o Orquestrador gerou.

Critérios:
1. **Aderência**: a resposta atende ao que foi pedido?
2. **Precisão**: as informações têm base no contexto fornecido, ou há alucinações?
3. **Citações**: se usou contexto da biblioteca, citou como [1], [2], etc?
4. **Tom**: o tom está adequado para a área (literário/cinematográfico/executivo/técnico)?
5. **Concisão**: há partes desnecessárias que podem ser cortadas?

Responda em JSON:
{
  "approved": true|false,
  "issues": ["lista de problemas concretos, se houver"],
  "suggestions": ["sugestões específicas, se houver"],
  "summary": "1 frase sobre a qualidade geral"
}

Se a resposta for boa, aprovado=true sem issues. Seja exigente mas justo.`;

const AGENTS = ["memoria", "bibliotecario", "leitor", "orquestrador", "revisor"] as const;
type AgentName = (typeof AGENTS)[number];

function formatAgentLabel(agent: AgentName): string {
  const map: Record<AgentName, string> = {
    memoria: "Memória",
    bibliotecario: "Bibliotecário",
    leitor: "Leitor de Documentos",
    orquestrador: "Orquestrador",
    revisor: "Revisor",
  };
  return map[agent];
}

function formatAgentStepLabel(agent: AgentName, status: "start" | "done", detail?: string): string {
  const labels: Record<AgentName, { start: string; done: string }> = {
    memoria: { start: "Carregando memórias...", done: detail || "Memórias consultadas" },
    bibliotecario: { start: "Vasculhando biblioteca...", done: detail || "Busca concluída" },
    leitor: { start: "Lendo documentos...", done: detail || "Documentos lidos" },
    orquestrador: { start: "Compondo resposta...", done: detail || "Resposta composta" },
    revisor: { start: "Auditando qualidade...", done: detail || "Auditoria concluída" },
  };
  return labels[agent][status];
}

type AgentStep = {
  id: string;
  agent: AgentName;
  label: string;
  state: "done" | "active" | "pending";
  detail?: string;
};

function buildInitialSteps(): AgentStep[] {
  return [
    { id: "s1", agent: "memoria", label: "Memória", state: "pending" },
    { id: "s2", agent: "bibliotecario", label: "Bibliotecário", state: "pending" },
    { id: "s3", agent: "leitor", label: "Leitor", state: "pending" },
    { id: "s4", agent: "orquestrador", label: "Compondo resposta", state: "pending" },
    { id: "s5", agent: "revisor", label: "Auditoria", state: "pending" },
  ];
}

function sseEvent(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function encodeSSE(data: object): Uint8Array {
  return new TextEncoder().encode(sseEvent(data));
}

async function runMemoryAgent(userId: string): Promise<{ context: string; count: number }> {
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
      context: `\n\n# Memórias persistentes sobre o Robert\n\nUse para personalizar respostas:\n${lines.join("\n")}`,
      count: memories.length,
    };
  } catch {
    return { context: "", count: 0 };
  }
}

async function runBibliotecarioAgent(
  userId: string,
  query: string
): Promise<{ context: string; count: number; sources: any[] }> {
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
      // Fallback JS
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
      context: `\n\n# Contexto da biblioteca (use para responder, cite [1], [2] etc)\n\n${formatted}`,
      count: chunks.length,
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
    if (messages.length === 0) {
      return new Response("Mensagens vazias", { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isLoggedIn = !!user;
    const userName = isLoggedIn ? user!.user_metadata?.display_name ?? user!.email : null;
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

    // Set up SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        let totalTokensIn = 0;
        let totalTokensOut = 0;
        let totalCost = 0;
        const stepState: Record<string, { state: string; detail?: string }> = {};

        // Helper to send SSE
        const send = (data: object) => controller.enqueue(encodeSSE(data));

        // Send initial steps
        const steps = buildInitialSteps();
        send({ type: "init", steps });

        // ============ AGENT 1: MEMÓRIA ============
        send({ type: "agent_start", agent: "memoria" });
        stepState.memoria = { state: "active" };
        send({ type: "step", stepId: "s1", state: "active" });

        const memoryResult = isLoggedIn
          ? await runMemoryAgent(user!.id)
          : { context: "", count: 0 };
        const memoryContext = memoryResult.context;
        stepState.memoria = {
          state: "done",
          detail: memoryResult.count > 0 ? `${memoryResult.count} memórias relevantes` : "Nenhuma memória",
        };
        send({ type: "agent_done", agent: "memoria", detail: stepState.memoria.detail });
        send({ type: "step", stepId: "s1", state: "done", detail: stepState.memoria.detail });

        // ============ AGENT 2: BIBLIOTECÁRIO ============
        send({ type: "agent_start", agent: "bibliotecario" });
        stepState.bibliotecario = { state: "active" };
        send({ type: "step", stepId: "s2", state: "active" });

        const bibResult = isLoggedIn
          ? await runBibliotecarioAgent(user!.id, lastUserMessage)
          : { context: "", count: 0, sources: [] };
        const bibContext = bibResult.context;
        stepState.bibliotecario = {
          state: "done",
          detail: bibResult.count > 0 ? `${bibResult.count} trechos relevantes` : "Nada relevante",
        };
        send({ type: "agent_done", agent: "bibliotecario", detail: stepState.bibliotecario.detail });
        send({ type: "step", stepId: "s2", state: "done", detail: stepState.bibliotecario.detail });

        // ============ AGENT 3: LEITOR (no-op for now — bibliotecário já leu) ============
        send({ type: "agent_start", agent: "leitor" });
        send({ type: "step", stepId: "s3", state: "active" });
        // Simulate Leitor by waiting briefly (real impl would extract specific sections)
        await new Promise((r) => setTimeout(r, 200));
        const leitorDetail = bibResult.count > 0 ? `${bibResult.count} trechos lidos` : "Nenhum trecho";
        stepState.leitor = { state: "done", detail: leitorDetail };
        send({ type: "agent_done", agent: "leitor", detail: leitorDetail });
        send({ type: "step", stepId: "s3", state: "done", detail: leitorDetail });

        // ============ AGENT 4: ORQUESTRADOR (Claude streaming) ============
        send({ type: "agent_start", agent: "orquestrador" });
        stepState.orquestrador = { state: "active" };
        send({ type: "step", stepId: "s4", state: "active" });

        const greetingContext = userName
          ? `\n\n[Usuário logado: ${userName}. Cumprimente pelo nome na primeira resposta se for o início da conversa.]`
          : "";

        const systemPrompt =
          BASE_SYSTEM + greetingContext + memoryContext + bibContext;

        let fullResponse = "";
        try {
          const result = streamText({
            model: anthropic("claude-sonnet-4-5"),
            system: systemPrompt,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            maxOutputTokens: 2000,
            temperature: 0.7,
            onFinish: ({ usage, finishReason }) => {
              if (usage) {
                totalTokensIn += usage.inputTokens ?? 0;
                totalTokensOut += usage.outputTokens ?? 0;
                // Claude Sonnet 4.5: $3/M input, $15/M output
                const costIn = (usage.inputTokens ?? 0) * 3 / 1_000_000;
                const costOut = (usage.outputTokens ?? 0) * 15 / 1_000_000;
                totalCost += costIn + costOut;
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

        stepState.orquestrador = { state: "done", detail: `${fullResponse.length} caracteres` };
        send({ type: "agent_done", agent: "orquestrador", detail: stepState.orquestrador.detail });
        send({ type: "step", stepId: "s4", state: "done", detail: stepState.orquestrador.detail });

        // ============ AGENT 5: REVISOR (single Claude call) ============
        send({ type: "agent_start", agent: "revisor" });
        stepState.revisor = { state: "active" };
        send({ type: "step", stepId: "s5", state: "active" });

        let revisorSummary = "OK";
        try {
          const review = await generateTextNoStream({
            model: anthropic("claude-sonnet-4-5"),
            system: REVISOR_SYSTEM,
            prompt: `Pedido do usuário: ${lastUserMessage}\n\nResposta do Orquestrador:\n\n${fullResponse}\n\nAudite.`,
            maxOutputTokens: 400,
            temperature: 0,
          });
          if (review.usage) {
            totalTokensIn += review.usage.inputTokens ?? 0;
            totalTokensOut += review.usage.outputTokens ?? 0;
            const costIn = (review.usage.inputTokens ?? 0) * 3 / 1_000_000;
            const costOut = (review.usage.outputTokens ?? 0) * 15 / 1_000_000;
            totalCost += costIn + costOut;
          }
          // Parse JSON from review
          const match = review.text.match(/\{[\s\S]*\}/);
          if (match) {
            try {
              const parsed = JSON.parse(match[0]);
              revisorSummary = parsed.approved
                ? "✓ Aprovado"
                : `⚠️ ${(parsed.issues ?? []).length} questão(ões)`;
            } catch {
              revisorSummary = "Auditado";
            }
          } else {
            revisorSummary = "Auditado";
          }
        } catch {
          revisorSummary = "Erro na auditoria";
        }

        stepState.revisor = { state: "done", detail: revisorSummary };
        send({ type: "agent_done", agent: "revisor", detail: revisorSummary });
        send({ type: "step", stepId: "s5", state: "done", detail: revisorSummary });

        // ============ SAVE TO GENERATED_DOCUMENTS ============
        let documentId: string | null = null;
        if (isLoggedIn && fullResponse.length > 0) {
          try {
            const { data: doc } = await supabase
              .from("generated_documents")
              .insert({
                user_id: user!.id,
                title: lastUserMessage.slice(0, 100) || "Conversa",
                description: "Resposta do chat Naninne",
                format: "markdown",
                status: "approved",
                content: fullResponse,
                metadata: {
                  tokens_in: totalTokensIn,
                  tokens_out: totalTokensOut,
                  cost_usd: totalCost,
                  sources: bibResult.sources ?? [],
                  agent_used: ["memoria", "bibliotecario", "leitor", "orquestrador", "revisor"],
                },
              })
              .select("id")
              .single();
            if (doc) documentId = doc.id;
          } catch (e) {
            console.error("[chat] save document error:", e);
          }
        }

        send({
          type: "done",
          document_id: documentId,
          tokens_in: totalTokensIn,
          tokens_out: totalTokensOut,
          cost_usd: totalCost,
          sources: bibResult.sources ?? [],
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
    return new Response(
      `Erro: ${err instanceof Error ? err.message : "Erro desconhecido"}`,
      { status: 500 }
    );
  }
}
