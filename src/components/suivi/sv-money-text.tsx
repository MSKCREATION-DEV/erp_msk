import { formatSvXof } from "@/lib/suivi/labels";
import { cn } from "@/lib/utils";

export type SvMoneyTone = "neutral" | "in" | "out" | "warn";

const TONE_CLASS: Record<SvMoneyTone, string> = {
  neutral: "text-msk-ink",
  in: "text-msk-blue",
  out: "text-msk-coral",
  warn: "text-msk-coral",
};

const SIZE_CLASS = {
  sm: "text-sm font-semibold",
  md: "text-base font-semibold sm:text-lg",
  lg: "text-xl font-semibold sm:text-2xl",
} as const;

/**
 * Montant Suivi (FCFA) — typo tabular, ton métier, signe optionnel.
 */
export function SvMoneyText({
  amount,
  tone = "neutral",
  size = "md",
  signed = false,
  className,
}: {
  amount: number;
  tone?: SvMoneyTone;
  size?: keyof typeof SIZE_CLASS;
  /** Préfixe + / − (hors zéro). */
  signed?: boolean;
  className?: string;
}) {
  const abs = Math.abs(amount);
  const prefix =
    signed && amount !== 0 ? (amount > 0 ? "+" : "−") : amount < 0 ? "−" : "";
  const display = amount < 0 ? abs : amount;

  return (
    <span
      className={cn(
        "inline-block tabular-nums tracking-tight",
        SIZE_CLASS[size],
        TONE_CLASS[tone],
        className,
      )}
    >
      {prefix}
      {formatSvXof(display)}
    </span>
  );
}
