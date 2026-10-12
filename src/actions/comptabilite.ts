"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BudNature, BudPatenteStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { writeAudit } from "@/lib/audit";
import type { ActionResult } from "@/actions/auth";
import { checkEntryBalance } from "@/lib/comptabilite/balance";
import { nextCptEntryNumber } from "@/lib/comptabilite/numbering";
import { resolveOpenPeriodForDate } from "@/lib/comptabilite/periods";
import { proposeEntryFromInvoice } from "@/lib/comptabilite/propose-from-invoice";

const cuidSchema = z.string().min(8).max(40);

const lineSchema = z.object({
  accountId: z.string().min(1),
  debit: z.number().int().min(0),
  credit: z.number().int().min(0),
  label: z.string().max(500).nullable().optional(),
});

function parseLinesJson(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const arr = z.array(lineSchema).safeParse(parsed);
    return arr.success ? arr.data : null;
  } catch {
    return null;
  }
}

function revalidateCpt() {
  revalidatePath("/comptabilite");
  revalidatePath("/comptabilite/ecritures");
  revalidatePath("/comptabilite/a-comptabiliser");
  revalidatePath("/comptabilite/plan");
  revalidatePath("/comptabilite/journaux");
  revalidatePath("/comptabilite/grand-livre");
  revalidatePath("/comptabilite/etats");
  revalidatePath("/comptabilite/banques");
  revalidatePath("/comptabilite/budget");
  revalidatePath("/comptabilite/fiscalite");
}

// ─── Plan de comptes ───

export async function createAccountAction(
  formData: FormData,
): Promise<ActionResult & { accountId?: string }> {
  const user = await requireUser();
  if (!hasPermission(user, "cpt.plan.configure")) {
    return { ok: false, error: "Permission refusée" };
  }

  const parsed = z
    .object({
      code: z.string().trim().min(1).max(16),
      label: z.string().trim().min(1).max(200),
      classNum: z.number().int().min(1).max(8),
      nature: z.enum(["ASSET", "LIABILITY", "EQUITY", "EXPENSE", "INCOME"]),
      isPostable: z.boolean(),
    })
    .safeParse({
      code: formData.get("code"),
      label: formData.get("label"),
      classNum: Number(formData.get("classNum")),
      nature: formData.get("nature"),
      isPostable: formData.get("isPostable") !== "false",
    });

  if (!parsed.success) {
    return { ok: false, error: "Données invalides" };
  }

  try {
    const account = await prisma.cptAccount.create({
      data: parsed.data,
    });
    await writeAudit({
      actorId: user.id,
      action: "cpt.account.create",
      entityType: "CptAccount",
      entityId: account.id,
      metadata: parsed.data,
    });
    revalidateCpt();
    return { ok: true, accountId: account.id, message: "Compte créé" };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Code déjà utilisé" };
    }
    throw e;
  }
}

// ─── Écritures ───

