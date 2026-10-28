import { NextResponse } from "next/server";
import { CrmTaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  notifyUsers,
  usersWithPermission,
} from "@/lib/notifications/notify";

export const dynamic = "force-dynamic";

/**
 * Digest relances en retard — Vercel Cron + CRON_SECRET.
 * GET/POST /api/cron/notifications
 */
export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}

async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const overdue = await prisma.crmTask.findMany({
    where: {
      status: CrmTaskStatus.OPEN,
      dueAt: { lt: now },
    },
    include: {
      opportunity: {
        select: {
          id: true,
          organization: { select: { name: true } },
        },
      },
    },
    take: 200,
  });

  let sent = 0;
  const byAssignee = new Map<string, typeof overdue>();
  for (const t of overdue) {
    const list = byAssignee.get(t.assigneeId) ?? [];
    list.push(t);
    byAssignee.set(t.assigneeId, list);
  }

  for (const [assigneeId, tasks] of byAssignee) {
    const first = tasks[0];
    const orgName =
      first?.opportunity?.organization.name ?? "prospect";
    await notifyUsers({
      userIds: [assigneeId],
      kind: "crm.followup_overdue",
      title:
        tasks.length === 1
          ? `Relance en retard — ${orgName}`
          : `${tasks.length} relances en retard`,
      body:
        tasks.length === 1
          ? `Échéance dépassée pour « ${first?.title ?? "Relance"} ».`
          : `Dont ${orgName} et d’autres dossiers.`,
      href: "/crm/relances",
    });
    sent += 1;
  }

  const old48h = overdue.filter(
    (t) => now.getTime() - t.dueAt.getTime() > 48 * 3600 * 1000,
  );
  if (old48h.length > 0) {
    const direction = await usersWithPermission("crm.reports.global");
    if (direction.length > 0) {
      await notifyUsers({
        userIds: direction,
        kind: "crm.followup_overdue",
        title: `${old48h.length} relance(s) en retard > 48 h`,
        body: "Digest Direction — voir la file Relances.",
        href: "/crm/relances",
      });
      sent += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    overdueTasks: overdue.length,
    notifies: sent,
  });
}
