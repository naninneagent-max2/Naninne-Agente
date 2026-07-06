"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { Inbox, type LucideIcon } from "lucide-react";


type Props = {
  icon?: LucideIcon;
  title: string;
  description: string;
  cta?: { label: string; onClick?: () => void; href?: string };
};

export function EmptyState({ icon: Icon = Inbox, title, description, cta }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center py-16 px-6"
    >
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground mb-4">
        <Icon className="h-8 w-8" />
      </div>
      <h2 className="text-lg font-semibold tracking-tight mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {cta && cta.href && (
        <a
          href={cta.href}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {cta.label}
        </a>
      )}
      {cta && cta.onClick && (
        <button
          onClick={cta.onClick}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {cta.label}
        </button>
      )}
    </motion.div>
  );
}
