import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Surface({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl border border-msk-ink/6 bg-white shadow-[0_1px_2px_rgba(13,19,48,0.04)]",
        className,
      )}
      {...props}
    />
  );
}
