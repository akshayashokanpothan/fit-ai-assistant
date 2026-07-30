"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Check } from "lucide-react";

interface SubscriptionSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SubscriptionSuccessModal({ isOpen, onClose }: SubscriptionSuccessModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleContinue = () => {
    onClose();
    router.push("/ai");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-ink/20 backdrop-blur-sm transition-opacity" 
        onClick={handleContinue}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-sm animate-in fade-in zoom-in-95 duration-300 rounded-[24px] bg-paper p-6 shadow-xl border border-line flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f1f6f3]">
          <Sparkles className="h-8 w-8 text-[#335f42]" />
        </div>
        
        <h3 className="mb-2 font-display text-[24px] font-medium text-ink">
          Welcome to Pro! 🎉
        </h3>
        
        <p className="mb-8 text-[15px] leading-relaxed text-ink-soft px-2">
          Your Pace AI experience has been upgraded. Your new limits are ready.
        </p>
        
        <button
          onClick={handleContinue}
          className="w-full flex h-12 items-center justify-center gap-2 rounded-full bg-[#335f42] px-6 text-[15px] font-bold text-white shadow-sm hover:bg-[#2a4d35] active:scale-[0.98] transition-all"
        >
          <span>Continue</span>
          <Check className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
