import Link from "next/link";
import { Surface } from "@/components/ui/surface";
import { formatMinutes } from "@/lib/rh/labels";
import type { DayHoursCompare } from "@/lib/rh/work-schedule";

const DAY_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;

export function HoursWeekCompare({
  scheduleLabel,
  weeklyHours,
  days,
  hasDeclaration,
}: {
  scheduleLabel: string;
  weeklyHours: number;
  days: DayHoursCompare[];
  /** True si une feuille existe pour la semaine (même à 0). */
  hasDeclaration: boolean;
}) {
  const theo = days.reduce((s, d) => s + d.theoreticalMinutes, 0);
  const decl = days.reduce((s, d) => s + d.declaredMinutes, 0);
  const delta = decl - theo;
  const nothingDeclared = !hasDeclaration || decl === 0;

  return (
    <Surface className="w-full space-y-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-msk-ink">
            Semaine en cours
          </h2>
          <p className="mt-1 text-sm text-msk-ink/55">
            Horaire prévu : {scheduleLabel} ({weeklyHours} h / semaine).
          </p>
        </div>
        {!nothingDeclared ? (
          <div className="flex flex-wrap gap-4 text-sm tabular-nums">
            <div>
              <p className="text-[11px] uppercase tracking-caps text-msk-ink/35">
                Prévu
              </p>
              <p className="font-semibold text-msk-ink">{formatMinutes(theo)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-caps text-msk-ink/35">
                Saisi
              </p>
              <p className="font-semibold text-msk-ink">{formatMinutes(decl)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-caps text-msk-ink/35">
                Différence
              </p>
              <p
                className={`font-semibold ${
                  delta < 0
                    ? "text-msk-coral"
                    : delta > 0
                      ? "text-msk-blue"
                      : "text-msk-ink"
                }`}
              >
                {delta > 0 ? `+${formatMinutes(delta)}` : formatMinutes(delta)}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {nothingDeclared ? (
        <div className="rounded-xl border border-dashed border-msk-blue/25 bg-msk-blue/4 px-4 py-5 text-center sm:px-6">
          <p className="text-sm font-medium text-msk-ink">
            Vous n’avez pas encore saisi vos heures cette semaine.
          </p>
          <p className="mt-1 text-sm text-msk-ink/55">
            L’horaire prévu est de {formatMinutes(theo)}. Déclarez votre
            semaine pour la faire valider.
          </p>
          <Link
            prefetch={false}
            href="/espace/heures/nouvelle-semaine"
            className="mt-4 inline-flex h-9 items-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
          >
            Saisir ma semaine
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {days.map((d, i) => {
            const under =
              d.isWorkDay && d.declaredMinutes < d.theoreticalMinutes;
            const over = d.declaredMinutes > d.theoreticalMinutes;
            return (
              <div
                key={d.dateKey}
                className={`rounded-lg border p-3 ${
                  d.isHoliday
                    ? "border-msk-ink/8 bg-msk-chalk/80"
                    : d.isWorkDay
                      ? "border-msk-ink/8 bg-white"
                      : "border-msk-ink/6 bg-msk-ink/4"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-caps text-msk-ink/40">
                  {DAY_SHORT[i] ?? "—"}
                </p>
                <p className="mt-0.5 text-xs text-msk-ink/55">
                  {d.date.toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </p>
                {d.isHoliday ? (
                  <p className="mt-2 text-xs text-msk-ink/50">Férié</p>
                ) : !d.isWorkDay ? (
                  <p className="mt-2 text-xs text-msk-ink/40">Repos</p>
                ) : (
                  <div className="mt-2 space-y-1 text-xs tabular-nums">
                    <p className="text-msk-ink/50">
                      Prévu {formatMinutes(d.theoreticalMinutes)}
                    </p>
                    <p
                      className={`font-medium ${
                        under
                          ? "text-msk-coral"
                          : over
                            ? "text-msk-blue"
                            : "text-msk-ink"
                      }`}
                    >
                      Saisi {formatMinutes(d.declaredMinutes)}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Surface>
  );
}
