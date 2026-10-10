import { prisma } from "@/lib/prisma";
import {
  ensureChild,
  ensureYearTree,
  folderCodeFromName,
} from "@/lib/ged/tree";

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
 * Assure `/{year}/03_CLIENTS/{slug}/Devis|Factures`.
 * Retourne le dossier type (Devis ou Factures).
 */
export async function ensureClientDocFolder(opts: {
  clientName: string;
  type: "Devis" | "Factures";
  year?: number;
  createdById?: string;
}) {
  const year = opts.year ?? new Date().getFullYear();
  await ensureYearTree(year, opts.createdById);

  const clientsRoot = await prisma.documentFolder.findUniqueOrThrow({
    where: { path: `/${year}/03_CLIENTS` },
    select: { id: true, path: true },
  });

  const slug = folderCodeFromName(opts.clientName);
  let clientFolder: FolderRef | null = await prisma.documentFolder.findUnique({
    where: { path: `${clientsRoot.path}/${slug}` },
    select: { id: true, path: true, name: true, code: true, parentId: true },
  });

  if (!clientFolder) {
    clientFolder = await ensureChild(
      clientsRoot.id,
      clientsRoot.path,
      slug,
      opts.clientName.slice(0, 80),
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

  return prisma.documentFolder.findUniqueOrThrow({
    where: { path: `${clientFolder.path}/${opts.type}` },
  });
}
