import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Skeleton — shimmer placeholder per design-system.md §10.9.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-neutral-100",
        "before:absolute before:inset-0",
        "before:bg-gradient-to-r before:from-transparent before:via-neutral-200/60 before:to-transparent",
        "before:animate-shimmer before:bg-[length:200%_100%]",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
