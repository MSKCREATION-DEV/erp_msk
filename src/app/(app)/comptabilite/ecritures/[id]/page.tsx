import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { formatXof } from "@/lib/comptabilite/money";
import { ENTRY_STATUS_LABEL } from "@/lib/comptabilite/labels";
import { EntryValidateButton } from "@/components/comptabilite/entry-validate-button";

export const metadata: Metadata = { title: "Écriture" };

export default async function ComptabiliteEcritureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "cpt.access")) redirect("/accueil");
  const { id } = await params;

  const entry = await prisma.cptEntry.findUnique({
    where: { id },
    include: {
      journal: { select: { code: true, label: true } },
      period: {
        select: { month: true, exercise: { select: { year: true } } },
      },
      createdBy: { select: { firstName: true, lastName: true } },
      validatedBy: { select: { firstName: true, lastName: true } },
      lines: {
        orderBy: { sortOrder: "asc" },
        include: { account: { select: { code: true, label: true } } },
      },
    },
  });
  if (!entry) notFound();

  const totalDebit = entry.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = entry.lines.reduce((s, l) => s + l.credit, 0);

  const canValidate =
    entry.status === "DRAFT" &&
    (hasPermission(user, "cpt.ecritures.validate") ||
      hasPermission(user, "cpt.ecritures.manage"));

  return (
    <PageShell>
      <PageHeader
        title={entry.number}
        description={entry.label}
        backHref="/comptabilite/ecritures"
        backLabel="Retour aux écritures"
        breadcrumbs={[
          { label: "Comptabilité", href: "/comptabilite" },
          { label: "Écritures", href: "/comptabilite/ecritures" },
          { label: entry.number },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={entry.status === "VALIDATED" ? "success" : "ink"}>
          {ENTRY_STATUS_LABEL[entry.status]}
        </Badge>
        <Badge tone="muted">{entry.journal.code}</Badge>
        <Badge tone="muted">
          {entry.period.month.toString().padStart(2, "0")}/
          {entry.period.exercise.year}
        </Badge>
        {entry.sourceType === "COM_INVOICE" ? (
          <Badge tone="blue">Généré depuis facture</Badge>
        ) : null}
      </div>

      <div className="grid gap-4 @lg:grid-cols-3">
        <Surface className="space-y-2 p-5 text-sm @lg:col-span-1">
          <p>
            <span className="text-msk-ink/45">Date </span>
            {entry.entryDate.toLocaleDateString("fr-FR")}
          </p>
          <p>
            <span className="text-msk-ink/45">Créée par </span>
            {entry.createdBy.firstName} {entry.createdBy.lastName}
          </p>
          {entry.validatedBy ? (
            <p>
              <span className="text-msk-ink/45">Validée par </span>
              {entry.validatedBy.firstName} {entry.validatedBy.lastName}
            </p>
          ) : null}
          {entry.sourceType === "COM_INVOICE" && entry.sourceId ? (
            <p>
              <Link prefetch={false}
                href={`/commercial/factures/${entry.sourceId}`}
                className="text-msk-blue hover:underline"
              >
                Voir la facture source
              </Link>
            </p>
          ) : null}
          <p className="font-semibold">
            Total {formatXof(totalDebit)}
          </p>
        </Surface>

        <Surface className="overflow-x-auto p-0 @lg:col-span-2">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-msk-ink/10 text-msk-ink/45">
              <tr>
                <th className="px-4 py-3 font-medium">Compte</th>
                <th className="px-4 py-3 font-medium">Libellé</th>
                <th className="px-4 py-3 font-medium">Débit</th>
                <th className="px-4 py-3 font-medium">Crédit</th>
              </tr>
            </thead>
            <tbody>
              {entry.lines.map((l) => (
                <tr key={l.id} className="border-b border-msk-ink/5">
                  <td className="px-4 py-2">
                    <span className="font-medium text-msk-ink">
                      {l.account.code}
                    </span>{" "}
                    <span className="text-msk-ink/55">
                      {l.account.label}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-msk-ink/70">
                    {l.label ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    {l.debit > 0 ? formatXof(l.debit) : ""}
                  </td>
                  <td className="px-4 py-2">
                    {l.credit > 0 ? formatXof(l.credit) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-msk-ink/10 font-semibold text-msk-ink">
                <td className="px-4 py-2" colSpan={2}>
                  Total
                </td>
                <td className="px-4 py-2">{formatXof(totalDebit)}</td>
                <td className="px-4 py-2">{formatXof(totalCredit)}</td>
              </tr>
            </tfoot>
          </table>
        </Surface>
      </div>

      {canValidate ? (
        <Surface className="p-5">
          <EntryValidateButton entryId={entry.id} />
        </Surface>
      ) : null}
    </PageShell>
  );
}
