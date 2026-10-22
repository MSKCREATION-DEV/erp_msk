import type { Metadata } from "next";
import { GuideList } from "@/components/guides/guide-list";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { requireUser } from "@/lib/auth/session";
import { ALL_GUIDES, publishedForUser } from "@/lib/guides";

export const metadata: Metadata = { title: "Guides — FAQ" };

export default async function GuidesFaqPage() {
  const user = await requireUser({ permission: "home.view" });
  const guides = publishedForUser(user, ALL_GUIDES).filter(
    (g) =>
      g.categories.includes("faq") ||
      g.categories.includes("depannage") ||
      g.taskIds.includes("depanner"),
  );

  return (
    <PageShell>
      <PageHeader
        title="FAQ & dépannage"
        description="Problèmes d’accès, mot de passe et blocages fréquents — solutions autorisées selon vos droits."
        backHref="/guides"
        backLabel="Centre de guides"
        breadcrumbs={[
          { label: "Guides", href: "/guides" },
          { label: "FAQ" },
        ]}
      />
      <GuideList
        guides={guides}
        emptyMessage="Aucune entrée FAQ publiée pour votre profil."
      />
    </PageShell>
  );
}
