"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resolveAssignmentRequestAction } from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field-label";
import { usePendingAction } from "@/hooks/use-pending-action";

export function AssignmentResolveActions({
  requestId,
}: {
  requestId: string;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function decide(decision: "APPROVE" | "REJECT") {
    setError(null);
    const fd = new FormData();
    fd.set("requestId", requestId);
    fd.set("decision", decision);
    if (note.trim()) fd.set("resolveNote", note.trim());
    void run(async () => {
      const res = await resolveAssignmentRequestAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        disabled={pending}
        placeholder="Note (optionnel)"
        className="max-w-xs"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => decide("APPROVE")}
        >
          {pending ? "…" : "Approuver"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => decide("REJECT")}
        >
          Refuser
        </Button>
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}
