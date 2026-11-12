/**
 * Upsert permissions sv.expenses.* + resync packs (sans Auth / MDP).
 */
import { config } from "dotenv";
import { createPrisma } from "@/lib/create-prisma";
import { PACK_PERMISSIONS, PACKS, PERMISSIONS } from "@/lib/rbac/catalog";

config({ path: ".env.local" });
config({ path: ".env" });

const prisma = createPrisma({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  max: 1,
});

async function main() {
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      create: { code: p.code, domain: p.domain, description: p.description },
      update: { domain: p.domain, description: p.description },
    });
  }
  const permByCode = Object.fromEntries(
    (await prisma.permission.findMany()).map((p) => [p.code, p.id]),
  );
  for (const [i, pack] of PACKS.entries()) {
    const row = await prisma.permissionPack.upsert({
      where: { code: pack.code },
      create: {
        code: pack.code,
        name: pack.name,
        description: pack.description,
        sortOrder: i,
      },
      update: {
        name: pack.name,
        description: pack.description,
        sortOrder: i,
      },
    });
    const codes = PACK_PERMISSIONS[pack.code] ?? [];
    await prisma.packPermission.deleteMany({ where: { packId: row.id } });
    for (const code of codes) {
      const permissionId = permByCode[code];
      if (!permissionId) continue;
      await prisma.packPermission.create({
        data: { packId: row.id, permissionId },
      });
    }
  }
  console.log("✓ permissions + packs (sv.expenses inclus)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
