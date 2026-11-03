import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { PROFILE_REQUESTABLE_FIELDS } from "@/lib/rh/profile-fields";
import { ProfileChangeReviewActions } from "@/components/rh/profile-change-review-actions";

export const metadata: Metadata = { title: "Demandes de profil" };

export default async function RhProfilDemandesPage() {
  const user = await requireUser();
  if (!hasPermission(user, "rh.access")) redirect("/accueil");
  if (!hasPermission(user, "rh.employees.manage")) redirect("/rh");

  const requests = await prisma.rhProfileChangeRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      employee: {
        select: { firstName: true, lastName: true, jobTitle: true },
      },
      requester: { select: { firstName: true, lastName: true, email: true } },
      lines: true,
    },
  });

  return (
    <PageShell>
      <PageHeader
        title="Demandes de modification de profil"
        description="Vérifiez les changements proposés, puis approuvez ou refusez."
        backHref="/rh"
        backLabel="Retour RH"
        breadcrumbs={[
          { label: "RH", href: "/rh" },
          { label: "Profil — demandes" },
        ]}
      />

      {requests.length === 0 ? (
        <Surface className="p-6 text-sm text-msk-ink/50">
          Aucune demande en attente.
        </Surface>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <Surface key={r.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-msk-ink">
                    {r.employee.firstName} {r.employee.lastName}
                  </p>
                  <p className="text-xs text-msk-ink/50">
                    {r.employee.jobTitle ?? "—"} · demandé par{" "}
                    {r.requester.firstName} {r.requester.lastName} ·{" "}
                    {r.createdAt.toLocaleString("fr-FR")}
                  </p>
                </div>
                <Badge tone="blue">En attente</Badge>
              </div>

              <ul className="mt-4 space-y-2">
                {r.lines.map((l) => {
                  const label =
                    PROFILE_REQUESTABLE_FIELDS.find((f) => f.key === l.fieldKey)
                      ?.label ?? l.fieldKey;
                  return (
                    <li
                      key={l.id}
                      className="rounded-lg border border-msk-ink/8 px-3 py-2 text-sm"
                    >
                      <p className="font-medium text-msk-ink">{label}</p>
                      <p className="mt-1 text-msk-ink/55">
                        <span className="text-msk-ink/40">Avant · </span>
                        {l.oldValue || "—"}
                      </p>
                      <p className="text-msk-ink/80">
                        <span className="text-msk-ink/40">Après · </span>
                        {l.newValue || "—"}
                      </p>
                    </li>
                  );
                })}
              </ul>

              {r.note ? (
                <p className="mt-3 text-sm text-msk-ink/60">
                  <span className="font-medium text-msk-ink/45">
                    Commentaire collab ·{" "}
                  </span>
                  {r.note}
                </p>
              ) : null}

              <div className="mt-4">
                <ProfileChangeReviewActions requestId={r.id} />
              </div>
            </Surface>
          ))}
        </div>
      )}
    </PageShell>
  );
}
