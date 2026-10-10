/**
 * Gate technique Phase 3 — Commercial documentaire.
 * Usage: NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/gate-phase3.mjs
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

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
  const perms = await prisma.permission.findMany({
    where: {
      code: {
        in: [
          "com.access",
          "com.clients.view_own",
          "com.clients.manage",
          "com.devis.create",
          "com.devis.send",
          "com.devis.accept_reject",
          "com.factures.create",
          "com.factures.issue",
          "com.paiements.record",
        ],
      },
    },
  });
  if (perms.length < 9) fail(`Permissions COM Phase 3 incomplètes (${perms.length}/9)`);
  else ok("Permissions Commercial Phase 3");

  await prisma.comClient.count();
  await prisma.comQuote.count();
  await prisma.comInvoice.count();
  await prisma.comPayment.count();
  await prisma.comNumberSequence.count();
  ok("Tables COM accessibles");

  // Séquence upsert smoke (ne laisse pas de doc métier)
  const year = new Date().getFullYear();
  const before = await prisma.comNumberSequence.findUnique({
    where: { kind_year: { kind: "DEVIS", year } },
  });
  const seq = await prisma.comNumberSequence.upsert({
    where: { kind_year: { kind: "DEVIS", year } },
    create: { kind: "DEVIS", year, lastValue: 0 },
    update: {},
  });
  if (!seq) fail("Séquence DEVIS introuvable après upsert");
  else ok(`Séquence DEVIS ${year} OK (last=${seq.lastValue})`);

  if (before == null && seq.lastValue === 0) {
    // nettoyage optionnel — laisse la séquence à 0 pour démarrage propre
  }

  if (process.exitCode) {
    console.error("Gate Phase 3 ÉCHEC");
  } else {
    console.log(
      "Gate Phase 3 technique OK — reste smoke UI + validation humaine Phase 3 OK",
    );
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
