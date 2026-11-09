import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { canTransformProspectToClient } from "@/lib/crm/guide-rules";
import { canMutateCrmDeal } from "@/lib/crm/scope";
import { ComQuoteStatus, type CrmSource } from "@/generated/prisma/client";
import { displayDocNumber } from "@/lib/commercial/doc-display";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import {
  ClientWizardForm,
  type AcceptedQuoteOpt,
  type OfferOpt,
} from "@/components/commercial/client-wizard-form";

export const metadata: Metadata = { title: "Nouveau client" };

export default async function CommercialClientNouveauPage({
  searchParams,
}: {
  searchParams: Promise<{ opportunityId?: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "com.clients.manage")) {
    redirect("/commercial/clients");
  }
  if (!hasPermission(user, "com.contrats.manage")) {
    redirect("/commercial/clients");
  }

  const sp = await searchParams;
  const opportunityId = sp.opportunityId?.trim() || undefined;

  let initial:
    | {
        name?: string;
        sector?: string;
        city?: string;
        country?: string;
        website?: string;
        contactName?: string;
        contactRole?: string;
        email?: string;
        phone?: string;
        source?: CrmSource;
        originNotes?: string;
      }
    | undefined;
  let orgName: string | undefined;
  let acceptedQuotes: AcceptedQuoteOpt[] = [];

  if (opportunityId) {
    const deal = await prisma.crmOpportunity.findUnique({
      where: { id: opportunityId },
      include: {
        organization: {
          select: {
            name: true,
            sector: true,
            city: true,
            country: true,
            website: true,
            source: true,
            notes: true,
            contacts: {
              orderBy: [
                { isPrimary: "desc" as const },
                { createdAt: "asc" as const },
              ],
              take: 1,
              select: {
                firstName: true,
                lastName: true,
                jobTitle: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });
    if (!deal || !canMutateCrmDeal(user, deal.ownerId)) {
      redirect("/crm/prospects");
    }
    if (!canTransformProspectToClient(deal.stage)) {
      redirect(`/crm/prospects/${opportunityId}`);
    }

    const contact = deal.organization.contacts[0];
    orgName = deal.organization.name;
    const source = deal.source ?? deal.organization.source ?? undefined;
    const originNotes =
      [deal.nextAction, deal.organization.notes]
        .map((s) => s?.trim())
        .filter(Boolean)
        .join("\n") || undefined;
    initial = {
      name: deal.organization.name,
      sector: deal.organization.sector ?? undefined,
      city: deal.organization.city ?? undefined,
      country: deal.organization.country ?? undefined,
      website: deal.organization.website ?? undefined,
      contactName: contact
        ? `${contact.firstName} ${contact.lastName}`.trim()
        : undefined,
      contactRole: contact?.jobTitle ?? undefined,
      email: contact?.email ?? undefined,
      phone: contact?.phone ?? undefined,
      source,
      originNotes,
    };

    const quote = await prisma.comQuote.findUnique({
      where: { opportunityId },
      select: {
        id: true,
        number: true,
        draftCode: true,
        status: true,
        lines: {
          orderBy: { sortOrder: "asc" },
          select: {
            label: true,
            qty: true,
            unitPrice: true,
            catalogOfferId: true,
            isTravel: true,
          },
        },
      },
    });
    if (quote && quote.status === ComQuoteStatus.ACCEPTE) {
      acceptedQuotes = [
        {
          id: quote.id,
          label: `Devis ${displayDocNumber(quote.number, quote.draftCode)}`,
          lines: quote.lines,
        },
      ];
    }
  }

  const canCreateQuote = hasPermission(user, "com.devis.create");
  const offerRows = canCreateQuote
    ? await prisma.catalogOffer.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          sku: true,
          priceXof: true,
          billing: true,
        },
      })
    : [];
  const offers: OfferOpt[] = offerRows;

  return (
    <PageShell>
      <PageHeader
        title={opportunityId ? "Transformer en client" : "Nouveau client"}
        description={
          opportunityId
            ? `Client + composition + contrat pour « ${orgName} ».`
            : "Client + composition + contrat — parcours unique Commercial."
        }
        backHref={
          opportunityId
            ? `/crm/prospects/${opportunityId}`
            : "/commercial/clients"
        }
        backLabel={
          opportunityId ? "Retour au prospect" : "Retour aux clients"
        }
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Clients", href: "/commercial/clients" },
          { label: "Nouveau" },
        ]}
      />
      <ClientWizardForm
        opportunityId={opportunityId}
        orgName={orgName}
        prospectEditHref={
          opportunityId ? `/crm/prospects/${opportunityId}/edit` : undefined
        }
        initial={initial}
        acceptedQuotes={acceptedQuotes}
        offers={offers}
      />
    </PageShell>
  );
}
