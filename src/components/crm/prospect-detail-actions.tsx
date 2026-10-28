"use client";

import { useState } from "react";
import type { CrmPipelineStage } from "@prisma/client";
import { ClipboardList, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StageForm } from "@/components/crm/stage-form";
import { ActivityForm } from "@/components/crm/activity-form";
import {
  ProspectQuoteCta,
} from "@/components/crm/prospect-quote-cta";
import type { QuotePrefillLine } from "@/components/commercial/quote-form";
import { COM_DOCS_GATED } from "@/lib/commercial/gates";
import type { ProspectLinkedSummary } from "@/lib/crm/prospect-linked-entities";

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
 * Actions fiche prospect — statut & journal via modales + CTA devis (gate Intéressé).
 */
export function ProspectDetailActions({
  opportunityId,
  stage,
  activityCount,
  hasFollowUp,
  linked,
  canEditStage,
  canLogActivity,
  requireFollowUp,
  quote,
}: {
  opportunityId: string;
  stage: CrmPipelineStage;
  activityCount: number;
  hasFollowUp: boolean;
  linked?: ProspectLinkedSummary;
  canEditStage: boolean;
  canLogActivity: boolean;
  requireFollowUp: boolean;
  quote?: {
    existingQuoteId?: string | null;
    existingClientId?: string | null;
    canCreateQuote: boolean;
    canManageClients: boolean;
    clients: ClientOpt[];
    offers: OfferOpt[];
    initialLines?: QuotePrefillLine[];
    defaultObject?: string;
  };
}) {
  const [stageOpen, setStageOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  const showQuoteCta = Boolean(
    quote &&
      (COM_DOCS_GATED
        ? quote.canManageClients || quote.existingClientId
        : quote.canCreateQuote),
  );

  if (!canEditStage && !canLogActivity && !showQuoteCta) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canEditStage ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setStageOpen(true)}
          >
            <GitBranch className="h-4 w-4" aria-hidden />
            Changer le statut
          </Button>
        ) : null}
        {canLogActivity ? (
          <Button
            type="button"
            size="sm"
            onClick={() => setActivityOpen(true)}
          >
            <ClipboardList className="h-4 w-4" aria-hidden />
            Enregistrer une action
          </Button>
        ) : null}
        {showQuoteCta && quote ? (
          <ProspectQuoteCta
            opportunityId={opportunityId}
            stage={stage}
            existingQuoteId={quote.existingQuoteId}
            existingClientId={quote.existingClientId}
            canCreateQuote={quote.canCreateQuote}
            canManageClients={quote.canManageClients}
            canOpenStage={canEditStage}
            onOpenStage={() => setStageOpen(true)}
            clients={quote.clients}
            offers={quote.offers}
            initialLines={quote.initialLines}
            defaultObject={quote.defaultObject}
          />
        ) : null}
      </div>

      {canEditStage ? (
        <Modal
          open={stageOpen}
          onOpenChange={setStageOpen}
          title="Changer le statut"
          description="Mise à jour du parcours commercial."
          size="md"
        >
          <div className="p-5">
            <StageForm
              opportunityId={opportunityId}
              stage={stage}
              activityCount={activityCount}
              hasFollowUp={hasFollowUp}
              linked={linked}
              onSuccess={() => setStageOpen(false)}
            />
          </div>
        </Modal>
      ) : null}

      {canLogActivity ? (
        <Modal
          open={activityOpen}
          onOpenChange={setActivityOpen}
          title="Enregistrer une action"
          description="Journalisez l’échange et planifiez la prochaine relance."
          size="md"
        >
          <div className="p-5">
            <ActivityForm
              opportunityId={opportunityId}
              requireFollowUp={requireFollowUp}
              onSuccess={() => setActivityOpen(false)}
            />
          </div>
        </Modal>
      ) : null}
    </>
  );
}
