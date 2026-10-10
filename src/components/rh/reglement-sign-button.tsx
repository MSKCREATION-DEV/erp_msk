"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signReglementAction } from "@/actions/rh";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";

/** Accusé de lecture / acceptation du règlement intérieur (collaborateur). */
export function ReglementSignButton() {
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
          void run(async () => {
            const res = await signReglementAction();
            if (!res.ok) {
              setError(res.error ?? "Échec");
              return;
            }
            router.refresh();
          });
        }}
      >
        {pending ? "Enregistrement…" : "J'ai lu et j'accepte le règlement"}
      </Button>
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
    </div>
  );
}
