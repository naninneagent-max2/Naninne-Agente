/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import * as XLSX from "xlsx";
import Papa from "papaparse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

const SYSTEM = `Você é o Analista de Dados do Naninne. Sua função é analisar planilhas (CSV/XLSX) e gerar uma análise executiva estruturada em JSON.

**SEMPRE retorne em JSON puro** (sem markdown, sem code fences) com este formato:
{
  "summary": "2-3 frases resumindo o que a planilha mostra",
  "kpis": [
    {"label": "Total de registros", "value": 1234, "unit": "registros", "trend": "up|down|neutral"},
    {"label": "Crescimento médio", "value": 12.5, "unit": "%", "trend": "up"}
  ],
  "insights": [
    {"title": "Insight 1", "description": "Descoberta interessante com números", "type": "trend|anomaly|opportunity|risk"}
  ],
  "recommendations": [
    {"title": "Ação 1", "description": "O que fazer", "priority": "high|medium|low"}
  ],
  "charts": [
    {"type": "bar|line|pie", "title": "Título", "data": [{"name": "Cat1", "value": 100}]}
  ]
}

**Regras**:
1. Use APENAS dados da planilha. Não invente números.
2. KPIs: máximo 5, focados no que importa
3. Insights: máximo 5, com números concretos
4. Recommendations: máximo 4, acionáveis
5. Charts: máximo 3, dados claros
6. Se a planilha for muito grande (>1000 linhas), agregue
7. Responda SOMENTE com JSON válido`;

async function parseCSV(buffer: Buffer): Promise<{ columns: string[]; rows: any[][]; rawText: string }> {
  const text = buffer.toString("utf-8");
  const parsed = Papa.parse(text, { header: false, skipEmptyLines: true });
  if (!parsed.data || parsed.data.length === 0) {
    return { columns: [], rows: [], rawText: text };
  }
  const columns = (parsed.data[0] as any[]).map((c) => String(c ?? ""));
  const rows = parsed.data.slice(1) as any[][];
  return { columns, rows, rawText: text };
}

async function parseXLSX(buffer: Buffer): Promise<{ columns: string[]; rows: any[][]; rawText: string }> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (!json || json.length === 0) {
    return { columns: [], rows: [], rawText: "" };
  }
  const columns = (json[0] as any[]).map((c) => String(c ?? ""));
  const rows = json.slice(1);
  const rawText = [columns.join("\t"), ...rows.slice(0, 50).map((r) => (r as any[]).join("\t"))].join("\n");
  return { columns, rows, rawText };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const projectId = (formData.get("project_id") as string | null) ?? null;
    const focusQuestion = (formData.get("focus") as string | null) ?? null;

    if (!file) {
      return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Arquivo muito grande (máx 10MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type;
    let parsed: { columns: string[]; rows: any[][]; rawText: string };
    let format = "unknown";
    if (mimeType === "text/csv" || file.name.toLowerCase().endsWith(".csv")) {
      parsed = await parseCSV(buffer);
      format = "csv";
    } else if (
      mimeType.includes("spreadsheet") ||
      file.name.toLowerCase().endsWith(".xlsx") ||
      file.name.toLowerCase().endsWith(".xls")
    ) {
      parsed = await parseXLSX(buffer);
      format = "xlsx";
    } else {
      return NextResponse.json({ error: "Tipo não suportado. Use CSV ou XLSX." }, { status: 400 });
    }

    if (parsed.rows.length === 0) {
      return NextResponse.json({ error: "Planilha vazia" }, { status: 400 });
    }

    const sample = parsed.rows.slice(0, 20);
    const summary = `# Planilha: ${file.name}
- Formato: ${format}
- Linhas: ${parsed.rows.length}
- Colunas (${parsed.columns.length}): ${parsed.columns.join(", ")}

## Primeiras 20 linhas:
${sample.map((r) => (r as any[]).map((v) => String(v ?? "")).join(" | ")).join("\n")}`;

    const focusText = focusQuestion ? `\n\n**Pergunta específica**: ${focusQuestion}` : "";

    const result = await generateText({
      model: anthropic("claude-sonnet-4-5"),
      system: SYSTEM,
      prompt: `Analise:${focusText}\n\n${summary}`,
      maxOutputTokens: 3000,
      temperature: 0.3,
    });

    let analysis: any = {};
    try {
      const match = result.text.match(/\{[\s\S]*\}/);
      if (match) analysis = JSON.parse(match[0]);
    } catch (e) {
      console.error("[mercado] JSON parse error:", e);
    }

    let documentId: string | null = null;
    try {
      const fullContent = `# Análise: ${file.name}\n\n## Resumo\n${analysis.summary ?? ""}\n\n## KPIs\n${(analysis.kpis ?? []).map((k: any) => `- **${k.label}**: ${k.value}${k.unit ?? ""}`).join("\n")}\n\n## Insights\n${(analysis.insights ?? []).map((i: any) => `- **${i.title}**: ${i.description}`).join("\n")}\n\n## Recomendações\n${(analysis.recommendations ?? []).map((r: any) => `- **[${r.priority}]** ${r.title}: ${r.description}`).join("\n")}`;
      const { data: doc } = await supabase
        .from("generated_documents")
        .insert({
          user_id: user!.id,
          project_id: projectId,
          title: `Análise: ${file.name}`,
          description: analysis.summary ?? "Análise de planilha",
          format: "markdown",
          status: "approved",
          content: fullContent,
          metadata: {
            type: "mercado_analysis",
            source_filename: file.name,
            source_format: format,
            source_rows: parsed.rows.length,
            source_columns: parsed.columns,
            kpis: analysis.kpis ?? [],
            insights: analysis.insights ?? [],
            recommendations: analysis.recommendations ?? [],
            charts: analysis.charts ?? [],
            tokens_in: result.usage?.inputTokens ?? 0,
            tokens_out: result.usage?.outputTokens ?? 0,
            cost_usd: ((result.usage?.inputTokens ?? 0) * 3 + (result.usage?.outputTokens ?? 0) * 15) / 1_000_000,
          },
        })
        .select("id")
        .single();
      if (doc) documentId = doc.id;
    } catch (e) {
      console.error("[mercado] save doc error:", e);
    }

    let analysisId: string | null = null;
    try {
      const { data: an } = await supabase
        .from("mercado_analyses")
        .insert({
          user_id: user!.id,
          project_id: projectId,
          source_document_id: documentId,
          source_filename: file.name,
          source_format: format,
          source_rows: parsed.rows.length,
          source_columns: parsed.columns,
          summary: analysis.summary,
          kpis: analysis.kpis,
          insights: analysis.insights,
          recommendations: analysis.recommendations,
          full_analysis: result.text,
        })
        .select("id")
        .single();
      if (an) analysisId = an.id;
    } catch (e) {
      console.error("[mercado] save analysis error:", e);
    }

    return NextResponse.json({
      ok: true,
      analysis: {
        id: analysisId,
        document_id: documentId,
        source: {
          filename: file.name,
          format,
          rows: parsed.rows.length,
          columns: parsed.columns,
        },
        ...analysis,
      },
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

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ analyses: [] });
    }
    const { data: analyses, error } = await supabase
      .from("mercado_analyses")
      .select("id, source_filename, source_format, source_rows, summary, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      return NextResponse.json({ analyses: [], error: error.message });
    }
    return NextResponse.json({ analyses: analyses ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
