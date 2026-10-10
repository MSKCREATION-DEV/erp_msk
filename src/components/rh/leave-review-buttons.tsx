"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { reviewLeaveAction } from "@/actions/rh";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";

/** Validation / refus d'une demande de congé (RH). */
export function LeaveReviewButtons({ leaveId }: { leaveId: string }) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function decide(decision: "APPROVED" | "REJECTED") {
    setError(null);
    const fd = new FormData();
    fd.set("leaveId", leaveId);
    fd.set("decision", decision);
    fd.set("reviewNote", note);
    void run(async () => {
      const res = await reviewLeaveAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        disabled={pending}
        rows={2}
        placeholder="Note de validation (optionnel)…"
        className="w-full rounded-lg border border-msk-ink/15 bg-white px-3 py-2 text-sm"
      />
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
