import type { Metadata } from "next";
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
import { Badge } from "@/components/ui/badge";
import { GenerateDemoButton } from "@/components/admin/generate-demo-pdf";

export const metadata: Metadata = { title: "Gabarits" };

export default async function GabaritsPage() {
  const user = await requireUser();
  if (!hasPermission(user, "cfg.templates")) redirect("/accueil");

  const templates = await prisma.documentTemplate.findMany({
    orderBy: [{ type: "asc" }, { code: "asc" }],
  });

  return (
    <PageShell>
      <PageHeader
        title="Gabarits"
        description="Devis & factures — génération PDF démo classée dans 04_MODELES."
        breadcrumbs={[
          { label: "Administration" },
          { label: "Gabarits" },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle>{t.name}</CardTitle>
                  <CardDescription className="font-mono text-xs">
                    {t.code} · v{t.version}
                  </CardDescription>
                </div>
                <Badge tone={t.type === "DEVIS" ? "blue" : "ink"}>
                  {t.type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <p className="text-xs text-msk-ink/45">
                {t.active
                  ? "Actif — structure alignée exemples MSK + charte"
                  : "Inactif"}
              </p>
              {t.active ? <GenerateDemoButton templateId={t.id} /> : null}
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 ? (
          <Card className="sm:col-span-2">
            <CardContent className="py-10 text-center text-sm text-msk-ink/45">
              Aucun gabarit — relancer le seed.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PageShell>
  );
}
