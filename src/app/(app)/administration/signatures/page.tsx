import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignatureStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RevokeSignatureButton } from "@/components/admin/revoke-signature-button";

export const metadata: Metadata = { title: "Signatures" };

export default async function AdminSignaturesPage() {
  const user = await requireUser();
  if (!hasPermission(user, "cfg.signatures")) redirect("/accueil");

  const signatures = await prisma.signatureAsset.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { firstName: true, lastName: true, email: true } },
    },
    take: 100,
  });

  return (
    <PageShell>
      <PageHeader
        title="Signatures"
        description="Bibliothèque signatures — révocation admin."
        breadcrumbs={[
          { label: "Administration" },
          { label: "Signatures" },
        ]}
      />

      <Card>
        <CardContent className="p-0">
          {signatures.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-msk-ink/40">
              Aucune signature déposée.
            </p>
          ) : (
            <ul className="divide-y divide-msk-ink/[0.06]">
              {signatures.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-msk-ink">{s.label}</p>
                    <p className="truncate text-xs text-msk-ink/45">
                      {s.owner
                        ? `${s.owner.firstName} ${s.owner.lastName} · ${s.owner.email}`
                        : s.orgOwned
                          ? "Société"
                          : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      tone={
                        s.status === SignatureStatus.ACTIVE
                          ? "success"
                          : s.status === SignatureStatus.REVOKED
                            ? "coral"
                            : "muted"
                      }
                    >
                      {s.status}
                    </Badge>
                    {s.status !== SignatureStatus.REVOKED ? (
                      <RevokeSignatureButton signatureId={s.id} />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
