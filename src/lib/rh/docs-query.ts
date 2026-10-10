import { DocStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  RH_DOC,
  RH_DOC_LABEL,
  type LinkedRhDoc,
  type RhDocKind,
} from "@/lib/rh/docs";

/** Compat : anciens liens `RhContract` / `RhEmployee` avant kinds typés. */
function legacyTypes(entityType: string): string[] {
  if (entityType === RH_DOC.CONTRACT) return [RH_DOC.CONTRACT, "RhContract"];
  if (
    entityType === RH_DOC.ATTESTATION ||
    entityType === RH_DOC.REGLEMENT ||
    entityType === RH_DOC.SOLDE ||
    entityType === RH_DOC.FICHE_PAIE
  ) {
    return [entityType, "RhEmployee"];
  }
  return [entityType];
}

export async function findLatestLinkedDoc(
  entityType: string,
  entityId: string,
): Promise<{ id: string; originalName: string; createdAt: Date } | null> {
  return prisma.document.findFirst({
    where: {
      status: DocStatus.ACTIVE,
      links: {
        some: {
          entityId,
          entityType: { in: legacyTypes(entityType) },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, originalName: true, createdAt: true },
  });
}

/** Derniers docs RH d’un collaborateur (par kind). */
export async function listEmployeeRhDocs(
  employeeId: string,
  contractIds: string[] = [],
): Promise<LinkedRhDoc[]> {
  const kinds: { kind: RhDocKind; entityId: string }[] = [
    { kind: RH_DOC.ATTESTATION, entityId: employeeId },
    { kind: RH_DOC.REGLEMENT, entityId: employeeId },
    { kind: RH_DOC.SOLDE, entityId: employeeId },
    { kind: RH_DOC.FICHE_PAIE, entityId: employeeId },
    ...contractIds.map((id) => ({
      kind: RH_DOC.CONTRACT as RhDocKind,
      entityId: id,
    })),
  ];

  const out: LinkedRhDoc[] = [];
  for (const { kind, entityId } of kinds) {
    const doc = await findLatestLinkedDoc(kind, entityId);
    if (doc) {
      out.push({
        ...doc,
        kind,
        label: RH_DOC_LABEL[kind],
      });
    }
  }
  return out.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function mapEmployeeDocIds(employeeId: string) {
  const [attestation, reglement, solde, fichePaie] = await Promise.all([
    findLatestLinkedDoc(RH_DOC.ATTESTATION, employeeId),
    findLatestLinkedDoc(RH_DOC.REGLEMENT, employeeId),
    findLatestLinkedDoc(RH_DOC.SOLDE, employeeId),
    findLatestLinkedDoc(RH_DOC.FICHE_PAIE, employeeId),
  ]);
  return {
    attestationId: attestation?.id ?? null,
    attestationName: attestation?.originalName ?? null,
    attestationAt: attestation?.createdAt ?? null,
    reglementId: reglement?.id ?? null,
    reglementName: reglement?.originalName ?? null,
    reglementAt: reglement?.createdAt ?? null,
    soldeId: solde?.id ?? null,
    soldeName: solde?.originalName ?? null,
    soldeAt: solde?.createdAt ?? null,
    fichePaieId: fichePaie?.id ?? null,
    fichePaieName: fichePaie?.originalName ?? null,
    fichePaieAt: fichePaie?.createdAt ?? null,
  };
}
