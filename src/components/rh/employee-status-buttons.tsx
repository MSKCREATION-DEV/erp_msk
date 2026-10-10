"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { RhEmployeeStatus } from "@prisma/client";
import { updateEmployeeStatusAction } from "@/actions/rh";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";
import { EMPLOYEE_STATUS_LABEL } from "@/lib/rh/labels";

const ORDER: RhEmployeeStatus[] = [
  "ACTIVE",
  "ONBOARDING",
  "OFFBOARDING",
  "ARCHIVED",
];

/** Changement de statut d'une fiche collaborateur (admin RH). */
export function EmployeeStatusButtons({
  employeeId,
  status,
}: {
  employeeId: string;
  status: RhEmployeeStatus;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);

  function setStatus(next: RhEmployeeStatus) {
    setError(null);
    const fd = new FormData();
    fd.set("employeeId", employeeId);
    fd.set("status", next);
    void run(async () => {
      const res = await updateEmployeeStatusAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {ORDER.filter((s) => s !== status).map((s) => (
          <Button
            key={s}
            type="button"
            size="sm"
            variant={s === "ARCHIVED" ? "danger" : "secondary"}
            disabled={pending}
            onClick={() => setStatus(s)}
          >
            {pending ? "…" : `Passer « ${EMPLOYEE_STATUS_LABEL[s]} »`}
          </Button>
        ))}
      </div>
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
    </div>
  );
}
