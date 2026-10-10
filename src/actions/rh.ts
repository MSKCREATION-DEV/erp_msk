"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  Prisma,
  RhAbsenceStatus,
  RhContractStatus,
  RhContractType,
  RhEmployeeStatus,
  RhEmployeeType,
  RhLeaveStatus,
  RhLeaveType,
  RhReglementStatus,
  RhTimesheetStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { writeAudit } from "@/lib/audit";
import type { ActionResult } from "@/actions/auth";

const cuidSchema = z.string().min(8).max(40);

function revalidateRh() {
  revalidatePath("/rh");
  revalidatePath("/rh/collaborateurs");
  revalidatePath("/rh/contrats");
  revalidatePath("/rh/conges");
  revalidatePath("/rh/absences");
  revalidatePath("/rh/heures");
  revalidatePath("/espace/conges");
  revalidatePath("/espace/absences");
  revalidatePath("/espace/heures");
}

function businessDaysInclusive(start: Date, end: Date): number {
  let days = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cur <= last) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) days += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(days, 0);
}

async function requireEmployeeForUser(userId: string) {
  return prisma.rhEmployee.findUnique({ where: { userId } });
}

// ─── Collaborateurs ───

export async function createEmployeeAction(
  formData: FormData,
): Promise<ActionResult & { employeeId?: string }> {
  const user = await requireUser();
  if (!hasPermission(user, "rh.employees.manage")) {
    return { ok: false, error: "Permission refusée" };
  }

  const parsed = z
    .object({
      firstName: z.string().trim().min(1).max(100),
      lastName: z.string().trim().min(1).max(100),
      email: z.string().trim().email().optional().or(z.literal("")),
      phone: z.string().trim().max(40).optional(),
      jobTitle: z.string().trim().max(120).optional(),
      employeeType: z.nativeEnum(RhEmployeeType),
      hireDate: z.string().optional(),
      leaveBalanceDays: z.number().min(0).max(365),
      userId: z.string().uuid().optional().or(z.literal("")),
    })
    .safeParse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email") || "",
      phone: formData.get("phone") || undefined,
      jobTitle: formData.get("jobTitle") || undefined,
      employeeType: formData.get("employeeType") || "SALARIE",
      hireDate: formData.get("hireDate") || undefined,
      leaveBalanceDays: Number(formData.get("leaveBalanceDays") ?? 0),
      userId: formData.get("userId") || "",
    });

  if (!parsed.success) return { ok: false, error: "Données invalides" };

  const linkUserId = parsed.data.userId || null;
  if (linkUserId) {
    const exists = await prisma.rhEmployee.findUnique({
      where: { userId: linkUserId },
    });
    if (exists) {
      return { ok: false, error: "Ce compte a déjà une fiche RH" };
    }
  }

  const employee = await prisma.rhEmployee.create({
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      jobTitle: parsed.data.jobTitle || null,
      employeeType: parsed.data.employeeType,
      hireDate: parsed.data.hireDate
        ? new Date(parsed.data.hireDate)
        : null,
      leaveBalanceDays: parsed.data.leaveBalanceDays,
      userId: linkUserId,
      status: "ACTIVE",
    },
  });

  await writeAudit({
    actorId: user.id,
    action: "rh.employee.create",
    entityType: "RhEmployee",
    entityId: employee.id,
    metadata: { lastName: employee.lastName },
  });

  revalidateRh();
  return { ok: true, employeeId: employee.id, message: "Collaborateur créé" };
}

export async function updateEmployeeStatusAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "rh.employees.manage")) {
    return { ok: false, error: "Permission refusée" };
  }

  const id = cuidSchema.safeParse(formData.get("employeeId"));
  const status = z.nativeEnum(RhEmployeeStatus).safeParse(formData.get("status"));
  if (!id.success || !status.success) {
    return { ok: false, error: "Données invalides" };
  }

  await prisma.rhEmployee.update({
    where: { id: id.data },
    data: { status: status.data },
  });
  revalidateRh();
  revalidatePath(`/rh/collaborateurs/${id.data}`);
  return { ok: true, message: "Statut mis à jour" };
}

