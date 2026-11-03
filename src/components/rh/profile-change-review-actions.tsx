"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewProfileChangeAction } from "@/actions/rh-profile";
import { usePendingAction } from "@/hooks/use-pending-action";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FieldLabel } from "@/components/ui/field-label";

export function ProfileChangeReviewActions({
  requestId,
}: {
  requestId: string;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [reviewNote, setReviewNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(decision: "APPROVED" | "REJECTED") {
    setError(null);
    void run(async () => {
      const fd = new FormData();
      fd.set("requestId", requestId);
      fd.set("decision", decision);
      if (reviewNote.trim()) fd.set("reviewNote", reviewNote.trim());
      const res = await reviewProfileChangeAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 border-t border-msk-ink/6 pt-3">
      <div>
        <FieldLabel htmlFor={`note-${requestId}`}>
          Commentaire RH (optionnel)
        </FieldLabel>
        <Textarea
          id={`note-${requestId}`}
          rows={2}
          value={reviewNote}
          disabled={pending}
          placeholder="Motif du refus ou précision"
          onChange={(e) => setReviewNote(e.target.value)}
        />
      </div>
      {error ? (
        <p className="text-sm text-msk-coral" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending}
          onClick={() => submit("APPROVED")}
        >
          {pending ? "Traitement…" : "Approuver"}
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          onClick={() => submit("REJECTED")}
        >
          {pending ? "Traitement…" : "Refuser"}
        </Button>
      </div>
    </div>
  );
}
