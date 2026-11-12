import type {
  PrismaClient,
  SvAccountKind,
  SvCashDirection,
} from "@/generated/prisma/client";

export const SV_ACCOUNT_KIND_LABEL: Record<SvAccountKind, string> = {
  PHYSICAL: "Compte physique",
  BANK: "Compte banque",
};

export const SV_ACCOUNT_KIND_HINT: Record<SvAccountKind, string> = {
  PHYSICAL:
    "Caisse espèces — achats, sorties, paiements cash, retraits banque reçus.",
  BANK: "Banque — virements, retraits, versements, remises de chèque.",
};

/**
 * Bascule Direction 12/11/2026 — début de journée Bamako (UTC+0 = UTC).
 * Historique antérieur = archive (countsTowardBalance=false).
 * Solde courant = écriture d’ouverture IN + mouvements post-bascule.
 * Décision I — docs/specs/suivi-tampon/DECISIONS-SEED.md
 */
export const SV_ACCOUNT_BASELINE_AT = new Date("2026-11-12T00:00:00.000Z");

export const SV_ACCOUNT_BASELINE_BALANCES: Record<SvAccountKind, number> = {
  PHYSICAL: 145_000,
  BANK: 204_815,
};

export const SV_ACCOUNT_BASELINE_CATEGORY = "Ouverture / Bascule Direction";

export function svBaselineReference(kind: SvAccountKind): string {
  return `sv-baseline:${kind}:2026-11-12`;
}

/** Métadonnées comptes — notes mises à jour après bascule (décision I). */
export const SV_ACCOUNT_SEED = [
  {
    kind: "PHYSICAL" as const,
    label: "Compte physique",
    notes:
      "Bascule Direction 12/11/2026 (début de journée) : solde d’ouverture 145 000 FCFA. Historique antérieur archivé (hors solde courant).",
  },
  {
    kind: "BANK" as const,
    label: "Compte banque",
    notes:
      "Bascule Direction 12/11/2026 (début de journée) : solde d’ouverture 204 815 FCFA. Historique antérieur archivé (hors solde courant).",
  },
] as const;

export function accountBalanceFromMoves(
  moves: {
    direction: SvCashDirection;
    amount: number;
    countsTowardBalance?: boolean;
  }[],
): number {
  let bal = 0;
  for (const m of moves) {
    if (m.countsTowardBalance === false) continue;
    bal += m.direction === "IN" ? m.amount : -m.amount;
  }
  return bal;
}

export function formatSvBaselineDateFr(
  at: Date = SV_ACCOUNT_BASELINE_AT,
): string {
  return at.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** true si la date est ≥ bascule (compte dans le solde courant). */
export function countsTowardBalanceForDate(movedAt: Date): boolean {
  return movedAt.getTime() >= SV_ACCOUNT_BASELINE_AT.getTime();
}

export async function ensureSvAccounts(db: PrismaClient) {
  for (const a of SV_ACCOUNT_SEED) {
    const existing = await db.svAccount.findUnique({
      where: { kind: a.kind },
    });
    if (existing) continue;
    await db.svAccount.create({
      data: {
        kind: a.kind,
        label: a.label,
        notes: a.notes,
        baselineAt: SV_ACCOUNT_BASELINE_AT,
        baselineBalance: SV_ACCOUNT_BASELINE_BALANCES[a.kind],
      },
    });
  }
}

/**
 * Idempotent : archive pre-bascule + écritures d’ouverture Direction.
 * Ne touche pas Auth / mots de passe.
 */
export async function applySvAccountBaseline(
  db: PrismaClient,
  createdById: string,
) {
  await ensureSvAccounts(db);

  for (const a of SV_ACCOUNT_SEED) {
    const account = await db.svAccount.findUniqueOrThrow({
      where: { kind: a.kind },
    });
    const balance = SV_ACCOUNT_BASELINE_BALANCES[a.kind];

    await db.svAccount.update({
      where: { id: account.id },
      data: {
        label: a.label,
        notes: a.notes,
        baselineAt: SV_ACCOUNT_BASELINE_AT,
        baselineBalance: balance,
      },
    });

    // Archive : tout mouvement du compte avant la bascule (hors écriture d’ouverture).
    const baselineRef = svBaselineReference(a.kind);
    await db.svCashMovement.updateMany({
      where: {
        accountId: account.id,
        movedAt: { lt: SV_ACCOUNT_BASELINE_AT },
        NOT: { reference: baselineRef },
        countsTowardBalance: true,
      },
      data: { countsTowardBalance: false },
    });

    const existingOpen = await db.svCashMovement.findFirst({
      where: { reference: baselineRef },
    });
    if (existingOpen) {
      await db.svCashMovement.update({
        where: { id: existingOpen.id },
        data: {
          accountId: account.id,
          movedAt: SV_ACCOUNT_BASELINE_AT,
          direction: "IN",
          amount: balance,
          category: SV_ACCOUNT_BASELINE_CATEGORY,
          description:
            "Solde d’ouverture confirmé Direction — début de journée 12/11/2026 (Bamako UTC).",
          paymentMethod: null,
          countsTowardBalance: true,
        },
      });
    } else {
      await db.svCashMovement.create({
        data: {
          accountId: account.id,
          movedAt: SV_ACCOUNT_BASELINE_AT,
          direction: "IN",
          amount: balance,
          category: SV_ACCOUNT_BASELINE_CATEGORY,
          description:
            "Solde d’ouverture confirmé Direction — début de journée 12/11/2026 (Bamako UTC).",
          reference: baselineRef,
          countsTowardBalance: true,
          createdById,
        },
      });
    }
  }
}

export async function getSvAccountByKind(
  kind: SvAccountKind,
  db: PrismaClient,
) {
  await ensureSvAccounts(db);
  return db.svAccount.findUniqueOrThrow({ where: { kind } });
}

/** Heuristique mode paiement → compte (miroir facture / saisie rapide). */
export function inferAccountKindFromPaymentMethod(
  method: string | null | undefined,
): SvAccountKind {
  const m = (method ?? "").toLowerCase();
  if (
    m.includes("vir") ||
    m.includes("chèque") ||
    m.includes("cheque") ||
    m.includes("bank") ||
    m.includes("banque")
  ) {
    return "BANK";
  }
  return "PHYSICAL";
}
