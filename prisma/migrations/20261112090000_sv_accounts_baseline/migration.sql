-- Suivi Comptes — bascule Direction 12/11/2026 (décision I)
-- Solde courant = mouvements countsTowardBalance=true (ouverture + post-bascule).
-- Historique pre-bascule reste visible mais exclu du solde.

ALTER TABLE "sv_accounts" ADD COLUMN "baselineAt" TIMESTAMP(3);
ALTER TABLE "sv_accounts" ADD COLUMN "baselineBalance" INTEGER;

ALTER TABLE "sv_cash_movements" ADD COLUMN "countsTowardBalance" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "sv_cash_movements_accountId_countsTowardBalance_idx"
  ON "sv_cash_movements"("accountId", "countsTowardBalance");
