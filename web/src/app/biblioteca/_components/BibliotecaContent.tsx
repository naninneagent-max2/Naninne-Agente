/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react/no-unescaped-entities */
/* eslint-disable react/no-unescaped-entities */
"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  FileText,
  Music,
  Image as ImageIcon,
  Video,
  FileType2,
  Globe,
  StickyNote,
  Upload,
  Filter,
  Library as LibraryIcon,
  Sparkles,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/lib/store/auth";
import { LibraryDetail } from "./LibraryDetail";
import { cn } from "@/lib/utils";

type LibraryItem = {
  id: string;
  name: string;
  type: "pdf" | "audio" | "image" | "doc" | "video" | "web" | "text";
  project: string | null;
  size_kb: number;
  added_at: string;
  tags: string[];
  status: string;
  error_message?: string;
  metadata?: {
    chunk_count?: number;
    text_length?: number;
    pages?: number;
  };
};

type SearchResult = {
  chunk_id: string;
  library_item_id: string;
  content: string;
  similarity: number;
  item: { id: string; title: string;  mime_type: string } | null;
};

const TYPE_FILTERS = [
  { id: "todos" as const, label: "Todos", icon: Filter },
  { id: "pdf" as const, label: "PDFs", icon: FileText },
  { id: "doc" as const, label: "Documentos", icon: FileType2 },
  { id: "text" as const, label: "Textos", icon: StickyNote },
];

const ICON_BY_TYPE: Record<LibraryItem["type"], React.ComponentType<{ className?: string }>> = {
  pdf: FileText, audio: Music, image: ImageIcon, doc: FileType2, video: Video, web: Globe, text: StickyNote,
};

const TYPE_LABELS: Record<LibraryItem["type"], string> = {
  pdf: "PDF", audio: "Áudio", image: "Imagem", doc: "Documento", video: "Vídeo", web: "Web", text: "Texto",
};

function formatSize(kb: number): string {
  if (kb < 1000) return `${Math.max(0, kb)} KB`;
  if (kb < 1_000_000) return `${(kb / 1024).toFixed(1)} MB`;
  return `${(kb / 1_048_576).toFixed(2)} GB`;
}

const STATUS_STYLES: Record<string, { label: string; class: string; icon: React.ComponentType<{ className?: string }> }> = {
  ready: { label: "Indexado", class: "bg-green-100 text-green-700", icon: CheckCircle2 },
  processing: { label: "Processando", class: "bg-blue-100 text-blue-700", icon: Loader2 },
  pending: { label: "Pendente", class: "bg-neutral-100 text-neutral-700", icon: Loader2 },
  failed: { label: "Falhou", class: "bg-red-100 text-red-700", icon: AlertCircle },
  archived: { label: "Arquivado", class: "bg-neutral-100 text-neutral-500", icon: FileText },
};

