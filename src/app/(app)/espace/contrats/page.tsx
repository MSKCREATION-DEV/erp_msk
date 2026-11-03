import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import {
  CONTRACT_STATUS_LABEL,
  CONTRACT_TYPE_LABEL,
  contractStatusTone,
} from "@/lib/rh/labels";
import { findLatestLinkedDoc } from "@/lib/rh/docs-query";
import { RH_DOC } from "@/lib/rh/docs";
import { DocDownloadButton } from "@/components/rh/doc-download-button";
import Link from "next/link";

export const metadata: Metadata = { title: "Mes contrats" };

const DAY_MS = 24 * 60 * 60 * 1000;

function daysUntil(end: Date | null, now = new Date()): number | null {
  if (!end) return null;
  const a = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  const b = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((a - b) / DAY_MS);
}

export default async function EspaceContratsPage() {
  const user = await requireUser();
  const employee = await prisma.rhEmployee.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!employee) redirect("/espace");

  const contracts = await prisma.rhContract.findMany({
    where: { employeeId: employee.id },
    orderBy: { startDate: "desc" },
    include: {
      avenants: {
        orderBy: { startDate: "asc" },
      },
      parent: {
        select: { id: true, title: true, type: true },
      },
    },
  });

  const roots = contracts.filter((c) => !c.parentId);
  const orphanAvenants = contracts.filter(
    (c) => c.parentId && !contracts.some((p) => p.id === c.parentId),
  );

  const timeline = [...roots, ...orphanAvenants];

  const withPdf = await Promise.all(
    timeline.map(async (c) => {
      const linked = await findLatestLinkedDoc(RH_DOC.CONTRACT, c.id);
      const avenantDocs = await Promise.all(
        c.avenants.map(async (a) => {
          const doc = await findLatestLinkedDoc(RH_DOC.CONTRACT, a.id);
          return {
            ...a,
            documentId: doc?.id ?? a.gedDocumentId,
            generatedAt: doc?.createdAt ?? null,
          };
        }),
      );
      return {
        ...c,
        documentId: linked?.id ?? c.gedDocumentId,
        generatedAt: linked?.createdAt ?? null,
        avenantsWithPdf: avenantDocs,
      };
    }),
  );

  return (
    <PageShell>
      <PageHeader
        title="Mes contrats"
        description="Parcours professionnel : contrats successifs, avenants, échéances et PDF."
        backHref="/espace"
        backLabel="Retour à Mon espace"
        breadcrumbs={[
          { label: "Mon espace", href: "/espace" },
          { label: "Mes contrats" },
        ]}
      />

      <p className="text-sm text-msk-ink/55">
        Les fichiers restent dans la{" "}
        <Link
          prefetch={false}
          href="/espace/documents"
          className="font-medium text-msk-blue hover:underline"
        >
          vue Documents
        </Link>{" "}
        et la GED — aucun doublon.
      </p>

      {withPdf.length === 0 ? (
        <Surface className="p-6 text-sm text-msk-ink/50">
          Aucun contrat pour le moment.
        </Surface>
      ) : (
        <ol className="relative space-y-4 border-l border-msk-ink/10 pl-5">
          {withPdf.map((c) => {
            const until = daysUntil(c.endDate);
            const endingSoon =
              until !== null && until >= 0 && until <= 60 && c.status === "ACTIVE";

            return (
              <li key={c.id} className="relative">
                <span
                  className="absolute -left-[1.4rem] top-5 h-3 w-3 rounded-full border-2 border-white bg-msk-blue"
                  aria-hidden
                />
                <Surface className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-msk-ink">
                        {c.title}
                      </p>
                      <p className="mt-0.5 text-sm text-msk-ink/55">
                        {CONTRACT_TYPE_LABEL[c.type]}
                        {c.parent
                          ? ` · avenant de « ${c.parent.title} »`
                          : ""}
                      </p>
                    </div>
                    <Badge tone={contractStatusTone(c.status)}>
                      {CONTRACT_STATUS_LABEL[c.status]}
                    </Badge>
                  </div>

                  <dl className="mt-3 grid gap-2 text-xs text-msk-ink/55 sm:grid-cols-3">
                    <div>
                      <dt className="font-medium text-msk-ink/40">Début</dt>
                      <dd className="mt-0.5 text-msk-ink/70">
                        {c.startDate.toLocaleDateString("fr-FR")}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-msk-ink/40">Fin</dt>
                      <dd className="mt-0.5 text-msk-ink/70">
                        {c.endDate
                          ? c.endDate.toLocaleDateString("fr-FR")
                          : "Indéterminée"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-msk-ink/40">Document</dt>
                      <dd className="mt-0.5">
                        {c.documentId ? (
                          <DocDownloadButton
                            documentId={c.documentId}
                            label="Voir / télécharger"
                            size="sm"
                          />
                        ) : (
                          <span className="text-msk-ink/40">
                            Pas encore disponible
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  {endingSoon ? (
                    <p className="mt-3 rounded-lg bg-msk-coral/10 px-3 py-2 text-sm text-msk-coral">
                      Échéance dans {until} jour{until === 1 ? "" : "s"} — contactez
                      les RH si besoin.
                    </p>
                  ) : null}

                  {c.avenantsWithPdf.length > 0 ? (
                    <div className="mt-4 space-y-2 border-t border-msk-ink/6 pt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-caps text-msk-ink/40">
                        Avenants
                      </p>
                      {c.avenantsWithPdf.map((a) => (
                        <div
                          key={a.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-msk-chalk/70 px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-msk-ink">
                              {a.title}
                            </p>
                            <p className="text-xs text-msk-ink/50">
                              {CONTRACT_TYPE_LABEL[a.type]} ·{" "}
                              {a.startDate.toLocaleDateString("fr-FR")}
                              {a.endDate
                                ? ` → ${a.endDate.toLocaleDateString("fr-FR")}`
                                : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge tone={contractStatusTone(a.status)}>
                              {CONTRACT_STATUS_LABEL[a.status]}
                            </Badge>
                            {a.documentId ? (
                              <DocDownloadButton
                                documentId={a.documentId}
                                label="PDF"
                                size="sm"
                              />
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </Surface>
              </li>
            );
          })}
        </ol>
      )}
    </PageShell>
  );
}
