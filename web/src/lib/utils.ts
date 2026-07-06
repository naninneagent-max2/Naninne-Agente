import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names intelligently (resolves conflicts).
 * Standard shadcn/ui helper.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a deterministic, harmonious HSL color from a string
 * (used for avatar fallbacks). Always pleasant and accessible.
 */
export function hashToHsl(name: string, saturation = 65, lightness = 60): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

/**
 * Format a date in pt-BR, short form ("12 jun").
 */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
