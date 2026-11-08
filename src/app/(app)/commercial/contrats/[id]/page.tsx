import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { canAccessComDocForClient } from "@/lib/commercial/scope";
import { commercialTeamUserIds } from "@/lib/crm/team";
import {
  CONTRACT_FAMILY_LABELS,
  formatComMoney,
  SERVICE_KIND_LABELS,
} from "@/lib/commercial/labels";
import { displayDocNumber } from "@/lib/commercial/doc-display";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { ContractDocActions } from "@/components/commercial/contract-doc-actions";
import { ContractInvoiceActions } from "@/components/commercial/contract-invoice-actions";
import { ContractStatusActions } from "@/components/commercial/contract-status-actions";

export const metadata: Metadata = { title: "Contrat" };

const STATUS_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  ACTIF: "Actif",
  SUSPENDU: "Suspendu",
  RESILIE: "Résilié",
  TERMINE: "Terminé",
};

export default async function ContratDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (
    !hasPermission(user, "com.contrats.manage") &&
    !hasPermission(user, "com.access")
  ) {
    redirect("/commercial");
  }

  const { id } = await params;
  const teamIds = await commercialTeamUserIds();
  const memberIds = Array.from(new Set([user.id, ...teamIds]));

  const contract = await prisma.comContract.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, ownerId: true } },
      quote: { select: { id: true, number: true, draftCode: true } },
      lines: { orderBy: { sortOrder: "asc" } },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          number: true,
          draftCode: true,
          status: true,
          totalTtc: true,
          currency: true,
          periodStart: true,
          periodEnd: true,
        },
      },
    },
  });
  if (!contract) notFound();
  if (
    !canAccessComDocForClient(
      user,
      contract.client.ownerId,
      memberIds,
      contract.ownerId,
    )
  ) {
    redirect("/commercial/contrats");
  }

  const canInvoice = hasPermission(user, "com.factures.create");
  const canManageContract = hasPermission(user, "com.contrats.manage");

  return (
    <PageShell>
      <PageHeader
        title={contract.reference}
        description={contract.title ?? contract.client.name}
        backHref="/commercial/contrats"
        backLabel="Retour aux contrats"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Contrats", href: "/commercial/contrats" },
          { label: contract.reference },
        ]}
        actions={
          <Badge tone={contract.status === "ACTIF" ? "success" : "muted"}>
            {STATUS_LABEL[contract.status] ?? contract.status}
          </Badge>
        }
      />

      <div className="grid gap-4 @lg:grid-cols-12">
        <Surface className="space-y-4 p-5 sm:p-6 @lg:col-span-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
              Client
            </p>
            <Link
              prefetch={false}
              href={`/commercial/clients/${contract.client.id}`}
              className="text-sm font-medium text-msk-blue hover:underline"
            >
              {contract.client.name}
            </Link>
          </div>
          {contract.family || contract.serviceKind ? (
            <div className="flex flex-wrap gap-1.5">
              {contract.family ? (
                <Badge tone="muted">{CONTRACT_FAMILY_LABELS[contract.family]}</Badge>
              ) : null}
              {contract.serviceKind ? (
                <Badge tone="muted">{SERVICE_KIND_LABELS[contract.serviceKind]}</Badge>
              ) : null}
            </div>
          ) : null}
          {contract.quote ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
                Devis source
              </p>
              <Link
                prefetch={false}
                href={`/commercial/devis/${contract.quote.id}`}
                className="text-sm text-msk-blue hover:underline"
              >
                {displayDocNumber(
                  contract.quote.number,
                  contract.quote.draftCode,
                )}
              </Link>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[11px] text-msk-ink/35">TVA</p>
              <p>
                {contract.vatEnabled ? `${contract.vatRate} %` : "Exonéré"}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-msk-ink/35">Échéance</p>
              <p>Jour {contract.billingDay}</p>
            </div>
            <div>
              <p className="text-[11px] text-msk-ink/35">Début</p>
              <p>
                {contract.startDate
                  ? contract.startDate.toLocaleDateString("fr-FR")
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-msk-ink/35">Fin</p>
              <p>
                {contract.endDate
                  ? contract.endDate.toLocaleDateString("fr-FR")
                  : "—"}
              </p>
            </div>
          </div>
          {canManageContract ? (
            <ContractStatusActions
              contractId={contract.id}
              status={contract.status}
              alreadySigned={Boolean(contract.signedAt)}
            />
          ) : null}
          {canInvoice && contract.status === "ACTIF" ? (
            <ContractInvoiceActions contractId={contract.id} />
          ) : null}
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
              Document contrat
            </p>
            <ContractDocActions
              contractId={contract.id}
              reference={contract.reference}
              gedDocumentId={contract.gedDocumentId}
              family={contract.family}
              serviceKind={contract.serviceKind}
              canManage={canManageContract}
            />
          </div>
        </Surface>

        <Surface className="overflow-hidden p-0 @lg:col-span-8">
          <div className="border-b border-msk-ink/6 px-5 py-4">
            <h2 className="text-sm font-semibold">Prestations (snapshot)</h2>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-msk-ink/10 text-msk-ink/45">
              <tr>
                <th className="px-5 py-3 font-medium">Libellé</th>
                <th className="px-3 py-3 font-medium">Facturation</th>
                <th className="px-3 py-3 font-medium">Qté</th>
                <th className="px-5 py-3 font-medium">P.U.</th>
              </tr>
            </thead>
            <tbody>
              {contract.lines.map((l) => (
                <tr key={l.id} className="border-b border-msk-ink/5">
                  <td className="px-5 py-2.5">
                    {l.label}
                    <span className="ml-2 text-xs text-msk-ink/40">
                      {STATUS_LABEL[l.status] ?? l.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs">{l.billing}</td>
                  <td className="px-3 py-2.5 tabular-nums">{l.qty}</td>
                  <td className="px-5 py-2.5 tabular-nums">
                    {formatComMoney(l.unitPrice, contract.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Surface>

        {contract.scopeJson ? (
          <ContractScopeSummary
            scopeJson={contract.scopeJson as Record<string, unknown>}
          />
        ) : null}

        <Surface className="p-5 sm:p-6 @lg:col-span-12">
          <h2 className="mb-3 text-sm font-semibold">Factures liées</h2>
          {contract.invoices.length === 0 ? (
            <p className="text-sm text-msk-ink/45">Aucune facture pour l’instant.</p>
          ) : (
            <ul className="space-y-2">
              {contract.invoices.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-center gap-3 text-sm">
                  <Link
                    prefetch={false}
                    href={`/commercial/factures/${inv.id}`}
                    className="font-medium text-msk-blue hover:underline"
                  >
                    {displayDocNumber(inv.number, inv.draftCode)}
                  </Link>
                  <span className="text-msk-ink/45">{inv.status}</span>
                  <span className="tabular-nums">
                    {formatComMoney(inv.totalTtc, inv.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Surface>
      </div>
    </PageShell>
  );
}

const SCOPE_SECTIONS: { key: string; label: string }[] = [
  { key: "contextProblems", label: "Contexte / problèmes" },
  { key: "objectives", label: "Objectifs" },
  { key: "deliverables", label: "Livrables" },
  { key: "outOfScope", label: "Hors périmètre" },
];

/** Famille B (engagement/CDC) — périmètre saisi au parcours unifié (analyse §6.3 `scope`). */
function ContractScopeSummary({
  scopeJson,
}: {
  scopeJson: Record<string, unknown>;
}) {
  const sections = SCOPE_SECTIONS.map((s) => ({
    ...s,
    items: Array.isArray(scopeJson[s.key])
      ? (scopeJson[s.key] as unknown[]).filter(
          (v): v is string => typeof v === "string" && v.length > 0,
        )
      : [],
  })).filter((s) => s.items.length > 0);

  if (sections.length === 0) return null;

  return (
    <Surface className="space-y-4 p-5 sm:p-6 @lg:col-span-12">
      <h2 className="text-sm font-semibold">Périmètre (cahier des charges)</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <div key={s.key}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
              {s.label}
            </p>
            <ul className="mt-1.5 list-inside list-disc space-y-1 text-sm text-msk-ink/75">
              {s.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Surface>
  );
}
