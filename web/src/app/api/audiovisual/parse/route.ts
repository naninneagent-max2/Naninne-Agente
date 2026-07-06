/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

const SYSTEM = `Você é o Visionário/Roteirista do Naninne. Sua especialidade é analisar roteiros e criar cards de cena com prompts visuais para IA generativa (Midjourney, Runway, Kling).

**Entrada**: o usuário fornece um roteiro (texto corrido, formato livre).
**Saída**: SEMPRE JSON puro (sem markdown) com este formato:
{
  "scenes": [
    {
      "scene_number": 1,
      "title": "Título curto e impactante",
      "cinematic_description": "1 parágrafo descrevendo a cena em linguagem cinematográfica: ação, emoção, atmosfera",
      "composition": "Descrição técnica: ângulo (close-up / plano médio / geral), lente (50mm / 24mm), movimento (estático / traveling / drone), iluminação (natural / chiaroscuro / neon), paleta de cor",
      "midjourney_prompt": "Prompt em inglês, técnica Midjourney: '[subject], [setting], [lighting], [mood], [style] --ar 21:9 --style raw --v 6'. Max 200 palavras. Específico e visual.",
      "tags": ["tag1", "tag2"]
    }
  ]
}

**Regras**:
1. Identifique 3-12 cenas-chave com potencial visual (não faça uma cena por parágrafo, agrupe ações)
2. Pense em IMAGEM, não em diálogo. Qual o frame mais forte?
3. Cinematográfico, não literário. "Plano aberto de uma fazenda no amanhecer" não "O sol nascia sobre a fazenda"
4. Prompt Midjourney em INGLÊS, vívido, com palavras visuais
5. Cores, texturas, atmosfera são mais importantes que enredo
6. Tags devem ser úteis pra organizar (gênero, local, emoção, época)
7. Responda SOMENTE com JSON válido, sem markdown`;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const script: string = body.script ?? "";
    const projectId: string | null = body.project_id ?? null;
    const style: string = body.style ?? "cinematic-dark";
    const count: number = Math.min(body.count ?? 8, 12);

    if (!script || script.length < 100) {
      return NextResponse.json({ error: "Roteiro obrigatório (mínimo 100 caracteres)" }, { status: 400 });
    }

    // Limit script size for context
    const truncatedScript = script.length > 10000 ? script.slice(0, 10000) + "\n\n[...continua...]" : script;

    const result = await generateText({
      model: anthropic("claude-sonnet-4-5"),
      system: SYSTEM,
      prompt: `Roteiro do usuário (${script.length} caracteres):\n\n${truncatedScript}\n\nEstilo visual desejado: ${style}\nNúmero de cenas-alvo: ${count}\n\nGere o JSON com as cenas-chave.`,
      maxOutputTokens: 4000,
      temperature: 0.7,
    });

    let parsed: { scenes: any[] } = { scenes: [] };
    try {
      const match = result.text.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch (e) {
      console.error("[audiovisual] JSON parse error:", e);
      return NextResponse.json({ error: "Falha ao processar roteiro. Tente novamente." }, { status: 500 });
    }

    const scenes = parsed.scenes ?? [];
    if (scenes.length === 0) {
      return NextResponse.json({ error: "Nenhuma cena identificada. Roteiro muito curto ou sem ação visual." }, { status: 400 });
    }

    // Save scenes to DB
    const savedScenes: any[] = [];
    for (const scene of scenes) {
      try {
        const { data: row, error } = await supabase
          .from("audiovisual_scenes")
          .insert({
            user_id: user!.id,
            project_id: projectId,
            scene_number: scene.scene_number ?? savedScenes.length + 1,
            title: scene.title ?? `Cena ${savedScenes.length + 1}`,
            cinematic_description: scene.cinematic_description ?? "",
            composition: scene.composition ?? null,
            midjourney_prompt: scene.midjourney_prompt ?? "",
            tags: scene.tags ?? [],
            style_reference: style,
            status: "draft",
            metadata: { source_script_length: script.length },
          })
          .select()
          .single();
        if (row) savedScenes.push(row);
      } catch (e) {
        console.error("[audiovisual] save scene error:", e);
      }
    }

    // Save as a generated document (overview)
    let documentId: string | null = null;
    try {
      const fullContent = `# Roteiro: ${scenes.length} cenas\n\n${savedScenes.map((s) => `## Cena ${s.scene_number}: ${s.title}\n\n**Descrição**: ${s.cinematic_description}\n\n**Composição**: ${s.composition ?? "—"}\n\n**Midjourney**: \`${s.midjourney_prompt}\`\n\n---\n`).join("\n")}`;
      const { data: doc } = await supabase
        .from("generated_documents")
        .insert({
          user_id: user!.id,
          project_id: projectId,
          title: `Roteiro: ${scenes.length} cenas`,
          description: `Análise de roteiro com ${scenes.length} cenas visuais`,
          format: "markdown",
          status: "draft",
          content: fullContent,
          metadata: {
            type: "audiovisual_scenes",
            style,
            scene_count: scenes.length,
            scene_ids: savedScenes.map((s) => s.id),
            tokens_in: result.usage?.inputTokens ?? 0,
            tokens_out: result.usage?.outputTokens ?? 0,
            cost_usd: ((result.usage?.inputTokens ?? 0) * 3 + (result.usage?.outputTokens ?? 0) * 15) / 1_000_000,
          },
        })
        .select("id")
        .single();
      if (doc) documentId = doc.id;
    } catch (e) {
      console.error("[audiovisual] save doc error:", e);
    }

    return NextResponse.json({
      ok: true,
      scenes: savedScenes,
      document_id: documentId,
      count: savedScenes.length,
      usage: {
        tokens_in: result.usage?.inputTokens ?? 0,
        tokens_out: result.usage?.outputTokens ?? 0,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
