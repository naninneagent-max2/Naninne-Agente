/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import * as React from "react";
import { Check, Folder, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Project = {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
};

interface ProjectPickerProps {
  projects: Project[];
  value: string | null;
  onChange: (projectId: string | null) => void;
  label?: string;
  allowNone?: boolean;
  noneLabel?: string;
  size?: "sm" | "md";
  className?: string;
}

export function ProjectPicker({
  projects,
  value,
  onChange,
  label = "Projeto",
  allowNone = true,
  noneLabel = "Sem projeto",
  size = "md",
  className,
}: ProjectPickerProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const selected = projects.find((p) => p.id === value);

  return (
    <div className={cn("relative", className)} ref={ref}>
      {label && (
        <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
          <Folder className="h-3.5 w-3.5 text-muted-foreground" />
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:border-primary/50 transition-colors",
          size === "sm" && "text-xs py-1.5"
        )}
      >
        {selected ? (
          <>
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: selected.color }}
            />
            <span className="font-medium truncate">{selected.name}</span>
          </>
        ) : (
          <>
            <Folder className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{noneLabel}</span>
          </>
        )}
        <span className="ml-auto text-muted-foreground">▾</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg overflow-hidden">
          {allowNone && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left",
                value === null && "bg-muted"
              )}
            >
              <Folder className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{noneLabel}</span>
              {value === null && <Check className="h-3.5 w-3.5 ml-auto" />}
            </button>
          )}
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onChange(p.id);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left",
                value === p.id && "bg-muted"
              )}
            >
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: p.color }}
              />
              <span className="flex-1 truncate">{p.name}</span>
              {value === p.id && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Badge display for showing project on items
export function ProjectBadge({ project, className }: { project: Project | null; className?: string }) {
  if (!project) return null;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs font-medium", className)}
      style={{ color: project.color }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: project.color }}
      />
      {project.name}
    </span>
  );
}
