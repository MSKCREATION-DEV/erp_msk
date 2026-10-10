"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { validateEntryAction } from "@/actions/comptabilite";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";

export function EntryValidateButton({ entryId }: { entryId: string }) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          const fd = new FormData();
          fd.set("entryId", entryId);
          void run(async () => {
            const res = await validateEntryAction(fd);
            if (!res.ok) {
              setError(res.error ?? "Échec");
              return;
            }
            router.refresh();
          });
        }}
      >
        {pending ? "Validation…" : "Valider l’écriture"}
      </Button>
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
    </div>
  );
}
