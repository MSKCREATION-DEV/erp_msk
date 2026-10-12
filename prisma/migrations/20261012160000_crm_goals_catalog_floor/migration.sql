-- AlterTable
ALTER TABLE "catalog_offers" ADD COLUMN "floorPriceXof" INTEGER;

-- CreateTable
CREATE TABLE "crm_weekly_goals" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "userId" UUID,
    "metric" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_weekly_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_weekly_goals_scope_metric_idx" ON "crm_weekly_goals"("scope", "metric");

-- CreateIndex
CREATE UNIQUE INDEX "crm_weekly_goals_scope_userId_metric_key" ON "crm_weekly_goals"("scope", "userId", "metric");

-- AddForeignKey
ALTER TABLE "crm_weekly_goals" ADD CONSTRAINT "crm_weekly_goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
