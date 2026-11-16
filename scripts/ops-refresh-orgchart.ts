/**
 * One-shot — réapplique MSK_TEAM → org_nodes (parents, photos, Eric, purge Issiaka/Madina)
 * puis bootstrap avatars GED manquants.
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/ops-refresh-orgchart.ts
 *   SKIP_AVATARS=1 npx tsx --env-file=.env.local scripts/ops-refresh-orgchart.ts
 */
import { createPrisma } from "@/lib/create-prisma";
import { MSK_TEAM } from "@/lib/org/team";
import { syncTeamAvatarsFromStaticPhotos } from "@/lib/org/sync-team-avatars";

const prisma = createPrisma({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  max: 1,
});
(globalThis as typeof globalThis & { __erp_msk_prisma__?: typeof prisma }).__erp_msk_prisma__ =
  prisma;

async function refreshOrgNodes() {
  const idByKey = new Map<string, string>();

  for (const member of MSK_TEAM) {
    const user = member.email
      ? await prisma.user.findUnique({ where: { email: member.email } })
      : null;
    const existing = await prisma.orgNode.findFirst({
      where: { fullName: member.fullName },
    });
    const data = {
      title: member.title,
      email: member.email,
      photoPath: member.photoPath,
      userId: user?.id ?? null,
      sortOrder: member.sortOrder,
    };
    if (existing) {
      const updated = await prisma.orgNode.update({
        where: { id: existing.id },
        data,
      });
      idByKey.set(member.key, updated.id);
    } else {
      const created = await prisma.orgNode.create({
        data: { fullName: member.fullName, ...data },
      });
      idByKey.set(member.key, created.id);
    }
  }

  for (const member of MSK_TEAM) {
    const id = idByKey.get(member.key);
    if (!id) continue;
    const parentId = member.parentKey
      ? (idByKey.get(member.parentKey) ?? null)
      : null;
    await prisma.orgNode.update({
      where: { id },
      data: { parentId },
    });
  }

  const keptNames = MSK_TEAM.map((m) => m.fullName);
  const deleted = await prisma.orgNode.deleteMany({
    where: { fullName: { notIn: keptNames } },
  });

  return { nodes: MSK_TEAM.length, deleted: deleted.count };
}

async function main() {
  console.log("→ Refresh organigramme…");
  const org = await refreshOrgNodes();
  console.log(`✓ Org nodes=${org.nodes}, deleted=${org.deleted}`);

  if (process.env.SKIP_AVATARS === "1") {
    console.log("SKIP_AVATARS=1 — fin");
    return;
  }

  console.log("→ Sync avatars…");
  const sync = await syncTeamAvatarsFromStaticPhotos();
  console.log(JSON.stringify(sync, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
