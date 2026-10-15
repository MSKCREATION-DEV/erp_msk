import { prisma } from "@/lib/prisma";
import { ensureChild, ensureYearTree } from "@/lib/ged/tree";

/** Sous-dossiers standards sous un client COM. */
const CLIENT_SUB = [
  { code: "Devis", name: "Devis" },
  { code: "Factures", name: "Factures" },
] as const;

type FolderRef = {
  id: string;
  path: string;
  name: string;
  code: string;
  parentId: string | null;
};

/**
 * Assure `/{year}/03_CLIENTS/{gedFolderCode}` (+ sous-dossiers Devis|Factures).
 * Le code vient de `ComClient.gedFolderCode` (unique) — pas du nom seul.
 */
export async function ensureClientRootFolder(opts: {
  clientId: string;
  year?: number;
  createdById?: string;
}): Promise<FolderRef> {
  const year = opts.year ?? new Date().getFullYear();
  await ensureYearTree(year, opts.createdById);

  const client = await prisma.comClient.findUniqueOrThrow({
    where: { id: opts.clientId },
    select: { name: true, gedFolderCode: true },
  });

  const clientsRoot = await prisma.documentFolder.findUniqueOrThrow({
    where: { path: `/${year}/03_CLIENTS` },
    select: { id: true, path: true },
  });

  const slug = client.gedFolderCode;
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

  for (const s of CLIENT_SUB) {
    await ensureChild(
      clientFolder.id,
      clientFolder.path,
      s.code,
      s.name,
      year,
      opts.createdById,
    );
  }

  return clientFolder;
}

/**
 * Assure `/{year}/03_CLIENTS/{gedFolderCode}/Devis|Factures`.
 */
export async function ensureClientDocFolder(opts: {
  clientId: string;
  type: "Devis" | "Factures";
  year?: number;
  createdById?: string;
}) {
  const clientFolder = await ensureClientRootFolder({
    clientId: opts.clientId,
    year: opts.year,
    createdById: opts.createdById,
  });

  return prisma.documentFolder.findUniqueOrThrow({
    where: { path: `${clientFolder.path}/${opts.type}` },
  });
}
