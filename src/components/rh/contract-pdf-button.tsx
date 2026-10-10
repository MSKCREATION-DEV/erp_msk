"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { generateContractPdfAction } from "@/actions/rh";
import { Button } from "@/components/ui/button";
import { usePendingAction } from "@/hooks/use-pending-action";
import { DocDownloadButton } from "@/components/rh/doc-download-button";

/** PDF contrat — Voir si déjà généré, sinon Générer. */
export function ContractPdfButton({
  contractId,
  documentId,
  generatedAt,
}: {
  contractId: string;
  documentId?: string | null;
  generatedAt?: Date | string | null;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [docId, setDocId] = useState<string | null>(documentId ?? null);

  function generate() {
    setMsg(null);
    setError(null);
    void run(async () => {
      const fd = new FormData();
      fd.set("contractId", contractId);
      const res = await generateContractPdfAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      if (res.documentId) setDocId(res.documentId);
      setMsg(res.message ?? "PDF généré — utilisez Voir / Télécharger");
      router.refresh();
    });
  }

  const when = generatedAt
    ? new Date(generatedAt).toLocaleDateString("fr-FR")
    : null;

  return (
    <div className="flex flex-col gap-2">
      {docId ? (
        <div className="flex flex-wrap items-center gap-2">
          <DocDownloadButton
            documentId={docId}
            label="Voir / Télécharger le contrat"
            variant="primary"
            size="sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={generate}
          >
            {pending ? "…" : "Regénérer"}
          </Button>
          {when ? (
            <span className="text-xs text-msk-ink/45">Généré le {when}</span>
          ) : null}
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={generate}
        >
          {pending ? "Génération…" : "Générer PDF contrat"}
        </Button>
      )}
      {msg ? <p className="text-sm text-msk-blue">{msg}</p> : null}
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
    </div>
  );
}
