import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-[var(--radius-sm)] border border-line-strong bg-surface px-3.5 text-[15px] text-ink placeholder:text-muted focus-visible:border-primary",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
