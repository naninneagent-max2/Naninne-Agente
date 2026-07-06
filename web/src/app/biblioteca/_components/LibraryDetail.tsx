/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react/no-unescaped-entities */
/* eslint-disable react/no-unescaped-entities */
"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FileText,
  Eye,
  Hash,
  StickyNote,
  Brain,
  Download,
  Trash2,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Database,
  Sparkles,
  Plus,
  Edit3,
  Save,
  Tag,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm/ConfirmDialog";
import { useToast } from "@/lib/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileViewer } from "./FileViewer";

type Tab = "info" | "arquivo" | "chunks" | "notas" | "memorias";

type LibraryItem = {
  id: string;
  title: string;
  description: string | null;
  mime_type: string;
  format: string;
  file_size_bytes: number;
  file_hash_sha256: string;
  status: string;
  error_message: string | null;
  storage_path: string | null;
  metadata: {
    chunk_count?: number;
    text_length?: number;
    pages?: number;
    full_text?: string;
    [k: string]: any;
  };
  indexed_at: string | null;
  created_at: string;
  updated_at: string;
};

type Chunk = {
  id: string;
  chunk_index: number;
  content: string;
  token_count: number;
  created_at: string;
};

type Note = {
  id: string;
  content: string;
  page_reference: string | null;
  tags: string[];
  library_item_id: string;
  chunk_id: string | null;
  created_at: string;
  updated_at: string;
};

