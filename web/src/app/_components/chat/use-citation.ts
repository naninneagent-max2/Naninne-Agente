/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import * as React from "react";
import type { Citation } from "./CitationModal";

type ChunkInfo = {
  id: string;
  page_reference?: string | null;
  content?: string;
  similarity?: number;
};

export function useCitationDetails(citation: Citation | null) {
  const [snippet, setSnippet] = React.useState<string | null>(null);
  const [page, setPage] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!citation || !citation.library_item_id) {
      setSnippet(null);
      setPage(null);
      return;
    }
    setLoading(true);
    let cancelled = false;
    fetch(`/api/library/${citation.library_item_id}/chunks`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const chunks: ChunkInfo[] = d.chunks ?? [];
        // Pick the chunk with highest similarity, or first
        const target = chunks.length > 0
          ? chunks.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))[0]
          : null;
        if (target) {
          setSnippet(target.content?.slice(0, 400) ?? null);
          setPage(target.page_reference ?? null);
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [citation?.library_item_id]);

  return { snippet, page, loading };
}
