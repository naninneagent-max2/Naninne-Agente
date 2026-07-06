/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

/**
 * MOCK orquestrador — Sprint 1.
 * No Sprint 2, este endpoint vai chamar o backend Python (LangGraph)
 * que orquestra os 10 agentes especializados.
 *
 * Por enquanto, retorna um plano de execução simulado em PT-BR.
 */
function mockOrchestratorPlan(userMessage: string): {
  response: string;
  sources: Array<{ type: string; label: string; snippet: string }>;
  plan: Array<{ agent: string; task: string; status: "pending" | "running" | "done" }>;
  tokens: { input: number; output: number };
  cost_usd: number;
  latency_ms: number;
} {
  const lower = userMessage.toLowerCase();

  // Detecção simples de intenção
  let project = "escrita";
  if (lower.includes("roteiro") || lower.includes("cena") || lower.includes("midjourney") || lower.includes("vídeo")) {
    project = "audiovisual";
  } else if (lower.includes("planilha") || lower.includes("dados") || lower.includes("gráfico") || lower.includes("rc agro") || lower.includes("pecuária")) {
    project = "mercado";
  } else if (lower.includes("github") || lower.includes("supabase") || lower.includes("código") || lower.includes("schema")) {
    project = "tech";
  }

  const plan = [
    { agent: "Orquestrador", task: "Interpretar pedido e planejar", status: "done" as const },
    { agent: "Memória", task: "Carregar contexto do usuário e preferências", status: "done" as const },
    { agent: "Bibliotecário", task: `Buscar contexto relevante na biblioteca (projeto: ${project})`, status: "running" as const },
    { agent: "Pesquisador", task: "Coletar dados externos se necessário", status: "pending" as const },
    { agent: "Redator", task: "Compor resposta final", status: "pending" as const },
    { agent: "Revisor", task: "Auditar qualidade e fontes", status: "pending" as const },
  ];

  return {
    response: `Entendi o pedido. Vou coordenar a equipe para o projeto **${project}**.

Plano de execução:
1. Memória carregada (suas preferências e contexto histórico)
2. Bibliotecário vasculhando a Biblioteca Universal
3. Se precisar, Pesquisador sai pra internet
4. Redator compõe a resposta
5. Revisor audita fontes e consistência

Por enquanto estou em modo DEMO — no Sprint 2 o backend Python (LangGraph) vai orquestrar esses 6 agentes de verdade, com Claude Sonnet 4 raciocinando + Gemini lendo livros inteiros + Tavily buscando dados. Cada operação vai custar entre $0.13 e $4.10 dependendo da complexidade.

Sua mensagem: "${userMessage.slice(0, 100)}${userMessage.length > 100 ? "..." : ""}"`,
    sources: [
      { type: "library", label: "Última conversa (Cap. 3 — O poder invisível)", snippet: "..." },
      { type: "memory", label: "Estilo preferido: Literário, formal mas acessível", snippet: "..." },
    ],
    plan,
    tokens: { input: 87, output: 234 },
    cost_usd: 0.012,
    latency_ms: 1240,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages: ChatMessage[] = body.messages ?? [];

    if (messages.length === 0) {
      return NextResponse.json({ error: "Mensagens vazias" }, { status: 400 });
    }

    const lastUserMessage = messages.filter((m) => m.role === "user").pop();
    if (!lastUserMessage) {
      return NextResponse.json({ error: "Nenhuma mensagem do usuário" }, { status: 400 });
    }

    // Simula latência do orquestrador
    await new Promise((r) => setTimeout(r, 800));

    const result = mockOrchestratorPlan(lastUserMessage.content);

    return NextResponse.json({
      response: result.response,
      sources: result.sources,
      plan: result.plan,
      tokens: result.tokens,
      cost_usd: result.cost_usd,
      latency_ms: result.latency_ms,
      timestamp: new Date().toISOString(),
      mode: "demo", // será "production" no Sprint 2
    });
  } catch (_err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
