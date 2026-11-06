-- PLAN-CLIENT-CONTRAT P3 — modèle de données contrat réel (famille A/B, composition, PDF).
-- Additive uniquement : nouveaux types + colonnes nullables / avec défaut sûr.

-- ─── Enums ───────────────────────────────────────────────────
CREATE TYPE "ComContractFamily" AS ENUM ('PRESTATION_ABONNEMENT', 'ENGAGEMENT_CDC');

CREATE TYPE "ComServiceKind" AS ENUM (
  'RESEAUX_SOCIAUX',
  'APPLICATION_WEB',
  'SITE_VITRINE',
  'CHARTE_GRAPHIQUE',
  'AUTRE',
  'BUNDLE'
);

CREATE TYPE "ComCompositionSource" AS ENUM ('QUOTE', 'INLINE');

ALTER TYPE "ComDocKind" ADD VALUE IF NOT EXISTS 'CONTRAT';

-- ─── com_contracts ───────────────────────────────────────────
ALTER TABLE "com_contracts"
  ADD COLUMN IF NOT EXISTS "family" "ComContractFamily",
  ADD COLUMN IF NOT EXISTS "serviceKind" "ComServiceKind",
  ADD COLUMN IF NOT EXISTS "compositionSource" "ComCompositionSource" NOT NULL DEFAULT 'INLINE',
  ADD COLUMN IF NOT EXISTS "scopeJson" JSONB,
  ADD COLUMN IF NOT EXISTS "gedDocumentId" TEXT;
