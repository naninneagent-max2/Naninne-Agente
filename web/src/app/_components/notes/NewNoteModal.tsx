/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/lib/hooks/use-projects";
import { cn } from "@/lib/utils";

interface NewNoteModalProps {
  open: boolean;
  onClose: () => void;
  prefilledContent?: string;
  prefilledProjectId?: string | null;
  onCreated?: (noteId: string) => void;
}

export function NewNoteModal({
  open,
  onClose,
  prefilledContent = "",
  prefilledProjectId,
  onCreated,
}: NewNoteModalProps) {
  const [content, setContent] = React.useState(prefilledContent);
  const [tagsStr, setTagsStr] = React.useState("");
  const [projectId, setProjectId] = React.useState<string | null>(prefilledProjectId ?? null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { projects } = useProjects();
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (open) {
      setContent(prefilledContent);
      setProjectId(prefilledProjectId ?? null);
      setTagsStr("");
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open, prefilledContent, prefilledProjectId]);

  async function handleSave() {
    if (!content.trim()) {
      setError("Escreva alguma coisa antes de salvar");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
      const r = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          content,
          tags,
          project_id: projectId,
        }),
      });
      const d = await r.json();
      if (!r.ok || !d.note) {
        throw new Error(d.error ?? "Erro ao salvar");
      }
      onCreated?.(d.note.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-tooltip bg-black/50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-background rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h2 className="text-base font-semibold">Nova nota</h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground uppercase tracking-wide">
                  Conteúdo
                </label>
                <textarea
                  ref={inputRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  placeholder="Insight, ideia, referência, lembrete..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground uppercase tracking-wide">
                    Tags (vírgula)
                  </label>
                  <input
                    type="text"
                    value={tagsStr}
                    onChange={(e) => setTagsStr(e.target.value)}
                    placeholder="príncipe, capítulo 3"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground uppercase tracking-wide">
                    Projeto
                  </label>
                  <select
                    value={projectId ?? ""}
                    onChange={(e) => setProjectId(e.target.value || null)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Sem projeto</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-caption text-muted-foreground bg-muted/40 rounded-md p-2">
                A nota é indexada semanticamente e vai aparecer em futuras buscas e na contextualização do chat.
              </p>

              {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{error}</div>}
            </div>

            <div className="flex gap-2 px-5 py-3 border-t border-border bg-muted/30">
              <Button variant="ghost" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || !content.trim()} className="flex-1 gap-1.5">
                {saving ? <Sparkles className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {saving ? "Salvando..." : "Salvar nota"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
