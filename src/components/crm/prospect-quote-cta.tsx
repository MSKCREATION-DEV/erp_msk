"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CrmPipelineStage } from "@prisma/client";
import { FileSpreadsheet, GitBranch, UserCheck } from "lucide-react";
import {
  convertOpportunityToClientAction,
  convertOpportunityToClientRedirectAction,
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
import {
  COM_DOCS_GATED,
  COM_DOCS_GATED_HINT,
} from "@/lib/commercial/gates";

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

const CONVERTIBLE = new Set(["INTERESSE", "DEVIS_ENVOYE", "GAGNE"]);

/**
 * CTA commercial sur fiche prospect :
 * - si devis gelés (Direction) → Transformer en client / Voir le client
 * - sinon → flux devis (Intéressé → modal création)
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
    <ProspectDevisCta
      opportunityId={opportunityId}
      stage={stage}
      existingQuoteId={existingQuoteId}
      existingClientId={existingClientId}
      canCreateQuote={canCreateQuote}
      canManageClients={canManageClients}
      canOpenStage={canOpenStage}
      onOpenStage={onOpenStage}
      clients={clients}
      offers={offers}
      initialLines={initialLines}
      defaultObject={defaultObject}
    />
  );
}

function ProspectConvertCta({
  opportunityId,
  stage,
  existingClientId,
  canManageClients,
  canOpenStage,
  onOpenStage,
}: {
  opportunityId: string;
  stage: CrmPipelineStage;
  existingClientId?: string | null;
  canManageClients: boolean;
  canOpenStage?: boolean;
  onOpenStage?: () => void;
}) {
  const { pending, run } = usePendingAction();
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uiStage = stage === "NEGOCIATION" ? "DEVIS_ENVOYE" : stage;
  const canConvert = CONVERTIBLE.has(uiStage);

  if (existingClientId) {
    return (
      <ActionLink
        href={`/commercial/clients/${existingClientId}`}
        icon={UserCheck}
        variant="secondary"
      >
        Voir le client
      </ActionLink>
    );
  }

  if (!canManageClients) return null;

  function runConvert() {
    setError(null);
    void run(async () => {
      const fd = new FormData();
      fd.set("opportunityId", opportunityId);
      const res = await convertOpportunityToClientRedirectAction(fd);
      if (res && !res.ok) {
        setConfirmOpen(false);
        setError(res.error ?? "Impossible de créer le client");
        setBlockedOpen(true);
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!canConvert) {
            setBlockedOpen(true);
            return;
          }
          setConfirmOpen(true);
        }}
      >
        <UserCheck className="h-4 w-4" aria-hidden />
        {pending ? "Conversion…" : "Transformer en client"}
      </Button>

      <Modal
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!pending) setConfirmOpen(open);
        }}
        title="Transformer en client ?"
        description="Fermeture du parcours commercial CRM."
        size="md"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => setConfirmOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => runConvert()}
            >
              <UserCheck className="h-4 w-4" aria-hidden />
              {pending ? "Conversion…" : "Confirmer"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 p-5 text-sm text-msk-ink/75">
          <p>
            Cette action va :
          </p>
          <ul className="list-inside list-disc space-y-1.5 text-msk-ink/70">
            <li>créer le <strong>client commercial</strong> (dossier GED) ;</li>
            <li>
              passer le statut CRM à <strong>Client</strong> ;
            </li>
            <li>enregistrer une ligne dans le journal d’activités.</li>
          </ul>
          <p className="text-xs text-msk-ink/45">
            Les devis restent gelés pour l’instant — vous pourrez les rouvrir
            plus tard depuis la fiche client.
          </p>
        </div>
      </Modal>

      <Modal
        open={blockedOpen}
        onOpenChange={setBlockedOpen}
        title={
          canConvert ? "Conversion impossible" : "Statut Intéressé requis"
        }
        description={
          canConvert
            ? undefined
            : "La conversion client démarre au statut Intéressé."
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
            {!canConvert && canOpenStage && onOpenStage ? (
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
          {!canConvert ? (
            <>
              <p>
                Statut actuel :{" "}
                <span className="font-semibold text-msk-ink">
                  {STAGE_LABELS[stage]}
                </span>
                .
              </p>
              <p>
                Passez le prospect en <strong>Intéressé</strong>, puis
                transformez-le en client depuis cette fiche.
              </p>
              <p className="text-xs text-msk-ink/45">{COM_DOCS_GATED_HINT}</p>
            </>
          ) : null}
          {error ? (
            <p className="rounded-lg border border-msk-coral/25 bg-msk-coral/5 px-3 py-2 text-msk-coral">
              {error}
            </p>
          ) : null}
        </div>
      </Modal>
    </>
  );
}

function ProspectDevisCta({
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
                setCreateOpen(false);
                const fd = new FormData();
                fd.set("quoteId", quoteId);
                const pdf = await generateQuotePdfAction(fd);
                router.refresh();
                if (!pdf.ok) {
                  router.push(`/commercial/devis/${quoteId}`);
                }
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
