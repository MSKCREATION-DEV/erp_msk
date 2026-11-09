"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CrmPipelineStage } from "@/generated/prisma/client";
import { FileSpreadsheet, GitBranch, UserCheck } from "lucide-react";
import { ensureProspectClientDraftForQuoteAction } from "@/actions/commercial";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ActionLink } from "@/components/ui/action-link";
import type { QuotePrefillLine } from "@/components/commercial/quote-form";
import { usePendingAction } from "@/hooks/use-pending-action";
import { canTransformProspectToClient } from "@/lib/crm/guide-rules";
import { STAGE_LABELS } from "@/lib/crm/labels";
import { COM_DOCS_GATED } from "@/lib/commercial/gates";

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
 * CTA commercial sur fiche prospect :
 * - si devis gelés (Direction) → Transformer en client / Voir le client
 * - sinon → Transformer en client + Créer un devis (page `/commercial/devis/nouveau`)
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
}: {
  opportunityId: string;
  stage: CrmPipelineStage;
  existingQuoteId?: string | null;
  existingClientId?: string | null;
  canCreateQuote: boolean;
  canManageClients: boolean;
  canOpenStage?: boolean;
  onOpenStage?: () => void;
  /** Conservés pour compat appelants — préremplissage via page `/nouveau`. */
  clients?: ClientOpt[];
  offers?: OfferOpt[];
  initialLines?: QuotePrefillLine[];
  defaultObject?: string;
}) {
  if (COM_DOCS_GATED) {
    return (
      <ProspectConvertCta
        opportunityId={opportunityId}
        stage={stage}
        existingClientId={existingClientId}
        canManageClients={canManageClients}
        canOpenStage={canOpenStage}
        onOpenStage={onOpenStage}
      />
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!existingQuoteId && canManageClients ? (
        <ProspectConvertCta
          opportunityId={opportunityId}
          stage={stage}
          existingClientId={existingClientId}
          canManageClients={canManageClients}
          canOpenStage={canOpenStage}
          onOpenStage={onOpenStage}
          variant="inline"
        />
      ) : null}
      {canCreateQuote ? (
        <ProspectDevisCta
          opportunityId={opportunityId}
          stage={stage}
          existingQuoteId={existingQuoteId}
          existingClientId={existingClientId}
          canManageClients={canManageClients}
          canOpenStage={canOpenStage}
          onOpenStage={onOpenStage}
        />
      ) : null}
    </div>
  );
}

function ProspectConvertCta({
  opportunityId,
  stage,
  existingClientId,
  canManageClients,
  canOpenStage,
  onOpenStage,
  variant = "standalone",
}: {
  opportunityId: string;
  stage: CrmPipelineStage;
  existingClientId?: string | null;
  canManageClients: boolean;
  canOpenStage?: boolean;
  onOpenStage?: () => void;
  variant?: "standalone" | "inline";
}) {
  const router = useRouter();
  const [blockedOpen, setBlockedOpen] = useState(false);

  const canConvert = canTransformProspectToClient(stage);

  if (existingClientId) {
    const link = (
      <ActionLink
        href={`/commercial/clients/${existingClientId}`}
        icon={UserCheck}
        variant="secondary"
      >
        Voir le client
      </ActionLink>
    );
    return variant === "inline" ? link : <>{link}</>;
  }

  if (!canManageClients) return null;

  const button = (
    <>
      <Button
        type="button"
        size="sm"
        onClick={() => {
          if (!canConvert) {
            setBlockedOpen(true);
            return;
          }
          router.push(
            `/commercial/clients/nouveau?opportunityId=${opportunityId}`,
          );
        }}
      >
        <UserCheck className="h-4 w-4" aria-hidden />
        Transformer en client
      </Button>

      <Modal
        open={blockedOpen}
        onOpenChange={setBlockedOpen}
        title="Prospect déjà clos"
        description="Un prospect Perdu ne peut pas être transformé en client."
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
            Rouvrez le dossier (hors Perdu) si vous devez créer la fiche
            client, ou créez un nouveau prospect si c’est un autre contact.
          </p>
        </div>
      </Modal>
    </>
  );

  return variant === "inline" ? button : <>{button}</>;
}

/**
 * Prépare le client draft si besoin, puis ouvre la page dédiée
 * `/commercial/devis/nouveau` (stepper) — plus de modal create riche.
 */
function ProspectDevisCta({
  opportunityId,
  stage,
  existingQuoteId,
  existingClientId,
  canManageClients,
  canOpenStage,
  onOpenStage,
}: {
  opportunityId: string;
  stage: CrmPipelineStage;
  existingQuoteId?: string | null;
  existingClientId?: string | null;
  canManageClients: boolean;
  canOpenStage?: boolean;
  onOpenStage?: () => void;
}) {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [prepError, setPrepError] = useState<string | null>(null);

  const uiStage = stage === "NEGOCIATION" ? "DEVIS_ENVOYE" : stage;
  const isInteresse = uiStage === "INTERESSE";

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

  function openCreatePage() {
    setPrepError(null);
    void run(async () => {
      let cid = existingClientId ?? "";
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
        const res = await ensureProspectClientDraftForQuoteAction(fd);
        if (!res.ok || !res.clientId) {
          setPrepError(res.error ?? "Impossible de préparer la fiche client");
          setBlockedOpen(true);
          return;
        }
        cid = res.clientId;
      }
      router.push(
        `/commercial/devis/nouveau?opportunityId=${opportunityId}&clientId=${cid}`,
      );
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!isInteresse) {
            setPrepError(null);
            setBlockedOpen(true);
            return;
          }
          openCreatePage();
        }}
      >
        <FileSpreadsheet className="h-4 w-4" aria-hidden />
        {pending ? "Préparation…" : "Créer un devis"}
      </Button>

      <Modal
        open={blockedOpen}
        onOpenChange={setBlockedOpen}
        title={
          prepError ? "Préparation impossible" : "Statut Intéressé requis"
        }
        description={
          prepError
            ? undefined
            : "Le devis commercial n’est possible qu’à ce stade du parcours."
        }
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
            {!prepError && canOpenStage && onOpenStage ? (
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
          {prepError ? (
            <p className="rounded-lg border border-msk-coral/25 bg-msk-coral/5 px-3 py-2 text-msk-coral">
              {prepError}
            </p>
          ) : (
            <>
              <p>
                Statut actuel :{" "}
                <span className="font-semibold text-msk-ink">
                  {STAGE_LABELS[stage]}
                </span>
                .
              </p>
              <p>
                Passez le prospect en <strong>Intéressé</strong>, puis créez le
                devis. Vous serez conduit vers le formulaire dédié (stepper).
              </p>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
