/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { embed, cosineSim, parseEmbedding } from "@/lib/ai/embeddings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

const SYSTEM = `Você é o Redator Literário do Naninne. Sua especialidade é escrever capítulos longos, densos, com citações verificadas e tom literário.

**Regras absolutas**:
1. **Citar fontes**: quando usar contexto da biblioteca, cite como [1], [2] etc. Quando referenciar conhecimento geral, cite como (Maquiavel, O Príncipe, Cap. XVIII).
2. **Sem alucinações**: se uma informação não está no contexto fornecido, NÃO invente. Marque como "extrapolação" e peça revisão.
3. **Tom consistente**: siga o tom pedido (literário, cinematográfico, executivo, técnico).
4. **Estrutura clara**: use ## H2 e ### H3 para organizar. Parágrafos curtos (3-5 linhas).
5. **Citações literais**: entre aspas, com página se disponível.
6. **Linguagem**: português brasileiro literário, sem clichês, sem floreio vazio.

**Estrutura do capítulo (8 páginas = ~3000-4000 palavras)**:
- **Abertura** (~300 palavras): cena concreta ou afirmação forte que prende
- **Parte 1** (~800 palavras): desenvolvimento do argumento principal
- **Parte 2** (~800 palavras): aprofundamento com exemplos do contexto
- **Parte 3** (~800 palavras): contraste, nuance, o outro lado
- **Parte 4** (~800 palavras): síntese
- **Fechamento** (~300 palavras): eco da abertura, abertura pro próximo

Total: 8 páginas × ~450 palavras = ~3600 palavras.`;

