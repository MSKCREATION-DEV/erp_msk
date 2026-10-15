-- LOT-J Break : objectifs ancrés jour/semaine/mois (crm_weekly_goals → crm_period_goals)

-- Colonnes période (défaut temporaire pour backfill)
ALTER TABLE "crm_weekly_goals" ADD COLUMN "periodType" TEXT NOT NULL DEFAULT 'WEEK';
ALTER TABLE "crm_weekly_goals" ADD COLUMN "periodStart" DATE;

-- Backfill : cibles existantes = semaine (lundi ISO) au moment de la migration
UPDATE "crm_weekly_goals"
SET "periodStart" = (date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE 'UTC'))::date
WHERE "periodStart" IS NULL;

ALTER TABLE "crm_weekly_goals" ALTER COLUMN "periodStart" SET NOT NULL;
ALTER TABLE "crm_weekly_goals" ALTER COLUMN "periodType" DROP DEFAULT;

-- Unique étendu
DROP INDEX IF EXISTS "crm_weekly_goals_scope_userId_metric_key";
CREATE UNIQUE INDEX "crm_weekly_goals_scope_userId_metric_periodType_periodStart_key"
  ON "crm_weekly_goals"("scope", "userId", "metric", "periodType", "periodStart");

CREATE INDEX "crm_weekly_goals_periodType_periodStart_idx"
  ON "crm_weekly_goals"("periodType", "periodStart");

-- Rename table + indexes / FK to match Prisma @@map
ALTER TABLE "crm_weekly_goals" RENAME TO "crm_period_goals";

ALTER INDEX "crm_weekly_goals_pkey" RENAME TO "crm_period_goals_pkey";
ALTER INDEX "crm_weekly_goals_scope_metric_idx" RENAME TO "crm_period_goals_scope_metric_idx";
ALTER INDEX "crm_weekly_goals_scope_userId_metric_periodType_periodStart_key"
  RENAME TO "crm_period_goals_scope_userId_metric_periodType_periodStart_key";
ALTER INDEX "crm_weekly_goals_periodType_periodStart_idx"
  RENAME TO "crm_period_goals_periodType_periodStart_idx";

ALTER TABLE "crm_period_goals" RENAME CONSTRAINT "crm_weekly_goals_userId_fkey" TO "crm_period_goals_userId_fkey";
