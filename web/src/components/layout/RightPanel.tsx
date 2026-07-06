/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  Library,
  Brain,
  Eye,
  PenLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgents, type AgentName } from "@/lib/store/agents";

/**
 * RightPanel — 320px. "Painel da IA" showing real-time agent progress.
 * Reads from the agent store updated by InicioContent during a chat turn.
 */
const ICON_MAP: Record<AgentName, React.ComponentType<{ className?: string }>> = {
  memoria: Brain,
  bibliotecario: Library,
  leitor: Eye,
  orquestrador: PenLine,
  revisor: ShieldCheck,
};

export function RightPanel() {
  const steps = useAgents((s) => s.steps);
  const isActive = useAgents((s) => s.isActive);
  const sources = useAgents((s) => s.sources);
  const tokensIn = useAgents((s) => s.tokensIn);
  const tokensOut = useAgents((s) => s.tokensOut);
  const cost = useAgents((s) => s.cost);

  const doneCount = steps.filter((s) => s.state === "done").length;
  const isAllDone = doneCount === steps.length && !isActive;

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
              {isActive
                ? "Equipe trabalhando..."
                : isAllDone
                ? "Última operação concluída"
                : "Aguardando seu próximo pedido"}
            </p>
          </div>
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

          {sources.length > 0 && (
            <>
              <p className="mb-3 mt-6 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Fontes consultadas
              </p>
              <div className="space-y-2">
                {sources.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-md border border-neutral-200 bg-card p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-100 text-primary-700 text-xs font-semibold">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-sm font-medium text-neutral-900">
                        {s.title}
                      </p>
                      <p className="text-caption text-neutral-500">
                        {((s.similarity ?? 0) * 100).toFixed(0)}% de similaridade
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {(tokensIn > 0 || tokensOut > 0) && (
            <>
              <p className="mb-3 mt-6 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Custo da operação
              </p>
              <div className="rounded-md border border-neutral-200 bg-card p-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-h4 font-semibold text-neutral-900">
                    ${cost.toFixed(4)}
                  </span>
                  <span className="text-caption text-neutral-500">
                    {tokensIn + tokensOut} tokens
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-caption text-neutral-500">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{tokensIn} in + {tokensOut} out</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

function StepCard({ step, index }: { step: ReturnType<typeof useAgents.getState>["steps"][number]; index: number }) {
  const Icon = ICON_MAP[step.agent] ?? PenLine;
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
        step.state === "pending" && "border-neutral-200 bg-card opacity-60"
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
        {isActive ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isDone ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
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
