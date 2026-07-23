import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "accent" | "muted" | "danger";
}) {
  const styles = {
    default: "bg-primary-soft text-primary",
    accent: "bg-accent-soft text-accent",
    muted: "bg-black/[0.04] text-ink-soft",
    danger: "bg-danger-soft text-danger",
  }[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        styles,
        className
      )}
      {...props}
    />
  );
}
