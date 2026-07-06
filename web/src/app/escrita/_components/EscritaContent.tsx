/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Plus,
  Save,
  Trash2,
  Loader2,
  ArrowLeft,
  Sparkles,
  Wand2,
  Download,
  FileText,
  Edit3,
  CheckCircle2,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ProjectPicker } from "@/components/ui/project-picker";
import { useProjects } from "@/lib/hooks/use-projects";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/store/auth";

type Chapter = {
  id: string;
  title: string;
  content: string;
  position: number;
  status: string;
  word_count: number;
  project_id: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  rascunho: { label: "Rascunho", class: "bg-neutral-100 text-neutral-700" },
  "em-rascunho": { label: "Em revisão", class: "bg-yellow-100 text-yellow-700" },
  finalizado: { label: "Finalizado", class: "bg-green-100 text-green-700" },
};

export function EscritaContent() {
  const user = useAuth((s) => s.user);
  const [chapters, setChapters] = React.useState<Chapter[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [projectId, setProjectId] = React.useState<string | null>(null);
  const { projects: availableProjects } = useProjects();
  const [genToast, setGenToast] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);

  // Editor state (synced with selected chapter)
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");

  const reload = React.useCallback(() => {
    if (!user) return;
    setLoading(true);
    fetch("/api/chapters", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setChapters(data.chapters ?? []))
      .catch(() => setChapters([]))
      .finally(() => setLoading(false));
  }, [user]);

  React.useEffect(() => { reload(); }, [reload]);

  // Sync editor with selected chapter
  React.useEffect(() => {
    if (selectedId) {
      const ch = chapters.find((c) => c.id === selectedId);
      if (ch) {
        setTitle(ch.title);
        setContent(ch.content);
        setSavedAt(new Date(ch.updated_at));
      }
    }
  }, [selectedId, chapters]);

async function handleCreate() {
    const res = await fetch("/api/chapters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        title: "Novo capítulo",
        content: "",
        position: chapters.length,
      }),
    });
    const data = await res.json();
    if (data.chapter) {
      reload();
      setSelectedId(data.chapter.id);
    }
  }

  async function handleSave() {
    if (!selectedId) return;
    setSaving(true);
    try {
      await fetch("/api/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          id: selectedId,
          title,
          content,
        }),
      });
      setSavedAt(new Date());
      reload();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deletar este capítulo?")) return;
    await fetch("/api/chapters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    if (selectedId === id) setSelectedId(null);
    reload();
  }

  async function handleStatusChange(status: string) {
    if (!selectedId) return;
    await fetch("/api/chapters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id: selectedId, status }),
    });
    reload();
  }

  function handleDownload(ch: Chapter) {
    const blob = new Blob([`# ${ch.title}\n\n${ch.content}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ch.title.replace(/[^a-z0-9]+/gi, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const charCount = content.length;
  const selectedChapter = chapters.find((c) => c.id === selectedId);

  const [genOpen, setGenOpen] = React.useState(false);
  const [genForm, setGenForm] = React.useState({ prompt: "", projectId: null as string | null, length: "long" as "long" | "short" });

  async function handleGenerate() {
    setGenForm({ prompt: "", projectId, length: "long" });
    setGenOpen(true);
  }

  async function handleGenerateSubmit() {
    if (!genForm.prompt.trim()) return;
    const { prompt, projectId: pid, length } = genForm;
    setGenOpen(false);
    setGenerating(true);
    setGenToast("Gerando capítulo (~3.600 palavras, 1-3 min)...");
    try {
      const res = await fetch("/api/escrita/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), project_id: pid, style: "literário", length }),
      });
      if (!res.ok || !res.body) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      let chapterId: string | null = null;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;
          try {
            const event = JSON.parse(json);
            if (event.type === "text") {
              accumulated += event.content;
            } else if (event.type === "done") {
              chapterId = event.chapter_id;
            }
          } catch {}
        }
      }
      setGenToast(`Capítulo gerado (${accumulated.split(/\s+/).filter(Boolean).length} palavras)`);
      setTimeout(() => setGenToast(null), 5000);
      if (chapterId) {
        setSelectedId(chapterId);
      }
      reload();
    } catch (err) {
      setGenToast(err instanceof Error ? err.message : "Erro");
      setTimeout(() => setGenToast(null), 5000);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
  

  return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        Carregando capítulos...
      </div>
    );
  }

  // Editor view
  if (selectedChapter) {
    return (
      <div className="flex flex-col h-[calc(100vh-var(--topbar-h))]">
        {/* Editor header */}
        <div className="border-b border-neutral-200 bg-background px-6 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Capítulos
          </Button>
          <div className="flex-1 flex items-center gap-2 text-caption text-muted-foreground">
            {saving ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Salvando...
              </span>
            ) : savedAt ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                Salvo {savedAt.toLocaleTimeString("pt-BR")}
              </span>
            ) : null}
            <span>·</span>
            <span>{wordCount} palavras · {charCount} caracteres</span>
          </div>
          <div className="flex items-center gap-2">
            {(["rascunho", "em-rascunho", "finalizado"] as const).map((s) => {
              const meta = STATUS_LABELS[s];
              const active = selectedChapter.status === s;
              return (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`px-3 py-1 rounded-full text-caption font-medium transition-colors ${
                    active ? meta.class : "bg-neutral-50 text-neutral-500 hover:bg-neutral-100"
                  }`}
                >
                  {meta.label}
                </button>
              );
            })}
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              Salvar
            </Button>
          </div>
        </div>

        {/* Editor body */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do capítulo"
              className="text-3xl font-semibold border-0 px-0 mb-4 focus-visible:ring-0 bg-transparent"
              style={{ fontSize: "2rem" }}
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Comece a escrever aqui. Use Cmd/Ctrl+S para salvar."
              className="w-full min-h-[60vh] resize-none border-0 bg-transparent text-base leading-relaxed text-neutral-900 focus:outline-none focus-visible:ring-0 placeholder:text-neutral-400"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // List view
  const totalWords = chapters.reduce((s, c) => s + c.word_count, 0);

  if (genToast) {
    // shown in the editor view
  }
  return (
    <>
    <div className="px-6 py-10 md:px-10 md:py-12">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Badge className="border-0 bg-writing-100 text-writing-700" size="sm">
                <BookOpen className="mr-1 h-3 w-3" />
                Projeto de escrita
              </Badge>
            </div>
          {genToast && (
            <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center gap-2 text-sm">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
              <span>{genToast}</span>
            </div>
          )}
          <h1 className="text-h1 text-neutral-900">Escrita Criativa</h1>
            <p className="mt-1 text-body text-neutral-600">
              {chapters.length === 0
                ? "Comece seu primeiro capítulo"
                : `${chapters.length} ${chapters.length === 1 ? "capítulo" : "capítulos"} · ${totalWords.toLocaleString("pt-BR")} palavras no total`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleGenerate} disabled={generating} variant="secondary" className="gap-1.5">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {generating ? "Gerando..." : "Gerar com IA"}
            </Button>
            <Button onClick={handleCreate} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Novo capítulo
            </Button>
          </div>
        </div>

        {chapters.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Nenhum capítulo ainda"
            description="Comece seu primeiro capítulo. Você pode estruturar, escrever, salvar, e exportar para Markdown. O Naninne também pode te ajudar a redigir e revisar."
            cta={{ label: "Criar primeiro capítulo", onClick: handleCreate }}
          />
        ) : (
          <div className="space-y-2">
            {chapters.map((ch, i) => {
              const meta = STATUS_LABELS[ch.status] ?? STATUS_LABELS.rascunho;
              return (
                <Card key={ch.id} variant="hover-elevate" className="cursor-pointer" onClick={() => setSelectedId(ch.id)}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <span className="text-h4 font-semibold text-neutral-400 w-10 text-center">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={meta.class} size="sm">
                          {meta.label}
                        </Badge>
                        <span className="text-caption text-muted-foreground">
                          {ch.word_count.toLocaleString("pt-BR")} palavras
                        </span>
                        {ch.updated_at && (
                          <span className="text-caption text-muted-foreground">
                            · {new Date(ch.updated_at).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-neutral-900 truncate">{ch.title}</p>
                      {ch.content && (
                        <p className="text-caption text-neutral-500 line-clamp-1 mt-0.5">
                          {ch.content.split("\n")[0]}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); handleDownload(ch); }}
                        className="text-muted-foreground hover:text-foreground"
                        title="Baixar"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); handleDelete(ch.id); }}
                        className="text-muted-foreground hover:text-red-600"
                        title="Deletar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>

      {/* Generate chapter modal */}
      {genOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4"
          >
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-primary" />
                Gerar capítulo com IA
              </h2>
              <p className="text-caption text-muted-foreground mt-1">
                O Naninne vai escrever usando o que está na sua biblioteca, notas e memórias.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Sobre o que escrever?</label>
              <Textarea
                value={genForm.prompt}
                onChange={(e) => setGenForm((f) => ({ ...f, prompt: e.target.value }))}
                placeholder="Ex: 'Estou no capítulo 4 sobre poder invisível. Cruze com O Príncipe e escreva 8 páginas no tom do Cap. III.'"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Comprimento</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setGenForm((f) => ({ ...f, length: "short" }))}
                    className={`text-xs px-3 py-2 rounded-md border ${genForm.length === "short" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"}`}
                  >
                    3 páginas
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenForm((f) => ({ ...f, length: "long" }))}
                    className={`text-xs px-3 py-2 rounded-md border ${genForm.length === "long" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"}`}
                  >
                    8 páginas
                  </button>
                </div>
              </div>
              <ProjectPicker
                projects={availableProjects}
                value={genForm.projectId}
                onChange={(id) => setGenForm((f) => ({ ...f, projectId: id }))}
                label="Projeto (opcional)"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setGenOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleGenerateSubmit} disabled={!genForm.prompt.trim()} className="flex-1 gap-1.5">
                <Wand2 className="h-4 w-4" />
                Gerar
              </Button>
            </div>
          </motion.div>
        </div>
      )}

    </>
  );
}
