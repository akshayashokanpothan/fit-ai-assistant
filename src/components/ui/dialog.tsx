"use client";

import { ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200" 
        onClick={() => onOpenChange(false)}
      />
      {/* Dialog children (usually DialogContent) */}
      {children}
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }
  
  return null;
}

export function DialogContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative z-10 flex w-full flex-col bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200",
        className
      )}
    >
      {children}
    </div>
  );
}
