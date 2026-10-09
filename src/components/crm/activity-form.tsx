"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { logActivityAction } from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACTIVITY_LABELS } from "@/lib/crm/labels";

export function ActivityForm({ opportunityId }: { opportunityId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(fd: FormData) {
    setError(null);
    fd.set("opportunityId", opportunityId);
    startTransition(async () => {
      const res = await logActivityAction(fd);
      if (!res.ok) setError(res.error ?? "Échec");
      else {
        (document.getElementById("activity-form") as HTMLFormElement | null)?.reset();
        router.refresh();
      }
    });
  }

  return (
    <form
      id="activity-form"
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget));
      }}
    >
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            name="type"
            className="mt-1 flex h-11 w-full rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
            defaultValue="NOTE"
          >
            {Object.entries(ACTIVITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="followUpAt">Prochaine relance</Label>
          <Input id="followUpAt" name="followUpAt" type="date" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="summary">Résumé *</Label>
          <Input id="summary" name="summary" required />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="nextAction">Prochaine action</Label>
          <Input id="nextAction" name="nextAction" />
        </div>
      </div>
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "…" : "Logger"}
      </Button>
    </form>
  );
}
