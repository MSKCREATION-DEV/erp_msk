"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  CrmActivityType,
  CrmAppointmentStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { canMutateCrmDeal } from "@/lib/crm/scope";
import type { ActionResult } from "@/actions/auth";

const createSchema = z.object({
  opportunityId: z.string().min(1),
  title: z.string().trim().min(2).max(200),
  startsAt: z.string().min(1),
  endsAt: z.string().optional().default(""),
  location: z.string().trim().max(300).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
});

function parseDateTime(raw: string): Date | null {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createAppointmentAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "crm.activity.log" });
  const parsed = createSchema.safeParse({
    opportunityId: String(formData.get("opportunityId") ?? ""),
    title: String(formData.get("title") ?? ""),
    startsAt: String(formData.get("startsAt") ?? ""),
    endsAt: String(formData.get("endsAt") ?? ""),
    location: String(formData.get("location") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, error: "Formulaire RDV incomplet" };
  }
  const startsAt = parseDateTime(parsed.data.startsAt);
  if (!startsAt) return { ok: false, error: "Date / heure invalide" };
  const endsAt = parsed.data.endsAt
    ? parseDateTime(parsed.data.endsAt)
    : null;

  const deal = await prisma.crmOpportunity.findUnique({
    where: { id: parsed.data.opportunityId },
    include: { organization: { select: { name: true } } },
  });
  if (!deal) return { ok: false, error: "Prospect introuvable" };
  if (!canMutateCrmDeal(actor, deal.ownerId)) {
    return { ok: false, error: "Pas le droit sur ce prospect" };
  }

  const appt = await prisma.$transaction(async (tx) => {
    const row = await tx.crmAppointment.create({
      data: {
        opportunityId: deal.id,
        title: parsed.data.title,
        startsAt,
        endsAt,
        location: parsed.data.location || null,
        notes: parsed.data.notes || null,
        assigneeId: deal.ownerId,
        createdById: actor.id,
        status: CrmAppointmentStatus.SCHEDULED,
      },
    });
    await tx.crmActivity.create({
      data: {
        opportunityId: deal.id,
        organizationId: deal.organizationId,
        type: CrmActivityType.RDV,
        summary: `RDV planifié — ${parsed.data.title}`,
        body: [
          startsAt.toLocaleString("fr-FR"),
          parsed.data.location ? `Lieu : ${parsed.data.location}` : null,
          parsed.data.notes || null,
        ]
          .filter(Boolean)
          .join("\n"),
        actorId: actor.id,
      },
    });
    await tx.crmOpportunity.update({
      where: { id: deal.id },
      data: { lastActivityAt: new Date() },
    });
    return row;
  });

  revalidatePath("/crm/rdv");
  revalidatePath(`/crm/prospects/${deal.id}`);
  revalidatePath("/crm");
  redirect(`/crm/rdv?focus=${appt.id}`);
}

export async function updateAppointmentAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "crm.activity.log" });
  const id = String(formData.get("appointmentId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const startsRaw = String(formData.get("startsAt") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!id || !title) return { ok: false, error: "RDV incomplet" };
  const startsAt = parseDateTime(startsRaw);
  if (!startsAt) return { ok: false, error: "Date / heure invalide" };

  const appt = await prisma.crmAppointment.findUnique({
    where: { id },
    include: { opportunity: true },
  });
  if (!appt || appt.status !== CrmAppointmentStatus.SCHEDULED) {
    return { ok: false, error: "RDV introuvable" };
  }
  if (!canMutateCrmDeal(actor, appt.opportunity.ownerId)) {
    return { ok: false, error: "Pas le droit sur ce prospect" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.crmAppointment.update({
      where: { id },
      data: { title, startsAt, location, notes },
    });
    await tx.crmActivity.create({
      data: {
        opportunityId: appt.opportunityId,
        organizationId: appt.opportunity.organizationId,
        type: CrmActivityType.NOTE,
        summary: "RDV modifié",
        body: `${title} — ${startsAt.toLocaleString("fr-FR")}`,
        actorId: actor.id,
      },
    });
  });

  revalidatePath("/crm/rdv");
  revalidatePath(`/crm/prospects/${appt.opportunityId}`);
  return { ok: true, message: "RDV mis à jour" };
}

export async function setAppointmentStatusAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "crm.activity.log" });
  const id = String(formData.get("appointmentId") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  const statusParsed = z
    .nativeEnum(CrmAppointmentStatus)
    .safeParse(statusRaw);
  if (!id || !statusParsed.success) {
    return { ok: false, error: "Statut RDV invalide" };
  }
  if (statusParsed.data === CrmAppointmentStatus.SCHEDULED) {
    return { ok: false, error: "Statut invalide" };
  }

  const appt = await prisma.crmAppointment.findUnique({
    where: { id },
    include: { opportunity: true },
  });
  if (!appt || appt.status !== CrmAppointmentStatus.SCHEDULED) {
    return { ok: false, error: "RDV introuvable" };
  }
  if (!canMutateCrmDeal(actor, appt.opportunity.ownerId)) {
    return { ok: false, error: "Pas le droit sur ce prospect" };
  }

  const now = new Date();
  const label =
    statusParsed.data === "DONE"
      ? "tenu"
      : statusParsed.data === "NO_SHOW"
        ? "no-show"
        : "annulé";

  await prisma.$transaction(async (tx) => {
    await tx.crmAppointment.update({
      where: { id },
      data: {
        status: statusParsed.data,
        completedAt: now,
      },
    });
    await tx.crmActivity.create({
      data: {
        opportunityId: appt.opportunityId,
        organizationId: appt.opportunity.organizationId,
        type:
          statusParsed.data === "DONE"
            ? CrmActivityType.RDV
            : CrmActivityType.NOTE,
        summary: `RDV ${label} — ${appt.title}`,
        body: note,
        actorId: actor.id,
      },
    });
  });

  revalidatePath("/crm/rdv");
  revalidatePath(`/crm/prospects/${appt.opportunityId}`);
  revalidatePath("/crm");
  return { ok: true, message: `RDV marqué ${label}` };
}
