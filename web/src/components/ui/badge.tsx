import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge — Naninne variants per design-system.md §10.6.
 * Variants include semantic + project palettes.
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 text-caption font-medium transition-colors",
  {
    variants: {
      variant: {
        neutral: "bg-neutral-100 text-neutral-700",
        writing: "bg-writing-100 text-writing-700",
        av: "bg-av-100 text-av-700",
        mkt: "bg-mkt-100 text-mkt-700",
        tech: "bg-tech-100 text-tech-700",
        success: "bg-success-soft-bg text-success-soft-text",
        warning: "bg-warning-soft-bg text-warning-soft-text",
        error: "bg-error-soft-bg text-error-soft-text",
        info: "bg-info-soft-bg text-info-soft-text",
        outline: "border border-neutral-300 bg-transparent text-neutral-700",
      },
      size: {
        sm: "h-5 px-2 text-[11px]",
        md: "h-6 px-3 text-caption",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