type Memory = {
  id: string;
  fact: string;
  category: string;
  confidence: number;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-neutral-100 text-neutral-700",
  processing: "bg-blue-100 text-blue-700",
  ready: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  archived: "bg-neutral-100 text-neutral-500",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  processing: "Processando",
  ready: "Indexado",
  failed: "Falhou",
  archived: "Arquivado",
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

interface LibraryDetailProps {
  itemId: string;
  onClose: () => void;
  onDeleted: () => void;
}

export function LibraryDetail({ itemId, onClose, onDeleted }: LibraryDetailProps) {
  const [item, setItem] = React.useState<LibraryItem | null>(null);
  const toast = useToast();
  const [chunks, setChunks] = React.useState<Chunk[]>([]);
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [memories, setMemories] = React.useState<Memory[]>([]);
  const [tab, setTab] = React.useState<Tab>("info");
  const [loading, setLoading] = React.useState(true);
  const [deleting, setDeleting] = React.useState(false);
  const [retrying, setRetrying] = React.useState(false);
  const [expandedChunks, setExpandedChunks] = React.useState<Set<number>>(new Set());

  // Note state
  const [newNoteContent, setNewNoteContent] = React.useState("");
  const [newNotePage, setNewNotePage] = React.useState("");
  const [newNoteTags, setNewNoteTags] = React.useState("");
  const [savingNote, setSavingNote] = React.useState(false);

  const loadItem = React.useCallback(async () => {
    const res = await fetch(`/api/library/${itemId}`);
    const data = await res.json();
    if (data.item) setItem(data.item);
  }, [itemId]);

  const loadChunks = React.useCallback(async () => {
    const res = await fetch(`/api/library/${itemId}/chunks`);
    const data = await res.json();
    if (data.chunks) setChunks(data.chunks);
  }, [itemId]);

  const loadNotes = React.useCallback(async () => {
    const res = await fetch(`/api/notes?library_item_id=${itemId}`);
    const data = await res.json();
    if (data.notes) setNotes(data.notes);
  }, [itemId]);

  const loadMemories = React.useCallback(async () => {
    // For now, fetch all memories (we don't link memories to library_items)
    // In future, we could search memories that match the file's content
    const res = await fetch(`/api/memories`);
    const data = await res.json();
    if (data.memories) setMemories(data.memories.slice(0, 50));
  }, []);

  React.useEffect(() => {
    setLoading(true);
    Promise.all([loadItem(), loadChunks(), loadNotes(), loadMemories()])
      .finally(() => setLoading(false));
  }, [loadItem, loadChunks, loadNotes, loadMemories]);

  const [confirmDelete, setConfirmDelete] = React.useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/library/${itemId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Arquivo deletado", `"${item?.title}" foi removido da biblioteca.`);
        onDeleted();
        onClose();
      } else {
        const data = await res.json();
        toast.error("Erro ao deletar", data.error ?? "Tente novamente.");
      }
    } catch (e) {
      toast.error("Erro de conexão", String(e));
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleRetry() {
    setRetrying(true);
    try {
      const res = await fetch("/api/library/upload", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Reindexação iniciada", `${item?.title} será processado em background.`);
        loadItem();
        loadChunks();
      } else {
        toast.error("Erro ao reindexar", data.error ?? "Tente novamente.");
      }
    } finally {
      setRetrying(false);
    }
  }

  async function handleDownload() {
    if (!item?.storage_path) return;
    // Use signed URL or direct download
    const res = await fetch(`/api/library/${itemId}/download`);
    const data = await res.json();
    if (data.url) {
      window.open(data.url, "_blank");
    } else {
      alert(`Erro: ${data.error ?? "sem URL"}`);
    }
  }

  async function handleAddNote() {
    if (!newNoteContent.trim()) return;
    setSavingNote(true);
    try {
      const tags = newNoteTags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          content: newNoteContent,
          page_reference: newNotePage || null,
          tags,
          library_item_id: itemId,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setNewNoteContent("");
        setNewNotePage("");
        setNewNoteTags("");
        loadNotes();
      } else {
        alert(`Erro: ${data.error}`);
      }
    } finally {
      setSavingNote(false);
    }
  }

  async function handleDeleteNote(id: string) {
    if (!confirm("Deletar esta nota?")) return;
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    loadNotes();
  }

  if (loading || !item) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-background rounded-2xl shadow-xl max-w-2xl w-full p-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-background rounded-2xl shadow-xl max-w-4xl w-full my-8"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-border bg-background rounded-t-2xl">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <Badge className={STATUS_STYLES[item.status] ?? "bg-neutral-100"} size="sm">
                {item.status === "processing" && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                {item.status === "ready" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                {item.status === "failed" && <AlertCircle className="h-3 w-3 mr-1" />}
                {STATUS_LABELS[item.status] ?? item.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {item.format} · {formatSize(item.file_size_bytes)}
              </span>
            </div>
            <h2 className="text-xl font-semibold truncate">{item.title}</h2>
            {item.error_message && (
              <p className="text-xs text-red-600 mt-1 truncate" title={item.error_message}>
                {item.error_message}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 ml-4">
            {item.storage_path && (
              <Button variant="ghost" size="icon" onClick={handleDownload} title="Baixar original">
                <Download className="h-4 w-4" />
              </Button>
            )}
            {item.status === "failed" && (
              <Button variant="ghost" size="icon" onClick={handleRetry} disabled={retrying} title="Tentar de novo">
                {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(true)} disabled={deleting} title="Deletar" className="text-muted-foreground hover:text-red-600">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6 bg-background">
          {([
            { id: "info", label: "Info", icon: Database, count: undefined },
            { id: "arquivo", label: "Arquivo", icon: Eye, count: undefined },
            { id: "chunks", label: "Chunks", icon: Hash, count: chunks.length },
            { id: "notas", label: "Notas", icon: StickyNote, count: notes.length },
            { id: "memorias", label: "Memórias", icon: Brain, count: memories.length },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {(t as any).count !== undefined && (
                <span className="text-caption text-muted-foreground">({t.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {tab === "info" && <InfoTab item={item} />}
          {tab === "arquivo" && (
            <FileViewer
              itemId={item.id}
              mimeType={item.mime_type}
              format={item.format}
              filename={item.title}
              fileSize={item.file_size_bytes}
              storagePath={item.storage_path}
              fullText={item.metadata?.full_text ?? ""}
              onDownload={handleDownload}
            />
          )}
          {tab === "chunks" && (
            <ChunksTab
              chunks={chunks}
              expanded={expandedChunks}
              setExpanded={setExpandedChunks}
            />
          )}
          {tab === "notas" && (
            <NotesTab
              notes={notes}
              newContent={newNoteContent}
              setNewContent={setNewNoteContent}
              newPage={newNotePage}
              setNewPage={setNewNotePage}
              newTags={newNoteTags}
              setNewTags={setNewNoteTags}
              onAdd={handleAddNote}
              onDelete={handleDeleteNote}
              saving={savingNote}
            />
          )}
          {tab === "memorias" && <MemoriesTab memories={memories} />}
        </div>
      </motion.div>
    </div>
  );
}

function InfoTab({ item }: { item: LibraryItem }) {
  const meta = item.metadata ?? {};
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <InfoRow label="Tipo" value={item.mime_type} />
        <InfoRow label="Formato" value={item.format} />
        <InfoRow label="Tamanho" value={formatSize(item.file_size_bytes)} />
        <InfoRow label="Chunks" value={String(meta.chunk_count ?? 0)} />
        <InfoRow label="Caracteres" value={(meta.text_length ?? 0).toLocaleString("pt-BR")} />
        {meta.pages && <InfoRow label="Páginas" value={String(meta.pages)} />}
        <InfoRow label="Criado" value={new Date(item.created_at).toLocaleString("pt-BR")} />
        <InfoRow label="Indexado" value={item.indexed_at ? new Date(item.indexed_at).toLocaleString("pt-BR") : "—"} />
      </div>
      {item.storage_path && (
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Caminho no storage</p>
          <p className="text-xs font-mono break-all">{item.storage_path}</p>
        </div>
      )}
      <div className="rounded-md border border-border bg-muted/30 p-3">
        <p className="text-xs font-medium text-muted-foreground mb-1">Hash SHA-256</p>
        <p className="text-xs font-mono break-all text-muted-foreground">{item.file_hash_sha256}</p>
      </div>
      {item.description && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Descrição</p>
          <p className="text-sm">{item.description}</p>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}


function ChunksTab({
  chunks,
  expanded,
  setExpanded,
}: {
  chunks: Chunk[];
  expanded: Set<number>;
  setExpanded: (s: Set<number>) => void;
}) {
  if (chunks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Nenhum chunk indexado.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {chunks.map((c) => {
        const isOpen = expanded.has(c.chunk_index);
        return (
          <div
            key={c.id}
            className="rounded-md border border-border bg-card overflow-hidden"
          >
            <button
              onClick={() => {
                const next = new Set(expanded);
                if (next.has(c.chunk_index)) next.delete(c.chunk_index);
                else next.add(c.chunk_index);
                setExpanded(next);
              }}
              className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 text-left"
            >
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="text-xs font-mono text-muted-foreground w-12">
                #{c.chunk_index}
              </span>
              <span className="text-sm flex-1 truncate">
                {c.content.slice(0, 120)}
                {c.content.length > 120 && "..."}
              </span>
              <span className="text-caption text-muted-foreground">
                {c.token_count} tokens
              </span>
            </button>
            {isOpen && (
              <div className="px-3 pb-3 pt-0">
                <div className="rounded bg-muted/30 p-3 max-h-60 overflow-y-auto">
                  <p className="text-sm whitespace-pre-wrap font-mono">{c.content}</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function NotesTab({
  notes,
  newContent,
  setNewContent,
  newPage,
  setNewPage,
  newTags,
  setNewTags,
  onAdd,
  onDelete,
  saving,
}: {
  notes: Note[];
  newContent: string;
  setNewContent: (s: string) => void;
  newPage: string;
  setNewPage: (s: string) => void;
  newTags: string;
  setNewTags: (s: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Add new note */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium">Nova nota</p>
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Anote uma observação, citação, insight, ou dúvida sobre este arquivo..."
            rows={3}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Referência (ex: p.47)"
              value={newPage}
              onChange={(e) => setNewPage(e.target.value)}
            />
            <Input
              placeholder="Tags (separadas por vírgula)"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
            />
          </div>
          <Button onClick={onAdd} disabled={!newContent.trim() || saving} size="sm" className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            Adicionar nota
          </Button>
        </CardContent>
      </Card>

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Nenhuma nota ainda. Anote insights, citações, ou dúvidas sobre este arquivo.
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <Card key={n.id} variant="hover-elevate">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <StickyNote className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {n.page_reference && (
                        <Badge variant="neutral" size="sm">
                          📄 {n.page_reference}
                        </Badge>
                      )}
                      {n.tags?.map((t) => (
                        <Badge key={t} variant="neutral" size="sm">
                          #{t}
                        </Badge>
                      ))}
                      <span className="text-caption text-muted-foreground ml-auto">
                        {new Date(n.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(n.id)}
                    className="text-muted-foreground hover:text-red-600 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function MemoriesTab({ memories }: { memories: Memory[] }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Fatos que o Naninne lembra sobre você. Conforme você conversa, mais memórias são salvas automaticamente.
      </p>
      {memories.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Nenhuma memória ainda. Clique no botão "Salvar na memória" no chat para extrair fatos da conversa.
        </div>
      ) : (
        <div className="space-y-2">
          {memories.map((m) => (
            <Card key={m.id}>
              <CardContent className="p-3 flex items-start gap-3">
                <Brain className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{m.fact}</p>
                  <p className="text-caption text-muted-foreground mt-1">
                    {m.category} · {(m.confidence * 100).toFixed(0)}% confiança
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
