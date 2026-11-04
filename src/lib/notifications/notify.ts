import "server-only";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/resend";
import {
  notificationEmailHtml,
  notificationEmailText,
} from "@/lib/email/templates";
import { shouldEmailNotificationKind } from "@/lib/notifications/kinds";
import { usersWithPermissionWhere } from "@/lib/notifications/notify-where";
import { publicAppBaseUrl } from "@/lib/app-url";
import { mapSeries } from "@/lib/db/serial";

export { usersWithPermissionWhere } from "@/lib/notifications/notify-where";

export type NotifyPayload = {
  userIds: string[];
  kind: string;
  title: string;
  body?: string | null;
  href?: string | null;
  channels?: Array<"in_app" | "email">;
};

export async function notifyUsers(payload: NotifyPayload): Promise<number> {
  const ids = [...new Set(payload.userIds.filter(Boolean))];
  if (ids.length === 0) return 0;

  const wantEmail =
    (payload.channels?.includes("email") ??
      shouldEmailNotificationKind(payload.kind)) &&
    shouldEmailNotificationKind(payload.kind);
  const wantInApp = payload.channels?.includes("in_app") ?? true;

  const notifByUser = new Map<string, string>();
  if (wantInApp) {
    const createdAt = new Date();
    // createMany = 1 round-trip (pool connection_limit=1).
    await prisma.appNotification.createMany({
      data: ids.map((userId) => ({
        userId,
        kind: payload.kind,
        title: payload.title,
        body: payload.body ?? null,
        href: payload.href ?? null,
        createdAt,
      })),
    });

    if (wantEmail) {
      const rows = await prisma.appNotification.findMany({
        where: {
          userId: { in: ids },
          kind: payload.kind,
          createdAt: { gte: createdAt },
        },
        select: { id: true, userId: true },
        orderBy: { createdAt: "desc" },
      });
      // Un id par user (le plus récent si collision improbable).
      for (const row of rows) {
        if (!notifByUser.has(row.userId)) {
          notifByUser.set(row.userId, row.id);
        }
      }
    }

    // Pas de revalidatePath("/", "layout") : trop large (shell entier).
    // La cloche se met à jour via poll / Realtime.
    revalidatePath("/notifications");
  }

  if (wantEmail) {
    const users = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, email: true, firstName: true },
    });
    const base = publicAppBaseUrl();
    const hrefAbs = payload.href
      ? payload.href.startsWith("http")
        ? payload.href
        : `${base}${payload.href.startsWith("/") ? "" : "/"}${payload.href}`
      : `${base}/notifications`;

    // Séquentiel — pool Prisma connection_limit=1 (pas Promise.all).
    await mapSeries(users, async (u) => {
      try {
        await sendEmail({
          to: u.email,
          subject: payload.title,
          html: notificationEmailHtml({
            firstName: u.firstName,
            title: payload.title,
            body: payload.body ?? undefined,
            ctaHref: hrefAbs,
          }),
          text: notificationEmailText({
            firstName: u.firstName,
            title: payload.title,
            body: payload.body ?? undefined,
            ctaHref: hrefAbs,
          }),
        });
        const nid = notifByUser.get(u.id);
        if (nid) {
          await prisma.appNotification.update({
            where: { id: nid },
            data: { emailSentAt: new Date() },
          });
        }
      } catch (err) {
        console.error("[notifyUsers] email failed", u.id, err);
      }
    });
  }

  return ids.length;
}

export async function usersWithPermission(
  permissionCode: string,
): Promise<string[]> {
  const perm = await prisma.permission.findUnique({
    where: { code: permissionCode },
    select: { id: true },
  });
  if (!perm) {
    console.warn(
      `[usersWithPermission] permission inconnue: ${permissionCode}`,
    );
    return [];
  }

  const rows = await prisma.user.findMany({
    where: usersWithPermissionWhere(perm.id),
    select: { id: true },
  });
  return rows.map((r) => r.id);
}
