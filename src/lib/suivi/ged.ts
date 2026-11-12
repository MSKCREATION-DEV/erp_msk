import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { ensureChild, ensureYearTree, folderCodeFromName } from "@/lib/ged/tree";
import { uploadGedObject } from "@/lib/ged/storage";

/** DocumentLink.entityType — isolé Commercial. */
export const SV_GED_ENTITY = {
  CLIENT: "sv_client",
  INVOICE: "sv_invoice",
  CONTRACT: "sv_contract",
  EXPENSE: "sv_expense_invoice",
} as const;

export type SvGedDocType = "Contrats" | "Factures";

const SUIVI_ROOT_CODE = "08_SUIVI_TAMPON";
const SUIVI_ROOT_NAME = "Suivi (tampon)";
const CLIENTS_CODE = "clients";
const CHARGES_CODE = "charges";

const EXPENSE_FOLDER: Record<string, { code: string; name: string }> = {
  ORANGE_INTERNET: { code: "orange", name: "Orange Internet" },
  EDM_ELECTRICITE: { code: "edm", name: "EDM électricité" },
  LOYER: { code: "loyer", name: "Loyer" },
  AUTRE: { code: "autre", name: "Autres charges" },
};

type FolderRef = {
  id: string;
  path: string;
  name: string;
  code: string;
  parentId: string | null;
};

export function svClientFolderSlug(name: string, clientId: string): string {
  const base = folderCodeFromName(name).slice(0, 40);
  const suffix = clientId.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase();
  return `SV_${base}_${suffix || "X"}`;
}

/**
 * Assure `/{year}/08_SUIVI_TAMPON/clients/{SV_SLUG}` (+ Contrats / Factures).
 * Isolé de `03_CLIENTS` Commercial.
 */
export async function ensureSvClientRootFolder(opts: {
  clientId: string;
  year?: number;
  createdById?: string;
}): Promise<FolderRef> {
  const year = opts.year ?? new Date().getFullYear();
  await ensureYearTree(year, opts.createdById);

  const client = await prisma.svClient.findUniqueOrThrow({
    where: { id: opts.clientId },
    select: { id: true, name: true },
  });

  const yearRoot = await prisma.documentFolder.findUniqueOrThrow({
    where: { path: `/${year}` },
    select: { id: true, path: true },
  });

  const suiviRoot = await ensureChild(
    yearRoot.id,
    yearRoot.path,
    SUIVI_ROOT_CODE,
    SUIVI_ROOT_NAME,
    year,
    opts.createdById,
  );

  const clientsRoot = await ensureChild(
    suiviRoot.id,
    suiviRoot.path,
    CLIENTS_CODE,
    "Clients Suivi",
    year,
    opts.createdById,
  );

  const slug = svClientFolderSlug(client.name, client.id);
  let clientFolder: FolderRef | null = await prisma.documentFolder.findUnique({
    where: { path: `${clientsRoot.path}/${slug}` },
    select: { id: true, path: true, name: true, code: true, parentId: true },
  });

  if (!clientFolder) {
    clientFolder = await ensureChild(
      clientsRoot.id,
      clientsRoot.path,
      slug,
      client.name.slice(0, 80),
      year,
      opts.createdById,
    );
  }

  for (const sub of [
    { code: "Contrats", name: "Contrats" },
    { code: "Factures", name: "Factures" },
  ] as const) {
    await ensureChild(
      clientFolder.id,
      clientFolder.path,
      sub.code,
      sub.name,
      year,
      opts.createdById,
    );
  }

  return clientFolder;
}

export async function ensureSvClientDocFolder(opts: {
  clientId: string;
  type: SvGedDocType;
  year?: number;
  createdById?: string;
}) {
  const clientFolder = await ensureSvClientRootFolder({
    clientId: opts.clientId,
    year: opts.year,
    createdById: opts.createdById,
  });
  return prisma.documentFolder.findUniqueOrThrow({
    where: { path: `${clientFolder.path}/${opts.type}` },
  });
}

export function mimeFromFilename(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  return "application/octet-stream";
}

/**
 * Résout un chemin `docs/...` du seed vers un fichier local
 * (gère NBSP / espaces / variantes de nom).
 */