export async function createEntryAction(
  formData: FormData,
): Promise<ActionResult & { entryId?: string }> {
  const user = await requireUser();
  if (!hasPermission(user, "cpt.ecritures.manage")) {
    return { ok: false, error: "Permission refusée" };
  }

  const journalId = String(formData.get("journalId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const dateRaw = String(formData.get("entryDate") ?? "");
  const lines = parseLinesJson(String(formData.get("lines") ?? "[]"));

  if (!journalId || !label || !dateRaw || !lines) {
    return { ok: false, error: "Données invalides" };
  }

  const entryDate = new Date(dateRaw);
  if (Number.isNaN(entryDate.getTime())) {
    return { ok: false, error: "Date invalide" };
  }

  const balance = checkEntryBalance(lines);
  if (!balance.ok) {
    return { ok: false, error: balance.error ?? "Écriture déséquilibrée" };
  }

  const journal = await prisma.cptJournal.findFirst({
    where: { id: journalId, active: true },
  });
  if (!journal) return { ok: false, error: "Journal introuvable" };

  const period = await resolveOpenPeriodForDate(entryDate);
  if (!period) {
    return { ok: false, error: "Période clôturée ou inexistante pour cette date" };
  }

  const accountIds = [...new Set(lines.map((l) => l.accountId))];
  const accounts = await prisma.cptAccount.findMany({
    where: { id: { in: accountIds }, active: true, isPostable: true },
  });
  if (accounts.length !== accountIds.length) {
    return { ok: false, error: "Compte invalide ou non ventilable" };
  }

  const number = await nextCptEntryNumber(journal.code, period.exercise.year);

  const entry = await prisma.cptEntry.create({
    data: {
      number,
      journalId: journal.id,
      periodId: period.id,
      entryDate,
      label: label.slice(0, 500),
      status: "DRAFT",
      createdById: user.id,
      lines: {
        create: lines.map((l, i) => ({
          accountId: l.accountId,
          debit: l.debit,
          credit: l.credit,
          label: l.label ?? null,
          sortOrder: i,
        })),
      },
    },
  });

  await writeAudit({
    actorId: user.id,
    action: "cpt.entry.create",
    entityType: "CptEntry",
    entityId: entry.id,
    metadata: { number, label, total: balance.totalDebit },
  });

  revalidateCpt();
  return { ok: true, entryId: entry.id, message: "Écriture créée (brouillon)" };
}

export async function validateEntryAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (
    !hasPermission(user, "cpt.ecritures.validate") &&
    !hasPermission(user, "cpt.ecritures.manage")
  ) {
    return { ok: false, error: "Permission refusée" };
  }

  const entryId = cuidSchema.safeParse(formData.get("entryId"));
  if (!entryId.success) return { ok: false, error: "Identifiant invalide" };

  const entry = await prisma.cptEntry.findUnique({
    where: { id: entryId.data },
    include: { lines: true, period: true },
  });
  if (!entry) return { ok: false, error: "Écriture introuvable" };
  if (entry.status !== "DRAFT") {
    return { ok: false, error: "Seuls les brouillons peuvent être validés" };
  }
  if (entry.period.status !== "OPEN") {
    return { ok: false, error: "Période clôturée" };
  }

  const balance = checkEntryBalance(entry.lines);
  if (!balance.ok) {
    return { ok: false, error: balance.error ?? "Déséquilibrée" };
  }

  await prisma.cptEntry.update({
    where: { id: entry.id },
    data: {
      status: "VALIDATED",
      validatedById: user.id,
      validatedAt: new Date(),
    },
  });

  await writeAudit({
    actorId: user.id,
    action: "cpt.entry.validate",
    entityType: "CptEntry",
    entityId: entry.id,
    metadata: { number: entry.number },
  });

  revalidateCpt();
  revalidatePath(`/comptabilite/ecritures/${entry.id}`);
  return { ok: true, message: "Écriture validée" };
}

export async function proposeInvoiceEntryAction(
  formData: FormData,
): Promise<ActionResult & { entryId?: string }> {
  const user = await requireUser();
  if (!hasPermission(user, "cpt.ecritures.manage")) {
    return { ok: false, error: "Permission refusée" };
  }

  const invoiceId = cuidSchema.safeParse(formData.get("invoiceId"));
  if (!invoiceId.success) return { ok: false, error: "Facture invalide" };

  const proposal = await proposeEntryFromInvoice(invoiceId.data);
  if ("error" in proposal) return { ok: false, error: proposal.error };
  if (proposal.alreadyLinked && proposal.existingEntryId) {
    return {
      ok: true,
      entryId: proposal.existingEntryId,
      message: "Écriture déjà liée",
    };
  }

  const journal = await prisma.cptJournal.findUnique({ where: { code: "VE" } });
  if (!journal) return { ok: false, error: "Journal VE manquant (seed)" };

  const codes = proposal.lines.map((l) => l.accountCode);
  const accounts = await prisma.cptAccount.findMany({
    where: { code: { in: codes } },
  });
  const byCode = new Map(accounts.map((a) => [a.code, a]));
  for (const code of codes) {
    if (!byCode.has(code)) {
      return { ok: false, error: `Compte ${code} manquant au plan` };
    }
  }

  const invoice = await prisma.comInvoice.findUniqueOrThrow({
    where: { id: invoiceId.data },
  });
  const entryDate = invoice.issuedAt ?? new Date();
  const period = await resolveOpenPeriodForDate(entryDate);
  if (!period) {
    return { ok: false, error: "Période clôturée pour la date de facture" };
  }

  const lines = proposal.lines.map((l) => ({
    accountId: byCode.get(l.accountCode)!.id,
    debit: l.debit,
    credit: l.credit,
    label: l.label,
  }));
  const balance = checkEntryBalance(lines);
  if (!balance.ok) {
    return { ok: false, error: balance.error ?? "Proposition déséquilibrée" };
  }

  const number = await nextCptEntryNumber("VE", period.exercise.year);

  const entry = await prisma.cptEntry.create({
    data: {
      number,
      journalId: journal.id,
      periodId: period.id,
      entryDate,
      label: proposal.label,
      status: "DRAFT",
      sourceType: "COM_INVOICE",
      sourceId: invoice.id,
      currencyOriginal: proposal.currencyOriginal,
      fxRate: proposal.fxRate != null ? new Prisma.Decimal(proposal.fxRate) : null,
      amountOriginal: proposal.amountOriginal,
      createdById: user.id,
      lines: {
        create: lines.map((l, i) => ({
          ...l,
          sortOrder: i,
        })),
      },
    },
  });

  await writeAudit({
    actorId: user.id,
    action: "cpt.entry.propose_invoice",
    entityType: "CptEntry",
    entityId: entry.id,
    metadata: { invoiceId: invoice.id, number },
  });

  revalidateCpt();
  revalidatePath(`/commercial/factures/${invoice.id}`);
  return { ok: true, entryId: entry.id, message: "Proposition VE créée (brouillon)" };
}

// ─── Banques ───

export async function createBankTxnAction(
  formData: FormData,
): Promise<ActionResult & { txnId?: string }> {
  const user = await requireUser();
  if (!hasPermission(user, "cpt.banques.manage")) {
    return { ok: false, error: "Permission refusée" };
  }

  const parsed = z
    .object({
      bankAccountId: cuidSchema,
      txnDate: z.string().min(8),
      label: z.string().trim().min(1).max(500),
      amount: z.number().int(),
      note: z.string().trim().max(1000).nullable(),
    })
    .safeParse({
      bankAccountId: formData.get("bankAccountId"),
      txnDate: formData.get("txnDate"),
      label: formData.get("label"),
      amount: Number(formData.get("amount")),
      note: formData.get("note") ? String(formData.get("note")).trim() || null : null,
    });

  if (!parsed.success || parsed.data.amount === 0) {
    return { ok: false, error: "Données invalides (montant ≠ 0)" };
  }

  const bank = await prisma.cptBankAccount.findFirst({
    where: { id: parsed.data.bankAccountId, active: true },
  });
  if (!bank) return { ok: false, error: "Compte bancaire introuvable" };

  const txn = await prisma.cptBankTxn.create({
    data: {
      bankAccountId: bank.id,
      txnDate: new Date(parsed.data.txnDate),
      label: parsed.data.label,
      amount: parsed.data.amount,
      note: parsed.data.note,
      createdById: user.id,
    },
  });

  await writeAudit({
    actorId: user.id,
    action: "cpt.bank_txn.create",
    entityType: "CptBankTxn",
    entityId: txn.id,
    metadata: { amount: txn.amount, label: txn.label },
  });

  revalidatePath(`/comptabilite/banques/${bank.id}`);
  revalidatePath("/comptabilite/banques");
  return { ok: true, txnId: txn.id, message: "Mouvement enregistré" };
}

export async function matchBankTxnAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "cpt.rapprochement")) {
    return { ok: false, error: "Permission refusée" };
  }

  const txnId = cuidSchema.safeParse(formData.get("txnId"));
  const entryIdRaw = formData.get("entryId");
  const entryId =
    entryIdRaw && String(entryIdRaw).trim()
      ? cuidSchema.safeParse(entryIdRaw)
      : null;

  if (!txnId.success) return { ok: false, error: "Mouvement invalide" };

  const txn = await prisma.cptBankTxn.findUnique({
    where: { id: txnId.data },
  });
  if (!txn) return { ok: false, error: "Mouvement introuvable" };

  if (!entryId || !entryId.success) {
    await prisma.cptBankTxn.update({
      where: { id: txn.id },
      data: { matchedEntryId: null, matchedAt: null },
    });
    revalidatePath(`/comptabilite/banques/${txn.bankAccountId}`);
    return { ok: true, message: "Rapprochement annulé" };
  }

  const entry = await prisma.cptEntry.findFirst({
    where: { id: entryId.data, status: "VALIDATED" },
  });
  if (!entry) {
    return { ok: false, error: "Écriture validée introuvable" };
  }

  await prisma.cptBankTxn.update({
    where: { id: txn.id },
    data: { matchedEntryId: entry.id, matchedAt: new Date() },
  });

  await writeAudit({
    actorId: user.id,
    action: "cpt.bank_txn.match",
    entityType: "CptBankTxn",
    entityId: txn.id,
    metadata: { entryId: entry.id },
  });

  revalidatePath(`/comptabilite/banques/${txn.bankAccountId}`);
  return { ok: true, message: "Rapproché" };
}

