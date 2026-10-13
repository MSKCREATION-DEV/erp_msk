import { cn } from "@/lib/utils";
import type { TextareaHTMLAttributes } from "react";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-lg border border-msk-ink/15 bg-white px-3.5 py-2.5 text-sm text-msk-ink shadow-sm transition",
        "placeholder:text-msk-ink/40",
        "focus:border-msk-blue focus:outline-none focus:ring-2 focus:ring-msk-blue/20",
        "disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