const ACCEPT = ".pdf,.txt,.md,.csv,.json,.docx,application/pdf,text/plain,text/markdown,text/csv,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function BibliotecaContent() {
  const user = useAuth((s) => s.user);
  const [items, setItems] = React.useState<LibraryItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeType, setActiveType] = React.useState<typeof TYPE_FILTERS[number]["id"]>("todos");
  const [query, setQuery] = React.useState("");

  // Upload state
  const [uploading, setUploading] = React.useState<{ name: string; status: string; error?: string; itemId?: string }[]>([]);
  const [dragActive, setDragActive] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Search state
  const [searching, setSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<SearchResult[] | null>(null);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  // Detail view
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const reload = React.useCallback(() => {
    if (!user) return;
    setLoading(true);
    fetch("/api/library", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setItems(data.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [user]);

  React.useEffect(() => { reload(); }, [reload]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const tempId = `up-${Date.now()}-${Math.random()}`;
      setUploading((u) => [...u, { name: file.name, status: "enviando..." }]);

      // Re-check it was actually added with tempId
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/library/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (data.ok) {
          setUploading((u) => u.map((x) => x.name === file.name && x.status === "enviando..." ? { ...x, status: `indexado (${data.item.chunks} trechos)`, itemId: data.item.id } : x));
          setTimeout(() => {
            setUploading((u) => u.filter((x) => x.itemId !== data.item.id));
          }, 3000);
          reload();
        } else {
          setUploading((u) => u.map((x) => x.name === file.name && x.status === "enviando..." ? { ...x, status: "erro", error: data.error } : x));
          setTimeout(() => {
            setUploading((u) => u.filter((x) => x.status !== "erro"));
          }, 8000);
        }
      } catch (err) {
        setUploading((u) => u.map((x) => x.name === file.name && x.status === "enviando..." ? { ...x, status: "erro", error: "rede" } : x));
      }
    }
  }

  async function doSearch() {
    const q = query.trim();
    if (!q || items.length === 0) return;
    setSearching(true);
    setSearchResults(null);
    try {
      const res = await fetch("/api/library/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, top_k: 5 }),
      });
      const data = await res.json();
      setSearchResults(data.results ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  const filtered = React.useMemo(() => {
    let list = items;
    if (activeType !== "todos") list = list.filter((i) => i.type === activeType);
    if (query.trim() && !searchResults) {
      const q = query.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q));
    }
    return list;
  }, [items, activeType, query, searchResults]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        Carregando biblioteca...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10 pb-24 md:px-10 md:py-12">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h1 text-neutral-900">Biblioteca</h1>
          <p className="mt-1 text-body text-neutral-600">
            {items.length === 0 ? "Vazia — faça upload para começar" : `${items.length} ${items.length === 1 ? "arquivo" : "arquivos"} indexados`}
          </p>
        </div>
        <Button
          className="gap-1.5"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading.some((u) => u.status === "enviando...")}
        >
          {uploading.some((u) => u.status === "enviando...") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Enviar arquivos
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </header>

      {/* Upload status toasts */}
      <AnimatePresence>
        {uploading.map((u, i) => {
          const isError = u.status === "erro";
          const isSuccess = u.status.includes("indexado");
          return (
            <motion.div
              key={`${u.name}-${i}`}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className={cn(
                "mb-2 rounded-lg border p-3 flex items-center gap-2 text-sm",
                isError
                  ? "border-red-200 bg-red-50 text-red-700"
                  : isSuccess
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-blue-200 bg-blue-50 text-blue-700"
              )}
            >
              {isError ? <AlertCircle className="h-4 w-4 shrink-0" /> :
                isSuccess ? <CheckCircle2 className="h-4 w-4 shrink-0" /> :
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="truncate"><strong>{u.name}</strong> — {u.status}</p>
                {u.error && <p className="text-xs mt-0.5">{u.error}</p>}
              </div>
              {isError && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setUploading((arr) => arr.filter((_, idx) => idx !== i))}
                  className="shrink-0"
                >
                  Fechar
                </Button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {items.length === 0 ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "rounded-2xl border-2 border-dashed p-12 text-center transition-colors",
            dragActive ? "border-primary bg-primary/5" : "border-border"
          )}
        >
          <EmptyState
            icon={LibraryIcon}
            title="Sua biblioteca está vazia"
            description="Arraste um PDF, DOCX, TXT ou Markdown aqui, ou clique em Enviar arquivos acima. Suportamos até 50MB por arquivo."
            cta={{ label: "Selecionar arquivo", onClick: () => fileInputRef.current?.click() }}
          />
        </div>
      ) : (
        <>
          <div className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <Sparkles className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
              <Input
                type="search"
                placeholder='Busca semântica — ex: "o que esse texto diz sobre poder invisível"'
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (!e.target.value) setSearchResults(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
                className="h-11 pl-10 pr-10"
              />
              {query && (
                <button
                  onClick={() => { setQuery(""); setSearchResults(null); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button onClick={doSearch} disabled={searching || !query.trim()} className="gap-1.5">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar
            </Button>
          </div>

          {searchResults && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>{searchResults.length} trechos relevantes para "{query}"</span>
                </div>
                <button onClick={() => setSearchResults(null)} className="text-xs text-muted-foreground hover:text-foreground">
                  limpar
                </button>
              </div>
              <div className="space-y-2">
                {searchResults.map((r, i) => {
                  const isOpen = expanded.has(r.chunk_id);
                  return (
                    <div
                      key={r.chunk_id}
                      className="bg-background rounded-lg border p-3 hover:border-primary/40 transition-colors cursor-pointer"
                      onClick={() => {
                        setExpanded((s) => {
                          const next = new Set(s);
                          if (next.has(r.chunk_id)) next.delete(r.chunk_id);
                          else next.add(r.chunk_id);
                          return next;
                        });
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-primary">[{i + 1}]</span>
                            <span className="text-sm font-medium truncate">{r.item?.title ?? "Arquivo"}</span>
                            <Badge variant="neutral" size="sm" className="ml-auto">
                              {(r.similarity * 100).toFixed(0)}% match
                            </Badge>
                          </div>
                          <p className={cn("text-sm text-muted-foreground", isOpen ? "" : "line-clamp-2")}>
                            {r.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          <div className="mb-6 flex flex-wrap gap-2">
            {TYPE_FILTERS.map((f) => {
              const Icon = f.icon;
              const active = activeType === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveType(f.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-body-sm font-medium transition-colors",
                    active ? "border-primary-500 bg-primary-50 text-primary-700" : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />{f.label}
                </button>
              );
            })}
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={cn(
              "rounded-2xl border-2 border-dashed p-1 transition-colors",
              dragActive ? "border-primary bg-primary/5" : "border-transparent"
            )}
          >
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Nenhum arquivo corresponde ao filtro.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((item) => {
                  const statusMeta = STATUS_STYLES[item.status] ?? STATUS_STYLES.ready;
                  const StatusIcon = statusMeta.icon;
                  return (
                    <Card
                      key={item.id}
                      variant="hover-elevate"
                      className="h-full cursor-pointer"
                      onClick={() => setDetailId(item.id)}
                    >
                      <CardContent className="flex h-full flex-col gap-3 p-4">
                        <div className="flex items-start gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-600">
                            {React.createElement(ICON_BY_TYPE[item.type] ?? FileText, { className: "h-5 w-5" })}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-body-sm font-medium text-neutral-900" title={item.name}>
                              {item.name}
                            </p>
                            <p className="mt-0.5 text-caption text-neutral-500">
                              {TYPE_LABELS[item.type]} · {formatSize(item.size_kb)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-auto flex items-center justify-between text-caption">
                          <Badge className={cn("border-0 gap-1", statusMeta.class)} size="sm">
                            <StatusIcon className={cn("h-3 w-3", item.status === "processing" && "animate-spin")} />
                            {statusMeta.label}
                          </Badge>
                          <span className="text-muted-foreground">
                            {new Date(item.added_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        {item.metadata?.chunk_count !== undefined && (
                          <p className="text-caption text-muted-foreground">
                            {item.metadata.chunk_count} trechos · {item.metadata.text_length?.toLocaleString("pt-BR")} chars
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {detailId && (
        <LibraryDetail
          itemId={detailId}
          onClose={() => setDetailId(null)}
          onDeleted={() => reload()}
        />
      )}
    </div>
  );
}
