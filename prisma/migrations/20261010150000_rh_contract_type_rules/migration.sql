-- Éligibilité paie / INPS / congés par type de contrat
CREATE TABLE "rh_contract_type_rules" (
    "id" TEXT NOT NULL,
    "contractType" "RhContractType" NOT NULL,
    "includeInPayroll" BOOLEAN NOT NULL DEFAULT true,
    "applyInpsRates" BOOLEAN NOT NULL DEFAULT true,
    "accruePaidLeave" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rh_contract_type_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rh_contract_type_rules_contractType_key" ON "rh_contract_type_rules"("contractType");

-- Defaults MVP
INSERT INTO "rh_contract_type_rules" ("id", "contractType", "includeInPayroll", "applyInpsRates", "accruePaidLeave", "active", "createdAt", "updatedAt") VALUES
  ('ctrule_cdi', 'CDI', true, true, true, true, NOW(), NOW()),
  ('ctrule_cdd', 'CDD', true, true, true, true, NOW(), NOW()),
  ('ctrule_stage', 'STAGE', true, true, false, true, NOW(), NOW()),
  ('ctrule_presta', 'PRESTA', false, false, false, true, NOW(), NOW()),
  ('ctrule_avenant', 'AVENANT', true, true, true, true, NOW(), NOW()),
  ('ctrule_autre', 'AUTRE', false, false, false, true, NOW(), NOW());
