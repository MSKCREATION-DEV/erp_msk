-- Phase 7B — Achats, patrimoine, projets, anomalies

CREATE TYPE "StkPurchaseStatus" AS ENUM ('DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED');
CREATE TYPE "PatAssetStatus" AS ENUM ('IN_SERVICE', 'MAINTENANCE', 'DISPOSED');
CREATE TYPE "PrjProjectStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'DONE', 'CANCELLED');
CREATE TYPE "PrjExpenseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REIMBURSED');
CREATE TYPE "OpsTicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "OpsTicketStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'DEFERRED');

CREATE TABLE "stk_purchases" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "supplierContact" TEXT,
    "status" "StkPurchaseStatus" NOT NULL DEFAULT 'DRAFT',
    "orderedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "cptEntryId" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "stk_purchases_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "stk_purchases_number_key" ON "stk_purchases"("number");
CREATE INDEX "stk_purchases_status_createdAt_idx" ON "stk_purchases"("status", "createdAt");

CREATE TABLE "stk_purchase_lines" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "articleId" TEXT,
    "label" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitPriceXof" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "stk_purchase_lines_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "stk_purchase_lines_purchaseId_idx" ON "stk_purchase_lines"("purchaseId");

CREATE TABLE "pat_assets" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "acquiredAt" DATE NOT NULL,
    "valueXof" INTEGER NOT NULL,
    "location" TEXT,
    "status" "PatAssetStatus" NOT NULL DEFAULT 'IN_SERVICE',
    "assignedToId" UUID,
    "purchaseId" TEXT,
    "amortYears" INTEGER NOT NULL DEFAULT 5,
    "disposeNote" TEXT,
    "disposedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pat_assets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pat_assets_code_key" ON "pat_assets"("code");
CREATE INDEX "pat_assets_status_category_idx" ON "pat_assets"("status", "category");

CREATE TABLE "prj_projects" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "PrjProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "budgetXof" INTEGER NOT NULL DEFAULT 0,
    "startDate" DATE,
    "endDate" DATE,
    "ownerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "prj_projects_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "prj_projects_code_key" ON "prj_projects"("code");
CREATE INDEX "prj_projects_status_idx" ON "prj_projects"("status");

CREATE TABLE "prj_members" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "prj_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "prj_members_projectId_userId_key" ON "prj_members"("projectId", "userId");

CREATE TABLE "prj_expenses" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "expenseDate" DATE NOT NULL,
    "nature" TEXT NOT NULL,
    "description" TEXT,
    "plannedXof" INTEGER NOT NULL DEFAULT 0,
    "spentXof" INTEGER NOT NULL,
    "paymentMode" TEXT,
    "status" "PrjExpenseStatus" NOT NULL DEFAULT 'DRAFT',
    "justificatifNote" TEXT,
    "createdById" UUID NOT NULL,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "prj_expenses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "prj_expenses_projectId_status_idx" ON "prj_expenses"("projectId", "status");

CREATE TABLE "ops_tickets" (
    "id" TEXT NOT NULL,
    "equipment" TEXT NOT NULL,
    "problem" TEXT NOT NULL,
    "priority" "OpsTicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "OpsTicketStatus" NOT NULL DEFAULT 'TODO',
    "actionPlan" TEXT,
    "observations" TEXT,
    "assignedToId" UUID,
    "createdById" UUID NOT NULL,
    "noticedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ops_tickets_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ops_tickets_status_priority_idx" ON "ops_tickets"("status", "priority");
CREATE INDEX "ops_tickets_assignedToId_idx" ON "ops_tickets"("assignedToId");

ALTER TABLE "stk_purchases" ADD CONSTRAINT "stk_purchases_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stk_purchase_lines" ADD CONSTRAINT "stk_purchase_lines_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "stk_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stk_purchase_lines" ADD CONSTRAINT "stk_purchase_lines_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "stk_articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pat_assets" ADD CONSTRAINT "pat_assets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pat_assets" ADD CONSTRAINT "pat_assets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pat_assets" ADD CONSTRAINT "pat_assets_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "stk_purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "prj_projects" ADD CONSTRAINT "prj_projects_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "prj_members" ADD CONSTRAINT "prj_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "prj_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prj_members" ADD CONSTRAINT "prj_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prj_expenses" ADD CONSTRAINT "prj_expenses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "prj_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prj_expenses" ADD CONSTRAINT "prj_expenses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "prj_expenses" ADD CONSTRAINT "prj_expenses_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ops_tickets" ADD CONSTRAINT "ops_tickets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ops_tickets" ADD CONSTRAINT "ops_tickets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
