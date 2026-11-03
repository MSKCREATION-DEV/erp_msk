import { prisma } from "@/lib/prisma";
import { RH_DOC, type LinkedRhDoc } from "@/lib/rh/docs";
import { listEmployeeRhDocs } from "@/lib/rh/docs-query";
import type { RhReglementStatus } from "@prisma/client";
import type { VaultDoc } from "@/lib/espace/documents-vault-types";

export type {
  VaultCategory,
  VaultDoc,
} from "@/lib/espace/documents-vault-types";
export {
  VAULT_CATEGORY_LABEL,
  filterVaultDocs,
  countByCategory,
} from "@/lib/espace/documents-vault-types";

function categoryForRhDoc(kind: LinkedRhDoc["kind"]): VaultDoc["category"] {
  switch (kind) {
    case RH_DOC.CONTRACT:
    case RH_DOC.ATTESTATION:
    case RH_DOC.SOLDE:
      return "pro";
    case RH_DOC.FICHE_PAIE:
      return "paie";
    case RH_DOC.REGLEMENT:
      return "internes";
    default:
      return "internes";
  }
}

export async function loadEmployeeDocumentVault(input: {
  employeeId: string;
  contractIds: string[];
  reglementStatus: RhReglementStatus;
}): Promise<VaultDoc[]> {
  const rhDocs = await listEmployeeRhDocs(input.employeeId, input.contractIds);

  const slips = await prisma.rhPayslip.findMany({
    where: {
      employeeId: input.employeeId,
      status: { in: ["APPROVED", "PAID"] },
      gedDocumentId: { not: null },
    },
    include: { period: true },
    orderBy: [{ period: { year: "desc" } }, { period: { month: "desc" } }],
  });

  const slipDocIds = slips
    .map((s) => s.gedDocumentId)
    .filter((id): id is string => Boolean(id));
  const slipDocs = slipDocIds.length
    ? await prisma.document.findMany({
        where: { id: { in: slipDocIds } },
        select: {
          id: true,
          originalName: true,
          mime: true,
          size: true,
          createdAt: true,
        },
      })
    : [];
  const slipDocById = new Map(slipDocs.map((d) => [d.id, d]));

  const out: VaultDoc[] = [];

  for (const d of rhDocs) {
    const cat = categoryForRhDoc(d.kind);
    const isReglement = d.kind === RH_DOC.REGLEMENT;
    out.push({
      id: d.id,
      title: d.label,
      originalName: d.originalName,
      mime: d.mime,
      size: d.size,
      createdAt: d.createdAt,
      category: cat,
      kind: d.kind,
      needsSignature: isReglement && input.reglementStatus === "PENDING",
      signed: isReglement && input.reglementStatus === "SIGNED",
    });
  }

  for (const s of slips) {
    if (!s.gedDocumentId) continue;
    if (out.some((x) => x.id === s.gedDocumentId)) {
      const existing = out.find((x) => x.id === s.gedDocumentId)!;
      existing.year = s.period.year;
      existing.month = s.period.month;
      existing.category = "paie";
      continue;
    }
    const doc = slipDocById.get(s.gedDocumentId);
    if (!doc) continue;
    out.push({
      id: doc.id,
      title: `Bulletin ${String(s.period.month).padStart(2, "0")}/${s.period.year}`,
      originalName: doc.originalName,
      mime: doc.mime,
      size: doc.size,
      createdAt: doc.createdAt,
      category: "paie",
      kind: "payslip",
      year: s.period.year,
      month: s.period.month,
    });
  }

  out.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return out;
}
