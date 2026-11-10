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

/** Soldes initiaux : 0 (aucune ouverture documentée). Les OUT seed Espèces impactent PHYSICAL. */
export const SV_ACCOUNT_SEED = [
  {
    kind: "PHYSICAL" as const,
    label: "Compte physique",
    notes:
      "Solde initial 0 (non documenté). Les sorties seed (Espèces) y sont rattachées.",
  },
  {
    kind: "BANK" as const,
    label: "Compte banque",
    notes:
      "Solde initial 0 (non documenté). Retraits / versements saisis manuellement.",
  },
] as const;

export function accountBalanceFromMoves(
  moves: { direction: SvCashDirection; amount: number }[],
): number {
  let bal = 0;
  for (const m of moves) {
    bal += m.direction === "IN" ? m.amount : -m.amount;
  }
  return bal;
}

export async function ensureSvAccounts(db: PrismaClient) {
  for (const a of SV_ACCOUNT_SEED) {
    const existing = await db.svAccount.findUnique({
      where: { kind: a.kind },
    });
    if (existing) continue;
    await db.svAccount.create({
      data: { kind: a.kind, label: a.label, notes: a.notes },
    });
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
