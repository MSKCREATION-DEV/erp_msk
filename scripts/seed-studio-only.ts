/**
 * Republie uniquement les gabarits Studio (DSL + variables) sans full seed.
 * Usage : npx tsx --env-file=.env.local scripts/seed-studio-only.ts
 */
import { prisma } from "../src/lib/prisma";
import { seedPhaseStudioDocumentaire } from "../prisma/seed-studio";

async function main() {
  await seedPhaseStudioDocumentaire(prisma);
  const codes = [
    "devis_standard",
    "facture_standard",
    "contrat_commercial_msk",
    "contrat_presta_msk",
    "reglement_interieur_msk",
    "fiche_paie_msk",
    "attestation_presence_libre",
  ];
  const rows = await prisma.documentTemplate.findMany({
    where: { code: { in: codes } },
    include: { publishedVersion: { select: { changelog: true } } },
  });
  for (const r of rows) {
    console.log(
      "·",
      r.code,
      "—",
      r.publishedVersion?.changelog?.slice(0, 90) ?? "(no version)",
    );
  }
  console.log("✓ seed studio only OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
