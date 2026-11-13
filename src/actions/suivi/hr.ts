"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { uploadSvAbsenceBytes } from "@/lib/suivi/ged";
import {
  assertJustifiedRequiresGed,
  combineSvDateTime,
  computeMinutesLate,
  parseSvDateOnly,
  statusAfterJustification,
  SV_ABSENCE_REASONS,
  SV_ABSENCE_STATUSES,
} from "@/lib/suivi/hr";
import { redirectWithFlash } from "@/lib/toast/flash";
import type { SessionUser } from "@/lib/rbac/session-user";

export type SvHrActionState = { ok: false; error: string } | null;

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const absenceSchema = z.object({
  employeeId: z.string().min(1, "Collaborateur obligatoire"),
  reason: z.enum(SV_ABSENCE_REASONS),
  reasonNote: z.string().trim().max(2000).optional().or(z.literal("")),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  deductLeave: z.enum(["0", "1"]).default("0"),
  deductLeaveNote: z.string().trim().max(1000).optional().or(z.literal("")),
  status: z.enum(SV_ABSENCE_STATUSES).optional(),
});

const lateSchema = z.object({
  employeeId: z.string().min(1, "Collaborateur obligatoire"),
  lateDate: z.string().min(1),
  expectedTime: z.string().trim().max(8).optional().or(z.literal("")),
  arrivedTime: z.string().min(1),
  note: z.string().trim().max(2000).optional().or(z.literal("")),
});

function canManage(user: SessionUser) {
  return hasPermission(user, "sv.hr.manage") || user.isSuperAdmin;
}

function emptyToNull(v: string | undefined) {
  const t = v?.trim();
  return t ? t : null;
}

function revalidateHr(paths: string[]) {
  revalidatePath("/suivi");
  revalidatePath("/suivi/absences");
  revalidatePath("/suivi/retards");
  revalidatePath("/suivi/tableau-de-bord");
  for (const p of paths) revalidatePath(p);
}

async function assertActiveEmployee(employeeId: string) {
  const emp = await prisma.rhEmployee.findFirst({
    where: {
      id: employeeId,
      status: { in: ["ACTIVE", "ONBOARDING"] },
    },
    select: { id: true },
  });
  return Boolean(emp);
}

async function readOptionalUpload(formData: FormData): Promise<
  | { ok: true; bytes: Buffer; name: string; mime: string }
  | { ok: true; bytes: null }
  | { ok: false; error: string }
> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return { ok: true, bytes: null };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "Fichier trop volumineux (max 8 Mo)." };
  }
  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(mime)) {
    return {
      ok: false,
      error: "Type de fichier non autorisé (PDF ou image).",
    };
  }
  return {
    ok: true,
    bytes: Buffer.from(await file.arrayBuffer()),
    name: file.name,
    mime,
  };
}

