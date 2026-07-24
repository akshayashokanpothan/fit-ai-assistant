import { cn } from "@/lib/utils";

/**
 * Minimal geometric mark: three rounded strides of increasing height on a
 * rising baseline — reads as building pace / forward momentum without
 * leaning on generic fitness or AI iconography (no dumbbell, heart, brain,
 * sparkle, or bolt). Kept as flat shapes on the existing token colors so it
 * stays legible down to ~24px and can be reused for favicon/PWA icons later.
 */
export function PaceMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="Pace AI"
    >
      <rect x="4" y="16" width="4.2" height="8" rx="2.1" fill="var(--primary)" />
      <rect x="11.4" y="10.5" width="4.2" height="13.5" rx="2.1" fill="var(--primary)" />
      <rect x="18.8" y="4" width="4.2" height="20" rx="2.1" fill="var(--accent)" />
    </svg>
  );
}
