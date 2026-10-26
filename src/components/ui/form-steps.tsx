import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type FormStepDef = {
  id: string;
  label: string;
  hint?: string;
};

/**
 * Progression visuelle partagée (création prospect, affectation…).
 * `currentIndex` 0-based ; les étapes passées sont cliquables si `onGoTo` fourni.
 */
export function FormSteps({
  steps,
  currentIndex,
  onGoTo,
  className,
}: {
  steps: readonly FormStepDef[];
  currentIndex: number;
  onGoTo?: (index: number) => void;
  className?: string;
}) {
  return (
    <ol
      className={cn(
        "flex flex-wrap gap-2 border-b border-msk-ink/8 pb-4",
        className,
      )}
      aria-label="Étapes du formulaire"
    >
      {steps.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const clickable = Boolean(onGoTo) && i <= currentIndex;
        return (
          <li key={step.id} className="min-w-0 flex-1 basis-28">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => onGoTo?.(i)}
              className={cn(
                "flex w-full flex-col gap-0.5 rounded-lg px-2 py-1.5 text-left transition",
                active && "bg-msk-blue/8",
                clickable && !active && "hover:bg-msk-chalk",
                !clickable && "cursor-default",
              )}
            >
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
                <span
                  className={cn(
                    "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
                    done && "bg-msk-blue text-white",
                    active && "bg-msk-blue text-white",
                    !done && !active && "bg-msk-ink/10 text-msk-ink/45",
                  )}
                  aria-hidden
                >
                  {done ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span
                  className={cn(
                    active ? "text-msk-blue" : "text-msk-ink/55",
                  )}
                >
                  {step.label}
                </span>
              </span>
              {step.hint ? (
                <span className="pl-7 text-[11px] text-msk-ink/40">
                  {step.hint}
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
