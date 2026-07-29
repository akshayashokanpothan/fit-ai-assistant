"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function SplashScreen() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Only run on the very first mount per session.
    const hasRun = sessionStorage.getItem("pace_splash_run");
    if (hasRun) {
      return;
    }
    
    sessionStorage.setItem("pace_splash_run", "true");
    
    setTimeout(() => {
      const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setReducedMotion(isReduced);
      setVisible(true);
      setMounted(true);

      const duration = isReduced ? 1500 : 2800; // Shorter duration for reduced motion
      setTimeout(() => {
        setVisible(false);
      }, duration);
    }, 0);

    return () => {};
  }, []);

  if (!mounted || !visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white"
      style={{
        animation: reducedMotion
          ? "splash-overlay-reduced 1.5s forwards"
          : "splash-overlay-fade 2.8s forwards",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes splash-overlay-fade {
          0%, 85.71% { opacity: 1; pointer-events: auto; }
          100% { opacity: 0; pointer-events: none; }
        }
        @keyframes splash-overlay-reduced {
          0%, 66% { opacity: 1; pointer-events: auto; }
          100% { opacity: 0; pointer-events: none; }
        }
        
        @keyframes logo-fade-sequence {
          0% { opacity: 0; }
          14.28% { opacity: 1; } /* 400ms */
          28.57% { opacity: 1; } /* 800ms */
          42.85% { opacity: 0; } /* 1200ms */
          57.14% { opacity: 1; } /* 1600ms */
          100% { opacity: 1; }
        }
        @keyframes logo-fade-reduced {
          0% { opacity: 0; transform: scale(0.95); }
          20%, 100% { opacity: 1; transform: scale(1); }
        }

        @keyframes color-shift-orange {
          0%, 57.14% { fill: #2F6F4E; }
          65%, 100% { fill: #F58634; }
        }

        @keyframes text-reveal {
          0%, 57.14% { opacity: 0; transform: translateY(10px); }
          65%, 100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes text-reveal-reduced {
          0%, 20% { opacity: 0; transform: translateY(5px); }
          40%, 100% { opacity: 1; transform: translateY(0); }
        }

        .splash-logo-container {
          opacity: 0;
          animation: logo-fade-sequence 2.8s forwards;
        }
        .splash-logo-container-reduced {
          animation: logo-fade-reduced 1.5s forwards;
        }

        .splash-color-shift {
          fill: #2F6F4E;
          animation: color-shift-orange 2.8s forwards;
        }
        .splash-color-static {
          fill: #F58634;
        }

        .splash-text {
          opacity: 0;
          animation: text-reveal 2.8s forwards;
        }
        .splash-text-reduced {
          animation: text-reveal-reduced 1.5s forwards;
        }
      `}} />

      <div className={cn("flex flex-col items-center", reducedMotion ? "splash-logo-container-reduced" : "splash-logo-container")}>
        <svg
          width="72"
          height="72"
          viewBox="0 0 512 512"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
          role="img"
          aria-label="Pace AI"
        >
          <circle cx="155" cy="105" r="42" fill="#2F6F4E" />
          <circle cx="350" cy="105" r="42" className={reducedMotion ? "splash-color-static" : "splash-color-shift"} />
          <path d="M113 405 C103 331 109 251 127 213 C145 175 181 163 218 170 C245 175 267 187 286 202
                   C300 214 301 235 288 248 C277 259 260 260 246 251
                   C228 240 210 233 193 235 C177 237 168 247 163 262
                   C153 292 154 349 160 396 C163 420 148 438 126 439
                   C105 440 91 426 88 406 Z" fill="#2F6F4E" />
          <path d="M315 170 C348 163 383 176 403 205 C426 238 431 286 414 326
                   C393 374 350 405 293 414 C269 418 248 403 245 382
                   C242 361 257 344 279 340 C314 334 338 318 349 293
                   C358 272 356 248 346 233 C337 220 324 213 309 211
                   C291 209 280 195 283 181 C286 171 298 166 315 170 Z" className={reducedMotion ? "splash-color-static" : "splash-color-shift"} />
        </svg>
        <span className={cn("mt-4 font-display text-[22px] font-medium tracking-tight text-ink", reducedMotion ? "splash-text-reduced" : "splash-text")}>
          Pace AI
        </span>
      </div>
    </div>
  );
}
