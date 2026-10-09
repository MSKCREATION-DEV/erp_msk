-- CreateEnum
CREATE TYPE "CatalogPillar" AS ENUM ('IMAGE_MARQUE', 'CONTENU_COMMUNICATION', 'PRESENCE_DIGITALE', 'CROISSANCE_ACQUISITION', 'TRANSFORMATION_STRUCTURATION');

-- CreateEnum
CREATE TYPE "CatalogBilling" AS ENUM ('ONE_SHOT', 'MONTHLY', 'PACKAGE');

-- CreateEnum
CREATE TYPE "CrmSource" AS ENUM ('INSTAGRAM', 'LINKEDIN', 'WHATSAPP', 'TIKTOK', 'GOOGLE_MAPS', 'GOOGLE', 'SNAPCHAT', 'TERRAIN', 'RECOMMANDATION', 'EMAIL', 'TELEPHONE', 'AUTRE');

-- CreateEnum
CREATE TYPE "CrmPipelineStage" AS ENUM ('NOUVEAU', 'CONTACTE', 'QUALIFICATION', 'INTERESSE', 'DEVIS_ENVOYE', 'NEGOCIATION', 'GAGNE', 'PERDU');

-- CreateEnum
CREATE TYPE "CrmActivityType" AS ENUM ('APPEL', 'WHATSAPP', 'INSTAGRAM', 'LINKEDIN', 'EMAIL', 'RDV', 'NOTE', 'AUTRE');

-- CreateEnum
CREATE TYPE "CrmTaskStatus" AS ENUM ('OPEN', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CrmLossReason" AS ENUM ('BUDGET', 'CONCURRENT', 'TIMING', 'NO_SHOW', 'AUTRE');

-- CreateTable
CREATE TABLE "catalog_offers" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pillar" "CatalogPillar" NOT NULL,
    "billing" "CatalogBilling" NOT NULL DEFAULT 'ONE_SHOT',
    "priceXof" INTEGER,
    "priceEurHint" INTEGER,
    "vatEligible" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "sector" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'ML',
    "website" TEXT,
    "source" "CrmSource",
    "notes" TEXT,
    "ownerId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_contacts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "jobTitle" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_opportunities" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "stage" "CrmPipelineStage" NOT NULL DEFAULT 'NOUVEAU',
    "source" "CrmSource",
    "offerLabel" TEXT,
    "catalogOfferId" TEXT,
    "budgetXof" INTEGER,
    "probability" INTEGER,
    "expectedCloseAt" TIMESTAMP(3),
    "lossReason" "CrmLossReason",
    "lossNote" TEXT,
    "ownerId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "lastActivityAt" TIMESTAMP(3),
    "nextAction" TEXT,
    "followUpAt" TIMESTAMP(3),
    "wonAt" TIMESTAMP(3),
    "lostAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_activities" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "opportunityId" TEXT,
    "type" "CrmActivityType" NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_tasks" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "opportunityId" TEXT,
    "title" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "CrmTaskStatus" NOT NULL DEFAULT 'OPEN',
    "assigneeId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_scripts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "channel" "CrmSource" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "tips" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_scripts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_offers_sku_key" ON "catalog_offers"("sku");
CREATE INDEX "catalog_offers_pillar_active_idx" ON "catalog_offers"("pillar", "active");

CREATE INDEX "crm_organizations_ownerId_idx" ON "crm_organizations"("ownerId");
CREATE INDEX "crm_organizations_normalizedName_idx" ON "crm_organizations"("normalizedName");

CREATE INDEX "crm_contacts_organizationId_idx" ON "crm_contacts"("organizationId");
CREATE INDEX "crm_contacts_email_idx" ON "crm_contacts"("email");

CREATE INDEX "crm_opportunities_ownerId_stage_idx" ON "crm_opportunities"("ownerId", "stage");
CREATE INDEX "crm_opportunities_organizationId_idx" ON "crm_opportunities"("organizationId");
CREATE INDEX "crm_opportunities_followUpAt_idx" ON "crm_opportunities"("followUpAt");

CREATE INDEX "crm_activities_opportunityId_occurredAt_idx" ON "crm_activities"("opportunityId", "occurredAt");
CREATE INDEX "crm_activities_organizationId_occurredAt_idx" ON "crm_activities"("organizationId", "occurredAt");

CREATE INDEX "crm_tasks_assigneeId_status_dueAt_idx" ON "crm_tasks"("assigneeId", "status", "dueAt");
CREATE INDEX "crm_tasks_dueAt_idx" ON "crm_tasks"("dueAt");

CREATE UNIQUE INDEX "crm_scripts_code_key" ON "crm_scripts"("code");
CREATE INDEX "crm_scripts_channel_active_idx" ON "crm_scripts"("channel", "active");

-- AddForeignKey
ALTER TABLE "crm_organizations" ADD CONSTRAINT "crm_organizations_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "crm_organizations" ADD CONSTRAINT "crm_organizations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "crm_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "crm_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_catalogOfferId_fkey" FOREIGN KEY ("catalogOfferId") REFERENCES "catalog_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "crm_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "crm_opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "crm_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "crm_opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
