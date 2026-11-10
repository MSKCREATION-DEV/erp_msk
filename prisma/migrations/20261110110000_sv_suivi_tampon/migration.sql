-- Module Suivi tampon — tables sv_* isolées + RLS (PostgREST fermé)

CREATE TYPE "SvInvoiceStatus" AS ENUM ('BROUILLON', 'EMISE', 'PARTIELLE', 'PAYEE', 'ANNULEE');
CREATE TYPE "SvCashDirection" AS ENUM ('IN', 'OUT');
CREATE TYPE "SvStockMoveKind" AS ENUM ('IN', 'OUT', 'ADJUST');

CREATE TABLE "sv_clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "country" TEXT,
    "notes" TEXT,
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sv_clients_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sv_clients_name_idx" ON "sv_clients"("name");

CREATE TABLE "sv_invoices" (
    "id" TEXT NOT NULL,
    "number" TEXT,
    "legacyNumber" TEXT,
    "status" "SvInvoiceStatus" NOT NULL DEFAULT 'BROUILLON',
    "clientId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "totalHt" INTEGER NOT NULL DEFAULT 0,
    "totalVat" INTEGER NOT NULL DEFAULT 0,
    "totalTtc" INTEGER NOT NULL DEFAULT 0,
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "vatRate" INTEGER NOT NULL DEFAULT 18,
    "object" TEXT,
    "notes" TEXT,
    "sourceDocument" TEXT,
    "remixedFromId" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sv_invoices_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sv_invoices_clientId_status_idx" ON "sv_invoices"("clientId", "status");
CREATE INDEX "sv_invoices_number_idx" ON "sv_invoices"("number");
CREATE INDEX "sv_invoices_issuedAt_idx" ON "sv_invoices"("issuedAt");

CREATE TABLE "sv_invoice_lines" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL DEFAULT 0,
    "vatRate" INTEGER,
    CONSTRAINT "sv_invoice_lines_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sv_invoice_lines_invoiceId_idx" ON "sv_invoice_lines"("invoiceId");

CREATE TABLE "sv_payments" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT,
    "reference" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sv_payments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sv_payments_invoiceId_paidAt_idx" ON "sv_payments"("invoiceId", "paidAt");

CREATE TABLE "sv_contracts" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "partyName" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "durationNote" TEXT,
    "monthlyAmount" INTEGER,
    "sourceDocument" TEXT,
    "gedDocumentId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sv_contracts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sv_contracts_clientId_idx" ON "sv_contracts"("clientId");

CREATE TABLE "sv_cash_movements" (
    "id" TEXT NOT NULL,
    "movedAt" TIMESTAMP(3) NOT NULL,
    "direction" "SvCashDirection" NOT NULL,
    "amount" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "clientProject" TEXT,
    "beneficiary" TEXT,
    "paymentMethod" TEXT,
    "paidBy" TEXT,
    "reference" TEXT,
    "linkedClientId" TEXT,
    "linkedInvoiceId" TEXT,
    "linkedPaymentId" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sv_cash_movements_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sv_cash_movements_movedAt_idx" ON "sv_cash_movements"("movedAt");
CREATE INDEX "sv_cash_movements_direction_movedAt_idx" ON "sv_cash_movements"("direction", "movedAt");
CREATE INDEX "sv_cash_movements_reference_idx" ON "sv_cash_movements"("reference");

CREATE TABLE "sv_stock_items" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "subFamily" TEXT,
    "label" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sv_stock_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sv_stock_items_code_key" ON "sv_stock_items"("code");
CREATE INDEX "sv_stock_items_family_idx" ON "sv_stock_items"("family");

CREATE TABLE "sv_stock_movements" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "movedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" "SvStockMoveKind" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "sourceRef" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sv_stock_movements_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sv_stock_movements_itemId_movedAt_idx" ON "sv_stock_movements"("itemId", "movedAt");

ALTER TABLE "sv_invoices" ADD CONSTRAINT "sv_invoices_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "sv_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sv_invoices" ADD CONSTRAINT "sv_invoices_remixedFromId_fkey" FOREIGN KEY ("remixedFromId") REFERENCES "sv_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sv_invoices" ADD CONSTRAINT "sv_invoices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sv_invoice_lines" ADD CONSTRAINT "sv_invoice_lines_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "sv_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sv_payments" ADD CONSTRAINT "sv_payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "sv_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sv_contracts" ADD CONSTRAINT "sv_contracts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "sv_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sv_cash_movements" ADD CONSTRAINT "sv_cash_movements_linkedClientId_fkey" FOREIGN KEY ("linkedClientId") REFERENCES "sv_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sv_cash_movements" ADD CONSTRAINT "sv_cash_movements_linkedInvoiceId_fkey" FOREIGN KEY ("linkedInvoiceId") REFERENCES "sv_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sv_cash_movements" ADD CONSTRAINT "sv_cash_movements_linkedPaymentId_fkey" FOREIGN KEY ("linkedPaymentId") REFERENCES "sv_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sv_cash_movements" ADD CONSTRAINT "sv_cash_movements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sv_stock_movements" ADD CONSTRAINT "sv_stock_movements_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "sv_stock_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sv_stock_movements" ADD CONSTRAINT "sv_stock_movements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS (PostgREST fermé) — pas de policy ouverte anon/authenticated
ALTER TABLE "sv_clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sv_invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sv_invoice_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sv_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sv_contracts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sv_cash_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sv_stock_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sv_stock_movements" ENABLE ROW LEVEL SECURITY;
