import type { PrismaClient } from "@prisma/client";
import { keepEmails } from "@/lib/crm/import/keep";
import { loadUsersMap } from "@/lib/crm/import/users-map";

export type PurgeResult = {
  crmDeleted: Record<string, number>;
  comClientsDeleted: number;
  quotesDeleted: number;
  invoicesDeleted: number;
  usersArchived: string[];
};

/**
 * Purge ordonnée du domaine CRM + clients COM liés / [TEST],
 * puis archive les users hors whitelist (sans toucher aux MDP Auth).
 */
export async function purgeCrmDomain(
  prisma: PrismaClient,
  opts?: { archiveUsers?: boolean },
): Promise<PurgeResult> {
  const crmDeleted: Record<string, number> = {};

  // 1. Satellites CRM (ceux sans cascade depuis org)
  crmDeleted.assignmentRequests = (
    await prisma.crmAssignmentRequest.deleteMany({})
  ).count;
  crmDeleted.opportunityOffers = (
    await prisma.crmOpportunityOffer.deleteMany({})
  ).count;
  crmDeleted.activities = (await prisma.crmActivity.deleteMany({})).count;
  crmDeleted.tasks = (await prisma.crmTask.deleteMany({})).count;
  crmDeleted.periodGoals = (await prisma.crmPeriodGoal.deleteMany({})).count;
  crmDeleted.weeklyReports = (await prisma.crmWeeklyReport.deleteMany({}))
    .count;

  // 2. Clients COM liés CRM, [TEST], Smoke / Review (fixtures) — devis / factures d’abord
  const linkedClients = await prisma.comClient.findMany({
    where: {
      OR: [
        { sourceOpportunityId: { not: null } },
        { crmOrganizationId: { not: null } },
        { name: { startsWith: "[TEST]" } },
        { name: { startsWith: "Smoke ", mode: "insensitive" } },
        { name: { startsWith: "Review SA", mode: "insensitive" } },
        { contactName: { contains: "Smoke", mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  const clientIds = linkedClients.map((c) => c.id);

  let quotesDeleted = 0;
  let invoicesDeleted = 0;
  if (clientIds.length > 0) {
    // Factures avant devis (FK quote)
    invoicesDeleted = (
      await prisma.comInvoice.deleteMany({
        where: { clientId: { in: clientIds } },
      })
    ).count;
    quotesDeleted = (
      await prisma.comQuote.deleteMany({
        where: { clientId: { in: clientIds } },
      })
    ).count;
  }

  // Détacher quotes encore liés à des opportunities (hors clients déjà ciblés)
  await prisma.comQuote.updateMany({
    where: { opportunityId: { not: null } },
    data: { opportunityId: null },
  });

  const comClientsDeleted = clientIds.length
    ? (await prisma.comClient.deleteMany({ where: { id: { in: clientIds } } }))
        .count
    : 0;

  // 3. Opportunities puis organizations (contacts/channels cascade)
  crmDeleted.opportunities = (await prisma.crmOpportunity.deleteMany({}))
    .count;
  crmDeleted.organizations = (await prisma.crmOrganization.deleteMany({}))
    .count;

  const usersArchived: string[] = [];
  if (opts?.archiveUsers !== false) {
    const keep = keepEmails();
    const map = loadUsersMap();
    for (const def of Object.values(map.aliases)) {
      keep.add(def.email.toLowerCase());
    }

    const victims = await prisma.user.findMany({
      where: {
        isSuperAdmin: false,
        email: { notIn: [...keep] },
        status: { not: "ARCHIVED" },
      },
      select: { id: true, email: true },
    });

    for (const u of victims) {
      await prisma.userPack.deleteMany({ where: { userId: u.id } });
      await prisma.groupMember.deleteMany({ where: { userId: u.id } });
      await prisma.user.update({
        where: { id: u.id },
        data: {
          status: "ARCHIVED",
          mustChangePassword: false,
        },
      });
      usersArchived.push(u.email);

      // Ban Auth soft — sans toucher password
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (url && key) {
          const { createClient } = await import("@supabase/supabase-js");
          const admin = createClient(url, key, {
            auth: { autoRefreshToken: false, persistSession: false },
          });
          await admin.auth.admin.updateUserById(u.id, { ban_duration: "876000h" });
        }
      } catch {
        // ignore Auth errors — Prisma ARCHIVED suffit pour bloquer session
      }
    }
  }

  return {
    crmDeleted,
    comClientsDeleted,
    quotesDeleted,
    invoicesDeleted,
    usersArchived,
  };
}
