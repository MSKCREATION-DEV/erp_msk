import { createPrisma } from "../src/lib/create-prisma";
import { PACK_PERMISSIONS, PACKS, PERMISSIONS } from "../src/lib/rbac/catalog";

const prisma = createPrisma({ max: 1 });

async function main() {
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      create: {
        code: p.code,
        domain: p.domain,
        description: p.description,
      },
      update: {
        domain: p.domain,
        description: p.description,
      },
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
      if (!permissionId) {
        console.warn(`Permission inconnue pour pack ${pack.code}: ${code}`);
        continue;
      }
      await prisma.packPermission.create({
        data: { packId: row.id, permissionId },
      });
    }
  }

  console.log("RBAC permissions/packs synced (COM-FACTU)");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
