"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  DocStatus,
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
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { writeAudit } from "@/lib/audit";
import type { ActionResult } from "@/actions/auth";
import { formatDateFr } from "@/lib/pdf/winansi";
import { uploadGedObject } from "@/lib/ged/storage";
import { ensureCollaboratorSubfolder } from "@/lib/ged/tree";
import { requireActiveTemplate, resolveTemplateSignature } from "@/lib/studio/engine";
import { generateOfficialPdfFromTemplate } from "@/lib/studio/generate-official-pdf";
import { CONTRACT_TYPE_LABEL, LEAVE_TYPE_LABEL } from "@/lib/rh/labels";
import { RH_DOC } from "@/lib/rh/docs";
import { signedGedUrl } from "@/lib/ged/storage";
import { canViewFolderPath } from "@/lib/ged/scope";
import {
  ensureOpeningBalance,
  recordLeaveConsumption,
} from "@/lib/rh/leave-ledger";
import {
  notifyUsers,
  usersWithPermission,
} from "@/lib/notifications/notify";

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

  const employee = await prisma.$transaction(async (tx) => {
    const created = await tx.rhEmployee.create({
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
    if (parsed.data.leaveBalanceDays > 0) {
      await ensureOpeningBalance(created.id, tx);
    }
    return created;
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
  if (
    !hasPermission(user, "self.documents.view") &&
    !hasPermission(user, "self.profile.edit")
  ) {
    return { ok: false, error: "Permission refusée" };
  }
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

  if (parsed.data.type === "CONGES_PAYES") {
    const activeContract = await prisma.rhContract.findFirst({
      where: { employeeId: emp.id, status: "ACTIVE" },
      orderBy: { startDate: "desc" },
    });
    if (activeContract) {
      const { getRuleForType } = await import("@/lib/paie/contract-rules");
      const rule = await getRuleForType(activeContract.type);
      if (!rule.accruePaidLeave) {
        return {
          ok: false,
          error:
            "Votre type de contrat n’ouvre pas droit aux congés payés (réglage Administration).",
        };
      }
    }
  }

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

  const validators = await usersWithPermission("rh.leave.validate");
  await notifyUsers({
    userIds: validators.filter((id) => id !== user.id),
    kind: "rh.leave.request",
    title: "Nouvelle demande de congé",
    body: `${emp.firstName} ${emp.lastName} — ${LEAVE_TYPE_LABEL[leave.type]} · ${Number(leave.days)} j (${start.toLocaleDateString("fr-FR")} → ${end.toLocaleDateString("fr-FR")})`,
    href: "/rh/conges",
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
        await recordLeaveConsumption(tx, {
          employeeId: leave.employeeId,
          leaveRequestId: leave.id,
          days: Number(leave.days),
          startDate: leave.startDate,
          createdById: user.id,
        });
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

  const approved = decision.data === "APPROVED";
  await notifyUsers({
    userIds: [leave.requesterId].filter((id) => id !== user.id),
    kind: approved ? "rh.leave.approved" : "rh.leave.rejected",
    title: approved ? "Congé approuvé" : "Congé refusé",
    body: `${LEAVE_TYPE_LABEL[leave.type]} · ${Number(leave.days)} j (${leave.startDate.toLocaleDateString("fr-FR")} → ${leave.endDate.toLocaleDateString("fr-FR")})${reviewNote ? ` — ${reviewNote}` : ""}`,
    href: "/espace/conges",
  });

  revalidateRh();
  return {
    ok: true,
    message: approved ? "Congé approuvé" : "Congé refusé",
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

  let gedDocumentId: string | null = null;
  const file = formData.get("justificatif");
  if (file instanceof File && file.size > 0) {
    const allowed = new Set([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
    if (!allowed.has(file.type)) {
      return { ok: false, error: "Justificatif : PDF, JPEG, PNG ou WebP" };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { ok: false, error: "Justificatif trop lourd (max 5 Mo)" };
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const ext =
      file.type === "application/pdf"
        ? "pdf"
        : file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : "jpg";
    const folder = await ensureCollaboratorSubfolder(
      emp.firstName,
      emp.lastName,
      "01_IDENTITE_ADMIN",
      new Date().getFullYear(),
      user.id,
    );
    const fileName = `absence-${Date.now()}.${ext}`;
    const storagePath = `${folder.path.replace(/^\//, "")}/${fileName}`;
    await uploadGedObject(storagePath, bytes, file.type, { upsert: true });
    const checksum = createHash("sha256").update(bytes).digest("hex");
    const doc = await prisma.document.create({
      data: {
        folderId: folder.id,
        storagePath,
        originalName: file.name.slice(0, 180) || fileName,
        mime: file.type,
        size: bytes.byteLength,
        checksum,
        status: DocStatus.ACTIVE,
        createdById: user.id,
      },
    });
    gedDocumentId = doc.id;
  }

  const absence = await prisma.rhAbsence.create({
    data: {
      employeeId: emp.id,
      declaredById: user.id,
      startDate: start,
      endDate: end,
      reason: parsed.data.reason,
      status: "DECLARED",
      gedDocumentId,
    },
  });

  const managers = await usersWithPermission("rh.absence.manage");
  await notifyUsers({
    userIds: managers.filter((id) => id !== user.id),
    kind: "rh.absence.declared",
    title: "Absence déclarée",
    body: `${emp.firstName} ${emp.lastName} · ${start.toLocaleDateString("fr-FR")} → ${end.toLocaleDateString("fr-FR")}`,
    href: "/rh/absences",
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

  const absence = await prisma.rhAbsence.update({
    where: { id: id.data },
    data: {
      status: status.data as RhAbsenceStatus,
      justificationNote: note,
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
  });

  await notifyUsers({
    userIds: [absence.declaredById].filter((id) => id !== user.id),
    kind: "rh.absence.reviewed",
    title:
      status.data === "JUSTIFIED"
        ? "Absence justifiée"
        : "Absence non justifiée",
    body: `${absence.startDate.toLocaleDateString("fr-FR")} → ${absence.endDate.toLocaleDateString("fr-FR")}${note ? ` — ${note}` : ""}`,
    href: "/espace/absences",
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

    const validators = await usersWithPermission("rh.timesheet.validate");
    await notifyUsers({
      userIds: validators.filter((id) => id !== user.id),
      kind: "rh.timesheet.submitted",
      title: "Feuille d’heures soumise",
      body: `${emp.firstName} ${emp.lastName} · semaine du ${sheet.weekStart.toLocaleDateString("fr-FR")}`,
      href: "/rh/heures",
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

  const approved = decision.data === "APPROVED";
  await notifyUsers({
    userIds: [sheet.ownerId].filter((id) => id !== user.id),
    kind: "rh.timesheet.reviewed",
    title: approved ? "Heures approuvées" : "Heures refusées",
    body: `Semaine du ${sheet.weekStart.toLocaleDateString("fr-FR")}`,
    href: "/espace/heures",
  });

  revalidateRh();
  return {
    ok: true,
    message: approved ? "Heures approuvées" : "Heures refusées",
  };
}

// ─── PDF RH (contrats, attestation, règlement, solde, fiche paie) ───

async function storeRhPdf(opts: {
  actorId: string;
  firstName: string;
  lastName: string;
  subCode: Parameters<typeof ensureCollaboratorSubfolder>[2];
  fileName: string;
  pdfBytes: Uint8Array;
  entityType: string;
  entityId: string;
  auditAction: string;
}) {
  const folder = await ensureCollaboratorSubfolder(
    opts.firstName,
    opts.lastName,
    opts.subCode,
    new Date().getFullYear(),
    opts.actorId,
  );
  const storagePath = `${folder.path.replace(/^\//, "")}/${opts.fileName}`;
  await uploadGedObject(storagePath, opts.pdfBytes, "application/pdf", {
    upsert: true,
  });
  const checksum = createHash("sha256").update(opts.pdfBytes).digest("hex");
  const doc = await prisma.document.create({
    data: {
      folderId: folder.id,
      storagePath,
      originalName: opts.fileName,
      mime: "application/pdf",
      size: opts.pdfBytes.byteLength,
      checksum,
      createdById: opts.actorId,
      links: {
        create: {
          entityType: opts.entityType,
          entityId: opts.entityId,
        },
      },
    },
  });
  await writeAudit({
    actorId: opts.actorId,
    action: opts.auditAction,
    entityType: "document",
    entityId: doc.id,
    metadata: { linked: opts.entityId, fileName: opts.fileName },
  });
  return doc;
}

function slugName(first: string, last: string) {
  return `${last}_${first}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .toUpperCase();
}

/** Génère le PDF du contrat selon son type (CDI/CDD → travail, STAGE, PRESTA). */
export async function generateContractPdfAction(
  formData: FormData,
): Promise<ActionResult & { documentId?: string }> {
  const actor = await requireUser({ permission: "rh.contracts.manage" });
  const id = cuidSchema.safeParse(formData.get("contractId"));
  if (!id.success) return { ok: false, error: "Contrat manquant" };

  const contract = await prisma.rhContract.findUnique({
    where: { id: id.data },
    include: { employee: true },
  });
  if (!contract) return { ok: false, error: "Contrat introuvable" };

  // Hook Studio documentaire — même registre central que Devis/Facture
  // (Commercial) : le gabarit fait autorité, signature jamais injectée si
  // `signatureEnabled=false` sur le gabarit, même si l'acteur a une
  // signature active enregistrée.
  const contractTemplateCode =
    contract.type === "STAGE"
      ? "contrat_stage_msk"
      : contract.type === "PRESTA"
        ? "contrat_presta_msk"
        : "contrat_travail_msk";
  let contractTemplate: Awaited<ReturnType<typeof requireActiveTemplate>>;
  try {
    contractTemplate = await requireActiveTemplate(contractTemplateCode);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gabarit indisponible" };
  }
  const signature = await resolveTemplateSignature({
    template: contractTemplate,
    ownerUserId: actor.id,
    signerLabel: `${actor.firstName} ${actor.lastName}`,
  });

  const person = {
    firstName: contract.employee.firstName,
    lastName: contract.employee.lastName,
    email: contract.employee.email ?? undefined,
    phone: contract.employee.phone ?? undefined,
    jobTitle: contract.employee.jobTitle ?? contract.title,
  };
  const base = {
    title: contract.title,
    startDate: formatDateFr(contract.startDate),
    endDate: contract.endDate ? formatDateFr(contract.endDate) : undefined,
    salaryXof: contract.salaryXof ?? undefined,
    notes: contract.notes ?? undefined,
    employee: person,
    signaturePng: signature.bytes,
    signatureLabel: signature.label,
  };

  let pdfBytes: Uint8Array;
  let kindLabel: string;
  const variant =
    contract.type === "STAGE"
      ? ("STAGE" as const)
      : contract.type === "PRESTA"
        ? ("PRESTA" as const)
        : ("TRAVAIL" as const);
  kindLabel = variant;
  try {
    pdfBytes = await generateOfficialPdfFromTemplate({
      template: contractTemplate,
      payload: {
        kind: "rh_contract",
        variant,
        input: { ...base, kind: variant },
      },
      signature: {
        signaturePng: signature.bytes,
        signatureLabel: signature.label,
      },
      strictVariables: true,
    });
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? `Génération PDF: ${e.message}`
          : "Échec génération PDF",
    };
  }

  const fileName = `CONTRAT_${kindLabel}_${slugName(person.firstName, person.lastName)}.pdf`;
  try {
    const doc = await storeRhPdf({
      actorId: actor.id,
      firstName: person.firstName,
      lastName: person.lastName,
      subCode: "02_CONTRATS",
      fileName,
      pdfBytes,
      entityType: RH_DOC.CONTRACT,
      entityId: contract.id,
      auditAction: "rh.contract.generate_pdf",
    });
    await prisma.rhContract.update({
      where: { id: contract.id },
      data: { gedDocumentId: doc.id },
    });
    revalidateRh();
    revalidatePath(`/rh/contrats/${contract.id}`);
    revalidatePath(`/rh/collaborateurs/${contract.employeeId}`);
    revalidatePath("/espace");
    revalidatePath("/espace/documents");
    revalidatePath("/espace/contrats");
    revalidatePath("/ged");
    return {
      ok: true,
      message: `PDF contrat classé GED (${fileName})`,
      documentId: doc.id,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Échec dépôt GED",
    };
  }
}

/** Attestation de stage / fin de mission pour un collaborateur. */
export async function generateAttestationPdfAction(
  formData: FormData,
): Promise<ActionResult & { documentId?: string }> {
  const actor = await requireUser({ permission: "rh.employees.manage" });
  const id = cuidSchema.safeParse(formData.get("employeeId"));
  if (!id.success) return { ok: false, error: "Collaborateur manquant" };

  const employee = await prisma.rhEmployee.findUnique({
    where: { id: id.data },
    include: {
      contracts: { orderBy: { startDate: "desc" }, take: 1 },
    },
  });
  if (!employee) return { ok: false, error: "Collaborateur introuvable" };

  const c = employee.contracts[0];
  let attestationTemplate: Awaited<ReturnType<typeof requireActiveTemplate>>;
  try {
    attestationTemplate = await requireActiveTemplate("attestation_stage_msk");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gabarit indisponible" };
  }
  const signature = await resolveTemplateSignature({
    template: attestationTemplate,
    ownerUserId: actor.id,
    signerLabel: `${actor.firstName} ${actor.lastName}`,
  });

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateOfficialPdfFromTemplate({
      template: attestationTemplate,
      payload: {
        kind: "rh_attestation",
        input: {
          employee: {
            firstName: employee.firstName,
            lastName: employee.lastName,
            jobTitle: employee.jobTitle ?? undefined,
          },
          startDate: c
            ? formatDateFr(c.startDate)
            : employee.hireDate
              ? formatDateFr(employee.hireDate)
              : formatDateFr(),
          endDate: c?.endDate
            ? formatDateFr(c.endDate)
            : employee.endDate
              ? formatDateFr(employee.endDate)
              : formatDateFr(),
          jobTitle: employee.jobTitle ?? c?.title ?? "Stagiaire",
        },
      },
      signature: {
        signaturePng: signature.bytes,
        signatureLabel: signature.label,
      },
      strictVariables: true,
    });
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? `Génération PDF: ${e.message}`
          : "Échec génération PDF",
    };
  }

  const fileName = `ATTESTATION_${slugName(employee.firstName, employee.lastName)}.pdf`;
  try {
    const doc = await storeRhPdf({
      actorId: actor.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      subCode: "05_DIPLOMES_ATTESTATIONS",
      fileName,
      pdfBytes,
      entityType: RH_DOC.ATTESTATION,
      entityId: employee.id,
      auditAction: "rh.attestation.generate_pdf",
    });
    revalidateRh();
    revalidatePath(`/rh/collaborateurs/${employee.id}`);
    revalidatePath("/espace/documents");
    return {
      ok: true,
      message: `Attestation classée GED`,
      documentId: doc.id,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Échec dépôt GED",
    };
  }
}

/** Règlement intérieur — accusé de réception PDF. */
export async function generateReglementPdfAction(
  formData: FormData,
): Promise<ActionResult & { documentId?: string }> {
  const actor = await requireUser({ permission: "rh.employees.manage" });
  const id = cuidSchema.safeParse(formData.get("employeeId"));
  if (!id.success) return { ok: false, error: "Collaborateur manquant" };

  const employee = await prisma.rhEmployee.findUnique({ where: { id: id.data } });
  if (!employee) return { ok: false, error: "Collaborateur introuvable" };

  let reglementTemplate: Awaited<ReturnType<typeof requireActiveTemplate>>;
  try {
    reglementTemplate = await requireActiveTemplate("reglement_interieur_msk");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gabarit indisponible" };
  }
  const signature = await resolveTemplateSignature({
    template: reglementTemplate,
    ownerUserId: actor.id,
    signerLabel: `${actor.firstName} ${actor.lastName}`,
  });

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateOfficialPdfFromTemplate({
      template: reglementTemplate,
      payload: {
        kind: "rh_reglement",
        input: {
          employee: {
            firstName: employee.firstName,
            lastName: employee.lastName,
          },
        },
      },
      signature: {
        signaturePng: signature.bytes,
        signatureLabel: signature.label,
      },
      strictVariables: true,
    });
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? `Génération PDF: ${e.message}`
          : "Échec génération PDF",
    };
  }

  const fileName = `REGLEMENT_${slugName(employee.firstName, employee.lastName)}.pdf`;
  try {
    const doc = await storeRhPdf({
      actorId: actor.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      subCode: "06_REGLEMENT_INTERIEUR",
      fileName,
      pdfBytes,
      entityType: RH_DOC.REGLEMENT,
      entityId: employee.id,
      auditAction: "rh.reglement.generate_pdf",
    });
    revalidateRh();
    revalidatePath(`/rh/collaborateurs/${employee.id}`);
    revalidatePath("/espace");
    revalidatePath("/espace/documents");
    return {
      ok: true,
      message: "Règlement intérieur PDF classé GED",
      documentId: doc.id,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Échec dépôt GED",
    };
  }
}

/** Solde de tout compte (montant XOF requis). */
export async function generateSoldePdfAction(
  formData: FormData,
): Promise<ActionResult & { documentId?: string }> {
  const actor = await requireUser({ permission: "rh.employees.manage" });
  const id = cuidSchema.safeParse(formData.get("employeeId"));
  const amount = z.coerce.number().int().min(0).safeParse(formData.get("amountXof"));
  if (!id.success || !amount.success) {
    return { ok: false, error: "Collaborateur ou montant invalide" };
  }

  const employee = await prisma.rhEmployee.findUnique({ where: { id: id.data } });
  if (!employee) return { ok: false, error: "Collaborateur introuvable" };

  const paymentRef = String(formData.get("paymentRef") ?? "").trim() || undefined;

  let soldeTemplate: Awaited<ReturnType<typeof requireActiveTemplate>>;
  try {
    soldeTemplate = await requireActiveTemplate("solde_tout_compte_msk");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gabarit indisponible" };
  }
  const signature = await resolveTemplateSignature({
    template: soldeTemplate,
    ownerUserId: actor.id,
    signerLabel: `${actor.firstName} ${actor.lastName}`,
  });

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateOfficialPdfFromTemplate({
      template: soldeTemplate,
      payload: {
        kind: "rh_solde",
        input: {
          employee: {
            firstName: employee.firstName,
            lastName: employee.lastName,
          },
          amountXof: amount.data,
          paymentRef,
        },
      },
      signature: {
        signaturePng: signature.bytes,
        signatureLabel: signature.label,
      },
      strictVariables: true,
    });
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? `Génération PDF: ${e.message}`
          : "Échec génération PDF",
    };
  }

  const fileName = `SOLDE_${slugName(employee.firstName, employee.lastName)}.pdf`;
  try {
    const doc = await storeRhPdf({
      actorId: actor.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      subCode: "09_SORTIE",
      fileName,
      pdfBytes,
      entityType: RH_DOC.SOLDE,
      entityId: employee.id,
      auditAction: "rh.solde.generate_pdf",
    });
    revalidateRh();
    revalidatePath(`/rh/collaborateurs/${employee.id}`);
    revalidatePath("/espace/documents");
    return {
      ok: true,
      message: "Solde de tout compte classé GED",
      documentId: doc.id,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Échec dépôt GED",
    };
  }
}

/** Fiche de paie indicative (aperçu Phase 5). */
export async function generateFichePaiePdfAction(
  formData: FormData,
): Promise<ActionResult & { documentId?: string }> {
  const actor = await requireUser({ permission: "rh.employees.manage" });
  const id = cuidSchema.safeParse(formData.get("employeeId"));
  if (!id.success) return { ok: false, error: "Collaborateur manquant" };

  const employee = await prisma.rhEmployee.findUnique({
    where: { id: id.data },
    include: {
      contracts: {
        where: { status: "ACTIVE" },
        orderBy: { startDate: "desc" },
        take: 1,
      },
    },
  });
  if (!employee) return { ok: false, error: "Collaborateur introuvable" };

  const c = employee.contracts[0];
  const salary = c?.salaryXof ?? 0;
  if (!salary) {
    return {
      ok: false,
      error: "Aucun salaire sur contrat actif — renseigner le contrat d'abord",
    };
  }

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  let paieTemplate: Awaited<ReturnType<typeof requireActiveTemplate>>;
  try {
    paieTemplate = await requireActiveTemplate("fiche_paie_msk");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gabarit indisponible" };
  }
  const signature = await resolveTemplateSignature({
    template: paieTemplate,
    ownerUserId: actor.id,
    signerLabel: `${actor.firstName} ${actor.lastName}`,
  });

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateOfficialPdfFromTemplate({
      template: paieTemplate,
      payload: {
        kind: "rh_payslip",
        input: {
          employee: {
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email ?? undefined,
            jobTitle: employee.jobTitle ?? undefined,
          },
          periodStart: formatDateFr(periodStart),
          periodEnd: formatDateFr(periodEnd),
          baseSalaryXof: salary,
          netSalaryXof: salary,
          contractTypeLabel: c ? CONTRACT_TYPE_LABEL[c.type] : undefined,
          leaveBalanceDays: Number(employee.leaveBalanceDays),
          leaveTakenDays: 0,
        },
      },
      signature: {
        signaturePng: signature.bytes,
        signatureLabel: signature.label,
      },
      strictVariables: true,
    });
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? `Génération PDF: ${e.message}`
          : "Échec génération PDF",
    };
  }

  const fileName = `PAIE_${slugName(employee.firstName, employee.lastName)}_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.pdf`;
  try {
    const doc = await storeRhPdf({
      actorId: actor.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      subCode: "03_PAIE",
      fileName,
      pdfBytes,
      entityType: RH_DOC.FICHE_PAIE,
      entityId: employee.id,
      auditAction: "rh.payslip.generate_pdf",
    });
    revalidateRh();
    revalidatePath(`/rh/collaborateurs/${employee.id}`);
    revalidatePath("/espace/documents");
    revalidatePath("/espace/bulletins");
    return {
      ok: true,
      message: "Fiche de paie (indicative) classée GED",
      documentId: doc.id,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Échec dépôt GED",
    };
  }
}

/**
 * Document lié au métier RH (pas Clients / Compta / modèles).
 * Empêche un profil RH d’obtenir une URL signée pour un doc hors périmètre.
 */
async function isRhScopedDocument(
  documentId: string,
  folderPath: string,
): Promise<boolean> {
  if (folderPath.includes("/05_COLLABORATEURS/")) return true;

  const link = await prisma.documentLink.findFirst({
    where: {
      documentId,
      OR: [
        { entityType: { startsWith: "Rh" } },
        {
          entityType: {
            in: [
              RH_DOC.CONTRACT,
              RH_DOC.ATTESTATION,
              RH_DOC.REGLEMENT,
              RH_DOC.SOLDE,
              RH_DOC.FICHE_PAIE,
            ],
          },
        },
      ],
    },
    select: { id: true },
  });
  if (link) return true;

  const payslip = await prisma.rhPayslip.findFirst({
    where: { gedDocumentId: documentId },
    select: { id: true },
  });
  if (payslip) return true;

  const absence = await prisma.rhAbsence.findFirst({
    where: { gedDocumentId: documentId },
    select: { id: true },
  });
  if (absence) return true;

  const avatar = await prisma.rhEmployee.findFirst({
    where: { avatarDocumentId: documentId },
    select: { id: true },
  });
  return Boolean(avatar);
}

/**
 * URL signée d’un document RH — RH admin ou collab (scope dossier / liens RH).
 */
export async function getRhDocumentUrlAction(
  formData: FormData,
): Promise<ActionResult & { url?: string }> {
  const actor = await requireUser();
  const id = cuidSchema.safeParse(formData.get("documentId"));
  if (!id.success) return { ok: false, error: "Document manquant" };

  const doc = await prisma.document.findUnique({
    where: { id: id.data },
    include: { folder: { select: { path: true } } },
  });
  if (!doc || doc.status === DocStatus.TRASH) {
    return { ok: false, error: "Document introuvable" };
  }

  const isRh =
    hasPermission(actor, "rh.employees.view") ||
    hasPermission(actor, "rh.employees.manage") ||
    hasPermission(actor, "rh.contracts.manage");
  const canSelf =
    hasPermission(actor, "self.documents.view") ||
    hasPermission(actor, "self.payslip.view") ||
    hasPermission(actor, "ged.view_scoped");

  if (!isRh && !canSelf) {
    return { ok: false, error: "Permission refusée" };
  }

  // Toujours appliquer le scope GED ; RH ne peut plus bypasser Clients/Compta.
  if (await canViewFolderPath(actor, doc.folder.path)) {
    // OK (browse full ou dossier collab / client autorisé)
  } else if (isRh && (await isRhScopedDocument(doc.id, doc.folder.path))) {
    // RH : uniquement arbo Collaborateurs ou docs liés RH
  } else {
    return { ok: false, error: "Document hors de votre périmètre" };
  }

  // Self (non-RH) : fiche de paie = uniquement la sienne (défense en profondeur).
  if (!isRh) {
    const slip = await prisma.rhPayslip.findFirst({
      where: { gedDocumentId: doc.id },
      select: { employee: { select: { userId: true } } },
    });
    if (slip && slip.employee.userId !== actor.id) {
      return { ok: false, error: "Document hors de votre périmètre" };
    }
  }

  try {
    const url = await signedGedUrl(doc.storagePath);
    return { ok: true, url };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "URL signée impossible",
    };
  }
}