export async function createSvAbsence(
  _prev: SvHrActionState,
  formData: FormData,
): Promise<SvHrActionState> {
  const user = await requireUser();
  if (!canManage(user)) {
    return { ok: false, error: "Permission refusée." };
  }

  const parsed = absenceSchema.safeParse({
    employeeId: formData.get("employeeId"),
    reason: formData.get("reason"),
    reasonNote: formData.get("reasonNote") ?? "",
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    deductLeave: formData.get("deductLeave") === "1" ? "1" : "0",
    deductLeaveNote: formData.get("deductLeaveNote") ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  const start = parseSvDateOnly(parsed.data.startDate);
  const end = parseSvDateOnly(parsed.data.endDate);
  if (!start || !end) {
    return { ok: false, error: "Dates invalides." };
  }
  if (end.getTime() < start.getTime()) {
    return {
      ok: false,
      error: "La date de fin doit être après ou égale au début.",
    };
  }

  const deductLeave = parsed.data.deductLeave === "1";
  if (deductLeave && !emptyToNull(parsed.data.deductLeaveNote)) {
    return {
      ok: false,
      error: "Précisez une note si vous cochez « déduire des congés ».",
    };
  }

  if (!(await assertActiveEmployee(parsed.data.employeeId))) {
    return { ok: false, error: "Collaborateur introuvable ou inactif." };
  }

  const upload = await readOptionalUpload(formData);
  if (!upload.ok) return { ok: false, error: upload.error };

  // Justifiée seulement si demandé ET justificatif présent (upload ≠ auto-Justifiée).
  const wantJustified = formData.get("status") === "JUSTIFIEE";
  if (wantJustified && !upload.bytes) {
    const err = assertJustifiedRequiresGed("JUSTIFIEE", false);
    return { ok: false, error: err ?? "Justificatif obligatoire." };
  }

  let id: string;
  try {
    const row = await prisma.svAbsence.create({
      data: {
        employeeId: parsed.data.employeeId,
        reason: parsed.data.reason,
        reasonNote: emptyToNull(parsed.data.reasonNote),
        startDate: start,
        endDate: end,
        deductLeave,
        deductLeaveNote: deductLeave
          ? emptyToNull(parsed.data.deductLeaveNote)
          : null,
        status: "ENREGISTREE",
        createdById: user.id,
      },
      select: { id: true },
    });
    id = row.id;

    if (upload.bytes) {
      await uploadSvAbsenceBytes({
        absenceId: id,
        originalName: upload.name,
        mime: upload.mime,
        bytes: upload.bytes,
        createdById: user.id,
      });
      if (wantJustified) {
        await prisma.svAbsence.update({
          where: { id },
          data: { status: "JUSTIFIEE" },
        });
      }
    }
  } catch (e) {
    console.error("[createSvAbsence]", e);
    return { ok: false, error: "Enregistrement impossible." };
  }

  revalidateHr([`/suivi/absences/${id}`]);
  await redirectWithFlash(`/suivi/absences/${id}`, "Absence enregistrée.");
  return null;
}

export async function updateSvAbsence(
  absenceId: string,
  _prev: SvHrActionState,
  formData: FormData,
): Promise<SvHrActionState> {
  const user = await requireUser();
  if (!canManage(user)) {
    return { ok: false, error: "Permission refusée." };
  }

  const existing = await prisma.svAbsence.findUnique({
    where: { id: absenceId },
    select: { id: true, status: true, gedDocumentId: true },
  });
  if (!existing) {
    return { ok: false, error: "Absence introuvable." };
  }
  if (existing.status === "ANNULEE") {
    return { ok: false, error: "Absence annulée — modification impossible." };
  }

  const parsed = absenceSchema.safeParse({
    employeeId: formData.get("employeeId"),
    reason: formData.get("reason"),
    reasonNote: formData.get("reasonNote") ?? "",
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    deductLeave: formData.get("deductLeave") === "1" ? "1" : "0",
    deductLeaveNote: formData.get("deductLeaveNote") ?? "",
    status: formData.get("status") || existing.status,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  const start = parseSvDateOnly(parsed.data.startDate);
  const end = parseSvDateOnly(parsed.data.endDate);
  if (!start || !end) {
    return { ok: false, error: "Dates invalides." };
  }
  if (end.getTime() < start.getTime()) {
    return {
      ok: false,
      error: "La date de fin doit être après ou égale au début.",
    };
  }

  const deductLeave = parsed.data.deductLeave === "1";
  if (deductLeave && !emptyToNull(parsed.data.deductLeaveNote)) {
    return {
      ok: false,
      error: "Précisez une note si vous cochez « déduire des congés ».",
    };
  }

  if (!(await assertActiveEmployee(parsed.data.employeeId))) {
    return { ok: false, error: "Collaborateur introuvable ou inactif." };
  }

  const upload = await readOptionalUpload(formData);
  if (!upload.ok) return { ok: false, error: upload.error };

  const willHaveJustificatif =
    Boolean(existing.gedDocumentId) || Boolean(upload.bytes);
  const nextStatus = parsed.data.status ?? existing.status;
  if (nextStatus === "ANNULEE") {
    return { ok: false, error: "Utilisez l’action Annuler pour annuler." };
  }
  // Pas de promotion auto Justifiée à l’upload — le statut choisi dans le formulaire prime.

  const justifiedErr = assertJustifiedRequiresGed(
    nextStatus,
    willHaveJustificatif,
  );
  if (justifiedErr) {
    return { ok: false, error: justifiedErr };
  }

  // Justifiée sans GED déjà lié : on n’écrit le statut qu’après upload réussi.
  const needsUploadForJustified =
    nextStatus === "JUSTIFIEE" &&
    !existing.gedDocumentId &&
    Boolean(upload.bytes);
  const statusForFirstWrite = needsUploadForJustified
    ? existing.status === "JUSTIFIEE"
      ? "ENREGISTREE"
      : existing.status
    : nextStatus;

  try {
    await prisma.svAbsence.update({
      where: { id: absenceId },
      data: {
        employeeId: parsed.data.employeeId,
        reason: parsed.data.reason,
        reasonNote: emptyToNull(parsed.data.reasonNote),
        startDate: start,
        endDate: end,
        deductLeave,
        deductLeaveNote: deductLeave
          ? emptyToNull(parsed.data.deductLeaveNote)
          : null,
        status: statusForFirstWrite,
      },
    });

    if (upload.bytes) {
      await uploadSvAbsenceBytes({
        absenceId,
        originalName: upload.name,
        mime: upload.mime,
        bytes: upload.bytes,
        createdById: user.id,
      });
      await prisma.svAbsence.update({
        where: { id: absenceId },
        data: { status: nextStatus },
      });
    }
  } catch (e) {
    console.error("[updateSvAbsence]", e);
    return { ok: false, error: "Mise à jour impossible." };
  }

  revalidateHr([`/suivi/absences/${absenceId}`, `/suivi/absences/${absenceId}/edit`]);
  await redirectWithFlash(`/suivi/absences/${absenceId}`, "Absence mise à jour.");
  return null;
}

export async function cancelSvAbsence(
  absenceId: string,
): Promise<SvHrActionState> {
  const user = await requireUser();
  if (!canManage(user)) {
    return { ok: false, error: "Permission refusée." };
  }

  const existing = await prisma.svAbsence.findUnique({
    where: { id: absenceId },
    select: { id: true, status: true },
  });
  if (!existing) return { ok: false, error: "Absence introuvable." };
  if (existing.status === "ANNULEE") {
    return { ok: false, error: "Déjà annulée." };
  }

  try {
    await prisma.svAbsence.update({
      where: { id: absenceId },
      data: { status: "ANNULEE" },
    });
  } catch (e) {
    console.error("[cancelSvAbsence]", e);
    return { ok: false, error: "Annulation impossible." };
  }

  revalidateHr([`/suivi/absences/${absenceId}`]);
  await redirectWithFlash(`/suivi/absences/${absenceId}`, "Absence annulée.");
  return null;
}

/** Ajoute / remplace le justificatif GED depuis la fiche (upload direct). */
export async function attachSvAbsenceJustificatif(
  absenceId: string,
  formData: FormData,
): Promise<SvHrActionState> {
  const user = await requireUser();
  if (!canManage(user)) {
    return { ok: false, error: "Permission refusée." };
  }

  const existing = await prisma.svAbsence.findUnique({
    where: { id: absenceId },
    select: { id: true, status: true },
  });
  if (!existing) return { ok: false, error: "Absence introuvable." };
  if (existing.status === "ANNULEE") {
    return { ok: false, error: "Absence annulée — justificatif impossible." };
  }

  const upload = await readOptionalUpload(formData);
  if (!upload.ok) return { ok: false, error: upload.error };
  if (!upload.bytes) {
    return { ok: false, error: "Choisissez un fichier justificatif." };
  }

  // markJustified=0 : lier le doc sans forcer Justifiée (défaut = oui).
  const markJustified = formData.get("markJustified") !== "0";

  try {
    await uploadSvAbsenceBytes({
      absenceId,
      originalName: upload.name,
      mime: upload.mime,
      bytes: upload.bytes,
      createdById: user.id,
    });
    if (markJustified) {
      await prisma.svAbsence.update({
        where: { id: absenceId },
        data: {
          status: statusAfterJustification(existing.status, true),
        },
      });
    }
  } catch (e) {
    console.error("[attachSvAbsenceJustificatif]", e);
    return { ok: false, error: "Envoi du justificatif impossible." };
  }

  revalidateHr([
    `/suivi/absences/${absenceId}`,
    `/suivi/absences/${absenceId}/edit`,
  ]);
  await redirectWithFlash(
    `/suivi/absences/${absenceId}`,
    "Justificatif ajouté.",
  );
  return null;
}

export async function createSvLate(
  _prev: SvHrActionState,
  formData: FormData,
): Promise<SvHrActionState> {
  const user = await requireUser();
  if (!canManage(user)) {
    return { ok: false, error: "Permission refusée." };
  }

  const parsed = lateSchema.safeParse({
    employeeId: formData.get("employeeId"),
    lateDate: formData.get("lateDate"),
    expectedTime: formData.get("expectedTime") ?? "",
    arrivedTime: formData.get("arrivedTime"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  const lateDate = parseSvDateOnly(parsed.data.lateDate);
  if (!lateDate) return { ok: false, error: "Date invalide." };

  const arrivedAt = combineSvDateTime(
    parsed.data.lateDate,
    parsed.data.arrivedTime,
  );
  if (!arrivedAt) {
    return { ok: false, error: "Heure d’arrivée invalide." };
  }

  let expectedAt: Date | null = null;
  if (parsed.data.expectedTime?.trim()) {
    expectedAt = combineSvDateTime(
      parsed.data.lateDate,
      parsed.data.expectedTime,
    );
    if (!expectedAt) {
      return { ok: false, error: "Heure prévue invalide." };
    }
  }

  if (!(await assertActiveEmployee(parsed.data.employeeId))) {
    return { ok: false, error: "Collaborateur introuvable ou inactif." };
  }

  const minutesLate = computeMinutesLate(expectedAt, arrivedAt);

  let id: string;
  try {
    const row = await prisma.svLate.create({
      data: {
        employeeId: parsed.data.employeeId,
        lateDate,
        expectedAt,
        arrivedAt,
        minutesLate,
        note: emptyToNull(parsed.data.note),
        createdById: user.id,
      },
      select: { id: true },
    });
    id = row.id;
  } catch (e) {
    console.error("[createSvLate]", e);
    return { ok: false, error: "Enregistrement impossible." };
  }

  revalidateHr([`/suivi/retards/${id}`]);
  await redirectWithFlash(`/suivi/retards/${id}`, "Retard enregistré.");
  return null;
}

export async function updateSvLate(
  lateId: string,
  _prev: SvHrActionState,
  formData: FormData,
): Promise<SvHrActionState> {
  const user = await requireUser();
  if (!canManage(user)) {
    return { ok: false, error: "Permission refusée." };
  }

  const existing = await prisma.svLate.findUnique({
    where: { id: lateId },
    select: { id: true, status: true },
  });
  if (!existing) return { ok: false, error: "Retard introuvable." };
  if (existing.status === "ANNULE") {
    return { ok: false, error: "Retard annulé — modification impossible." };
  }

  const parsed = lateSchema.safeParse({
    employeeId: formData.get("employeeId"),
    lateDate: formData.get("lateDate"),
    expectedTime: formData.get("expectedTime") ?? "",
    arrivedTime: formData.get("arrivedTime"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  const lateDate = parseSvDateOnly(parsed.data.lateDate);
  if (!lateDate) return { ok: false, error: "Date invalide." };

  const arrivedAt = combineSvDateTime(
    parsed.data.lateDate,
    parsed.data.arrivedTime,
  );
  if (!arrivedAt) {
    return { ok: false, error: "Heure d’arrivée invalide." };
  }

  let expectedAt: Date | null = null;
  if (parsed.data.expectedTime?.trim()) {
    expectedAt = combineSvDateTime(
      parsed.data.lateDate,
      parsed.data.expectedTime,
    );
    if (!expectedAt) {
      return { ok: false, error: "Heure prévue invalide." };
    }
  }

  if (!(await assertActiveEmployee(parsed.data.employeeId))) {
    return { ok: false, error: "Collaborateur introuvable ou inactif." };
  }

  const minutesLate = computeMinutesLate(expectedAt, arrivedAt);

  try {
    await prisma.svLate.update({
      where: { id: lateId },
      data: {
        employeeId: parsed.data.employeeId,
        lateDate,
        expectedAt,
        arrivedAt,
        minutesLate,
        note: emptyToNull(parsed.data.note),
      },
    });
  } catch (e) {
    console.error("[updateSvLate]", e);
    return { ok: false, error: "Mise à jour impossible." };
  }

  revalidateHr([`/suivi/retards/${lateId}`, `/suivi/retards/${lateId}/edit`]);
  await redirectWithFlash(`/suivi/retards/${lateId}`, "Retard mis à jour.");
  return null;
}

export async function cancelSvLate(lateId: string): Promise<SvHrActionState> {
  const user = await requireUser();
  if (!canManage(user)) {
    return { ok: false, error: "Permission refusée." };
  }

  const existing = await prisma.svLate.findUnique({
    where: { id: lateId },
    select: { id: true, status: true },
  });
  if (!existing) return { ok: false, error: "Retard introuvable." };
  if (existing.status === "ANNULE") {
    return { ok: false, error: "Déjà annulé." };
  }

  try {
    await prisma.svLate.update({
      where: { id: lateId },
      data: { status: "ANNULE" },
    });
  } catch (e) {
    console.error("[cancelSvLate]", e);
    return { ok: false, error: "Annulation impossible." };
  }

  revalidateHr([`/suivi/retards/${lateId}`]);
  await redirectWithFlash(`/suivi/retards/${lateId}`, "Retard annulé.");
  return null;
}