// ─── Budget ───

export async function createBudLineAction(
  formData: FormData,
): Promise<ActionResult & { lineId?: string }> {
  const user = await requireUser();
  if (!hasPermission(user, "bud.manage")) {
    return { ok: false, error: "Permission refusée" };
  }

  const year = Number(formData.get("year") ?? new Date().getFullYear());
  const parsed = z
    .object({
      nature: z.nativeEnum(BudNature),
      category: z.string().trim().min(1).max(120),
      month: z.number().int().min(1).max(12),
      planned: z.number().int().min(0),
      actual: z.number().int().min(0),
      note: z.string().trim().max(1000).nullable(),
    })
    .safeParse({
      nature: formData.get("nature"),
      category: formData.get("category"),
      month: Number(formData.get("month")),
      planned: Number(formData.get("planned") ?? 0),
      actual: Number(formData.get("actual") ?? 0),
      note: formData.get("note") ? String(formData.get("note")).trim() || null : null,
    });

  if (!parsed.success || !Number.isFinite(year)) {
    return { ok: false, error: "Données invalides" };
  }

  const exercise = await prisma.budExercise.upsert({
    where: { year },
    create: { year, label: `Budget ${year}` },
    update: {},
  });

  try {
    const line = await prisma.budLine.create({
      data: {
        exerciseId: exercise.id,
        ...parsed.data,
        createdById: user.id,
      },
    });
    await writeAudit({
      actorId: user.id,
      action: "bud.line.create",
      entityType: "BudLine",
      entityId: line.id,
      metadata: parsed.data,
    });
    revalidatePath("/comptabilite/budget");
    return { ok: true, lineId: line.id, message: "Ligne budget créée" };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Ligne déjà existante pour ce mois / catégorie" };
    }
    throw e;
  }
}

