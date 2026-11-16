import type { ReactNode } from "react";
import { FieldLabel } from "@/components/ui/field-label";
import { cn } from "@/lib/utils";

/**
 * Valeur générée côté serveur (code article, réf. MV-…).
 * Pas un `<input>` : les managers / extensions manipulent souvent les inputs
 * disabled/readOnly et cassent le commit React (`removeChild`).
 */
export function GeneratedValueField({
  id,
  label,
  value,
  hint,
  className,
  valueClassName,
}: {
  id: string;
  label: string;
  value: string;
  hint?: ReactNode;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <output
        id={id}
        key={`${id}::${value}`}
        className={cn(
          "mt-1.5 block w-full rounded-lg border border-msk-ink/10 bg-msk-chalk/60 px-3 py-2 text-sm text-msk-ink/70",
          valueClassName,
        )}
      >
        {value}
      </output>
      {hint != null ? (
        <p key={`${id}-hint`} className="mt-1 text-xs text-msk-ink/45">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
