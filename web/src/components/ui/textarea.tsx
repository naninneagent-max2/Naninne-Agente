import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-body placeholder:text-neutral-500",
        "transition-all duration-base ease-out",
        "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100",
        "disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
