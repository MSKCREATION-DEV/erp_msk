import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Surface({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-msk-ink/[0.06] bg-white shadow-[0_1px_2px_rgba(13,19,48,0.04)]",
        className,
      )}
      {...props}
    />
  );
}
