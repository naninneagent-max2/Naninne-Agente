"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, Library, FileText, Brain, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * RightPanel — 320px. "Painel da IA" showing agent progress cards.
 * Per master-doc §4 and design-system.md.
 * Static for now: 4 cards. Will become live in Sprint 1.
 */
type StepState = "done" | "active" | "pending";

interface Step {
  id: string;
  label: string;
  state: StepState;
  detail?: string;
  icon: "check" | "library" | "files" | "compose";
}

const DEFAULT_STEPS: Step[] = [
  { id: "s1", label: "Pedido entendido", state: "done", icon: "check" },
  { id: "s2", label: "Biblioteca consultada", state: "done", icon: "library" },
  { id: "s3", label: "4 arquivos encontrados", state: "done", icon: "files" },
  { id: "s4", label: "Compor resposta final", state: "active", icon: "compose" },
];

const ICON_MAP = {
  check: CheckCircle2,
  library: Library,
  files: FileText,
  compose: Loader2,
} as const;

interface RightPanelProps {
  steps?: Step[];
}

export function RightPanel({ steps = DEFAULT_STEPS }: RightPanelProps) {
  return (
    <aside
      className="hidden w-right-panel shrink-0 border-l border-neutral-200 bg-background xl:block"
      aria-label="Painel da IA"
    >
      <div className="sticky top-topbar flex h-[calc(100vh-var(--topbar-h))] flex-col">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <div>
            <h3 className="text-h4 font-semibold text-neutral-900">Painel da IA</h3>
            <p className="text-caption text-neutral-500">
              Acompanhe o trabalho dos agentes
            </p>
          </div>
          <button
            disabled
            className="text-caption font-medium text-primary-500 disabled:opacity-50"
            aria-label="Ver detalhes técnicos"
          >
            <span className="inline-flex items-center gap-0.5">
              Ver detalhes
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Progresso
          </p>
          <ol className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {steps.map((step, i) => (
                <StepCard key={step.id} step={step} index={i} />
              ))}
            </AnimatePresence>
          </ol>

          <p className="mb-3 mt-6 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Memória usada
          </p>
          <MemoryCard />

          <p className="mb-3 mt-6 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Custo estimado
          </p>
          <CostCard />
        </div>
      </div>
    </aside>
  );
}

function StepCard({ step, index }: { step: Step; index: number }) {
  const Icon = ICON_MAP[step.icon];
  const isActive = step.state === "active";
  const isDone = step.state === "done";

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex items-center gap-3 rounded-md border p-3 text-body-sm",
        isDone && "border-success-soft-border bg-success-soft-bg",
        isActive && "border-primary-200 bg-primary-50",
        step.state === "pending" && "border-neutral-200 bg-card"
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          isDone && "bg-success text-white",
          isActive && "bg-primary-500 text-white",
          step.state === "pending" && "bg-neutral-100 text-neutral-400"
        )}
        aria-hidden="true"
      >
        <Icon className={cn("h-4 w-4", isActive && "animate-spin")} />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-medium",
            isDone && "text-success-soft-text",
            isActive && "text-primary-700",
            step.state === "pending" && "text-neutral-500"
          )}
        >
          {step.label}
        </p>
        {step.detail && (
          <p className="mt-0.5 text-caption text-neutral-500">{step.detail}</p>
        )}
      </div>
    </motion.li>
  );
}

function MemoryCard() {
  return (
    <div className="flex items-start gap-3 rounded-md border border-neutral-200 bg-card p-3">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-100 text-primary-700"
        aria-hidden="true"
      >
        <Brain className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body-sm font-medium text-neutral-900">
          Tom literário, projeto livro
        </p>
        <p className="mt-0.5 text-caption text-neutral-500">
          Última atualização há 3 horas
        </p>
      </div>
    </div>
  );
}

function CostCard() {
  return (
    <div className="rounded-md border border-neutral-200 bg-card p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-h4 font-semibold text-neutral-900">$0,42</span>
        <span className="text-caption text-neutral-500">de ~$1,20</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full w-[35%] rounded-full bg-primary-500"
          aria-hidden="true"
        />
      </div>
      <p className="mt-1.5 text-caption text-neutral-500">
        Gemini 2M input + Claude Sonnet
      </p>
    </div>
  );
}
