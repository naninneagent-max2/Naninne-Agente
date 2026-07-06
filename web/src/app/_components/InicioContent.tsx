"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Paperclip,
  Mic,
  ArrowUp,
  Sparkles,
  Clock,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QUICK_ACTIONS } from "@/data/quick-actions";
import { cn } from "@/lib/utils";

/**
 * Início — "Command Hub" of Naninne.
 * Server-rendered structure + client-side animations only.
 * Per mockup 01-inicio.html: hero with big input, 6 quick actions, "Continue" section.
 */

const CONTINUE_ITEMS = [
  {
    id: "c1",
    title: "O Príncipe — Cap. IV (rascunho)",
    sub: "Poder invisível — 8 páginas",
    project: "escrita" as const,
    when: "há 3 horas",
    progress: 0.62,
  },
  {
    id: "c2",
    title: "O INVISÍVEL — Cena 07",
    sub: "Memória da avó no corredor",
    project: "audiovisual" as const,
    when: "ontem",
    progress: 0.34,
  },
  {
    id: "c3",
    title: "Relatório Pecuária 2025 Q4",
    sub: "Análise de exportações — 12 gráficos",
    project: "mercado" as const,
    when: "há 2 dias",
    progress: 0.88,
  },
];

const projectStyles: Record<"escrita" | "audiovisual" | "mercado", string> = {
  escrita: "bg-writing-100 text-writing-700",
  audiovisual: "bg-av-100 text-av-700",
  mercado: "bg-mkt-100 text-mkt-700",
};

export function InicioContent() {
  return (
    <div className="mx-auto max-w-[920px] px-6 py-10 pb-24 md:px-12 md:py-12">
      {/* Memory strip */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6 flex items-center justify-center gap-2 text-caption text-neutral-500"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
        <span>Memórias carregadas: 12</span>
        <span className="text-neutral-300" aria-hidden="true">•</span>
        <span>Última conversa: 3h atrás</span>
      </motion.div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8 text-center"
      >
        <h1 className="text-display text-neutral-900">O que você quer fazer hoje?</h1>
        <p className="mt-2 text-body-lg text-neutral-600">
          Peça em uma frase. Naninne entende, consulta sua biblioteca e entrega.
        </p>
      </motion.div>

      {/* Chat card */}
      <ChatInputCard />

      {/* Quick actions */}
      <section className="mt-8" aria-labelledby="qa-title">
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="qa-title"
            className="flex items-center gap-2 text-h4 font-semibold text-neutral-900"
          >
            <Sparkles className="h-4 w-4 text-primary-500" />
            Ações rápidas
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_ACTIONS.map((qa, i) => {
            const Icon = qa.icon;
            const palette = {
              writing: "bg-writing-100 text-writing-700",
              av: "bg-av-100 text-av-700",
              mkt: "bg-mkt-100 text-mkt-700",
              tech: "bg-tech-100 text-tech-700",
            }[qa.project];

            return (
              <motion.button
                key={qa.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -2 }}
                className="group flex items-center gap-3.5 rounded-lg border border-neutral-200 bg-card p-4 text-left shadow-elevation-1 transition-shadow hover:border-primary-200 hover:shadow-elevation-2"
                aria-label={`${qa.label} — ${qa.sub}`}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
                    palette
                  )}
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-medium text-neutral-900">
                    {qa.label}
                  </span>
                  <span className="mt-0.5 block truncate text-caption text-neutral-500">
                    {qa.sub}
                  </span>
                </span>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Continue section */}
      <section className="mt-12" aria-labelledby="continue-title">
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="continue-title"
            className="flex items-center gap-2 text-h4 font-semibold text-neutral-900"
          >
            <Clock className="h-4 w-4 text-neutral-500" />
            Continuar de onde parou
            <span className="text-body-sm font-normal text-neutral-500">(3)</span>
          </h2>
          <a
            href="/biblioteca"
            className="inline-flex items-center gap-0.5 text-caption font-medium text-primary-500 hover:underline"
          >
            Ver tudo
            <ChevronRight className="h-3.5 w-3.5" />
          </a>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CONTINUE_ITEMS.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card variant="hover-elevate" className="h-full">
                <CardContent className="flex h-full flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      className={cn("border-0", projectStyles[item.project])}
                      size="sm"
                    >
                      {item.project === "escrita"
                        ? "Escrita"
                        : item.project === "audiovisual"
                        ? "Audiovisual"
                        : "Mercado"}
                    </Badge>
                    <span className="text-caption text-neutral-500">{item.when}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-body font-semibold text-neutral-900">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-body-sm text-neutral-600">{item.sub}</p>
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-caption text-neutral-500">
                      <span className="inline-flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Progresso
                      </span>
                      <span>{Math.round(item.progress * 100)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full bg-primary-500"
                        style={{ width: `${item.progress * 100}%` }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ChatInputCard() {
  const [value, setValue] = React.useState("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl border border-neutral-200 bg-card p-2 shadow-elevation-3 transition-shadow hover:shadow-elevation-4"
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={`Ex: "Cruze minhas anotações sobre 'poder invisível' com O Príncipe e escreva 8 páginas no tom do cap. III"`}
        rows={3}
        aria-label="Pedido para Naninne"
        className="w-full resize-none rounded-lg bg-transparent px-4 py-3 text-body-lg text-neutral-900 placeholder:text-neutral-500 focus:outline-none"
      />
      <div className="mt-1 flex items-center gap-1 border-t border-neutral-200 px-2 pt-2">
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="sm" disabled className="gap-1.5">
            <Paperclip className="h-4 w-4" />
            Anexar
          </Button>
          <Button variant="ghost" size="sm" disabled className="gap-1.5">
            <Sparkles className="h-4 w-4" />
            Modo
          </Button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-caption text-neutral-500 sm:inline">
            {value.length} / 4000
          </span>
          <Button
            variant="ghost"
            size="icon"
            disabled
            aria-label="Entrada por voz"
          >
            <Mic className="h-4 w-4" />
          </Button>
          <Button
            disabled={!value.trim()}
            size="md"
            className="gap-1.5"
            aria-label="Enviar pedido"
          >
            Enviar
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
