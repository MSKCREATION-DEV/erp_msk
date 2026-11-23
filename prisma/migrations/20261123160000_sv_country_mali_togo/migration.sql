-- Suivi Mali / Togo Phase A — enum pays + uniques composés + backfill MALI
-- Shadow DB souvent cassée : migration SQL manuelle (style repo).
-- Rollback conceptuel : DROP colonnes/indexes + DROP TYPE (voir intent suivi-mali-togo).

CREATE TYPE "SvCountry" AS ENUM ('MALI', 'TOGO');

-- Comptes : 1 PHYSICAL + 1 BANK par pays
ALTER TABLE "sv_accounts"
  ADD COLUMN "country" "SvCountry" NOT NULL DEFAULT 'MALI';

DROP INDEX IF EXISTS "sv_accounts_kind_key";

CREATE UNIQUE INDEX "sv_accounts_country_kind_key"
  ON "sv_accounts"("country", "kind");

CREATE INDEX "sv_accounts_country_idx" ON "sv_accounts"("country");

-- Stocks : codes uniques par pays (mêmes codes Togo possibles)
ALTER TABLE "sv_stock_items"
  ADD COLUMN "country" "SvCountry" NOT NULL DEFAULT 'MALI';

DROP INDEX IF EXISTS "sv_stock_items_code_key";

CREATE UNIQUE INDEX "sv_stock_items_country_code_key"
  ON "sv_stock_items"("country", "code");

CREATE INDEX "sv_stock_items_country_idx" ON "sv_stock_items"("country");