export async function signReglementAction(): Promise<ActionResult> {
  const user = await requireUser();
  const emp = await requireEmployeeForUser(user.id);
  if (!emp) return { ok: false, error: "Aucune fiche RH liée à votre compte" };

  await prisma.rhEmployee.update({
    where: { id: emp.id },
    data: {
      reglementStatus: RhReglementStatus.SIGNED,
      reglementSignedAt: new Date(),
    },
  });
  await writeAudit({
    actorId: user.id,
    action: "rh.reglement.sign",
    entityType: "RhEmployee",
    entityId: emp.id,
  });
  revalidatePath("/espace");
  revalidatePath(`/rh/collaborateurs/${emp.id}`);
  return { ok: true, message: "Règlement accusé" };
}

// ─── Contrats ───

export async function createContractAction(
  formData: FormData,
): Promise<ActionResult & { contractId?: string }> {
  const user = await requireUser();
  if (!hasPermission(user, "rh.contracts.manage")) {
    return { ok: false, error: "Permission refusée" };
  }

  const parsed = z
    .object({
      employeeId: cuidSchema,
      type: z.nativeEnum(RhContractType),
      title: z.string().trim().min(1).max(200),
      startDate: z.string().min(8),
      endDate: z.string().optional(),
      salaryXof: z.number().int().min(0).optional(),
      notes: z.string().trim().max(2000).optional(),
      activate: z.boolean(),
    })
    .safeParse({
      employeeId: formData.get("employeeId"),
      type: formData.get("type") || "CDI",
      title: formData.get("title"),
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate") || undefined,
      salaryXof: formData.get("salaryXof")
        ? Number(formData.get("salaryXof"))
        : undefined,
      notes: formData.get("notes") || undefined,
      activate: formData.get("activate") === "true",
    });

  if (!parsed.success) return { ok: false, error: "Données invalides" };

  const contract = await prisma.rhContract.create({
    data: {
      employeeId: parsed.data.employeeId,
      type: parsed.data.type,
      title: parsed.data.title,
      startDate: new Date(parsed.data.startDate),
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      salaryXof: parsed.data.salaryXof ?? null,
      notes: parsed.data.notes || null,
      status: parsed.data.activate ? "ACTIVE" : "DRAFT",
    },
  });

  await writeAudit({
    actorId: user.id,
    action: "rh.contract.create",
    entityType: "RhContract",
    entityId: contract.id,
    metadata: { employeeId: contract.employeeId },
  });

  revalidateRh();
  return { ok: true, contractId: contract.id, message: "Contrat créé" };
}

export async function setContractStatusAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "rh.contracts.manage")) {
    return { ok: false, error: "Permission refusée" };
  }
  const id = cuidSchema.safeParse(formData.get("contractId"));
  const status = z.nativeEnum(RhContractStatus).safeParse(formData.get("status"));
  if (!id.success || !status.success) {
    return { ok: false, error: "Données invalides" };
  }
  await prisma.rhContract.update({
    where: { id: id.data },
    data: { status: status.data },
  });
  revalidateRh();
  revalidatePath(`/rh/contrats/${id.data}`);
  return { ok: true, message: "Statut contrat mis à jour" };
}

// ─── Congés ───

export async function requestLeaveAction(
  formData: FormData,
): Promise<ActionResult & { leaveId?: string }> {
  const user = await requireUser();
  if (!hasPermission(user, "self.leave.request")) {
    return { ok: false, error: "Permission refusée" };
  }
  const emp = await requireEmployeeForUser(user.id);
  if (!emp) {
    return {
      ok: false,
      error: "Aucune fiche RH liée — contactez l’administration",
    };
  }

  const parsed = z
    .object({
      type: z.nativeEnum(RhLeaveType),
      startDate: z.string().min(8),
      endDate: z.string().min(8),
      reason: z.string().trim().max(1000).optional(),
    })
    .safeParse({
      type: formData.get("type") || "CONGES_PAYES",
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate"),
      reason: formData.get("reason") || undefined,
    });
  if (!parsed.success) return { ok: false, error: "Données invalides" };

  const start = new Date(parsed.data.startDate);
  const end = new Date(parsed.data.endDate);
  if (end < start) return { ok: false, error: "Dates invalides" };

  const days = businessDaysInclusive(start, end);
  if (days <= 0) return { ok: false, error: "Aucun jour ouvrable" };

  const leave = await prisma.rhLeaveRequest.create({
    data: {
      employeeId: emp.id,
      requesterId: user.id,
      type: parsed.data.type,
      startDate: start,
      endDate: end,
      days,
      reason: parsed.data.reason || null,
      status: "PENDING",
    },
  });

  revalidateRh();
  return { ok: true, leaveId: leave.id, message: "Demande envoyée" };
}

