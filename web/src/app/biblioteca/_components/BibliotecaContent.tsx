/* eslint-disable @typescript-eslint/no-unused-vars, react/no-unescaped-entities */
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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/lib/store/auth";
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
};

type SearchResult = {
  chunk_id: string;
  library_item_id: string;
  content: string;
  similarity: number;
  item: { id: string; title: string; format: string; mime_type: string } | null;
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
  if (kb < 1000) return `${kb} KB`;
  if (kb < 1_000_000) return `${(kb / 1024).toFixed(1)} MB`;
  return `${(kb / 1_048_576).toFixed(2)} GB`;
}

const ACCEPT = ".pdf,.txt,.md,.csv,.json,.docx,application/pdf,text/plain,text/markdown,text/csv,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function BibliotecaContent() {
  const user = useAuth((s) => s.user);
  const [items, setItems] = React.useState<LibraryItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeType, setActiveType] = React.useState<typeof TYPE_FILTERS[number]["id"]>("todos");
  const [query, setQuery] = React.useState("");

  // Upload state
  const [uploading, setUploading] = React.useState<{ name: string; status: string; error?: string } | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Search state
  const [searching, setSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<SearchResult[] | null>(null);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

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
      setUploading({ name: file.name, status: "enviando..." });
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/library/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (data.ok) {
          setUploading({
            name: file.name,
            status: `indexado (${data.item.chunks} trechos)`,
          });
          setTimeout(() => setUploading(null), 2500);
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
          disabled={uploading !== null}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Enviando..." : "Enviar arquivos"}
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

      {/* Upload status toast */}
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
                : uploading.status.includes("indexado")
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-blue-200 bg-blue-50 text-blue-700"
            )}
          >
            {uploading.error ? (
              <AlertCircle className="h-4 w-4" />
            ) : uploading.status.includes("indexado") ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            <span className="flex-1 truncate">
              <strong>{uploading.name}</strong> — {uploading.status}
              {uploading.error && `: ${uploading.error}`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag-and-drop zone (only when empty) */}
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
            description="Arraste um PDF, DOCX, TXT ou Markdown aqui, ou clique em Enviar arquivos acima. A busca semântica é ativada após a indexação."
            cta={{ label: "Selecionar arquivo", onClick: () => fileInputRef.current?.click() }}
          />
        </div>
      ) : (
        <>
          {/* Search bar */}
          <div className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <Sparkles className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
              <Input
                type="search"
                placeholder="Busca semântica — ex: 'o que esse texto diz sobre poder invisível'"
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

          {/* Search results */}
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
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        )}
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

          {/* Type chips */}
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

          {/* File list (drag-drop area when has items) */}
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
                {filtered.map((item) => (
                  <Card key={item.id} variant="hover-elevate" className="h-full">
                    <CardContent className="flex h-full flex-col gap-3 p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-600">
                          {React.createElement(ICON_BY_TYPE[item.type], { className: "h-5 w-5" })}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-body-sm font-medium text-neutral-900" title={item.name}>{item.name}</p>
                          <p className="mt-0.5 text-caption text-neutral-500">
                            {TYPE_LABELS[item.type]} · {formatSize(item.size_kb)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-auto flex items-center justify-between text-caption text-neutral-500">
                        <span>
                          {item.status === "ready" ? "✓ indexado" : item.status}
                        </span>
                        <span>{new Date(item.added_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
