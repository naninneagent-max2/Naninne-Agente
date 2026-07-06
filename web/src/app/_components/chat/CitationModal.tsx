"use client";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type Citation = {
  library_item_id: string;
  title: string;
  similarity?: number;
  snippet?: string;
  page_reference?: string | null;
  chunk_id?: string | null;
  // Vem da chamada "library/[id]" detail
  // opcional: tipo do arquivo (pdf/docx/text)
  file_type?: string;
};

interface CitationModalProps {
  citation: Citation | null;
  onClose: () => void;
}

export function CitationModal({ citation, onClose }: CitationModalProps) {
  if (!citation) return null;

  const openInBiblioteca = () => {
    if (!citation.library_item_id) return;
    const url = citation.chunk_id
      ? `/biblioteca/${citation.library_item_id}#chunk-${citation.chunk_id}`
      : `/biblioteca/${citation.library_item_id}`;
    window.open(url, "_blank");
  };

  return (
    <AnimatePresence>
      <motion.div
        key="bg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-tooltip bg-black/50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          key="panel"
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-background rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-100 text-primary-700 font-semibold">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-caption uppercase tracking-wide text-muted-foreground">Fonte</p>
                <p className="text-sm font-semibold text-neutral-900 truncate">
                  {citation.title}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-3">
            {citation.page_reference && (
              <div className="flex items-center gap-2 text-caption">
                <span className="text-muted-foreground">Página/Trecho:</span>
                <span className="font-mono text-neutral-700">{citation.page_reference}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-caption">
              <span className="text-muted-foreground">Similaridade:</span>
              <Badge variant="neutral" size="sm">
                {((citation.similarity ?? 0) * 100).toFixed(0)}%
              </Badge>
            </div>
            {citation.snippet && (
              <div className="bg-muted/40 rounded-lg p-3 text-sm text-neutral-800 leading-relaxed border-l-2 border-primary">
                {citation.snippet}
              </div>
            )}
          </div>

          <div className="flex gap-2 px-5 py-3 border-t border-border bg-muted/30">
            <Button variant="ghost" onClick={onClose} className="flex-1">
              Fechar
            </Button>
            <Button onClick={openInBiblioteca} className="flex-1 gap-1.5">
              <ExternalLink className="h-4 w-4" />
              Abrir na Biblioteca
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
