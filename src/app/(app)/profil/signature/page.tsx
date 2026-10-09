import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignatureStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SignatureUploadForm } from "@/components/admin/signature-upload-form";

export const metadata: Metadata = { title: "Ma signature" };

export default async function MySignaturePage() {
  const user = await requireUser();
  if (!hasPermission(user, "self.signature.manage")) redirect("/accueil");

  const signatures = await prisma.signatureAsset.findMany({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <PageShell>
      <PageHeader
        title="Ma signature"
        description="Upload image (PNG / JPEG / WebP). Une seule signature active à la fois."
        breadcrumbs={[
          { label: "Accueil", href: "/accueil" },
          { label: "Signature" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Déposer</CardTitle>
            <CardDescription>
              Original conservé — nettoyage auto reporté Phase 1.x.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignatureUploadForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historique</CardTitle>
          </CardHeader>
          <CardContent>
            {signatures.length === 0 ? (
              <p className="text-sm text-msk-ink/40">Aucune signature.</p>
            ) : (
              <ul className="space-y-2">
                {signatures.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-msk-ink/10 px-3 py-2 text-sm"
                  >
                    <span className="truncate font-medium text-msk-ink">
                      {s.label}
                    </span>
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
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
