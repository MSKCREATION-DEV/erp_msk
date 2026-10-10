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
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { writeAudit } from "@/lib/audit";
import type { ActionResult } from "@/actions/auth";
import { formatDateFr } from "@/lib/pdf/winansi";
import {
  generateAttestationStagePdf,
  generateContractPrestaPdf,
  generateContractStagePdf,
  generateContractTravailPdf,
  generateFichePaiePdf,
  generateReglementInterieurPdf,
  generateSoldeToutComptePdf,
} from "@/lib/pdf/rh";
import { uploadGedObject } from "@/lib/ged/storage";
import { ensureCollaboratorSubfolder } from "@/lib/ged/tree";
import { getSignaturePngBytes } from "@/lib/signatures/resolve";
import { CONTRACT_TYPE_LABEL } from "@/lib/rh/labels";
import { RH_DOC } from "@/lib/rh/docs";
import { signedGedUrl } from "@/lib/ged/storage";
import { canViewFolderPath } from "@/lib/ged/scope";

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

  const signature = await getSignaturePngBytes({
    ownerUserId: actor.id,
  }).catch(() => null);

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
    signaturePng: signature?.bytes,
    signatureLabel: signature
      ? `${actor.firstName} ${actor.lastName}`
      : undefined,
  };

  let pdfBytes: Uint8Array;
  let kindLabel: string;
  try {
    if (contract.type === "STAGE") {
      pdfBytes = await generateContractStagePdf({ ...base, kind: "STAGE" });
      kindLabel = "STAGE";
    } else if (contract.type === "PRESTA") {
      pdfBytes = await generateContractPrestaPdf({ ...base, kind: "PRESTA" });
      kindLabel = "PRESTA";
    } else {
      pdfBytes = await generateContractTravailPdf({ ...base, kind: "TRAVAIL" });
      kindLabel = "TRAVAIL";
    }
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
  const signature = await getSignaturePngBytes({
    ownerUserId: actor.id,
  }).catch(() => null);

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateAttestationStagePdf({
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
      signaturePng: signature?.bytes,
      signatureLabel: signature
        ? `${actor.firstName} ${actor.lastName}`
        : undefined,
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

  const signature = await getSignaturePngBytes({
    ownerUserId: actor.id,
  }).catch(() => null);

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateReglementInterieurPdf({
      employee: {
        firstName: employee.firstName,
        lastName: employee.lastName,
      },
      signaturePng: signature?.bytes,
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

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateSoldeToutComptePdf({
      employee: {
        firstName: employee.firstName,
        lastName: employee.lastName,
      },
      amountXof: amount.data,
      paymentRef,
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

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateFichePaiePdf({
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
 * URL signée d’un document RH — RH admin ou collab (son dossier / self.documents.view).
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
    hasPermission(actor, "ged.view_scoped");

  if (!isRh && !canSelf) {
    return { ok: false, error: "Permission refusée" };
  }

  if (!isRh && !(await canViewFolderPath(actor, doc.folder.path))) {
    return { ok: false, error: "Document hors de votre périmètre" };
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
