import { DocStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { collabFolderSlug, COLLAB_SUBFOLDERS } from "@/lib/ged/constants";
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

type CollabSubCode = (typeof COLLAB_SUBFOLDERS)[number]["code"];

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

/** Mappe le sous-dossier GED collaborateur → catégorie coffre. */
function categoryForCollabSubfolder(
  code: string,
): VaultDoc["category"] | "skip" {
  switch (code as CollabSubCode) {
    case "01_IDENTITE_ADMIN":
      return "identite";
    case "02_CONTRATS":
    case "05_DIPLOMES_ATTESTATIONS":
      return "pro";
    case "03_PAIE":
      return "paie";
    case "04_CONGES_ABSENCES":
      return "justificatifs";
    case "06_REGLEMENT_INTERIEUR":
      return "internes";
    case "07_PHOTOS":
      return "skip"; // avatar géré sur la fiche, pas le coffre
    case "09_SORTIE":
    case "99_AUTRES":
      return "internes";
    default:
      return "internes";
  }
}

/** Noms techniques (cuid, avatar-…) — jamais affichés tels quels. */
export function isTechnicalFileName(name: string): boolean {
  const base = name.replace(/\.[^.]+$/, "").trim();
  if (/^avatar[-_]/i.test(base)) return true;
  if (/^[a-z]+-c[a-z0-9]{20,}$/i.test(base)) return true;
  if (/^c[a-z0-9]{20,}$/i.test(base)) return true;
  return false;
}

function defaultTitleForFolder(folderCode: string, folderName: string): string {
  switch (folderCode as CollabSubCode) {
    case "01_IDENTITE_ADMIN":
      return "Pièce d’identité / admin";
    case "02_CONTRATS":
      return "Contrat";
    case "03_PAIE":
      return "Bulletin de paie";
    case "04_CONGES_ABSENCES":
      return "Justificatif d’absence";
    case "05_DIPLOMES_ATTESTATIONS":
      return "Diplôme / attestation";
    case "06_REGLEMENT_INTERIEUR":
      return "Règlement intérieur";
    case "09_SORTIE":
      return "Document de sortie";
    case "99_AUTRES":
      return "Document";
    default:
      return folderName || "Document";
  }
}

function titleForFolderDoc(
  originalName: string,
  folderCode: string,
  folderName: string,
): string {
  if (folderCode === "06_REGLEMENT_INTERIEUR") return "Règlement intérieur";
  if (isTechnicalFileName(originalName) || /^avatar[-_]/i.test(originalName)) {
    return defaultTitleForFolder(folderCode, folderName);
  }
  const base = originalName.replace(/\.[^.]+$/, "").trim();
  // Remplace tirets/underscores techniques par espaces lisibles
  const pretty = base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!pretty || isTechnicalFileName(pretty)) {
    return defaultTitleForFolder(folderCode, folderName);
  }
  return pretty;
}

function shouldSkipVaultFile(originalName: string): boolean {
  return /^avatar[-_]/i.test(originalName);
}

/**
 * Documents déposés dans l’arborescence GED du collaborateur
 * (toutes années) — source de vérité terrain, au-delà des DocumentLink RH.
 */
