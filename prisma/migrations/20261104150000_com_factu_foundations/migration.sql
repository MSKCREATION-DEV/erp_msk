-- COM-FACTU Phase 2 — fondations facturation / contrats / AR / numérotation

-- ─── Enums ───────────────────────────────────────────────────
ALTER TYPE "CatalogBilling" ADD VALUE IF NOT EXISTS 'RECURRING';
ALTER TYPE "CatalogBilling" ADD VALUE IF NOT EXISTS 'SUR_DEVIS';
ALTER TYPE "CatalogBilling" ADD VALUE IF NOT EXISTS 'COMPLEMENTAIRE';

CREATE TYPE "CatalogPriceMode" AS ENUM ('FIXED', 'FROM', 'CUSTOM');

ALTER TYPE "ComDocKind" ADD VALUE IF NOT EXISTS 'AVOIR';
ALTER TYPE "ComDocKind" ADD VALUE IF NOT EXISTS 'BDC';

ALTER TYPE "ComQuoteStatus" ADD VALUE IF NOT EXISTS 'EMISE';
ALTER TYPE "ComQuoteStatus" ADD VALUE IF NOT EXISTS 'CONSULTE';

ALTER TYPE "ComInvoiceStatus" ADD VALUE IF NOT EXISTS 'ENVOYEE';
ALTER TYPE "ComInvoiceStatus" ADD VALUE IF NOT EXISTS 'EN_RETARD';
ALTER TYPE "ComInvoiceStatus" ADD VALUE IF NOT EXISTS 'AVOIREE';

CREATE TYPE "ComQuoteTemplate" AS ENUM ('LINE_ITEMS', 'COMPARATIVE_RS', 'CUSTOM');
CREATE TYPE "ComInvoiceSource" AS ENUM ('QUOTE', 'CONTRACT', 'MANUAL', 'IMPORT');
CREATE TYPE "ComPaymentStatus" AS ENUM ('DRAFT', 'VALIDATED', 'CANCELLED');
CREATE TYPE "ComClientStatus" AS ENUM ('PROSPECT', 'ACTIF', 'SUSPENDU', 'TERMINE', 'ARCHIVE');
CREATE TYPE "ComClientType" AS ENUM ('ENTREPRISE', 'PARTICULIER');
CREATE TYPE "ComContractStatus" AS ENUM ('BROUILLON', 'ACTIF', 'SUSPENDU', 'RESILIE', 'TERMINE');
CREATE TYPE "ComContractLineStatus" AS ENUM ('ACTIF', 'SUSPENDU', 'RESILIE', 'TERMINE');
CREATE TYPE "ComImportBatchStatus" AS ENUM ('DRY_RUN', 'PENDING_REVIEW', 'COMMITTED', 'CANCELLED');
CREATE TYPE "ComImportAnomalySeverity" AS ENUM ('WARNING', 'ERROR');

ALTER TYPE "ComPaymentMethod" ADD VALUE IF NOT EXISTS 'ORANGE_MONEY';
ALTER TYPE "ComPaymentMethod" ADD VALUE IF NOT EXISTS 'WAVE';
ALTER TYPE "ComPaymentMethod" ADD VALUE IF NOT EXISTS 'CHEQUE';

-- ─── Catalogue ───────────────────────────────────────────────
ALTER TABLE "catalog_offers"
  ADD COLUMN IF NOT EXISTS "longDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "priceMode" "CatalogPriceMode" NOT NULL DEFAULT 'FIXED',
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'XOF',
  ADD COLUMN IF NOT EXISTS "minEngagementMonths" INTEGER,
  ADD COLUMN IF NOT EXISTS "conditions" TEXT,
  ADD COLUMN IF NOT EXISTS "featuresJson" JSONB;

