import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireUser();
    if (!hasPermission(user, "self.notifications.view") && !user.isSuperAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const [items, unread] = await Promise.all([
      prisma.appNotification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.appNotification.count({
        where: { userId: user.id, readAt: null },
      }),
    ]);
    return NextResponse.json({
      unread,
      items: items.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        href: n.href,
        kind: n.kind,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}
