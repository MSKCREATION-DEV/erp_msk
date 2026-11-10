/**
 * One-shot : upload GED Suivi (Task 14) sans rejouer tout le seed.
 * Usage: npx tsx --env-file=.env.local scripts/seed-suivi-ged-only.ts
 */
import { createPrisma } from "@/lib/create-prisma";
import { seedSuiviGed } from "@/lib/suivi/seed-ged";

async function main() {
  const prisma = createPrisma();
  const actor =
    (await prisma.user.findFirst({
      where: { isSuperAdmin: true },
      select: { id: true },
    })) ?? (await prisma.user.findFirst({ select: { id: true } }));
  if (!actor) throw new Error("Aucun user pour createdById");

  await seedSuiviGed(prisma, actor.id);

  const contracts = await prisma.svContractMeta.count({
    where: { gedDocumentId: { not: null } },
  });
  const links = await prisma.documentLink.groupBy({
    by: ["entityType"],
    _count: true,
    where: { entityType: { startsWith: "sv_" } },
  });
  console.log("contracts with gedDocumentId", contracts);
  console.log("sv links", links);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
