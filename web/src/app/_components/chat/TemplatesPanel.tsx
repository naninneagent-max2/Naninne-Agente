/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import * as React from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { TEMPLATES } from "./templates/catalog";
import { cn } from "@/lib/utils";

interface TemplatesPanelProps {
  onPick: (prompt: string) => void;
  activeProjectSlug?: string | null;
  className?: string;
}

export function TemplatesPanel({ onPick, activeProjectSlug, className }: TemplatesPanelProps) {
  const [expanded, setExpanded] = React.useState(false);

  const all = React.useMemo(() => {
    if (!activeProjectSlug) return TEMPLATES;
    return TEMPLATES.filter((t) => !t.projectSlug || t.projectSlug === activeProjectSlug);
  }, [activeProjectSlug]);

  const featured = activeProjectSlug
    ? all.filter((t) => t.projectSlug === activeProjectSlug).slice(0, 4)
    : all.slice(0, 4);

  const visible = expanded ? all : featured;

  return (
    <div className={cn("rounded-lg border border-border bg-card/50 p-2.5", className)}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wide">
          <Sparkles className="h-3.5 w-3.5" />
          Atalhos rápidos
        </span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {visible.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-1.5 mt-2">
          {visible.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t.prompt)}
              className="group text-left p-2 rounded-md border border-border hover:border-primary/40 hover:bg-accent transition-colors"
            >
              <div className="text-lg mb-0.5">{t.icon}</div>
              <div className="text-xs font-medium text-foreground truncate">{t.label}</div>
              <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                {t.description}
              </div>
            </button>
          ))}
        </div>
      )}

      {!expanded && all.length > featured.length && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full text-center"
        >
          + {all.length - featured.length} atalhos
        </button>
      )}
    </div>
  );
}
