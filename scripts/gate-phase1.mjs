/**
 * Gate technique Phase 1 — smoke GED / org / templates.
 * Usage: NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/gate-phase1.mjs
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });
config({ path: ".env" });

const prisma = new PrismaClient();
const year = new Date().getFullYear();

function ok(msg) {
  console.log(`✓ ${msg}`);
}
function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
}

async function main() {
  const yearRoot = await prisma.documentFolder.findUnique({
    where: { path: `/${year}` },
  });
  if (!yearRoot) fail(`Arbo /${year} absente`);
  else ok(`Arbo /${year}`);

  for (const code of [
    "03_CLIENTS",
    "04_MODELES",
    "05_COLLABORATEURS",
  ]) {
    const f = await prisma.documentFolder.findUnique({
      where: { path: `/${year}/${code}` },
    });
    if (!f) fail(`Dossier ${code} manquant`);
    else ok(code);
  }

  const templates = await prisma.documentTemplate.count();
  if (templates < 2) fail("Gabarits < 2");
  else ok(`${templates} gabarits`);

  const org = await prisma.orgNode.count();
  if (org < 1) fail("Organigramme vide");
  else ok(`${org} nœuds org`);

  const perms = await prisma.permission.findMany({
    where: {
      code: {
        in: [
          "ged.browse",
          "ged.manage_folders",
          "ged.delete",
          "self.signature.manage",
          "orgchart.view",
        ],
      },
    },
  });
  if (perms.length < 5) fail("Permissions Phase 1 incomplètes");
  else ok("Permissions GED/org");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    const admin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await admin.storage.listBuckets();
    if (!data?.some((b) => b.name === "ged")) fail("Bucket ged absent");
    else ok("Bucket ged");
  }

  if (process.exitCode) {
    console.error("Gate Phase 1 ÉCHEC");
  } else {
    console.log("Gate Phase 1 technique OK — reste validation UI humaine + Phase 1 OK");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
