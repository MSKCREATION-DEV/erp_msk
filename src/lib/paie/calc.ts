import type { InpsRateLine } from "@/lib/paie/rates";

export type PayslipCalcInput = {
  baseSalaryXof: number;
  primesXof?: number;
  rates: InpsRateLine[];
};

export type PayslipCalcLine = {
  code: string;
  label: string;
  kind: "BASE" | "PRIME" | "RETENUE" | "CHARGE";
  rate: number | null;
  amountXof: number;
};

export type PayslipCalcResult = {
  baseSalaryXof: number;
  primesXof: number;
  brutXof: number;
  employeeDeductXof: number;
  employerChargesXof: number;
  netXof: number;
  lines: PayslipCalcLine[];
};

function roundXof(n: number) {
  return Math.round(n);
}

/** Calcule brut / retenues / charges / net à partir de l’assiette et des taux. */
export function calculatePayslip(input: PayslipCalcInput): PayslipCalcResult {
  const base = Math.max(0, Math.floor(input.baseSalaryXof));
  const primes = Math.max(0, Math.floor(input.primesXof ?? 0));
  const brut = base + primes;

  const lines: PayslipCalcLine[] = [
    {
      code: "BASE",
      label: "Salaire de base",
      kind: "BASE",
      rate: null,
      amountXof: base,
    },
  ];
  if (primes > 0) {
    lines.push({
      code: "PRIME",
      label: "Primes",
      kind: "PRIME",
      rate: null,
      amountXof: primes,
    });
  }

  let employeeDeduct = 0;
  let employerCharges = 0;

  for (const r of input.rates) {
    const amount = roundXof(brut * r.rate);
    if (r.party === "EMPLOYEE") {
      employeeDeduct += amount;
      lines.push({
        code: r.code,
        label: r.label,
        kind: "RETENUE",
        rate: r.rate,
        amountXof: amount,
      });
    } else {
      employerCharges += amount;
      lines.push({
        code: r.code,
        label: r.label,
        kind: "CHARGE",
        rate: r.rate,
        amountXof: amount,
      });
    }
  }

  const net = Math.max(0, brut - employeeDeduct);

  return {
    baseSalaryXof: base,
    primesXof: primes,
    brutXof: brut,
    employeeDeductXof: employeeDeduct,
    employerChargesXof: employerCharges,
    netXof: net,
    lines,
  };
}
