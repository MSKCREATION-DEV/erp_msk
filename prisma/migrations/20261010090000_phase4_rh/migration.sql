-- Phase 4 — RH cœur

CREATE TYPE "RhEmployeeType" AS ENUM ('SALARIE', 'STAGIAIRE', 'PRESTATAIRE', 'DIRIGEANT', 'AUTRE');
CREATE TYPE "RhEmployeeStatus" AS ENUM ('ACTIVE', 'ONBOARDING', 'OFFBOARDING', 'ARCHIVED');
CREATE TYPE "RhReglementStatus" AS ENUM ('PENDING', 'SIGNED', 'WAIVED');
CREATE TYPE "RhContractType" AS ENUM ('CDI', 'CDD', 'STAGE', 'PRESTA', 'AVENANT', 'AUTRE');
CREATE TYPE "RhContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ENDED', 'CANCELLED');
CREATE TYPE "RhLeaveType" AS ENUM ('CONGES_PAYES', 'SANS_SOLDE', 'EXCEPTIONNEL', 'MALADIE', 'AUTRE');
CREATE TYPE "RhLeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "RhAbsenceStatus" AS ENUM ('DECLARED', 'JUSTIFIED', 'UNJUSTIFIED');
CREATE TYPE "RhTimesheetStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

CREATE TABLE "rh_employees" (
    "id" TEXT NOT NULL,
    "userId" UUID,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "jobTitle" TEXT,
    "employeeType" "RhEmployeeType" NOT NULL DEFAULT 'SALARIE',
    "status" "RhEmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "hireDate" DATE,
    "endDate" DATE,
    "leaveBalanceDays" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "reglementStatus" "RhReglementStatus" NOT NULL DEFAULT 'PENDING',
    "reglementSignedAt" TIMESTAMP(3),
    "emergencyContact" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rh_employees_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rh_contracts" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "RhContractType" NOT NULL DEFAULT 'CDI',
    "status" "RhContractStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "salaryXof" INTEGER,
    "notes" TEXT,
    "gedDocumentId" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rh_contracts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rh_leave_requests" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "requesterId" UUID NOT NULL,
    "type" "RhLeaveType" NOT NULL DEFAULT 'CONGES_PAYES',
    "status" "RhLeaveStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "days" DECIMAL(5,2) NOT NULL,
    "reason" TEXT,
    "validatedById" UUID,
    "validatedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rh_leave_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rh_absences" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "declaredById" UUID NOT NULL,
    "status" "RhAbsenceStatus" NOT NULL DEFAULT 'DECLARED',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "justificationNote" TEXT,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rh_absences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rh_timesheets" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "ownerId" UUID NOT NULL,
    "weekStart" DATE NOT NULL,
    "status" "RhTimesheetStatus" NOT NULL DEFAULT 'DRAFT',
    "totalMinutes" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "validatedById" UUID,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rh_timesheets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rh_timesheet_lines" (
    "id" TEXT NOT NULL,
    "timesheetId" TEXT NOT NULL,
    "workDate" DATE NOT NULL,
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT,
    CONSTRAINT "rh_timesheet_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rh_employees_userId_key" ON "rh_employees"("userId");
CREATE INDEX "rh_employees_status_lastName_idx" ON "rh_employees"("status", "lastName");
CREATE INDEX "rh_contracts_employeeId_status_idx" ON "rh_contracts"("employeeId", "status");
CREATE INDEX "rh_leave_requests_employeeId_status_idx" ON "rh_leave_requests"("employeeId", "status");
CREATE INDEX "rh_leave_requests_status_startDate_idx" ON "rh_leave_requests"("status", "startDate");
CREATE INDEX "rh_absences_employeeId_status_idx" ON "rh_absences"("employeeId", "status");
CREATE UNIQUE INDEX "rh_timesheets_employeeId_weekStart_key" ON "rh_timesheets"("employeeId", "weekStart");
CREATE INDEX "rh_timesheets_status_weekStart_idx" ON "rh_timesheets"("status", "weekStart");
CREATE INDEX "rh_timesheet_lines_timesheetId_idx" ON "rh_timesheet_lines"("timesheetId");

ALTER TABLE "rh_employees" ADD CONSTRAINT "rh_employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rh_contracts" ADD CONSTRAINT "rh_contracts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "rh_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rh_contracts" ADD CONSTRAINT "rh_contracts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "rh_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rh_leave_requests" ADD CONSTRAINT "rh_leave_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "rh_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rh_leave_requests" ADD CONSTRAINT "rh_leave_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rh_leave_requests" ADD CONSTRAINT "rh_leave_requests_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rh_absences" ADD CONSTRAINT "rh_absences_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "rh_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rh_absences" ADD CONSTRAINT "rh_absences_declaredById_fkey" FOREIGN KEY ("declaredById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rh_absences" ADD CONSTRAINT "rh_absences_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rh_timesheets" ADD CONSTRAINT "rh_timesheets_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "rh_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rh_timesheets" ADD CONSTRAINT "rh_timesheets_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rh_timesheets" ADD CONSTRAINT "rh_timesheets_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rh_timesheet_lines" ADD CONSTRAINT "rh_timesheet_lines_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "rh_timesheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
