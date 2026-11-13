-- Suivi RH tampon — absences & retards (décision K)
-- Isolé de rh_absences / rh_leave_requests. Lien collab = rh_employees.
-- RLS sans policy PostgREST = fermé.

CREATE TYPE "SvAbsenceReason" AS ENUM (
  'MALADIE',
  'PERSONNEL',
  'AUTORISEE',
  'FORMATION',
  'AUTRE'
);

CREATE TYPE "SvAbsenceStatus" AS ENUM (
  'ENREGISTREE',
  'JUSTIFIEE',
  'NON_JUSTIFIEE',
  'ANNULEE'
);

CREATE TYPE "SvLateStatus" AS ENUM (
  'ENREGISTRE',
  'ANNULE'
);

CREATE TABLE "sv_absences" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" "SvAbsenceStatus" NOT NULL DEFAULT 'ENREGISTREE',
    "reason" "SvAbsenceReason" NOT NULL DEFAULT 'MALADIE',
    "reasonNote" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "deductLeave" BOOLEAN NOT NULL DEFAULT false,
    "deductLeaveNote" TEXT,
    "gedDocumentId" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sv_absences_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sv_absences_employeeId_status_idx"
  ON "sv_absences"("employeeId", "status");
CREATE INDEX "sv_absences_status_startDate_idx"
  ON "sv_absences"("status", "startDate");
CREATE INDEX "sv_absences_startDate_endDate_idx"
  ON "sv_absences"("startDate", "endDate");

CREATE TABLE "sv_lates" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" "SvLateStatus" NOT NULL DEFAULT 'ENREGISTRE',
    "lateDate" DATE NOT NULL,
    "expectedAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3) NOT NULL,
    "minutesLate" INTEGER,
    "note" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sv_lates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sv_lates_employeeId_lateDate_idx"
  ON "sv_lates"("employeeId", "lateDate");
CREATE INDEX "sv_lates_status_lateDate_idx"
  ON "sv_lates"("status", "lateDate");
CREATE INDEX "sv_lates_lateDate_idx"
  ON "sv_lates"("lateDate");

ALTER TABLE "sv_absences"
  ADD CONSTRAINT "sv_absences_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "rh_employees"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sv_absences"
  ADD CONSTRAINT "sv_absences_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sv_lates"
  ADD CONSTRAINT "sv_lates_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "rh_employees"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sv_lates"
  ADD CONSTRAINT "sv_lates_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sv_absences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sv_lates" ENABLE ROW LEVEL SECURITY;
