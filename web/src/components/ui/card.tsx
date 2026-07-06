import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Card — Naninne variants per design-system.md §10.2.
 * Variants: flat | elevated | hover-elevate | clickable
 */
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "flat" | "elevated" | "hover-elevate" | "clickable";
  }
>(({ className, variant = "elevated", ...props }, ref) => {
  const variantClass = {
    flat: "border border-neutral-200 bg-white",
    elevated: "bg-white shadow-elevation-2",
    "hover-elevate":
      "border border-neutral-200 bg-white shadow-elevation-2 hover:shadow-elevation-3 transition-shadow duration-base",
    clickable:
      "border border-neutral-200 bg-white shadow-elevation-1 hover:shadow-elevation-2 transition-shadow duration-base cursor-pointer",
  }[variant];

  return (
    <div
      ref={ref}
      className={cn("rounded-lg text-card-foreground", variantClass, className)}
      {...props}
    />
  );
});
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-4", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h4
      ref={ref}
      className={cn("text-h4 font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-body-sm text-neutral-600", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-4 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center p-4 pt-0", className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
