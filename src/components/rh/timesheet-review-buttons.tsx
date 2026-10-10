"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { reviewTimesheetAction } from "@/actions/rh";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";

/** Validation / refus d'une feuille d'heures soumise (RH). */
export function TimesheetReviewButtons({
  timesheetId,
}: {
  timesheetId: string;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);

  function decide(decision: "APPROVED" | "REJECTED") {
    setError(null);
    const fd = new FormData();
    fd.set("timesheetId", timesheetId);
    fd.set("decision", decision);
    void run(async () => {
      const res = await reviewTimesheetAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => decide("APPROVED")}
        >
          {pending ? "…" : "Approuver"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="danger"
          disabled={pending}
          onClick={() => decide("REJECTED")}
        >
          {pending ? "…" : "Refuser"}
        </Button>
      </div>
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
    </div>
  );
}
