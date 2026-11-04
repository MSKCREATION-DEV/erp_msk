import "server-only";

import {
  CrmAppointmentStatus,
  CrmAssignmentRequestStatus,
  CrmTaskStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { runSeries } from "@/lib/db/serial";
import type { ProspectLinkedSummary } from "@/lib/crm/prospect-linked-meta";

export type { ProspectLinkedSummary };
export {
  countLinkedEntities,
  linkedEntitiesLabels,
} from "@/lib/crm/prospect-linked-meta";

export async function loadProspectLinkedEntities(
  opportunityId: string,
): Promise<ProspectLinkedSummary> {
  const [
    openTasks,
    scheduledAppointments,
    pendingAssignments,
    quotes,
    invoices,
    offers,
  ] = await runSeries([
    () =>
      prisma.crmTask.count({
        where: { opportunityId, status: CrmTaskStatus.OPEN },
      }),
    () =>
      prisma.crmAppointment.count({
        where: {
          opportunityId,
          status: CrmAppointmentStatus.SCHEDULED,
        },
      }),
    () =>
      prisma.crmAssignmentRequest.count({
        where: {
          opportunityId,
          status: CrmAssignmentRequestStatus.PENDING,
        },
      }),
    () => prisma.comQuote.count({ where: { opportunityId } }),
    () =>
      prisma.comInvoice.count({
        where: { quote: { opportunityId } },
      }),
    () =>
      prisma.crmOpportunityOffer.count({ where: { opportunityId } }),
  ]);

  return {
    openTasks,
    scheduledAppointments,
    pendingAssignments,
    quotes,
    invoices,
    offers,
  };
}