export function resolveLocalSourceDocument(
  sourceDocument: string,
  cwd = process.cwd(),
): { absolutePath: string; originalName: string } | null {
  const normalized = sourceDocument.replace(/^\/+/, "");
  const direct = path.join(cwd, normalized);
  if (existsSync(direct)) {
    return { absolutePath: direct, originalName: path.basename(direct) };
  }

  // Variantes espaces / NBSP
  const alt = direct.replace(/\u00a0/g, " ").replace(/ /g, "\u00a0");
  if (existsSync(alt)) {
    return { absolutePath: alt, originalName: path.basename(alt) };
  }

  const docsDir = path.join(cwd, "docs");
  if (!existsSync(docsDir)) return null;

  const wanted = path.basename(normalized).replace(/\u00a0/g, " ").toLowerCase();
  for (const name of readdirSync(docsDir)) {
    const cmp = name.replace(/\u00a0/g, " ").toLowerCase();
    if (cmp === wanted) {
      return {
        absolutePath: path.join(docsDir, name),
        originalName: name,
      };
    }
  }

  // Match souple : même « noyau » alphanumérique
  const core = wanted.replace(/[^a-z0-9]+/g, "");
  for (const name of readdirSync(docsDir)) {
    const cmp = name.replace(/\u00a0/g, " ").toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (cmp === core && core.length > 8) {
      return {
        absolutePath: path.join(docsDir, name),
        originalName: name,
      };
    }
  }

  return null;
}

function storageSafeName(originalName: string): string {
  return originalName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u00a0/g, "_")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
}

/**
 * Upload idempotent d’un fichier source inventaire → Document + liens.
 */
export async function upsertSvSourceDocument(opts: {
  clientId: string;
  folderType: SvGedDocType;
  sourceDocument: string;
  createdById: string;
  links: Array<{ entityType: string; entityId: string }>;
  /** Si fourni, met à jour SvContractMeta.gedDocumentId */
  contractMetaId?: string;
}): Promise<{ documentId: string; created: boolean } | null> {
  const resolved = resolveLocalSourceDocument(opts.sourceDocument);
  if (!resolved) {
    console.warn(`⚠ Suivi GED: fichier introuvable ${opts.sourceDocument}`);
    return null;
  }

  const folder = await ensureSvClientDocFolder({
    clientId: opts.clientId,
    type: opts.folderType,
    createdById: opts.createdById,
  });

  const safe = storageSafeName(resolved.originalName);
  const storagePath = `${folder.path.replace(/^\//, "")}/${safe}`;

  const existing = await prisma.document.findFirst({
    where: { storagePath, status: "ACTIVE" },
    select: { id: true },
  });
  if (existing) {
    for (const link of opts.links) {
      await prisma.documentLink.upsert({
        where: {
          documentId_entityType_entityId: {
            documentId: existing.id,
            entityType: link.entityType,
            entityId: link.entityId,
          },
        },
        create: {
          documentId: existing.id,
          entityType: link.entityType,
          entityId: link.entityId,
        },
        update: {},
      });
    }
    if (opts.contractMetaId) {
      await prisma.svContractMeta.update({
        where: { id: opts.contractMetaId },
        data: { gedDocumentId: existing.id },
      });
    }
    return { documentId: existing.id, created: false };
  }

  const bytes = readFileSync(resolved.absolutePath);
  const mime = mimeFromFilename(resolved.originalName);
  await uploadGedObject(storagePath, bytes, mime, { upsert: true });

  const checksum = createHash("sha256").update(bytes).digest("hex");
  const doc = await prisma.document.create({
    data: {
      folderId: folder.id,
      storagePath,
      originalName: resolved.originalName,
      mime,
      size: bytes.byteLength,
      checksum,
      createdById: opts.createdById,
      links: {
        create: opts.links.map((l) => ({
          entityType: l.entityType,
          entityId: l.entityId,
        })),
      },
    },
  });

  if (opts.contractMetaId) {
    await prisma.svContractMeta.update({
      where: { id: opts.contractMetaId },
      data: { gedDocumentId: doc.id },
    });
  }

  return { documentId: doc.id, created: true };
}

export async function listSvLinkedDocuments(opts: {
  entityType: string;
  entityId: string;
}) {
  return prisma.documentLink.findMany({
    where: {
      entityType: opts.entityType,
      entityId: opts.entityId,
      document: { status: "ACTIVE", softDeletedAt: null },
    },
    include: {
      document: {
        select: {
          id: true,
          originalName: true,
          mime: true,
          size: true,
          storagePath: true,
          createdAt: true,
        },
      },
    },
    orderBy: { document: { createdAt: "desc" } },
  });
}

/**
 * Assure `/{year}/08_SUIVI_TAMPON/charges/{orange|edm|loyer|autre}`.
 */
