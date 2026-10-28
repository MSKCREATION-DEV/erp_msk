/** Résout des IDs réels pour l’audit fiches détail. */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });
config({ path: ".env" });

const prisma = new PrismaClient();

async function main() {
  const [opp, client, devis, facture] = await Promise.all([
    prisma.crmOpportunity.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { id: true, organization: { select: { name: true } } },
    }),
    prisma.comClient.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true },
    }),
    prisma.comQuote.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { id: true, number: true },
    }),
    prisma.comInvoice.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { id: true, number: true },
    }),
  ]);

  const out = {
    prospectId: opp?.id ?? null,
    prospectLabel: opp?.organization?.name ?? null,
    clientId: client?.id ?? null,
    clientLabel: client?.name ?? null,
    devisId: devis?.id ?? null,
    devisLabel: devis?.number ?? null,
    factureId: facture?.id ?? null,
    factureLabel: facture?.number ?? null,
  };
  console.log(JSON.stringify(out, null, 2));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
