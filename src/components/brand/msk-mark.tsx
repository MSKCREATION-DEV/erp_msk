import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type MskMarkProps = {
  className?: string;
  title?: string;
  style?: CSSProperties;
};

export function MskMark({ className, title = "MSK", style }: MskMarkProps) {
  return (
    <svg
      viewBox="0 0 300 192"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      style={style}
      role="img"
      aria-label={title || undefined}
      aria-hidden={!title}
    >
      {title ? <title>{title}</title> : null}
      <polygon points="0 179.13 146.95 95.65 0 12.17" />
      <path d="M108.69 191.3H300V0H108.69V27.82L203.48 95.65L108.69 163.48V191.3Z" />
    </svg>
  );
}

export function MskAvatar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex aspect-square items-center justify-center rounded-full bg-msk-ink text-white",
        className,
      )}
      aria-hidden
    >
      <MskMark className="h-[42%] w-[42%]" title="" />
    </div>
  );
}
