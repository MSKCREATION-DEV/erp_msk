"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CrmActivityType } from "@prisma/client";
import { logActivityAction } from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionPickerSingle } from "@/components/ui/option-picker-modal";
import { usePendingAction } from "@/hooks/use-pending-action";
import { ACTIVITY_LABELS } from "@/lib/crm/labels";

export function ActivityForm({
  opportunityId,
  requireFollowUp = false,
}: {
  opportunityId: string;
  requireFollowUp?: boolean;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<CrmActivityType | null>("NOTE");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!type) {
      setError("Choisissez un type d’action");
      return;
    }
    const fd = new FormData(e.currentTarget);
    fd.set("opportunityId", opportunityId);
    fd.set("type", type);
    void run(async () => {
      const res = await logActivityAction(fd);
      if (!res.ok) setError(res.error ?? "Échec");
      else {
        (
          document.getElementById("activity-form") as HTMLFormElement | null
        )?.reset();
        setType("NOTE");
        router.refresh();
      }
    });
  }

  return (
    <form
      id="activity-form"
      className="space-y-3"
      onSubmit={onSubmit}
      aria-busy={pending || undefined}
    >
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <OptionPickerSingle
        label="Type d’action"
        options={Object.entries(ACTIVITY_LABELS).map(([k, v]) => ({
          value: k,
          label: v,
        }))}
        value={type}
        onChange={(v) => setType((v as CrmActivityType) ?? "NOTE")}
        disabled={pending}
        placeholder="Choisir le type"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="followUpAt">
            Prochaine relance{requireFollowUp ? " *" : ""}
          </Label>
          <Input
            id="followUpAt"
            name="followUpAt"
            type="date"
            required={requireFollowUp}
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="summary">Résumé *</Label>
          <Input id="summary" name="summary" required disabled={pending} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="nextAction">Prochaine action</Label>
          <Input id="nextAction" name="nextAction" disabled={pending} />
        </div>
      </div>
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer l’action"}
      </Button>
    </form>
  );
}
