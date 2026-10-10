"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { RhContractType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { writeAudit } from "@/lib/audit";
import type { ActionResult } from "@/actions/auth";
import { ensureContractTypeRules } from "@/lib/paie/contract-rules";

const updateSchema = z.object({
  contractType: z.nativeEnum(RhContractType),
  includeInPayroll: z.boolean(),
  applyInpsRates: z.boolean(),
  accruePaidLeave: z.boolean(),
  active: z.boolean(),
});

export async function updateContractTypeRuleAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  if (
    !hasPermission(actor, "rh.payroll.run") &&
    !hasPermission(actor, "cfg.lists")
  ) {
    return { ok: false, error: "Permission refusée" };
  }

  const parsed = updateSchema.safeParse({
    contractType: formData.get("contractType"),
    includeInPayroll: formData.get("includeInPayroll") === "true",
    applyInpsRates: formData.get("applyInpsRates") === "true",
    accruePaidLeave: formData.get("accruePaidLeave") === "true",
    active: formData.get("active") === "true",
  });
  if (!parsed.success) return { ok: false, error: "Données invalides" };

  await ensureContractTypeRules();
  await prisma.rhContractTypeRule.update({
    where: { contractType: parsed.data.contractType },
    data: {
      includeInPayroll: parsed.data.includeInPayroll,
      applyInpsRates: parsed.data.applyInpsRates,
      accruePaidLeave: parsed.data.accruePaidLeave,
      active: parsed.data.active,
    },
  });

  await writeAudit({
    actorId: actor.id,
    action: "rh.contract_type_rule.update",
    entityType: "RhContractTypeRule",
    entityId: parsed.data.contractType,
    metadata: parsed.data,
  });

  revalidatePath("/administration/contrats-eligibilite");
  revalidatePath("/rh/paie");
  return { ok: true, message: "Règle mise à jour" };
}