async function listCollaboratorFolderDocs(input: {
  firstName: string;
  lastName: string;
  reglementStatus: RhReglementStatus;
}): Promise<VaultDoc[]> {
  const slug = collabFolderSlug(input.lastName, input.firstName);
  const marker = `/05_COLLABORATEURS/${slug}`;

  const folders = await prisma.documentFolder.findMany({
    where: {
      OR: [
        { path: { endsWith: marker } },
        { path: { contains: `${marker}/` } },
      ],
    },
    select: { id: true, code: true, name: true, path: true },
  });
  if (folders.length === 0) return [];

  const folderById = new Map(folders.map((f) => [f.id, f]));
  const docs = await prisma.document.findMany({
    where: {
      folderId: { in: folders.map((f) => f.id) },
      status: DocStatus.ACTIVE,
      softDeletedAt: null,
    },
    select: {
      id: true,
      originalName: true,
      mime: true,
      size: true,
      createdAt: true,
      folderId: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const out: VaultDoc[] = [];
  for (const d of docs) {
    if (shouldSkipVaultFile(d.originalName)) continue;
    const folder = folderById.get(d.folderId);
    if (!folder) continue;
    // Racine personne : pas de sous-code COLLAB → internes
    const isPersonRoot = folder.path.endsWith(marker);
    const cat = isPersonRoot
      ? "internes"
      : categoryForCollabSubfolder(folder.code);
    if (cat === "skip") continue;

    const isReglement = folder.code === "06_REGLEMENT_INTERIEUR";
    out.push({
      id: d.id,
      title: titleForFolderDoc(d.originalName, folder.code, folder.name),
      originalName: d.originalName,
      mime: d.mime,
      size: d.size,
      createdAt: d.createdAt,
      category: cat,
      kind: `ged:${folder.code}`,
      needsSignature: isReglement && input.reglementStatus === "PENDING",
      signed: isReglement && input.reglementStatus === "SIGNED",
    });
  }
  return out;
}

export async function loadEmployeeDocumentVault(input: {
  employeeId: string;
  firstName: string;
  lastName: string;
  /** Noms compte Auth (slug GED souvent basé sur User, pas RhEmployee). */
  userFirstName?: string | null;
  userLastName?: string | null;
  /** Photo profil — hors coffre (gérée sur la fiche). */
  avatarDocumentId?: string | null;
  contractIds: string[];
  reglementStatus: RhReglementStatus;
}): Promise<VaultDoc[]> {
  const namePairs = [
    { firstName: input.firstName, lastName: input.lastName },
  ];
  if (
    input.userFirstName &&
    input.userLastName &&
    (input.userFirstName !== input.firstName ||
      input.userLastName !== input.lastName)
  ) {
    namePairs.push({
      firstName: input.userFirstName,
      lastName: input.userLastName,
    });
  }

  const [rhDocs, folderDocsNested, slips] = await Promise.all([
    listEmployeeRhDocs(input.employeeId, input.contractIds),
    Promise.all(
      namePairs.map((n) =>
        listCollaboratorFolderDocs({
          ...n,
          reglementStatus: input.reglementStatus,
        }),
      ),
    ),
    prisma.rhPayslip.findMany({
      where: {
        employeeId: input.employeeId,
        status: { in: ["APPROVED", "PAID"] },
        gedDocumentId: { not: null },
      },
      include: { period: true },
      orderBy: [{ period: { year: "desc" } }, { period: { month: "desc" } }],
    }),
  ]);

  const folderDocs = folderDocsNested.flat();
  const byId = new Map<string, VaultDoc>();

  for (const d of folderDocs) {
    byId.set(d.id, d);
  }

  for (const d of rhDocs) {
    const cat = categoryForRhDoc(d.kind);
    const isReglement = d.kind === RH_DOC.REGLEMENT;
    const existing = byId.get(d.id);
    if (existing) {
      // Enrichir titre / signature si lien RH typé
      existing.kind = d.kind;
      existing.title = d.label;
      if (isReglement) {
        existing.category = "internes";
        existing.needsSignature = input.reglementStatus === "PENDING";
        existing.signed = input.reglementStatus === "SIGNED";
      }
      continue;
    }
    byId.set(d.id, {
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

  const slipDocIds = slips
    .map((s) => s.gedDocumentId)
    .filter((id): id is string => Boolean(id));
  const missingSlipIds = slipDocIds.filter((id) => !byId.has(id));
  const slipDocs = missingSlipIds.length
    ? await prisma.document.findMany({
        where: { id: { in: missingSlipIds } },
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

  for (const s of slips) {
    if (!s.gedDocumentId) continue;
    const existing = byId.get(s.gedDocumentId);
    if (existing) {
      existing.year = s.period.year;
      existing.month = s.period.month;
      existing.category = "paie";
      existing.title = `Bulletin ${String(s.period.month).padStart(2, "0")}/${s.period.year}`;
      continue;
    }
    const doc = slipDocById.get(s.gedDocumentId);
    if (!doc) continue;
    byId.set(doc.id, {
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

  if (input.avatarDocumentId) {
    byId.delete(input.avatarDocumentId);
  }

  // Nettoyage titres techniques restants
  for (const d of byId.values()) {
    if (isTechnicalFileName(d.title) || isTechnicalFileName(d.originalName)) {
      if (d.kind === RH_DOC.REGLEMENT || d.kind === "ged:06_REGLEMENT_INTERIEUR") {
        d.title = "Règlement intérieur";
      } else if (d.category === "paie" || d.kind === "payslip") {
        d.title =
          d.year && d.month
            ? `Bulletin ${String(d.month).padStart(2, "0")}/${d.year}`
            : "Bulletin de paie";
      } else if (d.category === "pro") {
        d.title = "Document professionnel";
      } else if (d.category === "identite") {
        d.title = "Pièce d’identité / admin";
      } else if (d.category === "justificatifs") {
        d.title = "Justificatif";
      } else {
        d.title = "Document";
      }
    }
  }

  return [...byId.values()].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}
