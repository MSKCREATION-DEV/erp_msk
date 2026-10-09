import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Bientôt",
};

const LABELS: Record<string, string> = {
  crm: "CRM",
  commercial: "Commercial",
  comptabilite: "Comptabilité",
  projets: "Projets",
  parametres: "Paramètres",
};

export default async function BientotPage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  await requireUser();
  const { module: mod } = await params;
  const label = LABELS[mod] ?? "Module";

  return (
    <PageShell>
      <PageHeader
        title={label}
        breadcrumbs={[{ label: "MSK", href: "/accueil" }, { label: "Bientôt" }]}
        description="Ce module n’est pas encore livré dans la Phase 0."
      />
      <Surface className="max-w-xl p-8 text-center">
        <p className="text-sm text-msk-ink/55">
          Priorité roadmap : Commercial / Finance / Compta après GED (Phase 1).
        </p>
        <Link href="/accueil" className="mt-6 inline-block">
          <Button>Retour à l’accueil</Button>
        </Link>
      </Surface>
    </PageShell>
  );
}
