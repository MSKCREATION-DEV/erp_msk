-- CreateEnum
CREATE TYPE "CrmAppointmentStatus" AS ENUM ('SCHEDULED', 'DONE', 'NO_SHOW', 'CANCELLED');

-- CreateTable
CREATE TABLE "crm_appointments" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "location" TEXT,
    "notes" TEXT,
    "status" "CrmAppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "assigneeId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_appointments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app_notifications" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "kind" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "crm_appointments_assigneeId_startsAt_idx" ON "crm_appointments"("assigneeId", "startsAt");
CREATE INDEX "crm_appointments_opportunityId_startsAt_idx" ON "crm_appointments"("opportunityId", "startsAt");
CREATE INDEX "crm_appointments_status_startsAt_idx" ON "crm_appointments"("status", "startsAt");
CREATE INDEX "app_notifications_userId_readAt_createdAt_idx" ON "app_notifications"("userId", "readAt", "createdAt");
CREATE INDEX "app_notifications_userId_createdAt_idx" ON "app_notifications"("userId", "createdAt");

ALTER TABLE "crm_appointments" ADD CONSTRAINT "crm_appointments_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "crm_opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_appointments" ADD CONSTRAINT "crm_appointments_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "crm_appointments" ADD CONSTRAINT "crm_appointments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "app_notifications" ADD CONSTRAINT "app_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."crm_appointments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."app_notifications" ENABLE ROW LEVEL SECURITY;

-- Realtime SELECT own notifications only (no write via PostgREST)
CREATE POLICY "app_notifications_select_own"
  ON "public"."app_notifications"
  FOR SELECT
  TO authenticated
  USING ("userId" = auth.uid());

-- Realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
