/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react/no-unescaped-entities */
"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Lightbulb,
  Target,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { ProjectPicker } from "@/components/ui/project-picker";
import { useProjects } from "@/lib/hooks/use-projects";
import { cn } from "@/lib/utils";

type Analysis = {
  id: string;
  document_id?: string;
  source: {
    filename: string;
    format: string;
    rows: number;
    columns: string[];
  };
  summary?: string;
  kpis?: Array<{ label: string; value: number | string; unit?: string; trend?: "up" | "down" | "neutral" }>;
  insights?: Array<{ title: string; description: string; type: string }>;
  recommendations?: Array<{ title: string; description: string; priority: string }>;
  charts?: Array<{ type: string; title: string; data: any[] }>;
  usage?: { tokens_in: number; tokens_out: number };
};

const ACCEPT = ".csv,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv";

const TREND_ICONS = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

const TREND_COLORS = {
  up: "text-green-600",
  down: "text-red-600",
  neutral: "text-neutral-500",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-blue-100 text-blue-700",
};

const INSIGHT_COLORS: Record<string, string> = {
  trend: "bg-blue-50 border-blue-200 text-blue-700",
  anomaly: "bg-orange-50 border-orange-200 text-orange-700",
  opportunity: "bg-green-50 border-green-200 text-green-700",
  risk: "bg-red-50 border-red-200 text-red-700",
};

