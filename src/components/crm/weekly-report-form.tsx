"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveWeeklyReportAction } from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";
import type { WeekStats } from "@/lib/crm/week-stats";

/** Champs éditables du rapport saisi — `relancesJournalisees` est dérivé (KPI auto). */
const FIELDS: { key: keyof WeekStats; label: string }[] = [
  { key: "newProspects", label: "Nouveaux prospects" },
  { key: "firstContacts", label: "Premiers contacts" },
  { key: "replies", label: "Réponses obtenues" },
  { key: "inDiscussion", label: "En discussion (stock)" },
  { key: "qualified", label: "Qualifiés (stock)" },
  { key: "meetings", label: "RDV" },
  { key: "followUpsDone", label: "Tâches relance clôturées" },
];

export function WeeklyReportForm({
  weekStartIso,
  initial,
  difficulty,
  needs,
  scriptsFeedback,
}: {
  weekStartIso: string;
  initial: WeekStats;
  difficulty?: string | null;
  needs?: string | null;
  scriptsFeedback?: string | null;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const fd = new FormData(e.currentTarget);
    fd.set("weekStart", weekStartIso);
    void run(async () => {
      const res = await saveWeeklyReportAction(fd);
      if (!res.ok) setError(res.error ?? "Échec");
      else {
        setOk(res.message ?? "Enregistré");
        router.refresh();
      }
    });
  }

  return (
    <form
      className="space-y-5"
      onSubmit={onSubmit}
      aria-busy={pending || undefined}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <Label htmlFor={f.key}>{f.label}</Label>
            <Input
              id={f.key}
              name={f.key}
              type="number"
              min={0}
              defaultValue={initial[f.key]}
              disabled={pending}
              className="mt-1"
            />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="difficulty">Principale difficulté</Label>
          <textarea
            id="difficulty"
            name="difficulty"
            rows={2}
            defaultValue={difficulty ?? ""}
            disabled={pending}
            className="mt-1 w-full rounded-lg border border-msk-ink/15 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <Label htmlFor="needs">Besoins pour mieux prospecter</Label>
          <textarea
            id="needs"
            name="needs"
            rows={2}
            defaultValue={needs ?? ""}
            disabled={pending}
            className="mt-1 w-full rounded-lg border border-msk-ink/15 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <Label htmlFor="scriptsFeedback">Feedback scripts</Label>
          <textarea
            id="scriptsFeedback"
            name="scriptsFeedback"
            rows={2}
            defaultValue={scriptsFeedback ?? ""}
            disabled={pending}
            className="mt-1 w-full rounded-lg border border-msk-ink/15 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      {ok ? <p className="text-sm text-msk-blue">{ok}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer le rapport"}
      </Button>
    </form>
  );
}
