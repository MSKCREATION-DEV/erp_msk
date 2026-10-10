/**
 * Seed Phase 6 — plan SYSCOHADA minimal PME services digitaux + journaux + banques + FX.
 */
import type { CptAccountNature, PrismaClient } from "@prisma/client";

type AccountSeed = {
  code: string;
  label: string;
  classNum: number;
  nature: CptAccountNature;
  isPostable?: boolean;
};

/** Plan minimal MSK — classes 1–8 (réf. SYSCOHADA / AUDCIF). */
export const CPT_ACCOUNTS_SEED: AccountSeed[] = [
  { code: "101", label: "Capital social", classNum: 1, nature: "EQUITY" },
  { code: "121", label: "Report à nouveau créditeur", classNum: 1, nature: "EQUITY" },
  { code: "131", label: "Résultat net de l'exercice", classNum: 1, nature: "EQUITY" },

  { code: "211", label: "Terrains", classNum: 2, nature: "ASSET", isPostable: false },
  { code: "244", label: "Matériel et outillage", classNum: 2, nature: "ASSET" },
  { code: "245", label: "Matériel de transport", classNum: 2, nature: "ASSET" },
  { code: "2451", label: "Matériel informatique", classNum: 2, nature: "ASSET" },

  { code: "31", label: "Marchandises", classNum: 3, nature: "ASSET", isPostable: false },

  { code: "4011", label: "Fournisseurs locaux", classNum: 4, nature: "LIABILITY" },
  { code: "4111", label: "Clients locaux", classNum: 4, nature: "ASSET" },
  { code: "4112", label: "Clients étrangers", classNum: 4, nature: "ASSET" },
  { code: "421", label: "Personnel, rémunérations dues", classNum: 4, nature: "LIABILITY" },
  { code: "4313", label: "INPS — cotisations sociales", classNum: 4, nature: "LIABILITY" },
  { code: "4432", label: "TVA facturée sur prestations de services", classNum: 4, nature: "LIABILITY" },
  { code: "4441", label: "État, TVA due", classNum: 4, nature: "LIABILITY" },
  { code: "4452", label: "TVA récupérable sur achats", classNum: 4, nature: "ASSET" },
  { code: "447", label: "État, impôts retenus à la source", classNum: 4, nature: "LIABILITY" },

  { code: "5211", label: "ECOBANK — Compte 1", classNum: 5, nature: "ASSET" },
  { code: "5212", label: "ECOBANK — Compte 2", classNum: 5, nature: "ASSET" },
  { code: "571", label: "Caisse", classNum: 5, nature: "ASSET" },
  { code: "585", label: "Mobile Money", classNum: 5, nature: "ASSET" },

  { code: "601", label: "Achats de marchandises", classNum: 6, nature: "EXPENSE" },
  { code: "604", label: "Achats stockés — matières et fournitures", classNum: 6, nature: "EXPENSE" },
  { code: "605", label: "Autres achats", classNum: 6, nature: "EXPENSE" },
  { code: "613", label: "Locations", classNum: 6, nature: "EXPENSE" },
  { code: "622", label: "Rémunérations d'intermédiaires et honoraires", classNum: 6, nature: "EXPENSE" },
  { code: "624", label: "Transports", classNum: 6, nature: "EXPENSE" },
  { code: "625", label: "Déplacements, missions et réceptions", classNum: 6, nature: "EXPENSE" },
  { code: "626", label: "Frais postaux et de télécommunications", classNum: 6, nature: "EXPENSE" },
  { code: "627", label: "Services bancaires et assimilés", classNum: 6, nature: "EXPENSE" },
  { code: "641", label: "Impôts et taxes", classNum: 6, nature: "EXPENSE" },
  { code: "661", label: "Rémunérations directes versées au personnel", classNum: 6, nature: "EXPENSE" },
  { code: "664", label: "Charges sociales", classNum: 6, nature: "EXPENSE" },

  { code: "706", label: "Services vendus", classNum: 7, nature: "INCOME" },
  { code: "707", label: "Produits accessoires", classNum: 7, nature: "INCOME" },
  { code: "77", label: "Produits financiers", classNum: 7, nature: "INCOME", isPostable: false },

  { code: "81", label: "Valeurs comptables des cessions d'immobilisations", classNum: 8, nature: "EXPENSE", isPostable: false },
  { code: "82", label: "Produits des cessions d'immobilisations", classNum: 8, nature: "INCOME", isPostable: false },
];

