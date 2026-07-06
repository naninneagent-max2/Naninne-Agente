"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Construction,
  Sparkles,
  Calendar,
  TrendingUp,
  FileText,
  Brain,
  Wrench,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Reusable placeholder for Sprint 0 — pages that exist in nav but are not yet implemented.
 * Per master-doc §7: Sprint 4 (Mercado) / Sprint 1 (Demais) — clearly communicates the status.
 *
 * NOTE: pages stay as Server Components; the icon is identified by string name and
 * resolved client-side from a fixed registry (avoids passing functions across the RSC
 * boundary).
 */
const ICONS: Record<string, LucideIcon> = {
  Construction,
  TrendingUp,
  FileText,
  Brain,
  Wrench,
  Settings,
};

export function PagePlaceholder({
  title,
  subtitle,
  description,
  sprint,
  iconName = "Construction",
  features = [],
}: {
  title: string;
  subtitle: string;
  description: string;
  sprint: string;
  iconName?: keyof typeof ICONS;
  features?: string[];
}) {
  const Icon = ICONS[iconName] ?? Construction;

  return (
    <div className="px-6 py-10 pb-24 md:px-10 md:py-12">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <header className="mb-8">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="info" size="sm">
                <Calendar className="mr-1 h-3 w-3" />
                {sprint}
              </Badge>
            </div>
            <h1 className="text-h1 text-neutral-900">{title}</h1>
            <p className="mt-1 text-body-lg text-neutral-600">{subtitle}</p>
          </header>

          <Card variant="elevated" className="mb-6">
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-500">
                <Icon className="h-7 w-7" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-h2 text-neutral-900">Em construção</h2>
                <p className="mt-2 max-w-md text-body text-neutral-600">
                  {description}
                </p>
              </div>
            </CardContent>
          </Card>

          {features.length > 0 && (
            <Card variant="flat">
              <div className="border-b border-neutral-200 p-4">
                <h3 className="flex items-center gap-2 text-h4 font-semibold text-neutral-900">
                  <Sparkles className="h-4 w-4 text-primary-500" />
                  O que virá aqui
                </h3>
              </div>
              <ul className="divide-y divide-neutral-100">
                {features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-3 px-4 py-3 text-body text-neutral-700"
                  >
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500"
                      aria-hidden="true"
                    />
                    {f}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}
