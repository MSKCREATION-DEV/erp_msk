import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { parseWorkDaysJson } from "@/lib/rh/work-schedule";

export const metadata: Metadata = { title: "Horaires de travail" };

const DAY_LABEL: Record<number, string> = {
  1: "Lun",
  2: "Mar",
  3: "Mer",
  4: "Jeu",
  5: "Ven",
  6: "Sam",
  7: "Dim",
};

export default async function RhHorairesPage() {
  const user = await requireUser();
  if (
    !hasPermission(user, "rh.employees.manage") &&
    !hasPermission(user, "rh.timesheet.validate")
  ) {
    redirect("/accueil");
  }

  const [schedules, holidays] = await Promise.all([
    prisma.rhWorkSchedule.findMany({ orderBy: { code: "asc" } }),
    prisma.rhPublicHoliday.findMany({
      where: { year: new Date().getFullYear() },
      orderBy: { date: "asc" },
      take: 40,
    }),
  ]);

  return (
    <PageShell>
      <PageHeader
        title="Horaires de travail"
        description="Configuration collective (référence théorique). Distincte du suivi des feuilles d’heures."
        backHref="/rh"
        backLabel="Retour RH"
        breadcrumbs={[
          { label: "RH", href: "/rh" },
          { label: "Horaires" },
        ]}
      />

      <div className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-caps text-msk-ink/35">
          Horaires collectifs
        </h2>
        {schedules.length === 0 ? (
          <Surface className="p-6 text-sm text-msk-ink/50">
            Aucun horaire — seed `msk_default` attendu.
          </Surface>
        ) : (
          schedules.map((s) => {
            const days = parseWorkDaysJson(s.workDaysJson);
            return (
              <Surface key={s.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-msk-ink">{s.label}</p>
                    <p className="mt-1 font-mono text-xs text-msk-ink/45">
                      {s.code}
                    </p>
                    <p className="mt-2 text-sm text-msk-ink/60">
                      {s.startTime}–{s.endTime} · pause {s.breakStart}–
                      {s.breakEnd} · {s.weeklyHours} h / semaine
                    </p>
                    <p className="mt-1 text-xs text-msk-ink/45">
                      Jours :{" "}
                      {days.map((d) => DAY_LABEL[d] ?? d).join(", ")}
                    </p>
                  </div>
                  <Badge tone={s.active ? "success" : "muted"}>
                    {s.active ? "Actif" : "Inactif"}
                  </Badge>
                </div>
              </Surface>
            );
          })
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-caps text-msk-ink/35">
          Jours fériés {new Date().getFullYear()}
        </h2>
        <Surface className="overflow-x-auto p-0">
          {holidays.length === 0 ? (
            <p className="px-4 py-6 text-sm text-msk-ink/50">
              Aucun jour férié saisi pour cette année.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-msk-ink/6 text-msk-ink/45">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Libellé</th>
                </tr>
              </thead>
              <tbody>
                {holidays.map((h) => (
                  <tr key={h.id} className="border-b border-msk-ink/6">
                    <td className="px-4 py-2.5 tabular-nums">
                      {h.date.toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-2.5">{h.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Surface>
      </div>
    </PageShell>
  );
}