export async function reviewLeaveAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "rh.leave.validate")) {
    return { ok: false, error: "Permission refusée" };
  }

  const id = cuidSchema.safeParse(formData.get("leaveId"));
  const decision = z.enum(["APPROVED", "REJECTED"]).safeParse(formData.get("decision"));
  const reviewNote = String(formData.get("reviewNote") ?? "").trim() || null;
  if (!id.success || !decision.success) {
    return { ok: false, error: "Données invalides" };
  }

  const leave = await prisma.rhLeaveRequest.findUnique({
    where: { id: id.data },
    include: { employee: true },
  });
  if (!leave || leave.status !== "PENDING") {
    return { ok: false, error: "Demande introuvable ou déjà traitée" };
  }

  if (decision.data === "APPROVED" && leave.type === "CONGES_PAYES") {
    const bal = Number(leave.employee.leaveBalanceDays);
    const need = Number(leave.days);
    if (need > bal) {
      return {
        ok: false,
        error: `Solde insuffisant (${bal} j. disponibles, ${need} demandés)`,
      };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (decision.data === "APPROVED" && leave.type === "CONGES_PAYES") {
        const need = Number(leave.days);
        const updated = await tx.rhEmployee.updateMany({
          where: {
            id: leave.employeeId,
            leaveBalanceDays: { gte: need },
          },
          data: {
            leaveBalanceDays: { decrement: need },
          },
        });
        if (updated.count !== 1) {
          throw new Error("SOLDE_INSUFFISANT");
        }
      }
      await tx.rhLeaveRequest.update({
        where: { id: leave.id },
        data: {
          status: decision.data as RhLeaveStatus,
          validatedById: user.id,
          validatedAt: new Date(),
          reviewNote,
        },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "SOLDE_INSUFFISANT") {
      return { ok: false, error: "Solde insuffisant (concurrence)" };
    }
    throw e;
  }

  await writeAudit({
    actorId: user.id,
    action: "rh.leave.review",
    entityType: "RhLeaveRequest",
    entityId: leave.id,
    metadata: { decision: decision.data },
  });

  revalidateRh();
  return {
    ok: true,
    message: decision.data === "APPROVED" ? "Congé approuvé" : "Congé refusé",
  };
}

// ─── Absences ───

export async function declareAbsenceAction(
  formData: FormData,
): Promise<ActionResult & { absenceId?: string }> {
  const user = await requireUser();
  if (!hasPermission(user, "self.absence.submit")) {
    return { ok: false, error: "Permission refusée" };
  }
  const emp = await requireEmployeeForUser(user.id);
  if (!emp) {
    return { ok: false, error: "Aucune fiche RH liée" };
  }

  const parsed = z
    .object({
      startDate: z.string().min(8),
      endDate: z.string().min(8),
      reason: z.string().trim().min(1).max(1000),
    })
    .safeParse({
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate"),
      reason: formData.get("reason"),
    });
  if (!parsed.success) return { ok: false, error: "Données invalides" };

  const start = new Date(parsed.data.startDate);
  const end = new Date(parsed.data.endDate);
  if (end < start) return { ok: false, error: "Dates invalides" };

  const absence = await prisma.rhAbsence.create({
    data: {
      employeeId: emp.id,
      declaredById: user.id,
      startDate: start,
      endDate: end,
      reason: parsed.data.reason,
      status: "DECLARED",
    },
  });

  revalidateRh();
  return { ok: true, absenceId: absence.id, message: "Absence déclarée" };
}

export async function reviewAbsenceAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "rh.absence.manage")) {
    return { ok: false, error: "Permission refusée" };
  }

  const id = cuidSchema.safeParse(formData.get("absenceId"));
  const status = z
    .enum(["JUSTIFIED", "UNJUSTIFIED"])
    .safeParse(formData.get("status"));
  const note = String(formData.get("justificationNote") ?? "").trim() || null;
  if (!id.success || !status.success) {
    return { ok: false, error: "Données invalides" };
  }

  await prisma.rhAbsence.update({
    where: { id: id.data },
    data: {
      status: status.data as RhAbsenceStatus,
      justificationNote: note,
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
  });

  revalidateRh();
  return { ok: true, message: "Absence mise à jour" };
}

