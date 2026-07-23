import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full resize-none rounded-[var(--radius-sm)] border border-line-strong bg-surface px-3.5 py-3 text-[15px] text-ink placeholder:text-muted focus-visible:border-primary",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
