import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { NotificationsBell } from "@/components/app/notifications-bell";

/** Chargé en Suspense depuis le shell — cookies/session isolés. */
export async function TopbarNotifications() {
  const user = await requireUser();
  if (!hasPermission(user, "self.notifications.view") && !user.isSuperAdmin) {
    return null;
  }

  const [items, unread] = await Promise.all([
    prisma.appNotification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.appNotification.count({
      where: { userId: user.id, readAt: null },
    }),
  ]);

  return (
    <NotificationsBell
      userId={user.id}
      initialUnread={unread}
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
  );
}
