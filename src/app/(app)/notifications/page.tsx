import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { NotificationsPageClient } from "@/components/app/notifications-page-client";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();
  if (!hasPermission(user, "self.notifications.view") && !user.isSuperAdmin) {
    redirect("/accueil");
  }

  const items = await prisma.appNotification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <PageShell>
      <PageHeader
        title="Mes notifications"
        description="Alertes in-app — demandes, affectations, relances."
        backHref="/accueil"
        breadcrumbs={[{ label: "Notifications" }]}
      />
      <Surface className="p-0">
        <NotificationsPageClient
          userId={user.id}
          initialItems={items.map((n) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            href: n.href,
            kind: n.kind,
            readAt: n.readAt?.toISOString() ?? null,
            createdAt: n.createdAt.toISOString(),
          }))}
        />
      </Surface>
      <p className="mt-3 text-xs text-msk-ink/40">
        Astuce : la cloche en haut à droite se met à jour en direct.{" "}
        <Link href="/crm/affectations" className="text-msk-blue hover:underline">
          File affectations
        </Link>
      </p>
    </PageShell>
  );
}
