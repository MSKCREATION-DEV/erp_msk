-- Photo profil Mon espace + catalogue types de congés

ALTER TABLE "rh_employees" ADD COLUMN IF NOT EXISTS "avatarDocumentId" TEXT;

ALTER TABLE "rh_absences" ADD COLUMN IF NOT EXISTS "gedDocumentId" TEXT;

CREATE TABLE IF NOT EXISTS "rh_leave_type_configs" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "legalBasis" TEXT,
  "paid" BOOLEAN NOT NULL DEFAULT true,
  "impactsLeaveBalance" BOOLEAN NOT NULL DEFAULT false,
  "requiresJustification" BOOLEAN NOT NULL DEFAULT false,
  "defaultDays" DECIMAL(5,2),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rh_leave_type_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "rh_leave_type_configs_code_key" ON "rh_leave_type_configs"("code");
CREATE INDEX IF NOT EXISTS "rh_leave_type_configs_active_sortOrder_idx" ON "rh_leave_type_configs"("active", "sortOrder");

ALTER TABLE "rh_leave_type_configs" ENABLE ROW LEVEL SECURITY;

-- Seed types alignés enum actuel + stubs Mali (à valider juriste)
INSERT INTO "rh_leave_type_configs" (
  "id", "code", "label", "legalBasis", "paid", "impactsLeaveBalance",
  "requiresJustification", "defaultDays", "active", "sortOrder", "notes", "createdAt", "updatedAt"
) VALUES
  ('rltc_cp', 'CONGES_PAYES', 'Congés payés annuels', 'Code du travail Mali L.148–L.154', true, true, false, NULL, true, 10, 'Acquisition MSK 2,5 j/mois (paramètre métier distinct).', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rltc_ss', 'SANS_SOLDE', 'Congé sans solde', NULL, false, false, true, NULL, true, 20, 'À valider : conditions d’octroi selon politique interne / textes applicables.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rltc_ex', 'EXCEPTIONNEL', 'Congé / autorisation exceptionnelle', 'Événements familiaux — textes à confirmer', true, false, true, NULL, true, 30, 'À valider juriste : durée et motifs (mariage, décès, etc.).', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rltc_mal', 'MALADIE', 'Absence maladie (arrêt)', NULL, true, false, true, NULL, true, 40, 'Ne confondre pas avec congés payés. Justificatif médical requis. Paie selon règles applicables — à valider.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rltc_autre', 'AUTRE', 'Autre', NULL, false, false, true, NULL, true, 90, 'Filet de sécurité — préférer un type nommé.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rltc_mat', 'MATERNITE', 'Congé de maternité', 'Code du travail Mali — dispositions maternité (à confirmer article exact)', true, false, true, NULL, false, 50, 'INACTIF jusqu’à validation juridique MSK. Non mappé à l’enum RhLeaveType tant que non validé.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
