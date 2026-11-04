"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { RhProfileChangeStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { writeAudit } from "@/lib/audit";
import type { ActionResult } from "@/actions/auth";
import {
  buildEmployeeUpdateFromLines,
  parseProfileFieldValue,
  readEmployeeField,
} from "@/lib/rh/profile-apply";
import { PROFILE_REQUESTABLE_KEYS } from "@/lib/rh/profile-fields";
import {
  notifyUsers,
  usersWithPermission,
} from "@/lib/notifications/notify";

function revalidateProfilePaths(employeeId?: string) {
  revalidatePath("/espace");
  revalidatePath("/espace/profil");
  revalidatePath("/rh");
  revalidatePath("/rh/profil-demandes");
  if (employeeId) {
    revalidatePath(`/rh/collaborateurs/${employeeId}`);
  }
}

const lineSchema = z.object({
  fieldKey: z.string().min(1).max(64),
  newValue: z.string().max(500),
});

/**
 * Collaborateur : propose une ou plusieurs modifications (jamais appliquées directement).
 */
export async function requestProfileChangeAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "self.profile.edit")) {
    return { ok: false, error: "Permission refusée" };
  }

  const employee = await prisma.rhEmployee.findUnique({
    where: { userId: user.id },
  });
  if (!employee) {
    return { ok: false, error: "Aucune fiche RH liée à votre compte" };
  }

  const note = String(formData.get("note") ?? "").trim().slice(0, 1000) || null;
  let linesRaw: unknown;
  try {
    linesRaw = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    return { ok: false, error: "Données invalides" };
  }
  const parsed = z.array(lineSchema).min(1).max(20).safeParse(linesRaw);
  if (!parsed.success) {
    return { ok: false, error: "Sélectionnez au moins un champ à modifier" };
  }

  const pending = await prisma.rhProfileChangeRequest.findFirst({
    where: { employeeId: employee.id, status: "PENDING" },
    select: { id: true },
  });
  if (pending) {
    return {
      ok: false,
      error: "Une demande est déjà en attente — attendez la décision RH",
    };
  }

  const empRecord = employee as unknown as Record<string, unknown>;
  const lines: Array<{ fieldKey: string; oldValue: string | null; newValue: string }> =
    [];

  for (const line of parsed.data) {
    if (!PROFILE_REQUESTABLE_KEYS.has(line.fieldKey)) {
      return { ok: false, error: `Champ non autorisé : ${line.fieldKey}` };
    }
    const valueCheck = parseProfileFieldValue(line.fieldKey, line.newValue);
    if (!valueCheck.ok) return { ok: false, error: valueCheck.error };
    const oldValue = readEmployeeField(empRecord, line.fieldKey);
    const newNorm =
      valueCheck.value instanceof Date
        ? valueCheck.value.toISOString().slice(0, 10)
        : valueCheck.value == null
          ? ""
          : String(valueCheck.value);
    if ((oldValue ?? "") === newNorm) continue;
    lines.push({
      fieldKey: line.fieldKey,
      oldValue,
      newValue: newNorm,
    });
  }

  if (lines.length === 0) {
    return { ok: false, error: "Aucun changement détecté" };
  }

  const created = await prisma.rhProfileChangeRequest.create({
    data: {
      employeeId: employee.id,
      requesterId: user.id,
      note,
      lines: { create: lines },
    },
    select: { id: true },
  });

  await writeAudit({
    actorId: user.id,
    action: "rh.profile_change.request",
    entityType: "RhProfileChangeRequest",
    entityId: created.id,
    metadata: { fields: lines.map((l) => l.fieldKey) },
  });

  const rhUserIds = await usersWithPermission("rh.employees.manage");
  await notifyUsers({
    userIds: rhUserIds.filter((id) => id !== user.id),
    kind: "rh.profile_change.request",
    title: "Demande de modification de profil",
    body: `${employee.firstName} ${employee.lastName} a proposé ${lines.length} modification(s).`,
    href: "/rh/profil-demandes",
  });

  revalidateProfilePaths(employee.id);
  return { ok: true };
}

/**
 * RH : approuver (applique les valeurs) ou refuser une demande.
 */
export async function reviewProfileChangeAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "rh.employees.manage")) {
    return { ok: false, error: "Permission refusée" };
  }

  const parsed = z
    .object({
      requestId: z.string().min(8).max(40),
      decision: z.enum(["APPROVED", "REJECTED"]),
      reviewNote: z.string().trim().max(1000).optional(),
    })
    .safeParse({
      requestId: formData.get("requestId"),
      decision: formData.get("decision"),
      reviewNote: String(formData.get("reviewNote") ?? "").trim() || undefined,
    });
  if (!parsed.success) {
    return { ok: false, error: "Données invalides" };
  }

  const request = await prisma.rhProfileChangeRequest.findUnique({
    where: { id: parsed.data.requestId },
    include: {
      lines: true,
      employee: { select: { id: true, userId: true, firstName: true, lastName: true } },
    },
  });
  if (!request || request.status !== RhProfileChangeStatus.PENDING) {
    return { ok: false, error: "Demande introuvable ou déjà traitée" };
  }

  if (parsed.data.decision === "REJECTED") {
    await prisma.rhProfileChangeRequest.update({
      where: { id: request.id },
      data: {
        status: "REJECTED",
        reviewedById: user.id,
        reviewedAt: new Date(),
        reviewNote: parsed.data.reviewNote ?? null,
      },
    });
    await writeAudit({
      actorId: user.id,
      action: "rh.profile_change.reject",
      entityType: "RhProfileChangeRequest",
      entityId: request.id,
    });
    if (request.employee.userId) {
      await notifyUsers({
        userIds: [request.employee.userId],
        kind: "rh.profile_change.rejected",
        title: "Modification de profil refusée",
        body:
          parsed.data.reviewNote ??
          "Votre demande de modification a été refusée par les RH.",
        href: "/espace/profil",
      });
    }
    revalidateProfilePaths(request.employeeId);
    return { ok: true };
  }

  const patch = buildEmployeeUpdateFromLines(request.lines);
  if (!patch.ok) return { ok: false, error: patch.error };

  await prisma.$transaction(async (tx) => {
    await tx.rhEmployee.update({
      where: { id: request.employeeId },
      data: patch.data,
    });
    await tx.rhProfileChangeRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        reviewedById: user.id,
        reviewedAt: new Date(),
        reviewNote: parsed.data.reviewNote ?? null,
      },
    });
  });

  await writeAudit({
    actorId: user.id,
    action: "rh.profile_change.approve",
    entityType: "RhProfileChangeRequest",
    entityId: request.id,
    metadata: { fields: request.lines.map((l) => l.fieldKey) },
  });

  if (request.employee.userId) {
    await notifyUsers({
      userIds: [request.employee.userId],
      kind: "rh.profile_change.approved",
      title: "Modification de profil approuvée",
      body: "Votre dossier personnel a été mis à jour.",
      href: "/espace/profil",
    });
  }

  revalidateProfilePaths(request.employeeId);
  return { ok: true };
}
