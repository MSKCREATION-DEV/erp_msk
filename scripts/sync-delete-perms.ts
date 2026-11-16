/**
 * One-shot : upsert crm.prospect.delete + com.clients.delete
 * et les attache au pack Direction (sans toucher Auth / MDP).
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PERMISSIONS, PACK_PERMISSIONS } from "../src/lib/rbac/catalog";

const codes = ["crm.prospect.delete", "com.clients.delete"] as const;

async function main() {
  const url = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
  if (!url) throw new Error("DATABASE_URL manquant");
  const pool = new pg.Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    for (const p of PERMISSIONS.filter((x) =>
      (codes as readonly string[]).includes(x.code),
    )) {
      await prisma.permission.upsert({
        where: { code: p.code },
        create: {
          code: p.code,
          domain: p.domain,
          description: p.description,
        },
        update: { domain: p.domain, description: p.description },
      });
      console.log("✓ permission", p.code);
    }
    const pack = await prisma.permissionPack.findUnique({
      where: { code: "direction" },
    });
    if (!pack) throw new Error("Pack direction introuvable");
    for (const code of PACK_PERMISSIONS.direction.filter((c) =>
      (codes as readonly string[]).includes(c),
    )) {
      const perm = await prisma.permission.findUnique({ where: { code } });
      if (!perm) continue;
      await prisma.packPermission.upsert({
        where: {
          packId_permissionId: { packId: pack.id, permissionId: perm.id },
        },
        create: { packId: pack.id, permissionId: perm.id },
        update: {},
      });
      console.log("✓ pack direction ←", code);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