export async function ensureSvChargesFolder(opts: {
  category: keyof typeof EXPENSE_FOLDER | string;
  year?: number;
  createdById?: string;
}): Promise<FolderRef> {
  const year = opts.year ?? new Date().getFullYear();
  await ensureYearTree(year, opts.createdById);

  const yearRoot = await prisma.documentFolder.findUniqueOrThrow({
    where: { path: `/${year}` },
    select: { id: true, path: true },
  });

  const suiviRoot = await ensureChild(
    yearRoot.id,
    yearRoot.path,
    SUIVI_ROOT_CODE,
    SUIVI_ROOT_NAME,
    year,
    opts.createdById,
  );

  const chargesRoot = await ensureChild(
    suiviRoot.id,
    suiviRoot.path,
    CHARGES_CODE,
    "Charges",
    year,
    opts.createdById,
  );

  const folderMeta =
    EXPENSE_FOLDER[opts.category] ?? EXPENSE_FOLDER.AUTRE!;

  return ensureChild(
    chargesRoot.id,
    chargesRoot.path,
    folderMeta.code,
    folderMeta.name,
    year,
    opts.createdById,
  );
}

/**
 * Upload idempotent d’une facture charge → Document + liens + gedDocumentId.
 */
export async function upsertSvExpenseDocument(opts: {
  expenseId: string;
  category: string;
  sourceDocument: string;
  createdById: string;
}): Promise<{ documentId: string; created: boolean } | null> {
  const resolved = resolveLocalSourceDocument(opts.sourceDocument);
  if (!resolved) {
    console.warn(`⚠ Suivi GED charges: fichier introuvable ${opts.sourceDocument}`);
    return null;
  }

  const folder = await ensureSvChargesFolder({
    category: opts.category,
    createdById: opts.createdById,
  });

  const safe = storageSafeName(resolved.originalName);
  const storagePath = `${folder.path.replace(/^\//, "")}/${safe}`;

  const existing = await prisma.document.findFirst({
    where: { storagePath, status: "ACTIVE" },
    select: { id: true },
  });

  if (existing) {
    await prisma.documentLink.upsert({
      where: {
        documentId_entityType_entityId: {
          documentId: existing.id,
          entityType: SV_GED_ENTITY.EXPENSE,
          entityId: opts.expenseId,
        },
      },
      create: {
        documentId: existing.id,
        entityType: SV_GED_ENTITY.EXPENSE,
        entityId: opts.expenseId,
      },
      update: {},
    });
    await prisma.svExpenseInvoice.update({
      where: { id: opts.expenseId },
      data: { gedDocumentId: existing.id },
    });
    return { documentId: existing.id, created: false };
  }

  const bytes = readFileSync(resolved.absolutePath);
  const mime = mimeFromFilename(resolved.originalName);
  await uploadGedObject(storagePath, bytes, mime, { upsert: true });

  const checksum = createHash("sha256").update(bytes).digest("hex");
  const doc = await prisma.document.create({
    data: {
      folderId: folder.id,
      storagePath,
      originalName: resolved.originalName,
      mime,
      size: bytes.byteLength,
      checksum,
      createdById: opts.createdById,
      links: {
        create: [
          {
            entityType: SV_GED_ENTITY.EXPENSE,
            entityId: opts.expenseId,
          },
        ],
      },
    },
  });

  await prisma.svExpenseInvoice.update({
    where: { id: opts.expenseId },
    data: { gedDocumentId: doc.id },
  });

  return { documentId: doc.id, created: true };
}

/** Upload bytes (réception UI) vers dossier charges. */
export async function uploadSvExpenseBytes(opts: {
  expenseId: string;
  category: string;
  originalName: string;
  mime: string;
  bytes: Buffer;
  createdById: string;
}): Promise<{ documentId: string }> {
  const folder = await ensureSvChargesFolder({
    category: opts.category,
    createdById: opts.createdById,
  });
  const safe = storageSafeName(opts.originalName);
  const storagePath = `${folder.path.replace(/^\//, "")}/${Date.now()}_${safe}`;
  await uploadGedObject(storagePath, opts.bytes, opts.mime, { upsert: true });
  const checksum = createHash("sha256").update(opts.bytes).digest("hex");
  const doc = await prisma.document.create({
    data: {
      folderId: folder.id,
      storagePath,
      originalName: opts.originalName,
      mime: opts.mime,
      size: opts.bytes.byteLength,
      checksum,
      createdById: opts.createdById,
      links: {
        create: [
          {
            entityType: SV_GED_ENTITY.EXPENSE,
            entityId: opts.expenseId,
          },
        ],
      },
    },
  });
  await prisma.svExpenseInvoice.update({
    where: { id: opts.expenseId },
    data: { gedDocumentId: doc.id },
  });
  return { documentId: doc.id };
}
