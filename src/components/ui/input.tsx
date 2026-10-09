import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3.5 text-sm text-msk-ink placeholder:text-msk-ink/40 shadow-sm transition focus:border-msk-blue focus:outline-none focus:ring-2 focus:ring-msk-blue/20 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
