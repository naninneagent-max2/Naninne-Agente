"use client";

import * as React from "react";

export type Project = {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  description?: string;
  sort_order: number;
};

let cached: Project[] | null = null;
let inflight: Promise<Project[]> | null = null;

export async function fetchProjects(force = false): Promise<Project[]> {
  if (cached && !force) return cached;
  if (inflight && !force) return inflight;
  inflight = fetch("/api/projects", { cache: "no-store" })
    .then((r) => r.json())
    .then((d) => {
      cached = d.projects ?? [];
      return cached!;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useProjects() {
  const [projects, setProjects] = React.useState<Project[]>(cached ?? []);
  const [loading, setLoading] = React.useState(!cached);
  React.useEffect(() => {
    let cancelled = false;
    fetchProjects().then((p) => {
      if (!cancelled) {
        setProjects(p);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return { projects, loading };
}
