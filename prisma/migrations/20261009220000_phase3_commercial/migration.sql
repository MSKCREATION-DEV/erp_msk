-- CreateEnum
CREATE TYPE "ComDocRegime" AS ENUM ('ML', 'FR');

-- CreateEnum
CREATE TYPE "ComDocKind" AS ENUM ('DEVIS', 'FACTURE');

-- CreateEnum
CREATE TYPE "ComQuoteStatus" AS ENUM ('BROUILLON', 'ENVOYE', 'ACCEPTE', 'REFUSE', 'EXPIRE', 'ANNULE');

-- CreateEnum
CREATE TYPE "ComInvoiceStatus" AS ENUM ('BROUILLON', 'EMISE', 'PARTIELLEMENT_PAYEE', 'PAYEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "ComPaymentMethod" AS ENUM ('ESPECES', 'VIREMENT', 'MOBILE_MONEY', 'AUTRE');

-- CreateTable
CREATE TABLE "com_number_sequences" (
    "id" TEXT NOT NULL,
    "kind" "ComDocKind" NOT NULL,
    "year" INTEGER NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "com_number_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "com_clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'ML',
    "notes" TEXT,
    "includeTravelDefault" BOOLEAN NOT NULL DEFAULT false,
    "crmOrganizationId" TEXT,
    "sourceOpportunityId" TEXT,
    "ownerId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "com_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "com_quotes" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "ComQuoteStatus" NOT NULL DEFAULT 'BROUILLON',
    "regime" "ComDocRegime" NOT NULL DEFAULT 'ML',
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "vatEnabled" BOOLEAN NOT NULL DEFAULT true,
    "vatRate" INTEGER NOT NULL DEFAULT 18,
    "promoEnabled" BOOLEAN NOT NULL DEFAULT false,
    "promoPercent" INTEGER,
    "includeTravel" BOOLEAN NOT NULL DEFAULT false,
    "object" TEXT,
    "missionNote" TEXT,
    "validUntil" TIMESTAMP(3),
    "totalHt" INTEGER NOT NULL DEFAULT 0,
    "totalVat" INTEGER NOT NULL DEFAULT 0,
    "totalTtc" INTEGER NOT NULL DEFAULT 0,
    "clientId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "ownerId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "gedDocumentId" TEXT,
    "sentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "com_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "com_quote_lines" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "catalogOfferId" TEXT,
    "isTravel" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "com_quote_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "com_invoices" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "ComInvoiceStatus" NOT NULL DEFAULT 'BROUILLON',
    "regime" "ComDocRegime" NOT NULL DEFAULT 'ML',
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "vatEnabled" BOOLEAN NOT NULL DEFAULT true,
    "vatRate" INTEGER NOT NULL DEFAULT 18,
    "object" TEXT,
    "totalHt" INTEGER NOT NULL DEFAULT 0,
    "totalVat" INTEGER NOT NULL DEFAULT 0,
    "totalTtc" INTEGER NOT NULL DEFAULT 0,
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "clientId" TEXT NOT NULL,
    "quoteId" TEXT,
    "ownerId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "gedDocumentId" TEXT,
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "com_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "com_invoice_lines" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "catalogOfferId" TEXT,
    "isTravel" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "com_invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "com_payments" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "ComPaymentMethod" NOT NULL DEFAULT 'VIREMENT',
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "recordedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "com_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "com_number_sequences_kind_year_key" ON "com_number_sequences"("kind", "year");

-- CreateIndex
CREATE INDEX "com_clients_ownerId_idx" ON "com_clients"("ownerId");

-- CreateIndex
CREATE INDEX "com_clients_normalizedName_idx" ON "com_clients"("normalizedName");

-- CreateIndex
CREATE INDEX "com_clients_crmOrganizationId_idx" ON "com_clients"("crmOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "com_quotes_number_key" ON "com_quotes"("number");

-- CreateIndex
CREATE INDEX "com_quotes_clientId_idx" ON "com_quotes"("clientId");

-- CreateIndex
CREATE INDEX "com_quotes_ownerId_status_idx" ON "com_quotes"("ownerId", "status");

-- CreateIndex
CREATE INDEX "com_quotes_opportunityId_idx" ON "com_quotes"("opportunityId");

-- CreateIndex
CREATE INDEX "com_quote_lines_quoteId_idx" ON "com_quote_lines"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "com_invoices_number_key" ON "com_invoices"("number");

-- CreateIndex
CREATE INDEX "com_invoices_clientId_idx" ON "com_invoices"("clientId");

-- CreateIndex
CREATE INDEX "com_invoices_ownerId_status_idx" ON "com_invoices"("ownerId", "status");

-- CreateIndex
CREATE INDEX "com_invoices_quoteId_idx" ON "com_invoices"("quoteId");

-- CreateIndex
CREATE INDEX "com_invoice_lines_invoiceId_idx" ON "com_invoice_lines"("invoiceId");

-- CreateIndex
CREATE INDEX "com_payments_invoiceId_idx" ON "com_payments"("invoiceId");

-- AddForeignKey
ALTER TABLE "com_clients" ADD CONSTRAINT "com_clients_crmOrganizationId_fkey" FOREIGN KEY ("crmOrganizationId") REFERENCES "crm_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "com_clients" ADD CONSTRAINT "com_clients_sourceOpportunityId_fkey" FOREIGN KEY ("sourceOpportunityId") REFERENCES "crm_opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "com_clients" ADD CONSTRAINT "com_clients_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "com_clients" ADD CONSTRAINT "com_clients_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "com_quotes" ADD CONSTRAINT "com_quotes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "com_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "com_quotes" ADD CONSTRAINT "com_quotes_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "crm_opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "com_quotes" ADD CONSTRAINT "com_quotes_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "com_quotes" ADD CONSTRAINT "com_quotes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "com_quote_lines" ADD CONSTRAINT "com_quote_lines_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "com_quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "com_quote_lines" ADD CONSTRAINT "com_quote_lines_catalogOfferId_fkey" FOREIGN KEY ("catalogOfferId") REFERENCES "catalog_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "com_invoices" ADD CONSTRAINT "com_invoices_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "com_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "com_invoices" ADD CONSTRAINT "com_invoices_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "com_quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "com_invoices" ADD CONSTRAINT "com_invoices_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "com_invoices" ADD CONSTRAINT "com_invoices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "com_invoice_lines" ADD CONSTRAINT "com_invoice_lines_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "com_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "com_invoice_lines" ADD CONSTRAINT "com_invoice_lines_catalogOfferId_fkey" FOREIGN KEY ("catalogOfferId") REFERENCES "catalog_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "com_payments" ADD CONSTRAINT "com_payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "com_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "com_payments" ADD CONSTRAINT "com_payments_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
