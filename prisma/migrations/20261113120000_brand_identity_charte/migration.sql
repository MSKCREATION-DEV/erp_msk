-- Charte MSK — identité visuelle (logos, couleurs, typos, ressources, config)

CREATE TYPE "BrandItemStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
CREATE TYPE "BrandLogoKind" AS ENUM ('PRINCIPAL', 'HORIZONTAL', 'VERTICAL', 'COMPACT', 'SYMBOLE', 'BLANC', 'MONO', 'DOCUMENTS', 'FAVICON', 'AUTRE');
CREATE TYPE "BrandColorCategory" AS ENUM ('MARQUE', 'INTERFACE', 'FONCTIONNELLE', 'DOCUMENTAIRE');
CREATE TYPE "BrandTypographyRole" AS ENUM ('HEADING', 'BODY', 'UI', 'PDF', 'ACCENT', 'IMPACT');
CREATE TYPE "BrandResourceKind" AS ENUM ('ICONE', 'PICTO', 'ILLUSTRATION', 'MOTIF', 'FOND', 'SIGNATURE_GRAPH', 'AUTRE');

CREATE TABLE "brand_logos" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "BrandLogoKind" NOT NULL DEFAULT 'AUTRE',
    "status" "BrandItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "isDefaultDocuments" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "publicPath" TEXT,
    "storageOriginal" TEXT,
    "storageOptimized" TEXT,
    "mime" TEXT NOT NULL,
    "originalFileName" TEXT,
    "fileSizeBytes" INTEGER,
    "widthPx" INTEGER,
    "heightPx" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_logos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "brand_logos_code_key" ON "brand_logos"("code");
CREATE INDEX "brand_logos_status_idx" ON "brand_logos"("status");
CREATE INDEX "brand_logos_kind_idx" ON "brand_logos"("kind");
CREATE INDEX "brand_logos_isDefaultDocuments_idx" ON "brand_logos"("isDefaultDocuments");
CREATE UNIQUE INDEX "brand_logos_one_default_documents"
  ON "brand_logos" ("isDefaultDocuments")
  WHERE "isDefaultDocuments" = true;

ALTER TABLE "brand_logos"
  ADD CONSTRAINT "brand_logos_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "brand_colors" (
    "id" TEXT NOT NULL,
    "tokenKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "hex" TEXT NOT NULL,
    "category" "BrandColorCategory" NOT NULL DEFAULT 'MARQUE',
    "usageNotes" TEXT,
    "status" "BrandItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "isReference" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_colors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "brand_colors_tokenKey_key" ON "brand_colors"("tokenKey");
CREATE INDEX "brand_colors_status_category_idx" ON "brand_colors"("status", "category");

CREATE TABLE "brand_typographies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "familyName" TEXT NOT NULL,
    "role" "BrandTypographyRole" NOT NULL,
    "status" "BrandItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "isDefaultErp" BOOLEAN NOT NULL DEFAULT false,
    "isDefaultPdf" BOOLEAN NOT NULL DEFAULT false,
    "cssStack" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_typographies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "brand_typographies_code_key" ON "brand_typographies"("code");
CREATE INDEX "brand_typographies_status_role_idx" ON "brand_typographies"("status", "role");

CREATE TABLE "brand_font_files" (
    "id" TEXT NOT NULL,
    "typographyId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 400,
    "style" TEXT NOT NULL DEFAULT 'normal',
    "storagePath" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "originalFileName" TEXT,
    "fileSizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_font_files_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "brand_font_files_typographyId_weight_style_key"
  ON "brand_font_files"("typographyId", "weight", "style");
CREATE INDEX "brand_font_files_typographyId_idx" ON "brand_font_files"("typographyId");

ALTER TABLE "brand_font_files"
  ADD CONSTRAINT "brand_font_files_typographyId_fkey"
  FOREIGN KEY ("typographyId") REFERENCES "brand_typographies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "brand_resources" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "BrandResourceKind" NOT NULL DEFAULT 'AUTRE',
    "status" "BrandItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "publicPath" TEXT,
    "storagePath" TEXT,
    "mime" TEXT NOT NULL,
    "originalFileName" TEXT,
    "fileSizeBytes" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_resources_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "brand_resources_code_key" ON "brand_resources"("code");
CREATE INDEX "brand_resources_status_kind_idx" ON "brand_resources"("status", "kind");

ALTER TABLE "brand_resources"
  ADD CONSTRAINT "brand_resources_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "brand_configurations" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "defaultDocumentsLogoId" TEXT,
    "settingsJson" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_configurations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "brand_configurations_defaultDocumentsLogoId_key"
  ON "brand_configurations"("defaultDocumentsLogoId");

ALTER TABLE "brand_configurations"
  ADD CONSTRAINT "brand_configurations_defaultDocumentsLogoId_fkey"
  FOREIGN KEY ("defaultDocumentsLogoId") REFERENCES "brand_logos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS : mode ERP (pas de policy anon/authenticated)
ALTER TABLE "public"."brand_logos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."brand_colors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."brand_typographies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."brand_font_files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."brand_resources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."brand_configurations" ENABLE ROW LEVEL SECURITY;
