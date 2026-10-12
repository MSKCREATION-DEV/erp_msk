-- CreateTable
CREATE TABLE "crm_weekly_reports" (
    "id" TEXT NOT NULL,
    "authorId" UUID NOT NULL,
    "weekStart" DATE NOT NULL,
    "newProspects" INTEGER NOT NULL DEFAULT 0,
    "firstContacts" INTEGER NOT NULL DEFAULT 0,
    "replies" INTEGER NOT NULL DEFAULT 0,
    "inDiscussion" INTEGER NOT NULL DEFAULT 0,
    "qualified" INTEGER NOT NULL DEFAULT 0,
    "meetings" INTEGER NOT NULL DEFAULT 0,
    "followUpsDone" INTEGER NOT NULL DEFAULT 0,
    "difficulty" TEXT,
    "needs" TEXT,
    "scriptsFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_weekly_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_weekly_reports_weekStart_idx" ON "crm_weekly_reports"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "crm_weekly_reports_authorId_weekStart_key" ON "crm_weekly_reports"("authorId", "weekStart");

-- AddForeignKey
ALTER TABLE "crm_weekly_reports" ADD CONSTRAINT "crm_weekly_reports_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
