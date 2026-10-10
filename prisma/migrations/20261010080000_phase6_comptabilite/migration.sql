-- Phase 6 — Comptabilité SYSCOHADA + banques + budget

CREATE TYPE "CptAccountNature" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'EXPENSE', 'INCOME');
CREATE TYPE "CptExerciseStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "CptPeriodStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "CptEntryStatus" AS ENUM ('DRAFT', 'VALIDATED');
CREATE TYPE "BudNature" AS ENUM ('CAPEX', 'OPEX');
CREATE TYPE "BudPatenteStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

CREATE TABLE "cpt_accounts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "classNum" INTEGER NOT NULL,
    "nature" "CptAccountNature" NOT NULL,
    "isPostable" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpt_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cpt_journals" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpt_journals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cpt_exercises" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "CptExerciseStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpt_exercises_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cpt_periods" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "CptPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpt_periods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cpt_entries" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "entryDate" DATE NOT NULL,
    "label" TEXT NOT NULL,
    "status" "CptEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceType" TEXT,
    "sourceId" TEXT,
    "currencyOriginal" TEXT,
    "fxRate" DECIMAL(12,6),
    "amountOriginal" INTEGER,
    "createdById" UUID NOT NULL,
    "validatedById" UUID,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpt_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cpt_entry_lines" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "label" TEXT,
    "debit" INTEGER NOT NULL DEFAULT 0,
    "credit" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "cpt_entry_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cpt_bank_accounts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "bankName" TEXT NOT NULL DEFAULT 'ECOBANK',
    "accountRef" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "cptAccountId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpt_bank_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cpt_bank_txns" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "txnDate" DATE NOT NULL,
    "label" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "matchedEntryId" TEXT,
    "matchedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpt_bank_txns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cpt_fx_rates" (
    "id" TEXT NOT NULL,
    "pair" TEXT NOT NULL DEFAULT 'EUR/XOF',
    "rate" DECIMAL(12,6) NOT NULL,
    "validFrom" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cpt_fx_rates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bud_exercises" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bud_exercises_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bud_lines" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "nature" "BudNature" NOT NULL,
    "category" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "planned" INTEGER NOT NULL DEFAULT 0,
    "actual" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bud_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bud_patente_dues" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dueDate" DATE NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "status" "BudPatenteStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bud_patente_dues_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cpt_accounts_code_key" ON "cpt_accounts"("code");
CREATE INDEX "cpt_accounts_classNum_code_idx" ON "cpt_accounts"("classNum", "code");
CREATE INDEX "cpt_accounts_active_isPostable_idx" ON "cpt_accounts"("active", "isPostable");

CREATE UNIQUE INDEX "cpt_journals_code_key" ON "cpt_journals"("code");
CREATE UNIQUE INDEX "cpt_exercises_year_key" ON "cpt_exercises"("year");
CREATE UNIQUE INDEX "cpt_periods_exerciseId_month_key" ON "cpt_periods"("exerciseId", "month");
CREATE INDEX "cpt_periods_status_idx" ON "cpt_periods"("status");

CREATE UNIQUE INDEX "cpt_entries_number_key" ON "cpt_entries"("number");
CREATE INDEX "cpt_entries_journalId_entryDate_idx" ON "cpt_entries"("journalId", "entryDate");
CREATE INDEX "cpt_entries_periodId_status_idx" ON "cpt_entries"("periodId", "status");
CREATE INDEX "cpt_entries_sourceType_sourceId_idx" ON "cpt_entries"("sourceType", "sourceId");

CREATE INDEX "cpt_entry_lines_entryId_idx" ON "cpt_entry_lines"("entryId");
CREATE INDEX "cpt_entry_lines_accountId_idx" ON "cpt_entry_lines"("accountId");

CREATE UNIQUE INDEX "cpt_bank_accounts_code_key" ON "cpt_bank_accounts"("code");
CREATE INDEX "cpt_bank_accounts_active_idx" ON "cpt_bank_accounts"("active");

CREATE INDEX "cpt_bank_txns_bankAccountId_txnDate_idx" ON "cpt_bank_txns"("bankAccountId", "txnDate");
CREATE INDEX "cpt_bank_txns_matchedEntryId_idx" ON "cpt_bank_txns"("matchedEntryId");

CREATE INDEX "cpt_fx_rates_pair_validFrom_idx" ON "cpt_fx_rates"("pair", "validFrom");

CREATE UNIQUE INDEX "bud_exercises_year_key" ON "bud_exercises"("year");
CREATE UNIQUE INDEX "bud_lines_exerciseId_nature_category_month_key" ON "bud_lines"("exerciseId", "nature", "category", "month");
CREATE INDEX "bud_lines_exerciseId_month_idx" ON "bud_lines"("exerciseId", "month");
CREATE INDEX "bud_patente_dues_exerciseId_dueDate_idx" ON "bud_patente_dues"("exerciseId", "dueDate");

ALTER TABLE "cpt_accounts" ADD CONSTRAINT "cpt_accounts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "cpt_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cpt_periods" ADD CONSTRAINT "cpt_periods_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "cpt_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cpt_entries" ADD CONSTRAINT "cpt_entries_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "cpt_journals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpt_entries" ADD CONSTRAINT "cpt_entries_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "cpt_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpt_entries" ADD CONSTRAINT "cpt_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpt_entries" ADD CONSTRAINT "cpt_entries_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cpt_entry_lines" ADD CONSTRAINT "cpt_entry_lines_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "cpt_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cpt_entry_lines" ADD CONSTRAINT "cpt_entry_lines_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "cpt_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpt_bank_accounts" ADD CONSTRAINT "cpt_bank_accounts_cptAccountId_fkey" FOREIGN KEY ("cptAccountId") REFERENCES "cpt_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpt_bank_txns" ADD CONSTRAINT "cpt_bank_txns_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "cpt_bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cpt_bank_txns" ADD CONSTRAINT "cpt_bank_txns_matchedEntryId_fkey" FOREIGN KEY ("matchedEntryId") REFERENCES "cpt_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cpt_bank_txns" ADD CONSTRAINT "cpt_bank_txns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bud_lines" ADD CONSTRAINT "bud_lines_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "bud_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bud_lines" ADD CONSTRAINT "bud_lines_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bud_patente_dues" ADD CONSTRAINT "bud_patente_dues_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "bud_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
