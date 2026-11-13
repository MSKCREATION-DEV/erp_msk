-- Studio documentaire (Phase 1) — moteur central de gabarits.
-- Additif uniquement : aucune colonne/table existante retirée, aucun générateur
-- legacy supprimé. `signatureEnabled` démarre à `false` par défaut (règle
-- absolue Studio) ; les gabarits historiques qui utilisent déjà la signature
-- en production (DEVIS, FACTURE, contrats, RH) sont explicitement repassés à
-- `true` dans le seed pour préserver le comportement actuel sans régression.

-- CreateEnum
CREATE TYPE "TemplateGeneratorKind" AS ENUM ('LEGACY_CODE', 'ENGINE_BLOCKS');

-- CreateEnum
CREATE TYPE "TemplateVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TemplateVariableCategory" AS ENUM ('CLIENT', 'ENTREPRISE', 'DOCUMENT', 'COLLABORATEUR', 'DIVERS');

-- AlterEnum
ALTER TYPE "TemplateType" ADD VALUE 'DOCUMENT_LIBRE';

-- AlterTable
ALTER TABLE "document_templates" ADD COLUMN     "createdById" UUID,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "generatorKind" "TemplateGeneratorKind" NOT NULL DEFAULT 'LEGACY_CODE',
ADD COLUMN     "publishedVersionId" TEXT,
ADD COLUMN     "signatureEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "document_template_versions" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "TemplateVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "bodyJson" JSONB NOT NULL DEFAULT '[]',
    "variablesJson" JSONB NOT NULL DEFAULT '[]',
    "changelog" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_variable_defs" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "category" "TemplateVariableCategory" NOT NULL DEFAULT 'DIVERS',
    "sampleValue" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_variable_defs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_template_versions_templateId_status_idx" ON "document_template_versions"("templateId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "document_template_versions_templateId_version_key" ON "document_template_versions"("templateId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "template_variable_defs_slug_key" ON "template_variable_defs"("slug");

-- CreateIndex
CREATE INDEX "template_variable_defs_category_idx" ON "template_variable_defs"("category");

-- CreateIndex
CREATE UNIQUE INDEX "document_templates_publishedVersionId_key" ON "document_templates"("publishedVersionId");

-- CreateIndex
CREATE INDEX "document_templates_generatorKind_idx" ON "document_templates"("generatorKind");

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_publishedVersionId_fkey" FOREIGN KEY ("publishedVersionId") REFERENCES "document_template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_template_versions" ADD CONSTRAINT "document_template_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "document_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_template_versions" ADD CONSTRAINT "document_template_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_variable_defs" ADD CONSTRAINT "template_variable_defs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS (règle supabase-rls-prisma) — nouvelles tables métier, pas de policy anon/authenticated.
ALTER TABLE "public"."document_template_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."template_variable_defs" ENABLE ROW LEVEL SECURITY;
