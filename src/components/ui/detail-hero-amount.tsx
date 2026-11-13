/**
 * Pastille montant pour en-tête de fiche (réf. charge Suivi).
 */
export function DetailHeroAmount({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-msk-ink/6">
      <p className="text-[10px] font-medium uppercase tracking-caps text-msk-ink/40">
        {label}
      </p>
      <p
        className={`mt-0.5 text-sm font-semibold tabular-nums sm:text-base ${
          emphasize ? "text-msk-coral" : "text-msk-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
