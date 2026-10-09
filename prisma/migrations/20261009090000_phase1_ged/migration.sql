-- Phase 1 GED — folders, documents, ACL, brand, signatures, orgchart, templates

CREATE TYPE "DocVisibility" AS ENUM ('PRIVATE_SELF', 'GROUP', 'RH_ONLY', 'DIRECTION', 'COMPANY', 'CUSTOM');
CREATE TYPE "DocStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'TRASH');
CREATE TYPE "AclRight" AS ENUM ('VIEW', 'UPLOAD', 'EDIT_META', 'MANAGE_SHARE');
CREATE TYPE "SignatureKind" AS ENUM ('UPLOAD');
CREATE TYPE "SignatureStatus" AS ENUM ('DRAFT', 'ACTIVE', 'REVOKED');
CREATE TYPE "TemplateType" AS ENUM ('DEVIS', 'FACTURE');

CREATE TABLE "document_folders" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "year" INTEGER,
    "visibility" "DocVisibility" NOT NULL DEFAULT 'COMPANY',
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_folders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "checksum" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "DocStatus" NOT NULL DEFAULT 'ACTIVE',
    "visibility" "DocVisibility" NOT NULL DEFAULT 'COMPANY',
    "createdById" UUID,
    "softDeletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "document_links" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,

    CONSTRAINT "document_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "document_acls" (
    "id" TEXT NOT NULL,
    "folderId" TEXT,
    "documentId" TEXT,
    "userId" UUID NOT NULL,
    "right" "AclRight" NOT NULL DEFAULT 'VIEW',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_acls_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "brand_assets" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "publicPath" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "signature_assets" (
    "id" TEXT NOT NULL,
    "ownerUserId" UUID,
    "orgOwned" BOOLEAN NOT NULL DEFAULT false,
    "kind" "SignatureKind" NOT NULL DEFAULT 'UPLOAD',
    "label" TEXT NOT NULL,
    "storageOriginal" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "status" "SignatureStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signature_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "org_nodes" (
    "id" TEXT NOT NULL,
    "userId" UUID,
    "title" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_nodes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "type" "TemplateType" NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "structureJson" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "document_folders_path_key" ON "document_folders"("path");
CREATE INDEX "document_folders_parentId_idx" ON "document_folders"("parentId");
CREATE INDEX "document_folders_year_idx" ON "document_folders"("year");
CREATE INDEX "document_folders_code_idx" ON "document_folders"("code");

CREATE INDEX "documents_folderId_idx" ON "documents"("folderId");
CREATE INDEX "documents_status_idx" ON "documents"("status");
CREATE INDEX "documents_softDeletedAt_idx" ON "documents"("softDeletedAt");

CREATE UNIQUE INDEX "document_links_documentId_entityType_entityId_key" ON "document_links"("documentId", "entityType", "entityId");
CREATE INDEX "document_links_entityType_entityId_idx" ON "document_links"("entityType", "entityId");

CREATE INDEX "document_acls_folderId_idx" ON "document_acls"("folderId");
CREATE INDEX "document_acls_documentId_idx" ON "document_acls"("documentId");
CREATE INDEX "document_acls_userId_idx" ON "document_acls"("userId");

CREATE UNIQUE INDEX "brand_assets_kind_key" ON "brand_assets"("kind");

CREATE INDEX "signature_assets_ownerUserId_idx" ON "signature_assets"("ownerUserId");
CREATE INDEX "signature_assets_status_idx" ON "signature_assets"("status");

CREATE INDEX "org_nodes_parentId_idx" ON "org_nodes"("parentId");
CREATE INDEX "org_nodes_sortOrder_idx" ON "org_nodes"("sortOrder");

CREATE UNIQUE INDEX "document_templates_code_key" ON "document_templates"("code");
CREATE INDEX "document_templates_type_idx" ON "document_templates"("type");

ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "document_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "documents" ADD CONSTRAINT "documents_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "document_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "document_links" ADD CONSTRAINT "document_links_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "document_acls" ADD CONSTRAINT "document_acls_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "document_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_acls" ADD CONSTRAINT "document_acls_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_acls" ADD CONSTRAINT "document_acls_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "signature_assets" ADD CONSTRAINT "signature_assets_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "org_nodes" ADD CONSTRAINT "org_nodes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "org_nodes" ADD CONSTRAINT "org_nodes_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "org_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