export async function updatePatenteAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "cpt.fiscalite.manage")) {
    return { ok: false, error: "Permission refusée" };
  }

  const parsed = z
    .object({
      id: cuidSchema,
      amount: z.number().int().min(0),
      status: z.nativeEnum(BudPatenteStatus),
      note: z.string().trim().max(1000).nullable(),
    })
    .safeParse({
      id: formData.get("id"),
      amount: Number(formData.get("amount")),
      status: formData.get("status"),
      note: formData.get("note") ? String(formData.get("note")).trim() || null : null,
    });

  if (!parsed.success) return { ok: false, error: "Données invalides" };

  await prisma.budPatenteDue.update({
    where: { id: parsed.data.id },
    data: {
      amount: parsed.data.amount,
      status: parsed.data.status,
      note: parsed.data.note,
    },
  });

  revalidatePath("/comptabilite/fiscalite");
  return { ok: true, message: "Patente mise à jour" };
}

export async function setFxRateAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (
    !hasPermission(user, "cpt.plan.configure") &&
    !hasPermission(user, "cpt.fiscalite.manage")
  ) {
    return { ok: false, error: "Permission refusée" };
  }

  const rate = Number(formData.get("rate"));
  const validFrom = String(formData.get("validFrom") ?? "");
  if (!Number.isFinite(rate) || rate <= 0 || !validFrom) {
    return { ok: false, error: "Taux invalide" };
  }

  await prisma.cptFxRate.create({
    data: {
      pair: "EUR/XOF",
      rate,
      validFrom: new Date(validFrom),
      note: String(formData.get("note") ?? "").trim() || null,
    },
  });

  revalidatePath("/comptabilite/fiscalite");
  return { ok: true, message: "Taux enregistré" };
}

export async function closePeriodAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "cpt.cloture")) {
    return { ok: false, error: "Permission refusée" };
  }

  const periodId = cuidSchema.safeParse(formData.get("periodId"));
  if (!periodId.success) return { ok: false, error: "Période invalide" };

  const drafts = await prisma.cptEntry.count({
    where: { periodId: periodId.data, status: "DRAFT" },
  });
  if (drafts > 0) {
    return {
      ok: false,
      error: `${drafts} brouillon(s) restant(s) — validez-les avant clôture`,
    };
  }

  await prisma.cptPeriod.update({
    where: { id: periodId.data },
    data: { status: "CLOSED" },
  });

  await writeAudit({
    actorId: user.id,
    action: "cpt.period.close",
    entityType: "CptPeriod",
    entityId: periodId.data,
  });

  revalidateCpt();
  return { ok: true, message: "Période clôturée" };
}
