"use client";

import { useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Cloud, RefreshCcw, ShieldCheck, Download, X, Check, Leaf } from "lucide-react";

export function PwaEngagementModal({
  open,
  onOpenChange,
  onInstall,
  onRemindLater,
  hasBeforeInstallPrompt,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstall: () => void;
  onRemindLater: () => void;
  hasBeforeInstallPrompt: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[340px] rounded-[24px] p-6 pt-10 text-center gap-0">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft">
          <div className="relative flex h-11 w-7 items-center justify-center rounded-[4px] border-[2px] border-primary bg-primary text-white overflow-hidden shadow-sm">
             <div className="absolute top-[2px] left-1/2 w-2 h-[2px] -translate-x-1/2 bg-white/40 rounded-full"></div>
             <div className="absolute inset-[2px] bg-white rounded-[2px] flex items-center justify-center">
                <Leaf className="w-3.5 h-3.5 text-primary fill-current" />
             </div>
          </div>
        </div>
        
        <h2 className="mb-2 text-xl font-bold tracking-tight text-ink">
          Really do you want<br />explore more together?
        </h2>
        
        <p className="mb-3 text-[13px] font-bold text-ink">
          Pace AI will works better as an <span className="text-primary">APP</span>
        </p>

        <p className="mb-6 text-[13px] leading-relaxed text-ink-soft">
          No more storage or update hazzle –<br />we will do everything in automated<br />PWA setup. Just click install!
        </p>

        <div className="mb-6 rounded-[16px] bg-primary-soft p-4 text-left">
          <div className="flex gap-3 mb-4">
            <Cloud className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={1.5} />
            <div>
              <h3 className="text-[13px] font-bold text-ink">No storage worries</h3>
              <p className="text-[11px] text-ink-soft">Everything stays connected & synced</p>
            </div>
          </div>
          <div className="flex gap-3 mb-4">
            <RefreshCcw className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={1.5} />
            <div>
              <h3 className="text-[13px] font-bold text-ink">No update hazzle</h3>
              <p className="text-[11px] text-ink-soft">We do all updates automatically</p>
            </div>
          </div>
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={1.5} />
            <div>
              <h3 className="text-[13px] font-bold text-ink">Faster & better experience</h3>
              <p className="text-[11px] text-ink-soft">Works offline & loads super fast</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {hasBeforeInstallPrompt ? (
            <Button
              className="w-full justify-between h-[46px] rounded-[12px] bg-[#114220] hover:bg-[#0c3117] text-white px-5"
              onClick={onInstall}
            >
              <span className="flex-1 text-center font-medium">Install Pace AI</span>
              <Download className="h-4 w-4" />
            </Button>
          ) : (
            <div className="w-full rounded-[12px] bg-surface border border-line p-3 text-[12px] text-ink-soft mb-1">
              To install, tap the <span className="font-bold">Share</span> button and select <span className="font-bold">Add to Home Screen</span>.
            </div>
          )}
          
          <Button
            variant="outline"
            className="w-full h-[46px] rounded-[12px] border-line-strong text-ink font-medium hover:bg-surface"
            onClick={onRemindLater}
          >
            Remind me later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PwaToasts({
  showRemindLater,
  showInstallSuccess,
  onCloseRemindLater,
  onCloseInstallSuccess
}: {
  showRemindLater: boolean;
  showInstallSuccess: boolean;
  onCloseRemindLater: () => void;
  onCloseInstallSuccess: () => void;
}) {
  useEffect(() => {
    if (showRemindLater) {
      const t = setTimeout(() => onCloseRemindLater(), 3000);
      return () => clearTimeout(t);
    }
  }, [showRemindLater, onCloseRemindLater]);

  useEffect(() => {
    if (showInstallSuccess) {
      const t = setTimeout(() => onCloseInstallSuccess(), 4000);
      return () => clearTimeout(t);
    }
  }, [showInstallSuccess, onCloseInstallSuccess]);

  return (
    <>
      {showRemindLater && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="flex items-center gap-3 rounded-full bg-[#114220] pl-2 pr-4 py-2 text-white shadow-lg">
             <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-primary">
                <Leaf className="h-4 w-4 fill-current" />
             </div>
             <p className="text-[13px] font-medium leading-tight text-white pr-2">
               No worries! We&apos;ll remind<br />you again in a few days.
             </p>
             <button onClick={onCloseRemindLater} className="text-white/70 hover:text-white p-1">
               <X className="h-4 w-4" />
             </button>
          </div>
        </div>
      )}

      {showInstallSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-in fade-in duration-300">
          <div className="w-[280px] rounded-[24px] bg-white p-6 text-center shadow-xl animate-in zoom-in-95 duration-200 relative overflow-hidden">
             {/* Simple confetti decorations */}
             <div className="absolute top-4 left-6 h-2 w-2 rounded-full bg-primary/40"></div>
             <div className="absolute top-8 right-8 h-2 w-2 rounded-full bg-accent/40"></div>
             <div className="absolute bottom-10 left-8 h-2 w-2 rounded-full bg-blue-400/40"></div>
             <div className="absolute bottom-6 right-10 h-2 w-2 rounded-full bg-yellow-400/40"></div>
             
             <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white">
                <Check className="h-7 w-7" strokeWidth={3} />
             </div>
             <h3 className="mb-2 text-[17px] font-bold text-ink">Thank you!</h3>
             <p className="text-[13px] text-ink-soft">Pace AI is now installed<br />as an app.</p>
             
             <button 
                onClick={onCloseInstallSuccess}
                className="absolute top-4 right-4 text-ink-soft hover:text-ink"
             >
                <X className="h-4 w-4" />
             </button>
          </div>
        </div>
      )}
    </>
  );
}