CREATE TABLE "catalog_offer_versions" (
  "id" TEXT NOT NULL,
  "catalogOfferId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "isOfficial" BOOLEAN NOT NULL DEFAULT false,
  "sku" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "billing" "CatalogBilling" NOT NULL,
  "priceMode" "CatalogPriceMode" NOT NULL,
  "priceXof" INTEGER,
  "floorPriceXof" INTEGER,
  "vatEligible" BOOLEAN NOT NULL DEFAULT true,
  "featuresJson" JSONB,
  "snapshotJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "catalog_offer_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "catalog_offer_versions_catalogOfferId_version_key"
  ON "catalog_offer_versions"("catalogOfferId", "version");
CREATE INDEX "catalog_offer_versions_sku_version_idx"
  ON "catalog_offer_versions"("sku", "version");

ALTER TABLE "catalog_offer_versions"
  ADD CONSTRAINT "catalog_offer_versions_catalogOfferId_fkey"
  FOREIGN KEY ("catalogOfferId") REFERENCES "catalog_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Séquences : year → periodKey ────────────────────────────
ALTER TABLE "com_number_sequences" ADD COLUMN IF NOT EXISTS "periodKey" TEXT;
UPDATE "com_number_sequences" SET "periodKey" = "year"::text WHERE "periodKey" IS NULL;
ALTER TABLE "com_number_sequences" ALTER COLUMN "periodKey" SET NOT NULL;

DROP INDEX IF EXISTS "com_number_sequences_kind_year_key";
ALTER TABLE "com_number_sequences" DROP COLUMN IF EXISTS "year";
CREATE UNIQUE INDEX "com_number_sequences_kind_periodKey_key"
  ON "com_number_sequences"("kind", "periodKey");

-- ─── Clients ─────────────────────────────────────────────────
ALTER TABLE "com_clients"
  ADD COLUMN IF NOT EXISTS "legalName" TEXT,
  ADD COLUMN IF NOT EXISTS "clientType" "ComClientType" NOT NULL DEFAULT 'ENTREPRISE',
  ADD COLUMN IF NOT EXISTS "status" "ComClientStatus" NOT NULL DEFAULT 'ACTIF',
  ADD COLUMN IF NOT EXISTS "sector" TEXT,
  ADD COLUMN IF NOT EXISTS "contactRole" TEXT,
  ADD COLUMN IF NOT EXISTS "website" TEXT,
  ADD COLUMN IF NOT EXISTS "taxId" TEXT;

CREATE INDEX IF NOT EXISTS "com_clients_status_idx" ON "com_clients"("status");

-- ─── Devis ───────────────────────────────────────────────────
ALTER TABLE "com_quotes"
  ADD COLUMN IF NOT EXISTS "draftCode" TEXT,
  ADD COLUMN IF NOT EXISTS "legacyNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "legacyInternalRef" TEXT,
  ADD COLUMN IF NOT EXISTS "template" "ComQuoteTemplate" NOT NULL DEFAULT 'LINE_ITEMS',
  ADD COLUMN IF NOT EXISTS "revision" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "conditionsJson" JSONB,
  ADD COLUMN IF NOT EXISTS "issuedAt" TIMESTAMP(3);

UPDATE "com_quotes" SET "draftCode" = 'DRF-DEV-' || substr("id", 1, 8)
  WHERE "draftCode" IS NULL;
ALTER TABLE "com_quotes" ALTER COLUMN "draftCode" SET NOT NULL;

ALTER TABLE "com_quotes" ALTER COLUMN "number" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "com_quotes_draftCode_key" ON "com_quotes"("draftCode");
CREATE INDEX IF NOT EXISTS "com_quotes_legacyNumber_idx" ON "com_quotes"("legacyNumber");

ALTER TABLE "com_quote_lines"
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "snapshotJson" JSONB;

-- ─── Factures ────────────────────────────────────────────────
ALTER TABLE "com_invoices"
  ADD COLUMN IF NOT EXISTS "draftCode" TEXT,
  ADD COLUMN IF NOT EXISTS "legacyNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "legacyInternalRef" TEXT,
  ADD COLUMN IF NOT EXISTS "source" "ComInvoiceSource" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "periodStart" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "periodEnd" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "presentedNetPayable" INTEGER,
  ADD COLUMN IF NOT EXISTS "contractId" TEXT,
  ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "importBatchId" TEXT;

UPDATE "com_invoices" SET "draftCode" = 'DRF-FAC-' || substr("id", 1, 8)
  WHERE "draftCode" IS NULL;
ALTER TABLE "com_invoices" ALTER COLUMN "draftCode" SET NOT NULL;
ALTER TABLE "com_invoices" ALTER COLUMN "number" DROP NOT NULL;

-- Lever 1 facture / devis
DROP INDEX IF EXISTS "com_invoices_quoteId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "com_invoices_draftCode_key" ON "com_invoices"("draftCode");
CREATE INDEX IF NOT EXISTS "com_invoices_legacyNumber_idx" ON "com_invoices"("legacyNumber");
CREATE INDEX IF NOT EXISTS "com_invoices_quoteId_idx" ON "com_invoices"("quoteId");
CREATE INDEX IF NOT EXISTS "com_invoices_dueDate_status_idx" ON "com_invoices"("dueDate", "status");

ALTER TABLE "com_invoice_lines"
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "contractLineId" TEXT,
  ADD COLUMN IF NOT EXISTS "snapshotJson" JSONB;

-- ─── Contrats ────────────────────────────────────────────────
CREATE TABLE "com_contracts" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "status" "ComContractStatus" NOT NULL DEFAULT 'BROUILLON',
  "title" TEXT,
  "regime" "ComDocRegime" NOT NULL DEFAULT 'ML',
  "currency" TEXT NOT NULL DEFAULT 'XOF',
  "vatEnabled" BOOLEAN NOT NULL DEFAULT true,
  "vatRate" INTEGER NOT NULL DEFAULT 18,
  "billingDay" INTEGER NOT NULL DEFAULT 5,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "paymentTerms" TEXT,
  "renewalTerms" TEXT,
  "terminationTerms" TEXT,
  "notes" TEXT,
  "clientId" TEXT NOT NULL,
  "quoteId" TEXT,
  "ownerId" UUID NOT NULL,
  "createdById" UUID NOT NULL,
  "signedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "com_contracts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "com_contracts_reference_key" ON "com_contracts"("reference");
CREATE INDEX "com_contracts_clientId_status_idx" ON "com_contracts"("clientId", "status");
CREATE INDEX "com_contracts_ownerId_idx" ON "com_contracts"("ownerId");

ALTER TABLE "com_contracts"
  ADD CONSTRAINT "com_contracts_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "com_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "com_contracts"
  ADD CONSTRAINT "com_contracts_quoteId_fkey"
  FOREIGN KEY ("quoteId") REFERENCES "com_quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "com_contracts"
  ADD CONSTRAINT "com_contracts_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "com_contracts"
  ADD CONSTRAINT "com_contracts_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "com_contract_lines" (
  "id" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "qty" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" INTEGER NOT NULL,
  "billing" "CatalogBilling" NOT NULL DEFAULT 'MONTHLY',
  "status" "ComContractLineStatus" NOT NULL DEFAULT 'ACTIF',
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "nextBillAt" TIMESTAMP(3),
  "catalogOfferId" TEXT,
  "catalogOfferVersionId" TEXT,
  "snapshotJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "com_contract_lines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "com_contract_lines_contractId_status_idx" ON "com_contract_lines"("contractId", "status");
CREATE INDEX "com_contract_lines_nextBillAt_idx" ON "com_contract_lines"("nextBillAt");

ALTER TABLE "com_contract_lines"
  ADD CONSTRAINT "com_contract_lines_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "com_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "com_contract_lines"
  ADD CONSTRAINT "com_contract_lines_catalogOfferId_fkey"
  FOREIGN KEY ("catalogOfferId") REFERENCES "catalog_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "com_contract_lines"
  ADD CONSTRAINT "com_contract_lines_catalogOfferVersionId_fkey"
  FOREIGN KEY ("catalogOfferVersionId") REFERENCES "catalog_offer_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "com_invoices"
  ADD CONSTRAINT "com_invoices_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "com_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "com_invoice_lines"
  ADD CONSTRAINT "com_invoice_lines_contractLineId_fkey"
  FOREIGN KEY ("contractLineId") REFERENCES "com_contract_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "com_invoices_contractId_idx" ON "com_invoices"("contractId");

-- ─── Arriérés présentation / avoirs / import ─────────────────
CREATE TABLE "com_invoice_arrears_refs" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "sourceInvoiceId" TEXT NOT NULL,
  "presentedAmount" INTEGER NOT NULL,
  "label" TEXT,
  CONSTRAINT "com_invoice_arrears_refs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "com_invoice_arrears_refs_invoiceId_sourceInvoiceId_key"
  ON "com_invoice_arrears_refs"("invoiceId", "sourceInvoiceId");
CREATE INDEX "com_invoice_arrears_refs_sourceInvoiceId_idx"
  ON "com_invoice_arrears_refs"("sourceInvoiceId");
ALTER TABLE "com_invoice_arrears_refs"
  ADD CONSTRAINT "com_invoice_arrears_refs_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "com_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "com_invoice_arrears_refs"
  ADD CONSTRAINT "com_invoice_arrears_refs_sourceInvoiceId_fkey"
  FOREIGN KEY ("sourceInvoiceId") REFERENCES "com_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "com_import_batches" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "status" "ComImportBatchStatus" NOT NULL DEFAULT 'DRY_RUN',
  "sourceName" TEXT,
  "reportJson" JSONB,
  "createdById" UUID NOT NULL,
  "committedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "com_import_batches_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "com_import_batches_status_idx" ON "com_import_batches"("status");
ALTER TABLE "com_import_batches"
  ADD CONSTRAINT "com_import_batches_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "com_invoices"
  ADD CONSTRAINT "com_invoices_importBatchId_fkey"
  FOREIGN KEY ("importBatchId") REFERENCES "com_import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "com_import_anomalies" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "severity" "ComImportAnomalySeverity" NOT NULL DEFAULT 'WARNING',
  "message" TEXT NOT NULL,
  "entityRef" TEXT,
  "metaJson" JSONB,
  "resolved" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "com_import_anomalies_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "com_import_anomalies_batchId_resolved_idx"
  ON "com_import_anomalies"("batchId", "resolved");
ALTER TABLE "com_import_anomalies"
  ADD CONSTRAINT "com_import_anomalies_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "com_import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "com_credit_notes" (
  "id" TEXT NOT NULL,
  "number" TEXT,
  "draftCode" TEXT NOT NULL,
  "legacyNumber" TEXT,
  "amount" INTEGER NOT NULL,
  "reason" TEXT,
  "clientId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "createdById" UUID NOT NULL,
  "gedDocumentId" TEXT,
  "issuedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "com_credit_notes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "com_credit_notes_number_key" ON "com_credit_notes"("number");
CREATE UNIQUE INDEX "com_credit_notes_draftCode_key" ON "com_credit_notes"("draftCode");
CREATE INDEX "com_credit_notes_clientId_idx" ON "com_credit_notes"("clientId");
CREATE INDEX "com_credit_notes_invoiceId_idx" ON "com_credit_notes"("invoiceId");
ALTER TABLE "com_credit_notes"
  ADD CONSTRAINT "com_credit_notes_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "com_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "com_credit_notes"
  ADD CONSTRAINT "com_credit_notes_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "com_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "com_credit_notes"
  ADD CONSTRAINT "com_credit_notes_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Paiements : clientId + allocations ──────────────────────
ALTER TABLE "com_payments"
  ADD COLUMN IF NOT EXISTS "clientId" TEXT,
  ADD COLUMN IF NOT EXISTS "status" "ComPaymentStatus" NOT NULL DEFAULT 'VALIDATED',
  ADD COLUMN IF NOT EXISTS "reference" TEXT,
  ADD COLUMN IF NOT EXISTS "gedDocumentId" TEXT,
  ADD COLUMN IF NOT EXISTS "importBatchId" TEXT;

UPDATE "com_payments" p
SET "clientId" = i."clientId"
FROM "com_invoices" i
WHERE p."invoiceId" = i."id" AND p."clientId" IS NULL;

-- Paiements orphelins (ne devrait pas arriver) : bloquer migrate si null restants
-- DELETE FROM com_payments WHERE "clientId" IS NULL; -- non : on refuse
ALTER TABLE "com_payments" ALTER COLUMN "clientId" SET NOT NULL;
ALTER TABLE "com_payments" ALTER COLUMN "invoiceId" DROP NOT NULL;

ALTER TABLE "com_payments"
  ADD CONSTRAINT "com_payments_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "com_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "com_payments"
  ADD CONSTRAINT "com_payments_importBatchId_fkey"
  FOREIGN KEY ("importBatchId") REFERENCES "com_import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "com_payments_clientId_idx" ON "com_payments"("clientId");
CREATE INDEX IF NOT EXISTS "com_payments_paidAt_idx" ON "com_payments"("paidAt");

CREATE TABLE "com_payment_allocations" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "com_payment_allocations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "com_payment_allocations_paymentId_invoiceId_key"
  ON "com_payment_allocations"("paymentId", "invoiceId");
CREATE INDEX "com_payment_allocations_invoiceId_idx" ON "com_payment_allocations"("invoiceId");
ALTER TABLE "com_payment_allocations"
  ADD CONSTRAINT "com_payment_allocations_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "com_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "com_payment_allocations"
  ADD CONSTRAINT "com_payment_allocations_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "com_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "com_payment_allocations" ("id", "paymentId", "invoiceId", "amount", "createdAt")
SELECT
  'alloc_' || p."id",
  p."id",
  p."invoiceId",
  p."amount",
  p."createdAt"
FROM "com_payments" p
WHERE p."invoiceId" IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE TABLE "com_client_events" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "metaJson" JSONB,
  "actorId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "com_client_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "com_client_events_clientId_createdAt_idx"
  ON "com_client_events"("clientId", "createdAt");
ALTER TABLE "com_client_events"
  ADD CONSTRAINT "com_client_events_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "com_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "com_client_events"
  ADD CONSTRAINT "com_client_events_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "com_invoice_reminders" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "level" INTEGER NOT NULL DEFAULT 1,
  "channel" TEXT NOT NULL,
  "content" TEXT,
  "result" TEXT,
  "nextAction" TEXT,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" UUID,
  CONSTRAINT "com_invoice_reminders_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "com_invoice_reminders_invoiceId_sentAt_idx"
  ON "com_invoice_reminders"("invoiceId", "sentAt");
ALTER TABLE "com_invoice_reminders"
  ADD CONSTRAINT "com_invoice_reminders_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "com_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS (PostgREST fermé) — trigger event + activation explicite
ALTER TABLE "catalog_offer_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "com_contracts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "com_contract_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "com_invoice_arrears_refs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "com_credit_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "com_payment_allocations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "com_client_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "com_invoice_reminders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "com_import_batches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "com_import_anomalies" ENABLE ROW LEVEL SECURITY;
