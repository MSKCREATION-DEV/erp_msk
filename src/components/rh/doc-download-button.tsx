"use client";

import { useState } from "react";
import { getRhDocumentUrlAction } from "@/actions/rh";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";

/** Ouvre le PDF RH via URL signée (sans passer par l’UI GED). */
export function DocDownloadButton({
  documentId,
  label = "Télécharger",
  variant = "secondary",
  size = "sm",
}: {
  documentId: string;
  label?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="inline-flex flex-col gap-1">
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={pending}
        onClick={() => {
          setError(null);
          void run(async () => {
            const fd = new FormData();
            fd.set("documentId", documentId);
            const res = await getRhDocumentUrlAction(fd);
            if (!res.ok || !res.url) {
              setError(res.error ?? "Téléchargement impossible");
              return;
            }
            window.open(res.url, "_blank", "noopener,noreferrer");
          });
        }}
      >
        {pending ? "Ouverture…" : label}
      </Button>
      {error ? <p className="text-xs text-msk-coral">{error}</p> : null}
    </div>
  );
}
