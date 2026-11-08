"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Share2 } from "lucide-react";
import { generateContractPdfAction } from "@/actions/contracts";
import { getDocumentDownloadUrlAction } from "@/actions/ged";
import { Button } from "@/components/ui/button";
import { DocDownloadButton } from "@/components/rh/doc-download-button";
import {
  GedPreviewModal,
  type PreviewDoc,
} from "@/components/ged/ged-preview-modal";
import { usePendingAction } from "@/hooks/use-pending-action";
import { cn } from "@/lib/utils";

/**
 * Raccourcis document contrat GED — fiche contrat + chips fiche client.
 *
 * - Document manquant : CTA « Générer le contrat » (si habilité), sinon un
 *   simple constat « PDF non généré » (pas de dette visuelle).
 * - Document présent : « Voir » (aperçu modal, pattern GED), « Télécharger »,
 *   « Partager » (lien signé copié dans le presse-papiers).
 *
 * Idempotence déléguée à `generateContractPdfAction` (`gedDocumentId`) — ce
 * composant ne réimplémente aucune logique de génération.
 */
export function ContractDocActions({
  contractId,
  reference,
  gedDocumentId,
  canManage,
  className,
}: {
  contractId: string;
  reference: string;
  gedDocumentId: string | null;
  canManage: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { pending: genPending, run: runGen } = usePendingAction();
  const { pending: sharePending, run: runShare } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const doc: PreviewDoc | null = gedDocumentId
    ? {
        id: gedDocumentId,
        originalName: `${reference}.pdf`,
        mime: "application/pdf",
        size: 0,
      }
    : null;

  function generate() {
    setError(null);
    setNotice(null);
    void runGen(async () => {
      const fd = new FormData();
      fd.set("contractId", contractId);
      const res = await generateContractPdfAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Échec génération PDF");
        return;
      }
      router.refresh();
    });
  }

  function share() {
    if (!gedDocumentId) return;
    setError(null);
    setNotice(null);
    void runShare(async () => {
      const res = await getDocumentDownloadUrlAction(gedDocumentId);
      if (!res.ok || !res.url) {
        setError(res.error ?? "Lien indisponible");
        return;
      }
      try {
        await navigator.clipboard.writeText(res.url);
        setNotice("Lien copié — valable temporairement");
      } catch {
        setError("Copie impossible — ouvrez « Voir » puis copiez l’URL");
      }
    });
  }

  if (!doc) {
    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        {canManage ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={genPending}
            onClick={generate}
          >
            {genPending ? "Génération…" : "Générer le contrat"}
          </Button>
        ) : (
          <p className="text-xs text-msk-ink/45">PDF non généré</p>
        )}
        {error ? <p className="text-xs text-msk-coral">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setPreviewOpen(true)}
        >
          <Eye className="h-3.5 w-3.5" aria-hidden />
          Voir
        </Button>
        <DocDownloadButton
          documentId={doc.id}
          label="Télécharger"
          variant="secondary"
          size="sm"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={sharePending}
          onClick={share}
        >
          <Share2 className="h-3.5 w-3.5" aria-hidden />
          {sharePending ? "…" : "Partager"}
        </Button>
      </div>
      {notice ? <p className="text-xs text-msk-blue">{notice}</p> : null}
      {error ? <p className="text-xs text-msk-coral">{error}</p> : null}
      <GedPreviewModal doc={doc} open={previewOpen} onOpenChange={setPreviewOpen} />
    </div>
  );
}
