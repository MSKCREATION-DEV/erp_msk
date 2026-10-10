"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PrjExpenseStatus, PrjProjectStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { EXPENSE_JUSTIFICATIF_THRESHOLD } from "@/lib/projets/constants";

type ActionResult = { ok: boolean; error?: string; message?: string; id?: string };

function revalidatePrj(projectId?: string) {
  revalidatePath("/projets");
  if (projectId) revalidatePath(`/projets/${projectId}`);
}

export async function createProjectAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "prj.manage")) {
    return { ok: false, error: "Permission refusée" };
  }
  const parsed = z
    .object({
      code: z.string().trim().min(1).max(64),
      name: z.string().trim().min(1).max(200),
      description: z.string().trim().max(2000).optional(),
      budgetXof: z.coerce.number().int().min(0).default(0),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })
    .safeParse({
      code: formData.get("code"),
      name: formData.get("name"),
      description: String(formData.get("description") ?? "").trim() || undefined,
      budgetXof: formData.get("budgetXof") ?? 0,
      startDate: String(formData.get("startDate") ?? "").trim() || undefined,
      endDate: String(formData.get("endDate") ?? "").trim() || undefined,
    });
  if (!parsed.success) return { ok: false, error: "Données invalides" };

  try {
    const project = await prisma.prjProject.create({
      data: {
        code: parsed.data.code.toUpperCase(),
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        budgetXof: parsed.data.budgetXof,
        startDate: parsed.data.startDate
          ? new Date(parsed.data.startDate)
          : null,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
        ownerId: user.id,
        members: { create: { userId: user.id, role: "owner" } },
      },
    });
    await writeAudit({
      actorId: user.id,
      action: "prj.project.create",
      entityType: "PrjProject",
      entityId: project.id,
    });
    revalidatePrj(project.id);
    return { ok: true, id: project.id, message: "Projet créé" };
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return { ok: false, error: "Code projet déjà utilisé" };
    }
    throw e;
  }
}

export async function updateProjectStatusAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "prj.manage")) {
    return { ok: false, error: "Permission refusée" };
  }
  const id = z.string().cuid().safeParse(formData.get("projectId"));
  const status = z.nativeEnum(PrjProjectStatus).safeParse(formData.get("status"));
  if (!id.success || !status.success) {
    return { ok: false, error: "Données invalides" };
  }
  await prisma.prjProject.update({
    where: { id: id.data },
    data: { status: status.data },
  });
  revalidatePrj(id.data);
  return { ok: true, message: "Statut projet mis à jour" };
}

export async function createExpenseAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "prj.access")) {
    return { ok: false, error: "Permission refusée" };
  }
  const parsed = z
    .object({
      projectId: z.string().cuid(),
      expenseDate: z.string().min(8),
      nature: z.string().trim().min(1).max(120),
      description: z.string().trim().max(1000).optional(),
      plannedXof: z.coerce.number().int().min(0).default(0),
      spentXof: z.coerce.number().int().min(0),
      paymentMode: z.string().trim().max(80).optional(),
      justificatifNote: z.string().trim().max(500).optional(),
      submit: z.boolean().default(false),
    })
    .safeParse({
      projectId: formData.get("projectId"),
      expenseDate: formData.get("expenseDate"),
      nature: formData.get("nature"),
      description: String(formData.get("description") ?? "").trim() || undefined,
      plannedXof: formData.get("plannedXof") ?? 0,
      spentXof: formData.get("spentXof"),
      paymentMode: String(formData.get("paymentMode") ?? "").trim() || undefined,
      justificatifNote:
        String(formData.get("justificatifNote") ?? "").trim() || undefined,
      submit: formData.get("submit") === "true",
    });
  if (!parsed.success) return { ok: false, error: "Données invalides" };

  if (
    parsed.data.spentXof >= EXPENSE_JUSTIFICATIF_THRESHOLD &&
    !parsed.data.justificatifNote
  ) {
    return {
      ok: false,
      error: `Justificatif requis dès ${EXPENSE_JUSTIFICATIF_THRESHOLD.toLocaleString("fr-FR")} XOF (réf. GED ou note)`,
    };
  }

  const project = await prisma.prjProject.findUnique({
    where: { id: parsed.data.projectId },
  });
  if (!project) return { ok: false, error: "Projet introuvable" };

  const expense = await prisma.prjExpense.create({
    data: {
      projectId: project.id,
      expenseDate: new Date(parsed.data.expenseDate),
      nature: parsed.data.nature,
      description: parsed.data.description ?? null,
      plannedXof: parsed.data.plannedXof,
      spentXof: parsed.data.spentXof,
      paymentMode: parsed.data.paymentMode ?? null,
      justificatifNote: parsed.data.justificatifNote ?? null,
      status: parsed.data.submit ? "SUBMITTED" : "DRAFT",
      createdById: user.id,
    },
  });
  revalidatePrj(project.id);
  return {
    ok: true,
    id: expense.id,
    message: parsed.data.submit ? "Dépense soumise" : "Dépense enregistrée",
  };
}

export async function reviewExpenseAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "prj.manage")) {
    return { ok: false, error: "Permission refusée" };
  }
  const id = z.string().cuid().safeParse(formData.get("expenseId"));
  const decision = z
    .enum(["APPROVED", "REJECTED", "REIMBURSED"])
    .safeParse(formData.get("decision"));
  const reviewNote = String(formData.get("reviewNote") ?? "").trim() || null;
  if (!id.success || !decision.success) {
    return { ok: false, error: "Données invalides" };
  }

  const expense = await prisma.prjExpense.findUnique({
    where: { id: id.data },
  });
  if (!expense) return { ok: false, error: "Dépense introuvable" };
  if (
    expense.status !== "SUBMITTED" &&
    !(expense.status === "APPROVED" && decision.data === "REIMBURSED")
  ) {
    return { ok: false, error: "Statut incompatible" };
  }

  await prisma.prjExpense.update({
    where: { id: expense.id },
    data: {
      status: decision.data as PrjExpenseStatus,
      reviewedById: user.id,
      reviewedAt: new Date(),
      reviewNote,
    },
  });
  revalidatePrj(expense.projectId);
  return { ok: true, message: `Dépense ${decision.data.toLowerCase()}` };
}
