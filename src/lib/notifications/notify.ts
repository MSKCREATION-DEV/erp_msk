import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/resend";
import {
  notificationEmailHtml,
  notificationEmailText,
} from "@/lib/email/templates";
import { shouldEmailNotificationKind } from "@/lib/notifications/kinds";
import { publicAppBaseUrl } from "@/lib/app-url";

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
    for (const userId of ids) {
      const row = await prisma.appNotification.create({
        data: {
          userId,
          kind: payload.kind,
          title: payload.title,
          body: payload.body ?? null,
          href: payload.href ?? null,
        },
        select: { id: true },
      });
      notifByUser.set(userId, row.id);
    }
    // Topbar cloche (Suspense layout) — invalider le shell.
    revalidatePath("/", "layout");
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

    await Promise.all(
      users.map(async (u) => {
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
      }),
    );
  }

  return ids.length;
}

export async function usersWithPermission(
  permissionCode: string,
): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: {
      archivedAt: null,
      status: { in: ["ACTIVE", "MUST_CHANGE_PASSWORD", "INVITE_PENDING"] },
      OR: [
        { isSuperAdmin: true },
        {
          userPacks: {
            some: {
              pack: {
                permissions: { some: { permissionId: permissionCode } },
              },
            },
          },
        },
        {
          overrides: {
            some: { permissionId: permissionCode, effect: "GRANT" },
          },
        },
      ],
    },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}
