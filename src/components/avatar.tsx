import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export function Avatar({
  src,
  size = 32,
  className,
}: {
  src?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-primary",
        className
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        // Demo-mode avatars are resized local data URLs — plain <img> avoids
        // Next/Image's remote-loader constraints for that case.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <UserRound className="h-[55%] w-[55%]" strokeWidth={1.75} />
      )}
    </span>
  );
}
