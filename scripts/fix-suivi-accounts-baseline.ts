/**
 * One-shot / idempotent : bascule Comptes Suivi Direction (décision I).
 * Usage: npx tsx --env-file=.env.local scripts/fix-suivi-accounts-baseline.ts
 *
 * - Archive pre-bascule (countsTowardBalance=false)
 * - Écritures d’ouverture IN au 12/11/2026 00:00 UTC (Bamako)
 * - Soldes : PHYSICAL 145 000 · BANK 204 815
 *
 * Ne touche PAS Auth / mots de passe.
 */
import { createPrisma } from "@/lib/create-prisma";
import {
  SV_ACCOUNT_BASELINE_AT,
  SV_ACCOUNT_BASELINE_BALANCES,
  accountBalanceFromMoves,
  applySvAccountBaseline,
  formatSvBaselineDateFr,
  svBaselineReference,
} from "@/lib/suivi/accounts";
import type { SvAccountKind } from "@/generated/prisma/client";

async function main() {
  const prisma = createPrisma();

  const actor =
    (await prisma.user.findFirst({
      where: { isSuperAdmin: true },
      select: { id: true },
    })) ?? (await prisma.user.findFirst({ select: { id: true } }));

  if (!actor) {
    console.error("✗ Aucun user pour createdById — abort.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  console.log(
    `→ Bascule Comptes (${formatSvBaselineDateFr(SV_ACCOUNT_BASELINE_AT)})…`,
  );
  await applySvAccountBaseline(prisma, actor.id);

  console.log("\n→ Vérification soldes courants…");
  let ok = true;
  const kinds = Object.keys(SV_ACCOUNT_BASELINE_BALANCES) as SvAccountKind[];

  for (const kind of kinds) {
    const account = await prisma.svAccount.findUniqueOrThrow({
      where: { kind },
    });
    const expected = SV_ACCOUNT_BASELINE_BALANCES[kind];
    const moves = await prisma.svCashMovement.findMany({
      where: { accountId: account.id },
      select: {
        direction: true,
        amount: true,
        countsTowardBalance: true,
        reference: true,
        movedAt: true,
      },
    });
    const balance = accountBalanceFromMoves(moves);
    const archived = moves.filter((m) => !m.countsTowardBalance).length;
    const opening = moves.find(
      (m) => m.reference === svBaselineReference(kind),
    );
    const metaOk =
      account.baselineBalance === expected &&
      account.baselineAt?.getTime() === SV_ACCOUNT_BASELINE_AT.getTime() &&
      opening?.amount === expected &&
      opening.countsTowardBalance === true &&
      opening.direction === "IN";

    const balOk = balance === expected;
    console.log(
      `${balOk && metaOk ? "✓" : "✗"} ${kind} · solde=${balance} (attendu ${expected}) · archivés=${archived} · ouverture=${opening?.amount ?? "ABSENT"} · baselineAt=${account.baselineAt?.toISOString() ?? "null"}`,
    );
    if (!balOk || !metaOk) ok = false;
  }

  if (!ok) {
    console.error("\n✗ Bascule non conforme — voir ci-dessus.");
    process.exitCode = 1;
  } else {
    console.log(
      `\n✓ Comptes alignés Direction (décision I) — solde = ouverture au ${formatSvBaselineDateFr()}.`,
    );
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
