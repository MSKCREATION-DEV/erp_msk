import { assertMoneyInt, type MoneyInt } from "./money";

export type AmountAnomaly = {
  code: "LINES_VS_DECLARED_TOTAL" | "EXCEL_VS_DOCUMENT" | "OTHER";
  message: string;
  expected: MoneyInt;
  actual: MoneyInt;
  delta: MoneyInt;
  severity: "warning" | "error";
};

/**
 * Détecte un écart entre somme des lignes et total déclaré (cas Prosperity +63 000).
 * Ne corrige pas — retourne une anomalie à résoudre.
 */
export function detectLinesVsDeclaredTotal(params: {
  linesSum: MoneyInt;
  declaredTotal: MoneyInt;
  tolerance?: MoneyInt;
}): AmountAnomaly | null {
  const linesSum = assertMoneyInt(params.linesSum, "linesSum");
  const declaredTotal = assertMoneyInt(params.declaredTotal, "declaredTotal");
  const tolerance = params.tolerance ?? 0;
  const delta = declaredTotal - linesSum;
  if (Math.abs(delta) <= tolerance) return null;
  return {
    code: "LINES_VS_DECLARED_TOTAL",
    message: `Écart entre somme des lignes (${linesSum}) et total déclaré (${declaredTotal}) : ${delta > 0 ? "+" : ""}${delta}`,
    expected: linesSum,
    actual: declaredTotal,
    delta,
    severity: "error",
  };
}

export function detectExcelVsDocument(params: {
  excelAmount: MoneyInt;
  documentAmount: MoneyInt;
  label?: string;
}): AmountAnomaly | null {
  const excelAmount = assertMoneyInt(params.excelAmount, "excelAmount");
  const documentAmount = assertMoneyInt(
    params.documentAmount,
    "documentAmount",
  );
  if (excelAmount === documentAmount) return null;
  const delta = documentAmount - excelAmount;
  return {
    code: "EXCEL_VS_DOCUMENT",
    message: `${params.label ?? "Montant"} : Excel=${excelAmount} / Document=${documentAmount} (Δ ${delta})`,
    expected: excelAmount,
    actual: documentAmount,
    delta,
    severity: "warning",
  };
}
