"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import type { ActionResult } from "@/actions/auth";

export async function markNotificationReadAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser({ permission: "self.notifications.view" });
  const id = String(formData.get("notificationId") ?? "").trim();
  if (!id) return { ok: false, error: "Notification manquante" };

  const row = await prisma.appNotification.findFirst({
    where: { id, userId: user.id },
  });
  if (!row) return { ok: false, error: "Introuvable" };

  if (!row.readAt) {
    await prisma.appNotification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  revalidatePath("/notifications");
  return { ok: true, message: "Marquée comme lue" };
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const user = await requireUser({ permission: "self.notifications.view" });
  await prisma.appNotification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
  return { ok: true, message: "Toutes marquées comme lues" };
}

export async function listMyNotificationsAction(opts?: {
  limit?: number;
  unreadOnly?: boolean;
}) {
  const user = await requireUser({ permission: "self.notifications.view" });
  const limit = opts?.limit ?? 30;
  return prisma.appNotification.findMany({
    where: {
      userId: user.id,
      ...(opts?.unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function countUnreadNotificationsAction(): Promise<number> {
  const user = await requireUser({ permission: "self.notifications.view" });
  return prisma.appNotification.count({
    where: { userId: user.id, readAt: null },
  });
}
