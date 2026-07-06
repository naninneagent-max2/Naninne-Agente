"use client";

import * as React from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BIBLIOTECA_ITEMS, type FileType, type LibraryItem } from "@/data/biblioteca";
import { cn, formatShortDate } from "@/lib/utils";

/**
 * Biblioteca — universal file library.
 * Per mockup 02-biblioteca.html: search bar, type chips, grid of 20 items.
 * Static for now — no real upload / search (Sprint 1).
 */

const TYPE_FILTERS: { id: "todos" | FileType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "todos", label: "Todos", icon: Filter },
  { id: "pdf", label: "PDFs", icon: FileText },
  { id: "doc", label: "Documentos", icon: FileType2 },
  { id: "audio", label: "Áudios", icon: Music },
  { id: "image", label: "Imagens", icon: ImageIcon },
  { id: "video", label: "Vídeos", icon: Video },
  { id: "text", label: "Textos", icon: StickyNote },
  { id: "web", label: "Web", icon: Globe },
];

const ICON_BY_TYPE: Record<FileType, React.ComponentType<{ className?: string }>> = {
  pdf: FileText,
  audio: Music,
  image: ImageIcon,
  doc: FileType2,
  video: Video,
  web: Globe,
  text: StickyNote,
};

const TYPE_LABELS: Record<FileType, string> = {
  pdf: "PDF",
  audio: "Áudio",
  image: "Imagem",
  doc: "Documento",
  video: "Vídeo",
  web: "Web",
  text: "Texto",
};

const PROJECT_PALETTE: Record<LibraryItem["project"], { bg: string; text: string; label: string }> = {
  escrita: { bg: "bg-writing-100", text: "text-writing-700", label: "Escrita" },
  audiovisual: { bg: "bg-av-100", text: "text-av-700", label: "Audiovisual" },
  mercado: { bg: "bg-mkt-100", text: "text-mkt-700", label: "Mercado" },
  tech: { bg: "bg-tech-100", text: "text-tech-700", label: "Tech" },
  geral: { bg: "bg-neutral-100", text: "text-neutral-700", label: "Geral" },
};

function formatSize(kb: number): string {
  if (kb < 1000) return `${kb} KB`;
  if (kb < 1_000_000) return `${(kb / 1024).toFixed(1)} MB`;
  return `${(kb / 1_048_576).toFixed(2)} GB`;
}

export function BibliotecaContent() {
  const [activeType, setActiveType] = React.useState<(typeof TYPE_FILTERS)[number]["id"]>("todos");
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    let list = BIBLIOTECA_ITEMS;
    if (activeType !== "todos") list = list.filter((i) => i.type === activeType);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activeType, query]);

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10 pb-24 md:px-10 md:py-12">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h1 text-neutral-900">Biblioteca</h1>
          <p className="mt-1 text-body text-neutral-600">
            {BIBLIOTECA_ITEMS.length} arquivos indexados · busca semântica disponível em breve
          </p>
        </div>
        <Button disabled className="gap-1.5">
          <Upload className="h-4 w-4" />
          Enviar arquivos
        </Button>
      </header>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Buscar por nome ou tag…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar na biblioteca"
          className="h-11 pl-10 text-body"
        />
      </div>

      {/* Type chips */}
      <div
        className="mb-6 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Filtrar por tipo"
      >
        {TYPE_FILTERS.map((f) => {
          const Icon = f.icon;
          const active = activeType === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setActiveType(f.id)}
              role="tab"
              aria-selected={active}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-body-sm font-medium transition-colors duration-base",
                active
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item, i) => (
            <LibraryCard key={item.id} item={item} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function LibraryCard({ item, index }: { item: LibraryItem; index: number }) {
  const Icon = ICON_BY_TYPE[item.type];
  const project = PROJECT_PALETTE[item.project];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.3) }}
    >
      <Card variant="hover-elevate" className="h-full">
        <CardContent className="flex h-full flex-col gap-3 p-4">
          <div className="flex items-start gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-600"
              aria-hidden="true"
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-sm font-medium text-neutral-900" title={item.name}>
                {item.name}
              </p>
              <p className="mt-0.5 text-caption text-neutral-500">
                {TYPE_LABELS[item.type]} · {formatSize(item.sizeKb)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              className={cn("border-0", project.bg, project.text)}
              size="sm"
            >
              {project.label}
            </Badge>
            {item.tags.slice(0, 2).map((t) => (
              <Badge key={t} variant="neutral" size="sm">
                #{t}
              </Badge>
            ))}
          </div>

          <div className="mt-auto flex items-center justify-between text-caption text-neutral-500">
            <span>{formatShortDate(item.addedAt)}</span>
            {item.source && <span className="truncate">{item.source}</span>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
        <Search className="h-6 w-6" />
      </div>
      <h3 className="text-h4 font-semibold text-neutral-900">
        Nenhum arquivo encontrado
      </h3>
      <p className="mt-1 max-w-sm text-body-sm text-neutral-600">
        Tente uma busca diferente ou ajuste os filtros. Em breve, busca semântica por significado.
      </p>
    </div>
  );
}