// ─── Heures ───

export async function submitTimesheetAction(
  formData: FormData,
): Promise<ActionResult & { timesheetId?: string }> {
  const user = await requireUser();
  if (!hasPermission(user, "self.timesheet.submit")) {
    return { ok: false, error: "Permission refusée" };
  }
  const emp = await requireEmployeeForUser(user.id);
  if (!emp) return { ok: false, error: "Aucune fiche RH liée" };

  const weekStartRaw = String(formData.get("weekStart") ?? "");
  const linesRaw = String(formData.get("lines") ?? "[]");
  let lines: { workDate: string; minutes: number; label?: string }[];
  try {
    lines = z
      .array(
        z.object({
          workDate: z.string().min(8),
          minutes: z.number().int().min(0).max(24 * 60),
          label: z.string().max(200).optional(),
        }),
      )
      .parse(JSON.parse(linesRaw));
  } catch {
    return { ok: false, error: "Lignes invalides" };
  }

  if (!weekStartRaw || lines.length === 0) {
    return { ok: false, error: "Semaine / lignes manquantes" };
  }

  const weekStart = new Date(weekStartRaw);
  const totalMinutes = lines.reduce((s, l) => s + l.minutes, 0);

  const existing = await prisma.rhTimesheet.findUnique({
    where: { employeeId_weekStart: { employeeId: emp.id, weekStart } },
  });
  if (existing?.status === "APPROVED") {
    return {
      ok: false,
      error: "Cette semaine est déjà approuvée — contactez RH pour correction",
    };
  }
  if (existing?.status === "SUBMITTED") {
    return {
      ok: false,
      error: "Feuille déjà soumise — attendez la validation RH",
    };
  }

  try {
    const sheet = existing
      ? await prisma.rhTimesheet.update({
          where: { id: existing.id },
          data: {
            status: "SUBMITTED",
            totalMinutes,
            validatedById: null,
            validatedAt: null,
            lines: {
              deleteMany: {},
              create: lines.map((l) => ({
                workDate: new Date(l.workDate),
                minutes: l.minutes,
                label: l.label || null,
              })),
            },
          },
        })
      : await prisma.rhTimesheet.create({
          data: {
            employeeId: emp.id,
            ownerId: user.id,
            weekStart,
            status: "SUBMITTED",
            totalMinutes,
            lines: {
              create: lines.map((l) => ({
                workDate: new Date(l.workDate),
                minutes: l.minutes,
                label: l.label || null,
              })),
            },
          },
        });

    revalidateRh();
    return {
      ok: true,
      timesheetId: sheet.id,
      message: "Feuille d’heures soumise",
    };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return { ok: false, error: "Conflit feuille d’heures" };
    }
    throw e;
  }
}

export async function reviewTimesheetAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "rh.timesheet.validate")) {
    return { ok: false, error: "Permission refusée" };
  }

  const id = cuidSchema.safeParse(formData.get("timesheetId"));
  const decision = z.enum(["APPROVED", "REJECTED"]).safeParse(formData.get("decision"));
  if (!id.success || !decision.success) {
    return { ok: false, error: "Données invalides" };
  }

  const sheet = await prisma.rhTimesheet.findUnique({ where: { id: id.data } });
  if (!sheet || sheet.status !== "SUBMITTED") {
    return { ok: false, error: "Feuille introuvable ou non soumise" };
  }

  await prisma.rhTimesheet.update({
    where: { id: sheet.id },
    data: {
      status: decision.data as RhTimesheetStatus,
      validatedById: user.id,
      validatedAt: new Date(),
    },
  });

  revalidateRh();
  return {
    ok: true,
    message:
      decision.data === "APPROVED" ? "Heures approuvées" : "Heures refusées",
  };
}
