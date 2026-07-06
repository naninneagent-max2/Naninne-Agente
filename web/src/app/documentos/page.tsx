/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { FileText, Trash2, Loader2, Download, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/lib/store/auth";
import { ProjectPicker, ProjectBadge } from "@/components/ui/project-picker";
import { useProjects } from "@/lib/hooks/use-projects";

type Document = {
  id: string;
  project_id?: string | null;
  project?: { id: string; name: string; color: string } | null;
  title: string;
  description: string | null;
  format: string;
  status: string;
  metadata: {
    tokens_in?: number;
    tokens_out?: number;
    cost_usd?: number;
    sources?: Array<{ title: string; similarity: number }>;
    agent_used?: string[];
  };
  created_at: string;
  updated_at: string;
};

const FORMAT_COLORS: Record<string, string> = {
  markdown: "bg-blue-100 text-blue-700",
  pdf: "bg-red-100 text-red-700",
  docx: "bg-purple-100 text-purple-700",
  json: "bg-green-100 text-green-700",
};

export default function DocumentosPage() {
  const user = useAuth((s) => s.user);
  const [docs, setDocs] = React.useState<Document[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<Document | null>(null);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [filterProject, setFilterProject] = React.useState<string | null>(null);
  const { projects: allProjects } = useProjects();

  const reload = React.useCallback(() => {
    if (!user) return;
    setLoading(true);
    fetch(`/api/documents${filterProject ? `?project_id=${filterProject}` : ""}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setDocs(data.documents ?? []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, [user, filterProject]);

  React.useEffect(() => { reload(); }, [reload, filterProject]);

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
      reload();
      if (selected?.id === id) setSelected(null);
    } finally {
      setDeleting(null);
    }
  }

  async function handleOpen(doc: Document) {
    const res = await fetch(`/api/documents?id=${doc.id}`);
    const data = await res.json();
    setSelected(data.document ?? doc);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        Carregando documentos...
      </div>
    );
  }

  if (selected) {
    return (
      <div className="px-6 py-10 md:px-10 md:py-12">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="mb-2 -ml-2">
                ← Voltar
              </Button>
              <h1 className="text-h1 text-neutral-900">{selected.title}</h1>
              <p className="mt-1 text-body text-neutral-600">
                {new Date(selected.created_at).toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selected.metadata?.cost_usd !== undefined && (
                <Badge variant="neutral">${selected.metadata.cost_usd.toFixed(4)}</Badge>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  const blob = new Blob([(selected as any).content ?? ""], { type: "text/markdown" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${selected.title}.md`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-4 w-4 mr-1" /> Baixar
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              <pre className="whitespace-pre-wrap text-sm text-neutral-900 font-sans leading-relaxed">
                {(selected as any).content ?? "Conteúdo não disponível"}
              </pre>
            </CardContent>
          </Card>

          {selected.metadata?.sources && selected.metadata.sources.length > 0 && (
            <div className="mt-6">
              <p className="text-caption font-semibold uppercase tracking-wide text-neutral-500 mb-3">
                Fontes consultadas
              </p>
              <div className="flex flex-wrap gap-2">
                {selected.metadata.sources.map((s, i) => (
                  <Badge key={i} variant="neutral">
                    [{i + 1}] {s.title}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-10 md:px-10 md:py-12">
      <div className="mx-auto max-w-[1100px]">
        <h1 className="text-h1 text-neutral-900 mb-1">Documentos</h1>
        <p className="text-body text-neutral-600 mb-6">
          Tudo que o Naninne gerou: respostas, capítulos, análises, relatórios.
        </p>

        <div className="mb-6 max-w-sm">
          <ProjectPicker
            projects={allProjects}
            value={filterProject}
            onChange={setFilterProject}
            label="Filtrar por projeto"
            noneLabel="Todos os projetos"
          />
        </div>

        {docs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhum documento gerado"
            description="Conforme você conversa com o Naninne, cada resposta do Redator é salva aqui automaticamente. Você pode revisitá-las, baixá-las em Markdown ou deletá-las."
          />
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card variant="hover-elevate" className="cursor-pointer" onClick={() => handleOpen(doc)}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-100 text-primary-700">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={FORMAT_COLORS[doc.format] ?? "bg-neutral-100 text-neutral-700"} size="sm">
                          {doc.format}
                        </Badge>
                        {doc.metadata?.cost_usd !== undefined && (
                          <span className="text-caption text-muted-foreground">
                            ${doc.metadata.cost_usd.toFixed(4)}
                          </span>
                        )}
                        {doc.metadata?.tokens_in && (
                          <span className="text-caption text-muted-foreground">
                            {doc.metadata.tokens_in + (doc.metadata.tokens_out ?? 0)} tokens
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-neutral-900 truncate">{doc.title}</p>
                          {doc.project_id && allProjects.find(p => p.id === doc.project_id) && (
                            <ProjectBadge project={allProjects.find(p => p.id === doc.project_id)!} />
                          )}
                        </div>
                      <p className="text-caption text-muted-foreground">
                        {new Date(doc.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                      disabled={deleting === doc.id}
                      className="shrink-0 text-muted-foreground hover:text-red-600"
                    >
                      {deleting === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
