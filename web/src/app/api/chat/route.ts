import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM_PROMPT = `Você é o Naninne — o "segundo cérebro digital" do Robert. Você é um assistente pessoal inteligente que:

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

Seja conciso na primeira resposta. Se Robert pedir profundidade, aí você expande. Você está começando do zero — Robert ainda não tem nada na biblioteca, então não presuma arquivos ou memórias que não existem. Quando precisar de algo, peça.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages: Array<{ role: "user" | "assistant"; content: string }> = body.messages ?? [];

    if (messages.length === 0) {
      return new Response("Mensagens vazias", { status: 400 });
    }

    // Optional: try to get user context (best-effort, no error if not logged in)
    let userContext = "";
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("display_name, preferences")
          .eq("id", user.id)
          .single();
        if (profile?.display_name) {
          userContext = `\n\n[Contexto do usuário logado: ${profile.display_name}. Saudar pelo nome na primeira resposta se for o início da conversa.]`;
        }
      }
    } catch {
      // ignore — chat works sem auth também
    }

    const result = streamText({
      model: anthropic("claude-sonnet-4-5"),
      system: SYSTEM_PROMPT + userContext,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      maxOutputTokens: 1024,
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
  } catch (err) {
    console.error("[/api/chat] error:", err);
    return new Response(
      `Erro ao processar mensagem. ${err instanceof Error ? err.message : "Erro desconhecido"}`,
      { status: 500 }
    );
  }
}
