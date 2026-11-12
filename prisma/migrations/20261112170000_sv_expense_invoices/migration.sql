-- Suivi Charges — factures internes / fournisseurs (décision J)
-- Isolé de sv_invoices (clients). RLS sans policy PostgREST = fermé.

CREATE TYPE "SvExpenseCategory" AS ENUM (
  'ORANGE_INTERNET',
  'EDM_ELECTRICITE',
  'LOYER',
  'AUTRE'
);

CREATE TABLE "sv_expense_invoices" (
    "id" TEXT NOT NULL,
    "category" "SvExpenseCategory" NOT NULL,
    "status" "SvInvoiceStatus" NOT NULL DEFAULT 'BROUILLON',
    "vendorName" TEXT NOT NULL,
    "vendorRef" TEXT,
    "number" TEXT,
    "issuedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "periodLabel" TEXT,
    "totalHt" INTEGER NOT NULL DEFAULT 0,
    "totalVat" INTEGER NOT NULL DEFAULT 0,
    "totalTtc" INTEGER NOT NULL DEFAULT 0,
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "object" TEXT,
    "notes" TEXT,
    "sourceDocument" TEXT,
    "gedDocumentId" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sv_expense_invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sv_expense_invoices_sourceDocument_key"
  ON "sv_expense_invoices"("sourceDocument");
CREATE INDEX "sv_expense_invoices_category_status_idx"
  ON "sv_expense_invoices"("category", "status");
CREATE INDEX "sv_expense_invoices_number_idx" ON "sv_expense_invoices"("number");
CREATE INDEX "sv_expense_invoices_issuedAt_idx" ON "sv_expense_invoices"("issuedAt");
CREATE INDEX "sv_expense_invoices_vendorName_idx" ON "sv_expense_invoices"("vendorName");

CREATE TABLE "sv_expense_payments" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT,
    "reference" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sv_expense_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sv_expense_payments_invoiceId_paidAt_idx"
  ON "sv_expense_payments"("invoiceId", "paidAt");

ALTER TABLE "sv_cash_movements"
  ADD COLUMN "linkedExpenseInvoiceId" TEXT,
  ADD COLUMN "linkedExpensePaymentId" TEXT;

CREATE INDEX "sv_cash_movements_linkedExpenseInvoiceId_idx"
  ON "sv_cash_movements"("linkedExpenseInvoiceId");

ALTER TABLE "sv_expense_invoices"
  ADD CONSTRAINT "sv_expense_invoices_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sv_expense_payments"
  ADD CONSTRAINT "sv_expense_payments_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "sv_expense_invoices"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sv_cash_movements"
  ADD CONSTRAINT "sv_cash_movements_linkedExpenseInvoiceId_fkey"
  FOREIGN KEY ("linkedExpenseInvoiceId") REFERENCES "sv_expense_invoices"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sv_cash_movements"
  ADD CONSTRAINT "sv_cash_movements_linkedExpensePaymentId_fkey"
  FOREIGN KEY ("linkedExpensePaymentId") REFERENCES "sv_expense_payments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sv_expense_invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sv_expense_payments" ENABLE ROW LEVEL SECURITY;
