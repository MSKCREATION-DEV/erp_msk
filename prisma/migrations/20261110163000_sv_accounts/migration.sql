-- Suivi tampon — comptes physique / banque + lien mouvements

CREATE TYPE "SvAccountKind" AS ENUM ('PHYSICAL', 'BANK');

CREATE TABLE "sv_accounts" (
    "id" TEXT NOT NULL,
    "kind" "SvAccountKind" NOT NULL,
    "label" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sv_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sv_accounts_kind_key" ON "sv_accounts"("kind");

ALTER TABLE "sv_cash_movements" ADD COLUMN "accountId" TEXT;
ALTER TABLE "sv_cash_movements" ADD COLUMN "transferId" TEXT;

CREATE INDEX "sv_cash_movements_accountId_movedAt_idx" ON "sv_cash_movements"("accountId", "movedAt");
CREATE INDEX "sv_cash_movements_transferId_idx" ON "sv_cash_movements"("transferId");

ALTER TABLE "sv_cash_movements"
  ADD CONSTRAINT "sv_cash_movements_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "sv_accounts"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS (PostgREST fermé) — pas de policy ouverte anon/authenticated
ALTER TABLE "sv_accounts" ENABLE ROW LEVEL SECURITY;
