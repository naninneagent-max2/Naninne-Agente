import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { embed, cosineSim, parseEmbedding } from "@/lib/ai/embeddings";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/* eslint-disable @typescript-eslint/no-explicit-any */

const EXTRACT_PROMPT = `Você extrai memórias persistentes sobre o usuário a partir de conversas em português brasileiro.

Extraia SOMENTE fatos duráveis, não momentos da conversa atual. Exemplos do que EXTRAIR:
- "Usuário está escrevendo um livro sobre o poder invisível"
- "Usuário trabalha com pecuária de corte"
- "Usuário prefere respostas em português brasileiro"
- "Usuário mencionou que Maquiavel é uma referência importante"

Exemplos do que NÃO extrair:
- "Usuário perguntou sobre X" (transacional)
- "Resposta falou sobre Y" (sobre a IA, não o usuário)
- Cumprimentos, agradecimentos, pedidos temporários

Responda em JSON com formato:
{ "memories": [{ "fact": "texto curto e impessoal sobre o usuário", "category": "preference|project|personality|context|other", "confidence": 0.0-1.0 }] }

Se não houver nada memorável, retorne { "memories": [] }.
Máximo 5 memórias por extração. Não invente coisas que não foram ditas.`;

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ memories: [] });
    }
    const { data: memories, error } = await supabase
      .from("memories")
      .select("id, fact, category, confidence, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) {
      return NextResponse.json({ memories: [], error: error.message });
    }
    return NextResponse.json({ memories: memories ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

type PostBody = {
  action: "extract" | "add" | "delete";
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
  fact?: string;
  category?: string;
  memory_id?: string;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body: PostBody = await request.json();
    const action = body.action ?? "extract";

    if (action === "delete") {
      if (!body.memory_id) {
        return NextResponse.json({ error: "memory_id obrigatório" }, { status: 400 });
      }
      const { error } = await supabase
        .from("memories")
        .delete()
        .eq("id", body.memory_id)
        .eq("user_id", user.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (action === "add") {
      if (!body.fact) {
        return NextResponse.json({ error: "fact obrigatório" }, { status: 400 });
      }
      const embedding = await embed(body.fact);
      const { data, error } = await supabase
        .from("memories")
        .insert({
          user_id: user.id,
          fact: body.fact,
          category: body.category ?? "context",
          confidence: 1.0,
          embedding,
        })
        .select("id, fact, category, confidence, created_at, updated_at")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, memory: data });
    }

    if (action === "extract") {
      if (!body.messages || body.messages.length === 0) {
        return NextResponse.json({ error: "messages obrigatórias" }, { status: 400 });
      }
      const conversationText = body.messages
        .map((m) => `${m.role === "user" ? "Usuário" : "IA"}: ${m.content.slice(0, 800)}`)
        .join("\n\n");

      const result = await generateText({
        model: anthropic("claude-sonnet-4-5"),
        system: EXTRACT_PROMPT,
        prompt: `Conversa:\n\n${conversationText}\n\nExtraia as memórias em JSON.`,
        maxOutputTokens: 600,
        temperature: 0,
      });

      let parsed: { memories?: Array<{ fact: string; category: string; confidence: number }> } = { memories: [] };
      try {
        const match = result.text.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      } catch {
        return NextResponse.json({ ok: true, extracted: 0, raw: result.text });
      }

      const mems = parsed.memories ?? [];
      if (mems.length === 0) {
        return NextResponse.json({ ok: true, extracted: 0 });
      }

      // Fetch existing memories with their embeddings for dedup
      const { data: existing } = await supabase
        .from("memories")
        .select("id, fact, embedding")
        .eq("user_id", user.id);
      const existingArr = (existing ?? []).map((e: any) => ({
        id: e.id,
        fact: e.fact,
        embedding: parseEmbedding(e.embedding),
      }));

      const toInsert: any[] = [];
      let deduped = 0;
      for (const m of mems) {
        const newEmb = await embed(m.fact);
        let isDuplicate = false;
        for (const e of existingArr) {
          if (!e.embedding) continue;
          const sim = cosineSim(newEmb, e.embedding);
          if (sim > 0.85) {
            isDuplicate = true;
            deduped++;
            break;
          }
        }
        if (!isDuplicate) {
          toInsert.push({
            user_id: user.id,
            fact: m.fact,
            category: m.category ?? "context",
            confidence: m.confidence ?? 0.7,
            embedding: newEmb,
          });
        }
      }

      if (toInsert.length === 0) {
        return NextResponse.json({ ok: true, extracted: 0, deduplicated: deduped });
      }

      const { data: inserted, error } = await supabase
        .from("memories")
        .insert(toInsert)
        .select("id, fact, category, confidence, created_at, updated_at");
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({
        ok: true,
        extracted: inserted?.length ?? 0,
        deduplicated: deduped,
        memories: inserted,
      });
    }

    return NextResponse.json({ error: "action inválida" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
