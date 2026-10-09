import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
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

export const metadata: Metadata = { title: "Charte MSK" };

const TOKENS = [
  { name: "msk-blue", hex: "#1D73BC", usage: "Primary / CTA" },
  { name: "msk-ink", hex: "#0D1330", usage: "Texte / fonds sombres" },
  { name: "msk-coral", hex: "#FF5A3C", usage: "Accent ≤ 10 %" },
  { name: "msk-chalk", hex: "#F5F3EF", usage: "Fond pages" },
];

export default async function ChartePage() {
  const user = await requireUser();
  if (!hasPermission(user, "cfg.brand")) redirect("/accueil");

  const assets = await prisma.brandAsset.findMany({
    where: { active: true },
    orderBy: { kind: "asc" },
  });

  return (
    <PageShell>
      <PageHeader
        title="Charte graphique"
        description="Tokens MSK et assets brand référencés pour l’ERP et les PDF."
        breadcrumbs={[
          { label: "Administration" },
          { label: "Charte" },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Couleurs</CardTitle>
          <CardDescription>Référence charte v3 — tokens Tailwind `msk-*`.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TOKENS.map((t) => (
              <div
                key={t.name}
                className="overflow-hidden rounded-xl border border-msk-ink/10"
              >
                <div className="h-16" style={{ backgroundColor: t.hex }} />
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold text-msk-ink">{t.name}</p>
                  <p className="font-mono text-xs text-msk-ink/50">{t.hex}</p>
                  <p className="mt-1 text-xs text-msk-ink/40">{t.usage}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logos</CardTitle>
          <CardDescription>
            Assets `public/brand` — enregistrés en base pour les gabarits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <p className="text-sm text-msk-ink/45">
              Aucun asset seedé — relancer `npm run db:seed`.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {assets.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col items-center gap-3 rounded-xl border border-msk-ink/10 bg-msk-ink p-4"
                >
                  <div className="relative h-16 w-full">
                    <Image
                      src={a.publicPath}
                      alt={a.label}
                      fill
                      className="object-contain"
                      sizes="200px"
                      unoptimized={a.publicPath.endsWith(".svg")}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-white">{a.label}</p>
                    <p className="font-mono text-[10px] text-white/50">
                      {a.kind}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
