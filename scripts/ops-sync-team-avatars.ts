/**
 * One-shot — bootstrap photos organigramme (`public/team/*`) → avatar GED RH.
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/ops-sync-team-avatars.ts
 *   DRY_RUN=1 npx tsx --env-file=.env.local scripts/ops-sync-team-avatars.ts
 *   ONLY_KEYS=eric npx tsx --env-file=.env.local scripts/ops-sync-team-avatars.ts
 *
 * Ne remplace jamais un avatar déjà renseigné.
 */
import { createPrisma } from "@/lib/create-prisma";
import { syncTeamAvatarsFromStaticPhotos } from "@/lib/org/sync-team-avatars";

const prisma = createPrisma({ max: 1 });
(globalThis as typeof globalThis & { __erp_msk_prisma__?: typeof prisma }).__erp_msk_prisma__ =
  prisma;

async function main() {
  const dryRun = process.env.DRY_RUN === "1";
  const onlyKeys = process.env.ONLY_KEYS
    ? process.env.ONLY_KEYS.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  console.log("→ Sync avatars organigramme → GED…", {
    dryRun,
    onlyKeys: onlyKeys ?? "all",
  });

  const result = await syncTeamAvatarsFromStaticPhotos({ dryRun, onlyKeys });
  console.log(JSON.stringify(result, null, 2));
  if (result.missing.length > 0) {
    console.warn("⚠ Entrées non synchronisées (user/RH ou fichier manquant)");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
