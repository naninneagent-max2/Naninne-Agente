/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import * as React from "react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Citation } from "./CitationModal";

interface CitationFooterProps {
  sources: Citation[];
  onCiteClick: (citation: Citation, index: number) => void;
}

export function CitationFooter({ sources, onCiteClick }: CitationFooterProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 pt-2 border-t border-border/50">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5 font-semibold">
        Fontes consultadas
      </p>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((s, i) => (
          <button
            key={i}
            onClick={() => onCiteClick(s, i)}
            className={cn(
              "group inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs hover:bg-primary-100 hover:border-primary-300 transition-colors"
            )}
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white text-[10px] font-semibold">
              {i + 1}
            </span>
            <FileText className="h-3 w-3 text-primary-700" />
            <span className="font-medium text-primary-900 max-w-[180px] truncate">
              {s.title}
            </span>
            <span className="text-caption text-primary-600 group-hover:text-primary-700">
              {((s.similarity ?? 0) * 100).toFixed(0)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
