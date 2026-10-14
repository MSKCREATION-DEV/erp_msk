-- CreateEnum
CREATE TYPE "CrmAssignmentRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "crm_assignment_requests" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "requesterId" UUID NOT NULL,
    "message" TEXT,
    "status" "CrmAssignmentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" UUID,
    "resolveNote" TEXT,

    CONSTRAINT "crm_assignment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_assignment_requests_status_createdAt_idx" ON "crm_assignment_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "crm_assignment_requests_opportunityId_status_idx" ON "crm_assignment_requests"("opportunityId", "status");

-- CreateIndex
CREATE INDEX "crm_assignment_requests_requesterId_idx" ON "crm_assignment_requests"("requesterId");

-- AddForeignKey
ALTER TABLE "crm_assignment_requests" ADD CONSTRAINT "crm_assignment_requests_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "crm_opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "crm_assignment_requests" ADD CONSTRAINT "crm_assignment_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "crm_assignment_requests" ADD CONSTRAINT "crm_assignment_requests_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