async function fetchContext(userId: string, projectId: string | null) {
  const supabase = await createClient();
  const ctx: { memories: string; library: string; notes: string } = {
    memories: "",
    library: "",
    notes: "",
  };

  // 1) Memórias
  const { data: memories } = await supabase
    .from("memories")
    .select("fact, category")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(15);
  if (memories && memories.length > 0) {
    ctx.memories = `# Memórias persistentes sobre o Robert\n\n${memories.map((m) => `- [${m.category}] ${m.fact}`).join("\n")}`;
  }

  // 2) Library chunks (do projeto ou todos)
  const { data: chunks } = await supabase
    .from("document_chunks")
    .select("id, content, library_item_id, chunk_index, project_id")
    .eq("user_id", userId)
    .order("chunk_index")
    .limit(300);
  if (chunks && chunks.length > 0) {
    // Get item titles
    const itemIds = Array.from(new Set(chunks.map((c: any) => c.library_item_id).filter(Boolean)));
    const { data: items } = await supabase
      .from("library_items")
      .select("id, title")
      .in("id", itemIds);
    const itemMap = new Map((items ?? []).map((i: any) => [i.id, i.title]));
    // Limit to 30 most relevant (by chunk_index = position in book)
    const limited = chunks.slice(0, 30);
    ctx.library = `# Trechos da biblioteca (cite [N] quando usar)\n\n${limited
      .map((c: any, i: number) => `[${i + 1}] (de "${itemMap.get(c.library_item_id) ?? "?"}"): ${c.content.slice(0, 500)}`)
      .join("\n\n")}`;
  }

  // 3) Notas (do projeto)
  const { data: notes } = await supabase
    .from("notes")
    .select("content, page_reference, tags, project_id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(20);
  if (notes && notes.length > 0) {
    ctx.notes = `# Anotações suas (use como insight pessoal)\n\n${notes
      .map((n: any, i: number) => `[nota ${i + 1}]${n.page_reference ? ` (ref: ${n.page_reference})` : ""}: ${n.content.slice(0, 400)}`)
      .join("\n\n")}`;
  }

  return ctx;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt: string = body.prompt ?? "";
    const projectId: string | null = body.project_id ?? null;
    const style: string = body.style ?? "literário";
    const length: string = body.length ?? "long"; // long = 8 pages, short = 3 pages

    if (!prompt || prompt.length < 10) {
      return new Response("Prompt obrigatório (mínimo 10 caracteres)", { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response("Não autenticado", { status: 401 });
    }

    const ctx = await fetchContext(user!.id, projectId);
    const fullContext = [ctx.memories, ctx.library, ctx.notes].filter(Boolean).join("\n\n");

    const userPrompt = `Pedido do Robert: ${prompt}

Tom desejado: ${style}
Comprimento: ${length === "long" ? "8 páginas (~3600 palavras)" : "3 páginas (~1300 palavras)"}

${fullContext ? "Use o contexto abaixo como base. Cite [N] quando referenciar biblioteca, (nota N) para anotações." : "Sem contexto específico. Use conhecimento geral e cite fontes (autor, obra, capítulo)."}

${fullContext}

Estratégia sugerida:
1. Abertura: cena concreta ou afirmação forte
2. Desenvolvimento: 2-4 partes que constroem o argumento
3. Fechamento: eco da abertura, deixa espaço pro próximo

Comece diretamente com o capítulo. Use ## para seções.`;

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) =>
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));

        let tokensIn = 0, tokensOut = 0, cost = 0;
        let fullResponse = "";

        try {
          const result = streamText({
            model: anthropic("claude-sonnet-4-5"),
            system: SYSTEM,
            prompt: userPrompt,
            maxOutputTokens: length === "long" ? 6000 : 2500,
            temperature: 0.75,
            onFinish: ({ usage }) => {
              if (usage) {
                tokensIn += usage.inputTokens ?? 0;
                tokensOut += usage.outputTokens ?? 0;
                cost += ((usage.inputTokens ?? 0) * 3 + (usage.outputTokens ?? 0) * 15) / 1_000_000;
              }
            },
          });
          for await (const chunk of result.textStream) {
            fullResponse += chunk;
            send({ type: "text", content: chunk });
          }
        } catch (e) {
          send({ type: "error", message: e instanceof Error ? e.message : "Erro" });
        }

        // Save as chapter + document
        let chapterId: string | null = null;
        let documentId: string | null = null;
        if (fullResponse.length > 100) {
          try {
            // Create chapter
            const titleMatch = fullResponse.match(/^#\s+(.+)$/m);
            const title = titleMatch ? titleMatch[1].trim().slice(0, 100) : prompt.slice(0, 100);
            const { data: ch } = await supabase
              .from("chapters")
              .insert({
                user_id: user!.id,
                project_id: projectId,
                title,
                content: fullResponse,
                position: 999, // Append to end
                status: "rascunho",
                word_count: fullResponse.split(/\s+/).filter(Boolean).length,
                metadata: { generated: true, prompt, style, length },
              })
              .select("id")
              .single();
            if (ch) chapterId = ch.id;

            // Save as generated document
            const { data: doc } = await supabase
              .from("generated_documents")
              .insert({
                user_id: user!.id,
                project_id: projectId,
                title: `Capítulo: ${title}`,
                description: `Gerado por IA a partir do prompt: ${prompt.slice(0, 100)}`,
                format: "markdown",
                status: "draft",
                content: fullResponse,
                metadata: {
                  generated: true,
                  prompt,
                  style,
                  length,
                  word_count: fullResponse.split(/\s+/).filter(Boolean).length,
                  chapter_id: chapterId,
                  tokens_in: tokensIn,
                  tokens_out: tokensOut,
                  cost_usd: cost,
                },
              })
              .select("id")
              .single();
            if (doc) documentId = doc.id;
          } catch (e) {
            console.error("[generate-chapter] save error:", e);
          }
        }

        send({
          type: "done",
          chapter_id: chapterId,
          document_id: documentId,
          word_count: fullResponse.split(/\s+/).filter(Boolean).length,
          tokens_in: tokensIn,
          tokens_out: tokensOut,
          cost_usd: cost,
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
    console.error("[/api/escrita/generate] error:", err);
    return new Response(`Erro: ${err instanceof Error ? err.message : "Erro"}`, { status: 500 });
  }
}
