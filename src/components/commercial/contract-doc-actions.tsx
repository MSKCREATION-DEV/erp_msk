"use client";

import { failAction, reportActionSuccess } from "@/lib/toast/report";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Share2 } from "lucide-react";
import type { ComContractFamily, ComServiceKind } from "@/generated/prisma/client";
import {
  generateContractPdfAction,
  setContractPrestationAction,
} from "@/actions/contracts";
import { getDocumentDownloadUrlAction } from "@/actions/ged";
import { Button } from "@/components/ui/button";
import { FieldHint, FieldLabel } from "@/components/ui/field-label";
import { DocDownloadButton } from "@/components/rh/doc-download-button";
import {
  GedPreviewModal,
  type PreviewDoc,
} from "@/components/ged/ged-preview-modal";
import { usePendingAction } from "@/hooks/use-pending-action";
import {
  CONTRACT_FAMILY_LABELS,
  SERVICE_KIND_DEFAULT_FAMILY,
  SERVICE_KIND_LABELS,
} from "@/lib/commercial/labels";
import { cn } from "@/lib/utils";

/**
 * Raccourcis document contrat GED — fiche contrat + chips fiche client.
 *
 * - Document manquant : CTA « Générer le contrat » (si habilité), sinon un
 *   simple constat « PDF non généré » (pas de dette visuelle).
 * - Nature manquante : sélecteur compact famille / prestation avant génération.
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
  family,
  serviceKind,
  canManage,
  className,
}: {
  contractId: string;
  reference: string;
  gedDocumentId: string | null;
  family: ComContractFamily | null;
  serviceKind: ComServiceKind | null;
  canManage: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { pending: genPending, run: runGen } = usePendingAction();
  const { pending: savePending, run: runSave } = usePendingAction();
  const { pending: sharePending, run: runShare } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const needsPrestation = !family || !serviceKind;
  const [pickFamily, setPickFamily] = useState<ComContractFamily>(
    family ?? "PRESTATION_ABONNEMENT",
  );
  const [pickServiceKind, setPickServiceKind] = useState<ComServiceKind>(
    serviceKind ?? "RESEAUX_SOCIAUX",
  );

  const doc: PreviewDoc | null = gedDocumentId
    ? {
        id: gedDocumentId,
        originalName: `${reference}.pdf`,
        mime: "application/pdf",
        size: 0,
      }
    : null;

  function withPrestationFields(fd: FormData) {
    if (needsPrestation) {
      fd.set("family", pickFamily);
      fd.set("serviceKind", pickServiceKind);
    }
  }

  function generate() {
    setError(null);
    setNotice(null);
    void runGen(async () => {
      const fd = new FormData();
      fd.set("contractId", contractId);
      withPrestationFields(fd);
      const res = await generateContractPdfAction(fd);
      if (failAction(res, setError, "Échec génération PDF")) return;
      reportActionSuccess("Document généré.");
      router.refresh();
    });
  }

  function savePrestation() {
    setError(null);
    setNotice(null);
    void runSave(async () => {
      const fd = new FormData();
      fd.set("contractId", contractId);
      fd.set("family", pickFamily);
      fd.set("serviceKind", pickServiceKind);
      const res = await setContractPrestationAction(fd);
      if (failAction(res, setError, "Enregistrement impossible")) return;
      reportActionSuccess("Prestation enregistrée.");
      setNotice(res.message ?? "Nature enregistrée");
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
        failAction(
          { ok: false, error: res.error ?? "Lien indisponible" },
          setError,
          "Lien indisponible",
        );
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
      <div className={cn("flex flex-col gap-2", className)}>
        {needsPrestation && canManage ? (
          <div className="rounded-lg border border-msk-ink/8 bg-msk-chalk/50 p-2.5">
            <p className="text-xs text-msk-ink/55">
              Famille / nature absentes sur ce contrat — nécessaires pour le PDF.
              Vous pouvez les choisir ci-dessous ou lancer la génération (déduction
              depuis les lignes si possible).
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor={`sk-${contractId}`} className="text-xs">
                  Nature
                </FieldLabel>
                <select
                  id={`sk-${contractId}`}
                  className="mt-1 w-full rounded-lg border border-msk-ink/12 bg-white px-2 py-1.5 text-xs"
                  value={pickServiceKind}
                  disabled={savePending || genPending}
                  onChange={(e) => {
                    const v = e.target.value as ComServiceKind;
                    setPickServiceKind(v);
                    setPickFamily(SERVICE_KIND_DEFAULT_FAMILY[v]);
                  }}
                >
                  {(
                    Object.entries(SERVICE_KIND_LABELS) as [
                      ComServiceKind,
                      string,
                    ][]
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel htmlFor={`fam-${contractId}`} className="text-xs">
                  Famille document
                </FieldLabel>
                <select
                  id={`fam-${contractId}`}
                  className="mt-1 w-full rounded-lg border border-msk-ink/12 bg-white px-2 py-1.5 text-xs"
                  value={pickFamily}
                  disabled={savePending || genPending}
                  onChange={(e) =>
                    setPickFamily(e.target.value as ComContractFamily)
                  }
                >
                  {(
                    Object.entries(CONTRACT_FAMILY_LABELS) as [
                      ComContractFamily,
                      string,
                    ][]
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <FieldHint className="mt-1.5">
              Prérempli selon le parcours client — ajustez si besoin.
            </FieldHint>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-2"
              disabled={savePending}
              onClick={savePrestation}
            >
              {savePending ? "Enregistrement…" : "Enregistrer la nature"}
            </Button>
          </div>
        ) : null}
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
        {notice ? <p className="text-xs text-msk-blue">{notice}</p> : null}
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
