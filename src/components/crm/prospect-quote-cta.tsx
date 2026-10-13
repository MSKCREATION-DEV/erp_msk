"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CrmPipelineStage } from "@prisma/client";
import { FileSpreadsheet, GitBranch } from "lucide-react";
import {
  convertOpportunityToClientAction,
  generateQuotePdfAction,
} from "@/actions/commercial";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ActionLink } from "@/components/ui/action-link";
import {
  QuoteCreateForm,
  type QuotePrefillLine,
} from "@/components/commercial/quote-form";
import { usePendingAction } from "@/hooks/use-pending-action";
import { STAGE_LABELS } from "@/lib/crm/labels";

type OfferOpt = {
  id: string;
  name: string;
  sku: string;
  priceXof: number | null;
  floorPriceXof: number | null;
};

type ClientOpt = {
  id: string;
  name: string;
  includeTravelDefault: boolean;
};

/**
 * CTA devis sur fiche prospect :
 * - hors Intéressé → info (pas de création)
 * - Intéressé sans devis → modal création
 * - devis déjà existant → lien vers la fiche devis
 */
export function ProspectQuoteCta({
  opportunityId,
  stage,
  existingQuoteId,
  existingClientId,
  canCreateQuote,
  canManageClients,
  canOpenStage,
  onOpenStage,
  clients,
  offers,
  initialLines,
  defaultObject,
}: {
  opportunityId: string;
  stage: CrmPipelineStage;
  existingQuoteId?: string | null;
  existingClientId?: string | null;
  canCreateQuote: boolean;
  canManageClients: boolean;
  canOpenStage?: boolean;
  onOpenStage?: () => void;
  clients: ClientOpt[];
  offers: OfferOpt[];
  initialLines?: QuotePrefillLine[];
  defaultObject?: string;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [prepError, setPrepError] = useState<string | null>(null);
  const [clientId, setClientId] = useState(existingClientId ?? "");

  const uiStage = stage === "NEGOCIATION" ? "DEVIS_ENVOYE" : stage;
  const isInteresse = uiStage === "INTERESSE";

  if (!canCreateQuote) return null;

  if (existingQuoteId) {
    return (
      <ActionLink
        href={`/commercial/devis/${existingQuoteId}`}
        icon={FileSpreadsheet}
        variant="secondary"
      >
        Voir le devis
      </ActionLink>
    );
  }

  function openBlocked() {
    setBlockedOpen(true);
  }

  function openCreate() {
    setPrepError(null);
    void run(async () => {
      let cid = existingClientId ?? clientId;
      if (!cid) {
        if (!canManageClients) {
          setPrepError(
            "Créez d’abord le client commercial, ou demandez le droit clients.",
          );
          setBlockedOpen(true);
          return;
        }
        const fd = new FormData();
        fd.set("opportunityId", opportunityId);
        const res = await convertOpportunityToClientAction(fd);
        if (!res.ok || !res.clientId) {
          setPrepError(res.error ?? "Impossible de créer le client");
          setBlockedOpen(true);
          return;
        }
        cid = res.clientId;
        setClientId(cid);
      }
      setCreateOpen(true);
    });
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!isInteresse) openBlocked();
          else openCreate();
        }}
      >
        <FileSpreadsheet className="h-4 w-4" aria-hidden />
        {pending ? "Préparation…" : "Créer un devis"}
      </Button>

      <Modal
        open={blockedOpen}
        onOpenChange={setBlockedOpen}
        title="Statut Intéressé requis"
        description="Le devis commercial n’est possible qu’à ce stade du parcours."
        size="md"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setBlockedOpen(false)}
            >
              Fermer
            </Button>
            {canOpenStage && onOpenStage ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setBlockedOpen(false);
                  onOpenStage();
                }}
              >
                <GitBranch className="h-4 w-4" aria-hidden />
                Changer le statut
              </Button>
            ) : null}
          </div>
        }
      >
        <div className="space-y-3 p-5 text-sm text-msk-ink/75">
          <p>
            Statut actuel :{" "}
            <span className="font-semibold text-msk-ink">
              {STAGE_LABELS[stage]}
            </span>
            .
          </p>
          <p>
            Passez le prospect en <strong>Intéressé</strong>, puis créez le
            devis depuis cette fiche. Le document apparaîtra dans « Devis &amp;
            factures ».
          </p>
          {prepError ? (
            <p className="rounded-lg border border-msk-coral/25 bg-msk-coral/5 px-3 py-2 text-msk-coral">
              {prepError}
            </p>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Créer un devis"
        description="Proposition commerciale liée à ce prospect."
        size="xl"
      >
        <div className="p-5">
          {clientId || existingClientId ? (
            <QuoteCreateForm
              embedded
              fromProspect
              clients={
                clients.length
                  ? clients
                  : [
                      {
                        id: clientId || existingClientId!,
                        name: "Client prospect",
                        includeTravelDefault: false,
                      },
                    ]
              }
              offers={offers}
              defaultClientId={clientId || existingClientId || undefined}
              defaultOpportunityId={opportunityId}
              initialLines={initialLines}
              defaultObject={defaultObject}
              onCancel={() => setCreateOpen(false)}
              onSuccess={async (quoteId) => {
                const fd = new FormData();
                fd.set("quoteId", quoteId);
                const pdf = await generateQuotePdfAction(fd);
                if (!pdf.ok) {
                  throw new Error(
                    pdf.error ??
                      "Devis créé, mais la génération PDF a échoué. Ouvrez le devis pour réessayer.",
                  );
                }
                setCreateOpen(false);
                router.refresh();
              }}
            />
          ) : (
            <p className="text-sm text-msk-coral">Client manquant.</p>
          )}
        </div>
      </Modal>
    </>
  );
}
