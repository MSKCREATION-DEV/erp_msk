-- Mon espace : profil enrichi, demandes de modification, ledger congés, horaires / fériés.
-- Additif uniquement (pas de drop). RLS activé sans policy PostgREST (mode ERP).

-- ─── RhEmployee colonnes ───
ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "birthName" TEXT;
ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "personalEmail" TEXT;
ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "personalPhone" TEXT;
ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "department" TEXT;
ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "workLocation" TEXT;
ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "employeeCode" TEXT;
ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "birthDate" DATE;
ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "birthPlace" TEXT;
ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "nationality" TEXT;
ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "idDocumentType" TEXT;
ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "idDocumentNumber" TEXT;
ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "idIssuedOn" DATE;
ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "idExpiresOn" DATE;
ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "idIssuedBy" TEXT;
ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "addressLine1" TEXT;
ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "addressLine2" TEXT;
ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "region" TEXT;
ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "postalCode" TEXT;
ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'Mali';
ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "emergencyContactName" TEXT;
ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "emergencyContactPhone" TEXT;
ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "emergencyContactRelation" TEXT;
ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "bankName" TEXT;
ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "bankAccountHolder" TEXT;
ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "bankIban" TEXT;
ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "managerEmployeeId" TEXT;

CREATE INDEX IF NOT EXISTS "rh_employees_managerEmployeeId_idx" ON "rh_employees"("managerEmployeeId");

DO $$ BEGIN
  ALTER TABLE "rh_employees"
    ADD CONSTRAINT "rh_employees_managerEmployeeId_fkey"
    FOREIGN KEY ("managerEmployeeId") REFERENCES "rh_employees"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Profile change requests ───
CREATE TYPE "RhProfileChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TABLE IF NOT EXISTS "rh_profile_change_requests" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "requesterId" UUID NOT NULL,
  "status" "RhProfileChangeStatus" NOT NULL DEFAULT 'PENDING',
  "note" TEXT,
  "gedDocumentId" TEXT,
  "reviewedById" UUID,
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rh_profile_change_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "rh_profile_change_lines" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "fieldKey" TEXT NOT NULL,
  "oldValue" TEXT,
  "newValue" TEXT NOT NULL,
  CONSTRAINT "rh_profile_change_lines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "rh_profile_change_requests_employeeId_status_idx"
  ON "rh_profile_change_requests"("employeeId", "status");
CREATE INDEX IF NOT EXISTS "rh_profile_change_requests_status_createdAt_idx"
  ON "rh_profile_change_requests"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "rh_profile_change_lines_requestId_idx"
  ON "rh_profile_change_lines"("requestId");

DO $$ BEGIN
  ALTER TABLE "rh_profile_change_requests"
    ADD CONSTRAINT "rh_profile_change_requests_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "rh_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "rh_profile_change_requests"
    ADD CONSTRAINT "rh_profile_change_requests_requesterId_fkey"
    FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "rh_profile_change_requests"
    ADD CONSTRAINT "rh_profile_change_requests_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "rh_profile_change_lines"
    ADD CONSTRAINT "rh_profile_change_lines_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "rh_profile_change_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "rh_profile_change_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rh_profile_change_lines" ENABLE ROW LEVEL SECURITY;

-- ─── Leave movements ───
CREATE TYPE "RhLeaveMovementType" AS ENUM (
  'OPENING_BALANCE', 'ACCRUAL', 'CONSUMPTION', 'ADJUSTMENT', 'CANCEL', 'SENIORITY_BONUS'
);

CREATE TABLE IF NOT EXISTS "rh_leave_movements" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "type" "RhLeaveMovementType" NOT NULL,
  "days" DECIMAL(6,2) NOT NULL,
  "effectiveDate" DATE NOT NULL,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "note" TEXT,
  "createdById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rh_leave_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "rh_leave_movements_employeeId_effectiveDate_idx"
  ON "rh_leave_movements"("employeeId", "effectiveDate");
CREATE INDEX IF NOT EXISTS "rh_leave_movements_sourceType_sourceId_idx"
  ON "rh_leave_movements"("sourceType", "sourceId");

DO $$ BEGIN
  ALTER TABLE "rh_leave_movements"
    ADD CONSTRAINT "rh_leave_movements_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "rh_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "rh_leave_movements"
    ADD CONSTRAINT "rh_leave_movements_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "rh_leave_movements" ENABLE ROW LEVEL SECURITY;

-- ─── Work schedule + holidays ───
CREATE TABLE IF NOT EXISTS "rh_work_schedules" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "weeklyHours" INTEGER NOT NULL DEFAULT 40,
  "workDaysJson" TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
  "startTime" TEXT NOT NULL DEFAULT '08:00',
  "endTime" TEXT NOT NULL DEFAULT '17:00',
  "breakStart" TEXT NOT NULL DEFAULT '13:00',
  "breakEnd" TEXT NOT NULL DEFAULT '14:00',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rh_work_schedules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "rh_work_schedules_code_key" ON "rh_work_schedules"("code");

CREATE TABLE IF NOT EXISTS "rh_public_holidays" (
  "id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "label" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rh_public_holidays_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "rh_public_holidays_date_key" ON "rh_public_holidays"("date");
CREATE INDEX IF NOT EXISTS "rh_public_holidays_year_idx" ON "rh_public_holidays"("year");

ALTER TABLE "rh_work_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rh_public_holidays" ENABLE ROW LEVEL SECURITY;

-- Horaires MSK par défaut (40 h — L.131)
INSERT INTO "rh_work_schedules" (
  "id", "code", "label", "weeklyHours", "workDaysJson",
  "startTime", "endTime", "breakStart", "breakEnd", "active", "createdAt", "updatedAt"
)
VALUES (
  'rh_sched_msk_default',
  'msk_default',
  'Horaire collectif MSK',
  40,
  '[1,2,3,4,5]',
  '08:00',
  '17:00',
  '13:00',
  '14:00',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO NOTHING;
