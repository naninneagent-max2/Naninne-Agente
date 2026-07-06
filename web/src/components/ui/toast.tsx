"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "next-themes";

/**
 * Toast — wraps `sonner` with Naninne design tokens.
 * Per design-system.md §10.5: top-right, 360px, radius-md, slide-down on enter.
 */
export function Toaster() {
  const { theme } = useTheme();
  return (
    <SonnerToaster
      position="top-right"
      theme={theme as "light" | "dark" | "system"}
      richColors
      closeButton
      toastOptions={{
        style: {
          background: "var(--card)",
          color: "var(--card-foreground)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          fontSize: "13px",
          padding: "12px 16px",
        },
      }}
    />
  );
}
