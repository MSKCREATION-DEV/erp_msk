import type { RhContractType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ContractTypeRuleDto = {
  contractType: RhContractType;
  includeInPayroll: boolean;
  applyInpsRates: boolean;
  accruePaidLeave: boolean;
  active: boolean;
};

const DEFAULTS: Record<
  RhContractType,
  Omit<ContractTypeRuleDto, "contractType">
> = {
  CDI: {
    includeInPayroll: true,
    applyInpsRates: true,
    accruePaidLeave: true,
    active: true,
  },
  CDD: {
    includeInPayroll: true,
    applyInpsRates: true,
    accruePaidLeave: true,
    active: true,
  },
  STAGE: {
    includeInPayroll: true,
    applyInpsRates: true,
    accruePaidLeave: false,
    active: true,
  },
  PRESTA: {
    includeInPayroll: false,
    applyInpsRates: false,
    accruePaidLeave: false,
    active: true,
  },
  AVENANT: {
    includeInPayroll: true,
    applyInpsRates: true,
    accruePaidLeave: true,
    active: true,
  },
  AUTRE: {
    includeInPayroll: false,
    applyInpsRates: false,
    accruePaidLeave: false,
    active: true,
  },
};

export const ALL_CONTRACT_TYPES = Object.keys(DEFAULTS) as RhContractType[];

/** Assure les 6 lignes + retourne la matrice. */
export async function ensureContractTypeRules(): Promise<ContractTypeRuleDto[]> {
  for (const contractType of ALL_CONTRACT_TYPES) {
    const d = DEFAULTS[contractType];
    await prisma.rhContractTypeRule.upsert({
      where: { contractType },
      create: { contractType, ...d },
      update: {},
    });
  }
  const rows = await prisma.rhContractTypeRule.findMany({
    orderBy: { contractType: "asc" },
  });
  return rows.map((r) => ({
    contractType: r.contractType,
    includeInPayroll: r.includeInPayroll,
    applyInpsRates: r.applyInpsRates,
    accruePaidLeave: r.accruePaidLeave,
    active: r.active,
  }));
}

export async function getPayrollEligibleTypes(): Promise<RhContractType[]> {
  const rules = await ensureContractTypeRules();
  return rules
    .filter((r) => r.active && r.includeInPayroll)
    .map((r) => r.contractType);
}

export async function getRuleForType(
  type: RhContractType,
): Promise<ContractTypeRuleDto> {
  const rules = await ensureContractTypeRules();
  return (
    rules.find((r) => r.contractType === type) ?? {
      contractType: type,
      ...DEFAULTS[type],
    }
  );
}
