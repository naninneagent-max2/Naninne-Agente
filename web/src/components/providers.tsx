"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toast";

/**
 * Top-level providers — wrap the app in:
 * - next-themes (dark mode toggle)
 * - Radix Tooltip (single provider, anywhere in tree)
 * - Sonner toaster
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
      <Toaster />
    </ThemeProvider>
  );
}
