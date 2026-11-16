import { readFile } from "fs/promises";
import path from "path";
import { MSK_TEAM } from "@/lib/org/team";
import { upsertEmployeeAvatar } from "@/lib/rh/upsert-avatar";
import { prisma } from "@/lib/prisma";

function mimeFromPath(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

/**
 * Bootstrap : pour chaque membre MSK_TEAM lié à un User + RhEmployee
 * sans avatar GED, upload `public/team/*` → GED + `avatarDocumentId`.
 * Ne touche jamais un avatar déjà renseigné (choix collab prioritaire).
 */
export async function syncTeamAvatarsFromStaticPhotos(opts?: {
  /** Limiter à certaines clés (ex. `["eric"]`). */
  onlyKeys?: string[];
  dryRun?: boolean;
}): Promise<{
  scanned: number;
  uploaded: number;
  skipped: number;
  missing: string[];
}> {
  const only = opts?.onlyKeys ? new Set(opts.onlyKeys) : null;
  const members = MSK_TEAM.filter((m) => !only || only.has(m.key));
  let uploaded = 0;
  let skipped = 0;
  const missing: string[] = [];

  for (const member of members) {
    if (!member.photoPath || !member.email) {
      skipped += 1;
      continue;
    }

    const user = await prisma.user.findUnique({
      where: { email: member.email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        rhEmployee: {
          select: {
            id: true,
            avatarDocumentId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!user?.rhEmployee) {
      missing.push(`${member.fullName} (${member.email}) — user/RH absent`);
      continue;
    }
    if (user.rhEmployee.avatarDocumentId) {
      skipped += 1;
      continue;
    }

    // photoPath = `/team/foo.jpg` → public/team/foo.jpg
    const rel = member.photoPath.replace(/^\//, "");
    const fileAbs = path.join(process.cwd(), "public", ...rel.split("/"));

    let bytes: Buffer;
    try {
      bytes = await readFile(fileAbs);
    } catch {
      missing.push(`${member.fullName} — fichier manquant ${member.photoPath}`);
      continue;
    }

    if (opts?.dryRun) {
      uploaded += 1;
      continue;
    }

    await upsertEmployeeAvatar({
      employeeId: user.rhEmployee.id,
      firstName: user.rhEmployee.firstName || user.firstName,
      lastName: user.rhEmployee.lastName || user.lastName,
      actorUserId: user.id,
      bytes: new Uint8Array(bytes),
      mime: mimeFromPath(fileAbs),
    });
    uploaded += 1;
  }

  return {
    scanned: members.length,
    uploaded,
    skipped,
    missing,
  };
}
