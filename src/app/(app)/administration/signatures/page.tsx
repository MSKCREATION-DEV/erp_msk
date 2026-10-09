import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignatureStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { signedGedUrl } from "@/lib/ged/storage";
import { recleanActiveSignatures } from "@/lib/signatures/resolve";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { RevokeSignatureButton } from "@/components/admin/revoke-signature-button";
import { SignaturePreviewCard } from "@/components/admin/signature-preview";

export const metadata: Metadata = { title: "Signatures" };

export default async function AdminSignaturesPage() {
  const user = await requireUser();
  if (!hasPermission(user, "cfg.signatures")) redirect("/accueil");

  await recleanActiveSignatures(30).catch(() => null);

  const signatures = await prisma.signatureAsset.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { firstName: true, lastName: true, email: true } },
    },
    take: 100,
  });

  const items = await Promise.all(
    signatures.map(async (s) => {
      let previewUrl: string | null = null;
      try {
        previewUrl = await signedGedUrl(
          s.storageCleaned ?? s.storageOriginal,
          3600,
        );
      } catch {
        previewUrl = null;
      }
      return {
        id: s.id,
        label: s.label,
        status: s.status,
        mime: s.mime,
        previewUrl,
        createdAt: s.createdAt.toISOString(),
        subtitle: s.owner
          ? `${s.owner.firstName} ${s.owner.lastName} · ${s.owner.email}`
          : s.orgOwned
            ? "Société"
            : null,
        canRevoke: s.status !== SignatureStatus.REVOKED,
      };
    }),
  );

  return (
    <PageShell>
      <PageHeader
        title="Signatures"
        description="Bibliothèque signatures — aperçu et révocation admin."
        breadcrumbs={[
          { label: "Administration" },
          { label: "Signatures" },
        ]}
      />

      <Card>
        <CardContent className="p-4 sm:p-5">
          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-msk-ink/40">
              Aucune signature déposée.
            </p>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <SignaturePreviewCard
                  key={item.id}
                  item={item}
                  actions={
                    item.canRevoke ? (
                      <RevokeSignatureButton signatureId={item.id} />
                    ) : null
                  }
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
