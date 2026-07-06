/* eslint-disable @typescript-eslint/no-unused-vars */
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
  Library,
  Inbox,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  source?: string;
  tags: string[];
};

const TYPE_FILTERS = [
  { id: "todos" as const, label: "Todos", icon: Filter },
  { id: "pdf" as const, label: "PDFs", icon: FileText },
  { id: "doc" as const, label: "Documentos", icon: FileType2 },
  { id: "audio" as const, label: "Áudios", icon: Music },
  { id: "image" as const, label: "Imagens", icon: ImageIcon },
  { id: "video" as const, label: "Vídeos", icon: Video },
  { id: "text" as const, label: "Textos", icon: StickyNote },
  { id: "web" as const, label: "Web", icon: Globe },
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

export function BibliotecaContent() {
  const user = useAuth((s) => s.user);
  const [items, setItems] = React.useState<LibraryItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeType, setActiveType] = React.useState<typeof TYPE_FILTERS[number]["id"]>("todos");
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch("/api/library", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setItems(data.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = React.useMemo(() => {
    let list = items;
    if (activeType !== "todos") list = list.filter((i) => i.type === activeType);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q) || i.tags.some((t) => t.toLowerCase().includes(q)));
    }
    return list;
  }, [items, activeType, query]);

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
            {items.length === 0 ? "Vazia — faça upload para começar" : `${items.length} arquivos indexados`}
          </p>
        </div>
        <Button className="gap-1.5">
          <Upload className="h-4 w-4" />
          Enviar arquivos
        </Button>
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon={Library}
          title="Sua biblioteca está vazia"
          description="Faça upload de PDFs, documentos, áudios, imagens ou vídeos. A busca semântica é ativada automaticamente após a indexação."
          cta={{ label: "Enviar primeiro arquivo" }}
        />
      ) : (
        <>
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input type="search" placeholder="Buscar por nome ou tag..." value={query} onChange={(e) => setQuery(e.target.value)} className="h-11 pl-10" />
          </div>
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
                        <p className="mt-0.5 text-caption text-neutral-500">{TYPE_LABELS[item.type]} · {formatSize(item.size_kb)}</p>
                      </div>
                    </div>
                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.tags.slice(0, 3).map((t) => (
                          <span key={t} className="text-caption text-neutral-500">#{t}</span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
