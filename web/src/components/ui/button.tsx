import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Button — Naninne variants per design-system.md §10.1.
 * Variants: primary | secondary | ghost | danger
 * Sizes:    sm (32px) | md (40px) | lg (48px)
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-body font-medium transition-all duration-base ease-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-primary-500 text-white shadow-elevation-1 hover:bg-primary-600 active:bg-primary-700",
        secondary:
          "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100",
        ghost: "text-neutral-700 hover:bg-neutral-100",
        danger: "bg-error text-white hover:opacity-90",
        outline:
          "border border-neutral-300 bg-transparent text-neutral-700 hover:bg-neutral-100",
        link: "text-primary-500 underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-body-sm",
        md: "h-10 px-4 text-body",
        lg: "h-12 px-6 text-body-lg",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
