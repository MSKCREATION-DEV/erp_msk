/**
 * Gate technique Phase 7A — Stocks MVP.
 * Usage: NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/gate-phase7a.mjs
 */
import { config } from "dotenv";
import { PrismaClient, Prisma } from "@prisma/client";

config({ path: ".env.local" });
config({ path: ".env" });

const prisma = new PrismaClient();

function ok(msg) {
  console.log(`✓ ${msg}`);
}
function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
}

async function main() {
  const required = [
    "stk.access",
    "stk.articles.manage",
    "stk.moves.create",
    "stk.alerts.view",
  ];
  const perms = await prisma.permission.findMany({
    where: { code: { in: required } },
  });
  if (perms.length < required.length) {
    fail(`Permissions stk incomplètes (${perms.length}/${required.length}) — seed`);
  } else ok("Permissions Phase 7A");

  const stockPack = await prisma.permissionPack.findUnique({
    where: { code: "stock" },
    include: { permissions: { include: { permission: true } } },
  });
  const packCodes = new Set(
    (stockPack?.permissions ?? []).map((p) => p.permission.code),
  );
  for (const code of required) {
    if (!packCodes.has(code)) {
      fail(`Pack stock sans ${code}`);
      break;
    }
  }
  if (!process.exitCode) ok("Pack stock complet");

  const tables = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('stk_articles','stk_movements')
  `;
  if (tables.length < 2) fail(`Tables stocks manquantes (${tables.length}/2)`);
  else ok("Tables stk_articles / stk_movements");

  const articles = await prisma.stkArticle.count();
  if (articles < 1) fail("Aucun article — seed Phase 7A");
  else ok(`Articles seed (${articles})`);

  const folder = await prisma.documentFolder.findFirst({
    where: { path: { endsWith: "/07_STOCKS_ACHATS" } },
  });
  if (!folder) {
    console.warn("⚠ GED 07_STOCKS_ACHATS absent — relancer seed GED année");
  } else ok("GED 07_STOCKS_ACHATS");

  // Smoke : sortie refusée si stock insuffisant
  const sample = await prisma.stkArticle.findFirst({
    where: { active: true, qtyOnHand: { gt: 0 } },
  });
  const admin = await prisma.user.findFirst({ where: { isSuperAdmin: true } });
  if (sample && admin) {
    const before = new Prisma.Decimal(sample.qtyOnHand);
    const tooMuch = before.add(1);
    let refused = false;
    try {
      await prisma.$transaction(async (tx) => {
        const a = await tx.stkArticle.findUniqueOrThrow({
          where: { id: sample.id },
        });
        if (new Prisma.Decimal(a.qtyOnHand).lt(tooMuch)) {
          throw new Error("STOCK_INSUFFISANT");
        }
      });
    } catch (e) {
      if (e instanceof Error && e.message === "STOCK_INSUFFISANT") refused = true;
      else throw e;
    }
    if (!refused) fail("Smoke SORTIE insuffisante KO");
    else ok("Smoke SORTIE refusée si stock insuffisant");
  } else {
    console.warn("⚠ Smoke sortie skipped (pas d’article/admin)");
  }

  await prisma.$disconnect();
  if (process.exitCode) {
    console.error("\nGate Phase 7A KO");
    process.exit(1);
  }
  console.log("\nGate Phase 7A OK");
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
