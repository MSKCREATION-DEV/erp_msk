"use client";

import { cn } from "@/lib/utils";

export type ChoiceCardOption<T extends string = string> = {
  value: T;
  label: string;
  description?: string;
};

type ChoiceCardsProps<T extends string> = {
  name: string;
  options: ChoiceCardOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  columns?: 2 | 3 | 4;
  className?: string;
};

/**
 * Sélection pro par cartes — remplace les `<select>` natifs pour enums courts.
 */
export function ChoiceCards<T extends string>({
  name,
  options,
  value,
  onChange,
  disabled,
  columns = 2,
  className,
}: ChoiceCardsProps<T>) {
  return (
    <div
      className={cn(
        "grid gap-2",
        columns === 2 &&
          "[grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr))]",
        columns === 3 &&
          "[grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))]",
        columns === 4 &&
          "[grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr))]",
        className,
      )}
      role="radiogroup"
    >
      <input type="hidden" name={name} value={value} />
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-lg border px-3 py-2.5 text-left transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-msk-blue/40",
              selected
                ? "border-msk-blue bg-msk-blue/6 shadow-sm"
                : "border-msk-ink/12 bg-white hover:border-msk-ink/25 hover:bg-msk-chalk/40",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            <span
              className={cn(
                "block text-sm font-medium",
                selected ? "text-msk-blue" : "text-msk-ink",
              )}
            >
              {opt.label}
            </span>
            {opt.description ? (
              <span className="mt-0.5 block text-xs text-msk-ink/45">
                {opt.description}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
