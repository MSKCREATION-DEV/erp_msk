-- Phase 5 — Paie + INPS
CREATE TYPE "RhPayrollPeriodStatus" AS ENUM ('DRAFT', 'OPEN', 'CALCULATED', 'APPROVED', 'CLOSED');
CREATE TYPE "RhPayslipStatus" AS ENUM ('DRAFT', 'CALCULATED', 'APPROVED', 'PAID', 'CANCELLED');
CREATE TYPE "RhInpsLineStatus" AS ENUM ('DRAFT', 'CALCULATED', 'DECLARED', 'PAID');

CREATE TABLE "rh_inps_settings" (
    "id" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "ratesJson" JSONB NOT NULL,
    "declarationPeriod" TEXT NOT NULL DEFAULT 'monthly',
    "paymentDueDay" INTEGER NOT NULL DEFAULT 15,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rh_inps_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rh_payroll_periods" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "RhPayrollPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "openedById" UUID NOT NULL,
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rh_payroll_periods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rh_payslips" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "contractId" TEXT,
    "status" "RhPayslipStatus" NOT NULL DEFAULT 'DRAFT',
    "baseSalaryXof" INTEGER NOT NULL,
    "primesXof" INTEGER NOT NULL DEFAULT 0,
    "brutXof" INTEGER NOT NULL,
    "employeeDeductXof" INTEGER NOT NULL DEFAULT 0,
    "employerChargesXof" INTEGER NOT NULL DEFAULT 0,
    "netXof" INTEGER NOT NULL,
    "gedDocumentId" TEXT,
    "cptEntryId" TEXT,
    "paidAt" TIMESTAMP(3),
    "paymentRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rh_payslips_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rh_payslip_lines" (
    "id" TEXT NOT NULL,
    "payslipId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "rate" DECIMAL(8,6),
    "amountXof" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "rh_payslip_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rh_inps_lines" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "payslipId" TEXT,
    "baseAmountXof" INTEGER NOT NULL,
    "employeeContributionXof" INTEGER NOT NULL,
    "employerContributionXof" INTEGER NOT NULL,
    "status" "RhInpsLineStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentRef" TEXT,
    "declaredAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rh_inps_lines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rh_inps_settings_effectiveFrom_idx" ON "rh_inps_settings"("effectiveFrom");
CREATE UNIQUE INDEX "rh_payroll_periods_year_month_key" ON "rh_payroll_periods"("year", "month");
CREATE INDEX "rh_payroll_periods_status_year_month_idx" ON "rh_payroll_periods"("status", "year", "month");
CREATE UNIQUE INDEX "rh_payslips_periodId_employeeId_key" ON "rh_payslips"("periodId", "employeeId");
CREATE INDEX "rh_payslips_employeeId_status_idx" ON "rh_payslips"("employeeId", "status");
CREATE INDEX "rh_payslip_lines_payslipId_idx" ON "rh_payslip_lines"("payslipId");
CREATE UNIQUE INDEX "rh_inps_lines_payslipId_key" ON "rh_inps_lines"("payslipId");
CREATE UNIQUE INDEX "rh_inps_lines_periodId_employeeId_key" ON "rh_inps_lines"("periodId", "employeeId");
CREATE INDEX "rh_inps_lines_status_idx" ON "rh_inps_lines"("status");

ALTER TABLE "rh_payroll_periods" ADD CONSTRAINT "rh_payroll_periods_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rh_payroll_periods" ADD CONSTRAINT "rh_payroll_periods_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rh_payslips" ADD CONSTRAINT "rh_payslips_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "rh_payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rh_payslips" ADD CONSTRAINT "rh_payslips_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "rh_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rh_payslip_lines" ADD CONSTRAINT "rh_payslip_lines_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "rh_payslips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rh_inps_lines" ADD CONSTRAINT "rh_inps_lines_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "rh_payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rh_inps_lines" ADD CONSTRAINT "rh_inps_lines_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "rh_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rh_inps_lines" ADD CONSTRAINT "rh_inps_lines_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "rh_payslips"("id") ON DELETE SET NULL ON UPDATE CASCADE;
