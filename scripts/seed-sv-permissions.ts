/**
 * Upsert permissions sv.* + packs direction / admin_plateforme (sans full seed).
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { createPrisma } from "../src/lib/create-prisma";
import {
  PACK_PERMISSIONS,
  PERMISSIONS,
  SV_PERMISSIONS,
} from "../src/lib/rbac/catalog";

async function main() {
  const prisma = createPrisma({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
    max: 1,
  });

  const svPerms = PERMISSIONS.filter((p) => p.domain === "sv");
  for (const p of svPerms) {
    await prisma.permission.upsert({
      where: { code: p.code },
      create: { code: p.code, domain: p.domain, description: p.description },
      update: { domain: p.domain, description: p.description },
    });
  }

  const permByCode = Object.fromEntries(
    (await prisma.permission.findMany()).map((p) => [p.code, p.id]),
  );

  for (const packCode of ["direction", "admin_plateforme"] as const) {
    const pack = await prisma.permissionPack.findUnique({
      where: { code: packCode },
    });
    if (!pack) {
      console.warn(`Pack ${packCode} introuvable`);
      continue;
    }
    const codes = PACK_PERMISSIONS[packCode] ?? [];
    await prisma.packPermission.deleteMany({ where: { packId: pack.id } });
    for (const code of codes) {
      const permissionId = permByCode[code];
      if (!permissionId) continue;
      await prisma.packPermission.create({
        data: { packId: pack.id, permissionId },
      });
    }
    console.log(`✓ pack ${packCode} (${codes.length} perms)`);
  }

  console.log(`✓ sv permissions ${SV_PERMISSIONS.length}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
