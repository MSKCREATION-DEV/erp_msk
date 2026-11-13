/**
 * Upsert `sv.hr.view` / `sv.hr.manage` + lien packs Direction / Admin plateforme.
 * Ne touche pas Auth / mots de passe.
 */
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/catalog";

async function main() {
  const hr = PERMISSIONS.filter((p) => p.code.startsWith("sv.hr."));
  for (const p of hr) {
    await prisma.permission.upsert({
      where: { code: p.code },
      create: { code: p.code, domain: p.domain, description: p.description },
      update: { domain: p.domain, description: p.description },
    });
    console.log("perm", p.code);
  }

  const permByCode = Object.fromEntries(
    (
      await prisma.permission.findMany({
        where: { code: { in: ["sv.hr.view", "sv.hr.manage"] } },
      })
    ).map((p) => [p.code, p.id]),
  );

  for (const packCode of ["direction", "admin_plateforme"]) {
    const pack = await prisma.permissionPack.findUnique({
      where: { code: packCode },
    });
    if (!pack) {
      console.log("skip pack", packCode);
      continue;
    }
    for (const code of ["sv.hr.view", "sv.hr.manage"] as const) {
      const permissionId = permByCode[code];
      if (!permissionId) continue;
      const exists = await prisma.packPermission.findFirst({
        where: { packId: pack.id, permissionId },
      });
      if (!exists) {
        await prisma.packPermission.create({
          data: { packId: pack.id, permissionId },
        });
        console.log("linked", packCode, code);
      } else {
        console.log("ok", packCode, code);
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
