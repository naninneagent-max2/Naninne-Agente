"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Plus, FileText, MoreHorizontal, BookOpen, Sparkles, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatShortDate } from "@/lib/utils";

/**
 * Escrita Criativa — book editor with Tabs.
 * Per mockup 04-escrita.html: Projeto / Capítulos / Anotações / Estilo / Exportar.
 * Static for now — TipTap editor will be wired in Sprint 1.
 */

const TABS = [
  { id: "projeto", label: "Projeto" },
  { id: "capitulos", label: "Capítulos" },
  { id: "anotacoes", label: "Anotações" },
  { id: "estilo", label: "Estilo" },
  { id: "exportar", label: "Exportar" },
] as const;

const CHAPTERS = [
  { num: 1, title: "Prólogo — A biblioteca como máquina do tempo", status: "finalizado", words: 3840, updated: "2026-06-12" },
  { num: 2, title: "Capítulo I — O peso da herança", status: "finalizado", words: 5210, updated: "2026-06-18" },
  { num: 3, title: "Capítulo II — Encontros na Casa de Memória", status: "finalizado", words: 4720, updated: "2026-06-22" },
  { num: 4, title: "Capítulo III — Memórias que não se apagam", status: "finalizado", words: 6890, updated: "2026-06-28" },
  { num: 5, title: "Capítulo IV — O poder invisível", status: "em-rascunho", words: 3120, updated: "2026-07-04" },
  { num: 6, title: "Capítulo V — A viagem sem volta", status: "pendente", words: 0, updated: null },
  { num: 7, title: "Capítulo VI — Casa vazia, casa cheia", status: "pendente", words: 0, updated: null },
  { num: 8, title: "Epílogo — Voltar para começar", status: "pendente", words: 0, updated: null },
] as const;

const STATUS_STYLES: Record<(typeof CHAPTERS)[number]["status"], string> = {
  finalizado: "bg-success-soft-bg text-success-soft-text",
  "em-rascunho": "bg-warning-soft-bg text-warning-soft-text",
  pendente: "bg-neutral-100 text-neutral-600",
};

const STATUS_LABEL: Record<(typeof CHAPTERS)[number]["status"], string> = {
  finalizado: "Finalizado",
  "em-rascunho": "Em rascunho",
  pendente: "Pendente",
};

export function EscritaContent() {
  const [activeTab, setActiveTab] = React.useState<(typeof TABS)[number]["id"]>("capitulos");

  return (
    <div className="px-6 py-10 pb-24 md:px-10 md:py-12">
      <div className="mx-auto max-w-[1100px]">
        {/* Header */}
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Badge className="border-0 bg-writing-100 text-writing-700" size="sm">
                <BookOpen className="mr-1 h-3 w-3" />
                Projeto de escrita
              </Badge>
            </div>
            <h1 className="text-h1 text-neutral-900">O Peso das Coisas Invisíveis</h1>
            <p className="mt-1 text-body text-neutral-600">
              Romance literário · 8 capítulos · 23.780 palavras no total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              Pedir continuação
            </Button>
            <Button disabled className="gap-1.5">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </header>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Seções do projeto"
          className="mb-6 flex items-center gap-1 border-b border-neutral-200"
        >
          {TABS.map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                role="tab"
                aria-selected={active}
                className={cn(
                  "relative px-3 py-2.5 text-body-sm font-medium transition-colors",
                  active ? "text-primary-700" : "text-neutral-600 hover:text-neutral-900"
                )}
              >
                {t.label}
                {active && (
                  <motion.span
                    layoutId="escrita-tab-underline"
                    className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary-500"
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Body — split: chapter list + preview */}
        {activeTab === "capitulos" ? (
          <CapitulosView />
        ) : (
          <PlaceholderTab name={TABS.find((t) => t.id === activeTab)?.label ?? ""} />
        )}
      </div>
    </div>
  );
}

function CapitulosView() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
      {/* Chapter list */}
      <Card variant="flat" className="h-fit">
        <div className="flex items-center justify-between border-b border-neutral-200 p-4">
          <h2 className="text-h4 font-semibold text-neutral-900">Capítulos</h2>
          <Button size="sm" variant="ghost" disabled className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            Novo
          </Button>
        </div>
        <ol className="divide-y divide-neutral-100">
          {CHAPTERS.map((c) => (
            <li
              key={c.num}
              className={cn(
                "group flex cursor-pointer items-start gap-3 p-3 transition-colors hover:bg-neutral-50",
                c.num === 5 && "bg-primary-50/40"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-caption font-semibold",
                  c.status === "finalizado" && "bg-success-soft-bg text-success-soft-text",
                  c.status === "em-rascunho" && "bg-primary-100 text-primary-700",
                  c.status === "pendente" && "bg-neutral-100 text-neutral-500"
                )}
              >
                {c.num}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-medium text-neutral-900">
                  {c.title}
                </p>
                <div className="mt-1 flex items-center gap-1.5 text-caption text-neutral-500">
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      STATUS_STYLES[c.status]
                    )}
                  >
                    {STATUS_LABEL[c.status]}
                  </span>
                  {c.words > 0 && <span>· {c.words.toLocaleString("pt-BR")} palavras</span>}
                </div>
              </div>
              <button
                className="rounded-md p-1 text-neutral-400 opacity-0 transition-opacity hover:bg-neutral-100 hover:text-neutral-700 group-hover:opacity-100"
                aria-label="Ações do capítulo"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ol>
      </Card>

      {/* Preview pane */}
      <Card variant="elevated" className="h-fit p-8">
        <div className="mx-auto max-w-prose">
          <p className="text-caption font-semibold uppercase tracking-wide text-primary-500">
            Capítulo V
          </p>
          <h2 className="mt-1 text-h2 text-neutral-900">O poder invisível</h2>
          <p className="mt-1 text-body-sm text-neutral-500">
            Em rascunho · atualizado em {formatShortDate("2026-07-04")}
          </p>
          <div className="prose prose-neutral mt-6 max-w-none text-body text-neutral-800">
            <p>
              A Casa de Memória guardava mais do que livros — guardava gestos. O
              da avó ajeitando o quadro na parede, o do pai carregando uma caixa
              vazia como se estivesse cheia, o meu, hoje, de abrir uma janela que
              ninguém lembra de ter fechado.
            </p>
            <p>
              A herança, descobri aos trinta e cinco, não se transmite. Ela se
              infiltra. Como luz em um quarto escuro: você não vê de onde vem,
              mas tudo o que toca muda de cor.
            </p>
            <p className="text-neutral-400">
              <em>
                [Editor de texto será ativado na Sprint 1 — Tiptap com modo foco
                e salvamento automático]
              </em>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function PlaceholderTab({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-500">
        <FileText className="h-6 w-6" />
      </div>
      <h3 className="text-h4 font-semibold text-neutral-900">{name}</h3>
      <p className="mt-1 max-w-sm text-body-sm text-neutral-600">
        Esta seção será implementada na Sprint 1. Por enquanto, apenas a aba
        Capítulos é navegável.
      </p>
    </div>
  );
}
