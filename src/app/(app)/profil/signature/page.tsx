import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { signedGedUrl } from "@/lib/ged/storage";
import { getSignaturePngBytes } from "@/lib/signatures/resolve";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignatureUploadForm } from "@/components/admin/signature-upload-form";
import { SignaturePreviewCard } from "@/components/admin/signature-preview";

export const metadata: Metadata = { title: "Ma signature" };

export default async function MySignaturePage() {
  const user = await requireUser();
  if (!hasPermission(user, "self.signature.manage")) redirect("/accueil");

  // Backfill / upgrade v2 (retire fond gris des anciens cleans)
  await getSignaturePngBytes({ ownerUserId: user.id }).catch(() => null);

  const signatures = await prisma.signatureAsset.findMany({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const items = await Promise.all(
    signatures.map(async (s) => {
      let previewUrl: string | null = null;
      const path = s.storageCleaned ?? s.storageOriginal;
      try {
        previewUrl = await signedGedUrl(path, 3600);
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
      };
    }),
  );

  const active = items.find((i) => i.status === "ACTIVE");

  return (
    <PageShell>
      <PageHeader
        backHref="/accueil"
        backLabel="Retour à l’accueil"
        title="Ma signature"
        description="Déposez une image PNG, JPEG ou WebP — le fond papier est retiré automatiquement (PNG transparent)."
        breadcrumbs={[
          { label: "Accueil", href: "/accueil" },
          { label: "Signature" },
        ]}
      />

      {active?.previewUrl ? (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Signature active</CardTitle>
            <CardDescription>{active.label}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex max-w-md items-center justify-center rounded-xl border border-msk-ink/8 bg-[linear-gradient(45deg,#f3f3f3_25%,transparent_25%,transparent_75%,#f3f3f3_75%,#f3f3f3),linear-gradient(45deg,#f3f3f3_25%,transparent_25%,transparent_75%,#f3f3f3_75%,#f3f3f3)] bg-[length:16px_16px] bg-[position:0_0,8px_8px] p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.previewUrl}
                alt={active.label}
                className="max-h-28 max-w-full object-contain"
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Déposer</CardTitle>
            <CardDescription>
              Original conservé + version nettoyée (fond transparent) pour PDF.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignatureUploadForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historique</CardTitle>
            <CardDescription>Cliquez une vignette pour agrandir.</CardDescription>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-sm text-msk-ink/40">Aucune signature.</p>
            ) : (
              <ul className="space-y-2">
                {items.map((item) => (
                  <SignaturePreviewCard key={item.id} item={item} compact />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