export const CPT_JOURNALS_SEED = [
  { code: "AC", label: "Achats", sortOrder: 10 },
  { code: "VE", label: "Ventes", sortOrder: 20 },
  { code: "BQ", label: "Banque", sortOrder: 30 },
  { code: "CA", label: "Caisse", sortOrder: 40 },
  { code: "OD", label: "Opérations diverses", sortOrder: 50 },
  { code: "PA", label: "Paie", sortOrder: 60 },
  { code: "MM", label: "Mobile Money", sortOrder: 70 },
] as const;

export async function seedPhase6Compta(prisma: PrismaClient) {
  for (const a of CPT_ACCOUNTS_SEED) {
    await prisma.cptAccount.upsert({
      where: { code: a.code },
      create: {
        code: a.code,
        label: a.label,
        classNum: a.classNum,
        nature: a.nature,
        isPostable: a.isPostable ?? true,
        active: true,
      },
      update: {
        label: a.label,
        classNum: a.classNum,
        nature: a.nature,
        isPostable: a.isPostable ?? true,
      },
    });
  }

  for (const j of CPT_JOURNALS_SEED) {
    await prisma.cptJournal.upsert({
      where: { code: j.code },
      create: { ...j, active: true },
      update: { label: j.label, sortOrder: j.sortOrder, active: true },
    });
  }

  const year = new Date().getFullYear();
  const exercise = await prisma.cptExercise.upsert({
    where: { year },
    create: { year, status: "OPEN" },
    update: {},
  });

  for (let month = 1; month <= 12; month++) {
    await prisma.cptPeriod.upsert({
      where: { exerciseId_month: { exerciseId: exercise.id, month } },
      create: { exerciseId: exercise.id, month, status: "OPEN" },
      update: {},
    });
  }

  const acc5211 = await prisma.cptAccount.findUniqueOrThrow({ where: { code: "5211" } });
  const acc5212 = await prisma.cptAccount.findUniqueOrThrow({ where: { code: "5212" } });

  await prisma.cptBankAccount.upsert({
    where: { code: "ECOBANK1" },
    create: {
      code: "ECOBANK1",
      label: "ECOBANK Compte 1",
      bankName: "ECOBANK",
      accountRef: "À renseigner",
      cptAccountId: acc5211.id,
      sortOrder: 1,
    },
    update: { label: "ECOBANK Compte 1", cptAccountId: acc5211.id, active: true },
  });
  await prisma.cptBankAccount.upsert({
    where: { code: "ECOBANK2" },
    create: {
      code: "ECOBANK2",
      label: "ECOBANK Compte 2",
      bankName: "ECOBANK",
      accountRef: "À renseigner",
      cptAccountId: acc5212.id,
      sortOrder: 2,
    },
    update: { label: "ECOBANK Compte 2", cptAccountId: acc5212.id, active: true },
  });

  const fxCount = await prisma.cptFxRate.count({ where: { pair: "EUR/XOF" } });
  if (fxCount === 0) {
    await prisma.cptFxRate.create({
      data: {
        pair: "EUR/XOF",
        rate: 655.957,
        validFrom: new Date(`${year}-01-01`),
        note: "Taux fixe initial (paramétrable)",
      },
    });
  }

  const bud = await prisma.budExercise.upsert({
    where: { year },
    create: { year, label: `Budget ${year}` },
    update: {},
  });

  const patenteCount = await prisma.budPatenteDue.count({ where: { exerciseId: bud.id } });
  if (patenteCount === 0) {
    await prisma.budPatenteDue.create({
      data: {
        exerciseId: bud.id,
        label: `Patente ${year} — échéance indicative`,
        dueDate: new Date(`${year}-03-31`),
        amount: 0,
        status: "PENDING",
        note: "Montant à saisir (fiscalité assistée)",
      },
    });
  }

  console.log(
    `✓ Phase 6 CPT: ${CPT_ACCOUNTS_SEED.length} comptes, ${CPT_JOURNALS_SEED.length} journaux, exercice ${year}, 2 banques ECOBANK`,
  );
}