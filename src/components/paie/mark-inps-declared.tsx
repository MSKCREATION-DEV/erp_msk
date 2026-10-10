"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { markInpsDeclaredAction } from "@/actions/paie";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";

export function MarkInpsDeclaredButton({ periodId }: { periodId: string }) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="inline-flex flex-col gap-1">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          setError(null);
          void run(async () => {
            const fd = new FormData();
            fd.set("periodId", periodId);
            const res = await markInpsDeclaredAction(fd);
            if (!res.ok) {
              setError(res.error ?? "Échec");
              return;
            }
            router.refresh();
          });
        }}
      >
        {pending ? "…" : "Marquer déclaré"}
      </Button>
      {error ? <p className="text-xs text-msk-coral">{error}</p> : null}
    </div>
  );
}
