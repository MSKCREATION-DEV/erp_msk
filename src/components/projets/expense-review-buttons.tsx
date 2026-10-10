"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { reviewExpenseAction } from "@/actions/projets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";

export function ExpenseReviewButtons({
  expenseId,
  status,
}: {
  expenseId: string;
  status: string;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");

  function act(decision: "APPROVED" | "REJECTED" | "REIMBURSED") {
    setError(null);
    const fd = new FormData();
    fd.set("expenseId", expenseId);
    fd.set("decision", decision);
    fd.set("reviewNote", note);
    void run(async () => {
      const res = await reviewExpenseAction(fd);
      if (!res.ok) setError(res.error ?? "Échec");
      else router.refresh();
    });
  }

  const canReview = status === "SUBMITTED";
  const canReimburse = status === "APPROVED";
  if (!canReview && !canReimburse) return null;

  return (
    <div className="space-y-2">
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      <div>
        <Label htmlFor={`review-${expenseId}`}>Note validation</Label>
        <Input
          id={`review-${expenseId}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={pending}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {canReview ? (
          <>
            <Button
              type="button"
              disabled={pending}
              className="bg-msk-blue"
              onClick={() => act("APPROVED")}
            >
              Approuver
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => act("REJECTED")}
            >
              Rejeter
            </Button>
          </>
        ) : null}
        {canReimburse ? (
          <Button
            type="button"
            disabled={pending}
            className="bg-msk-blue"
            onClick={() => act("REIMBURSED")}
          >
            Rembourser
          </Button>
        ) : null}
      </div>
    </div>
  );
}
