-- AlterTable
ALTER TABLE "catalog_offers" ADD COLUMN "optionSchema" JSONB;

-- CreateTable
CREATE TABLE "crm_opportunity_offers" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "catalogOfferId" TEXT NOT NULL,
    "config" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_opportunity_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_opportunity_offers_opportunityId_idx" ON "crm_opportunity_offers"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_opportunity_offers_opportunityId_catalogOfferId_key" ON "crm_opportunity_offers"("opportunityId", "catalogOfferId");

-- AddForeignKey
ALTER TABLE "crm_opportunity_offers" ADD CONSTRAINT "crm_opportunity_offers_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "crm_opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_opportunity_offers" ADD CONSTRAINT "crm_opportunity_offers_catalogOfferId_fkey" FOREIGN KEY ("catalogOfferId") REFERENCES "catalog_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
