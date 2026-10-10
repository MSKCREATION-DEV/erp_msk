/**
 * Seed articles démo Phase 7A — qty via mouvements ENTREE initiaux.
 */
import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

const DEMO: Array<{
  code: string;
  family: string;
  subFamily?: string;
  designation: string;
  unit: string;
  stockMin: number;
  location: string;
  unitCostXof?: number;
  initialQty: number;
}> = [
  {
    code: "PAP-A4",
    family: "Papeterie",
    subFamily: "Impression",
    designation: "Ramette papier A4 80g",
    unit: "RAM",
    stockMin: 5,
    location: "Armoire 1",
    unitCostXof: 3500,
    initialQty: 12,
  },
  {
    code: "PAP-STYLO",
    family: "Papeterie",
    subFamily: "Écriture",
    designation: "Stylo bille bleu",
    unit: "U",
    stockMin: 20,
    location: "Armoire 1",
    unitCostXof: 150,
    initialQty: 8,
  },
  {
    code: "IT-USB",
    family: "Informatique",
    subFamily: "Périphériques",
    designation: "Clé USB 32 Go",
    unit: "U",
    stockMin: 3,
    location: "Armoire 2",
    unitCostXof: 8000,
    initialQty: 5,
  },
  {
    code: "IT-SOURIS",
    family: "Informatique",
    designation: "Souris optique USB",
    unit: "U",
    stockMin: 2,
    location: "Armoire 2",
    unitCostXof: 5500,
    initialQty: 4,
  },
  {
    code: "ENT-CAFE",
    family: "Consommables",
    designation: "Café dosettes (boîte)",
    unit: "BTQ",
    stockMin: 4,
    location: "Cuisine",
    unitCostXof: 12000,
    initialQty: 2,
  },
  {
    code: "ENT-EAU",
    family: "Consommables",
    designation: "Pack eau 1,5 L (6)",
    unit: "PK",
    stockMin: 6,
    location: "Cuisine",
    unitCostXof: 2500,
    initialQty: 10,
  },
  {
    code: "CREA-MARQ",
    family: "Créa",
    designation: "Marqueurs tableau",
    unit: "U",
    stockMin: 4,
    location: "Atelier",
    unitCostXof: 800,
    initialQty: 15,
  },
  {
    code: "CREA-CUT",
    family: "Créa",
    designation: "Cutter professionnel",
    unit: "U",
    stockMin: 2,
    location: "Atelier",
    unitCostXof: 4500,
    initialQty: 3,
  },
];

export async function seedPhase7aStocks(prisma: PrismaClient) {
  const admin = await prisma.user.findFirst({
    where: { isSuperAdmin: true },
    select: { id: true },
  });
  if (!admin) {
    console.warn("⚠ Seed stocks : pas de Super Admin — articles sans mouvements");
  }

  let created = 0;
  for (const d of DEMO) {
    const existing = await prisma.stkArticle.findUnique({
      where: { code: d.code },
    });
    if (existing) continue;

    const article = await prisma.stkArticle.create({
      data: {
        code: d.code,
        family: d.family,
        subFamily: d.subFamily ?? null,
        designation: d.designation,
        unit: d.unit,
        stockMin: new Prisma.Decimal(d.stockMin),
        location: d.location,
        unitCostXof: d.unitCostXof ?? null,
        qtyOnHand: new Prisma.Decimal(0),
        active: true,
        createdById: admin?.id ?? null,
      },
    });

    if (admin && d.initialQty > 0) {
      const qty = new Prisma.Decimal(d.initialQty);
      await prisma.stkArticle.update({
        where: { id: article.id },
        data: { qtyOnHand: qty },
      });
      await prisma.stkMovement.create({
        data: {
          articleId: article.id,
          type: "ENTREE",
          quantity: qty,
          qtyBefore: new Prisma.Decimal(0),
          qtyAfter: qty,
          reason: "Seed inventaire initial Phase 7A",
          createdById: admin.id,
        },
      });
    }
    created += 1;
  }

  console.log(
    `✓ Phase 7A Stocks: ${created} article(s) créés (${DEMO.length} au catalogue démo)`,
  );
}