export default function MercadoPage() {
  const [analyses, setAnalyses] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState<{ name: string; status: string; error?: string } | null>(null);
  const [current, setCurrent] = React.useState<Analysis | null>(null);
  const [focus, setFocus] = React.useState("");
  const [projectId, setProjectId] = React.useState<string | null>(null);
  const { projects: availableProjects } = useProjects();
  const [dragActive, setDragActive] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const reload = React.useCallback(() => {
    setLoading(true);
    fetch("/api/mercado/analyze", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setAnalyses(data.analyses ?? []))
      .catch(() => setAnalyses([]))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => { reload(); }, [reload]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploading({ name: file.name, status: "enviando..." });
    const fd = new FormData();
    fd.append("file", file);
    if (focus) fd.append("focus", focus);
    if (projectId) fd.append("project_id", projectId);
    try {
      const res = await fetch("/api/mercado/analyze", { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok) {
        setUploading({ name: file.name, status: "✓ analisado" });
        setTimeout(() => setUploading(null), 2000);
        setCurrent(data.analysis);
        reload();
      } else {
        setUploading({ name: file.name, status: "erro", error: data.error });
        setTimeout(() => setUploading(null), 5000);
      }
    } catch (err) {
      setUploading({ name: file.name, status: "erro", error: "rede" });
      setTimeout(() => setUploading(null), 5000);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        Carregando análises...
      </div>
    );
  }

  return (
    <div className="px-6 py-10 md:px-10 md:py-12">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Badge className="border-0 bg-mkt-100 text-mkt-700" size="sm">
                <BarChart3 className="mr-1 h-3 w-3" />
                Análise de dados
              </Badge>
            </div>
            <h1 className="text-h1 text-neutral-900">Mercado</h1>
            <p className="mt-1 text-body text-neutral-600">
              Faça upload de uma planilha e receba análise executiva com KPIs, insights e recomendações.
            </p>
          </div>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading !== null}
            className="gap-1.5"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Analisando..." : "Nova planilha"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* Upload toast */}
        <AnimatePresence>
          {uploading && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={cn(
                "mb-4 rounded-lg border p-3 flex items-center gap-2 text-sm",
                uploading.error
                  ? "border-red-200 bg-red-50 text-red-700"
                  : uploading.status.includes("✓")
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-blue-200 bg-blue-50 text-blue-700"
              )}
            >
              {uploading.error ? <AlertCircle className="h-4 w-4" /> :
                uploading.status.includes("✓") ? <CheckCircle2 className="h-4 w-4" /> :
                <Loader2 className="h-4 w-4 animate-spin" />}
              <span className="flex-1 truncate">
                <strong>{uploading.name}</strong> — {uploading.status}
                {uploading.error && `: ${uploading.error}`}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Projeto (opcional)</label>
            <ProjectPicker
              projects={availableProjects}
              value={projectId}
              onChange={setProjectId}
              label=""
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Pergunta específica (opcional)</label>
          <input
            type="text"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="Ex: Onde estão os outliers de preço? Qual categoria cresceu mais?"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          </div>
        </div>

        {/* Drag-drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "rounded-2xl border-2 border-dashed p-8 text-center mb-6 transition-colors",
            dragActive ? "border-primary bg-primary/5" : "border-border"
          )}
        >
          <FileSpreadsheet className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium mb-1">Arraste uma planilha aqui</p>
          <p className="text-caption text-muted-foreground mb-3">CSV ou XLSX · até 10MB</p>
          <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Escolher arquivo
          </Button>
        </div>

        {/* Current analysis */}
        {current ? (
          <AnalysisView analysis={current} onBack={() => setCurrent(null)} />
        ) : analyses.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="Nenhuma análise ainda"
            description="Faça upload da primeira planilha. Você pode subir CSV (exportado de Excel/Google Sheets) ou XLSX. O Naninne vai analisar e devolver KPIs, insights acionáveis e gráficos."
          />
        ) : (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Análises anteriores</h2>
            {analyses.map((a) => (
              <Card
                key={a.id}
                variant="hover-elevate"
                className="cursor-pointer"
                onClick={async () => {
                  const res = await fetch(`/api/mercado/analyze`);
                  // Can't load full details via this endpoint, just show summary
                  setCurrent({
                    id: a.id,
                    source: { filename: a.source_filename, format: a.source_format, rows: a.source_rows, columns: [] },
                    summary: a.summary,
                  });
                }}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-mkt-100 text-mkt-700">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.source_filename}</p>
                    <p className="text-caption text-muted-foreground line-clamp-1">{a.summary ?? "Análise"}</p>
                    <p className="text-caption text-muted-foreground mt-0.5">
                      {a.source_rows?.toLocaleString("pt-BR")} linhas · {a.source_format} · {new Date(a.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AnalysisView({ analysis, onBack }: { analysis: Analysis; onBack: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Voltar
        </Button>
        {analysis.document_id && (
          <Button variant="secondary" size="sm" asChild>
            <a href={`/documentos`} target="_blank">
              <ExternalLink className="h-4 w-4 mr-1" />
              Ver em Documentos
            </a>
          </Button>
        )}
      </div>

      {/* Summary */}
      {analysis.summary && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Resumo executivo</span>
            </div>
            <p className="text-base leading-relaxed">{analysis.summary}</p>
            <p className="mt-3 text-caption text-muted-foreground">
              Fonte: {analysis.source.filename} · {analysis.source.rows.toLocaleString("pt-BR")} linhas · {analysis.source.columns.length} colunas
            </p>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      {analysis.kpis && analysis.kpis.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">KPIs</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {analysis.kpis.map((kpi, i) => {
              const TrendIcon = TREND_ICONS[kpi.trend ?? "neutral"] ?? Minus;
              return (
                <Card key={i}>
                  <CardContent className="p-4">
                    <p className="text-caption text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-semibold mt-1">
                      {typeof kpi.value === "number" ? kpi.value.toLocaleString("pt-BR") : kpi.value}
                      {kpi.unit && <span className="text-sm text-muted-foreground ml-1">{kpi.unit}</span>}
                    </p>
                    {kpi.trend && (
                      <div className={cn("flex items-center gap-1 mt-2 text-xs", TREND_COLORS[kpi.trend])}>
                        <TrendIcon className="h-3 w-3" />
                        <span>{kpi.trend === "up" ? "alta" : kpi.trend === "down" ? "queda" : "estável"}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Insights */}
      {analysis.insights && analysis.insights.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Insights</h2>
          <div className="space-y-2">
            {analysis.insights.map((ins, i) => (
              <Card key={i} className={cn("border", INSIGHT_COLORS[ins.type] ?? "border-border")}>
                <CardContent className="p-4 flex items-start gap-3">
                  <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium">{ins.title}</h3>
                      <Badge variant="neutral" size="sm">{ins.type}</Badge>
                    </div>
                    <p className="text-sm">{ins.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Recomendações</h2>
          <div className="space-y-2">
            {analysis.recommendations.map((rec, i) => (
              <Card key={i}>
                <CardContent className="p-4 flex items-start gap-3">
                  <Target className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium">{rec.title}</h3>
                      <Badge className={PRIORITY_COLORS[rec.priority] ?? "bg-neutral-100"} size="sm">
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      {analysis.charts && analysis.charts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Gráficos sugeridos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analysis.charts.map((chart, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium">{chart.title}</h3>
                    <Badge variant="neutral" size="sm">{chart.type}</Badge>
                  </div>
                  {/* Simple bar visualization */}
                  <div className="space-y-1.5">
                    {chart.data?.slice(0, 8).map((d: any, j: number) => {
                      const max = Math.max(...chart.data.map((x: any) => Number(x.value) || 0));
                      const w = max > 0 ? (Number(d.value) / max) * 100 : 0;
                      return (
                        <div key={j} className="flex items-center gap-2">
                          <span className="text-caption text-muted-foreground w-24 truncate">{d.name}</span>
                          <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${w}%` }} />
                          </div>
                          <span className="text-caption tabular-nums w-12 text-right">{d.value}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {analysis.usage && (
        <p className="text-caption text-muted-foreground text-center">
          Custo: ${(((analysis.usage.tokens_in * 3) + (analysis.usage.tokens_out * 15)) / 1_000_000).toFixed(4)} · {analysis.usage.tokens_in + analysis.usage.tokens_out} tokens
        </p>
      )}
    </div>
  );
}
