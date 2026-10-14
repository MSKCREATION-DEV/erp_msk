-- LOT-F : RS org + moyens de contact multi-canaux

CREATE TYPE "CrmContactChannelType" AS ENUM ('PHONE', 'EMAIL', 'WHATSAPP', 'INSTAGRAM', 'LINKEDIN', 'AUTRE');

ALTER TABLE "crm_organizations"
  ADD COLUMN IF NOT EXISTS "instagramUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "linkedinUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "tiktokUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "facebookUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "whatsappUrl" TEXT;

CREATE TABLE IF NOT EXISTS "crm_contact_channels" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "type" "CrmContactChannelType" NOT NULL,
  "value" TEXT NOT NULL,
  "normalizedValue" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "crm_contact_channels_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "crm_contact_channels_contactId_idx" ON "crm_contact_channels"("contactId");
CREATE INDEX IF NOT EXISTS "crm_contact_channels_normalizedValue_idx" ON "crm_contact_channels"("normalizedValue");
CREATE INDEX IF NOT EXISTS "crm_contact_channels_type_normalizedValue_idx" ON "crm_contact_channels"("type", "normalizedValue");

ALTER TABLE "crm_contact_channels"
  ADD CONSTRAINT "crm_contact_channels_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "crm_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "crm_contacts_phone_idx" ON "crm_contacts"("phone");

-- Backfill : 1 canal depuis phone/email existants
INSERT INTO "crm_contact_channels" ("id", "contactId", "type", "value", "normalizedValue", "isPrimary", "createdAt", "updatedAt")
SELECT
  'bf_phone_' || c.id,
  c.id,
  'PHONE'::"CrmContactChannelType",
  c.phone,
  regexp_replace(c.phone, '[^0-9+]', '', 'g'),
  true,
  NOW(),
  NOW()
FROM "crm_contacts" c
WHERE c.phone IS NOT NULL AND TRIM(c.phone) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM "crm_contact_channels" ch WHERE ch."contactId" = c.id AND ch.type = 'PHONE'
  );

INSERT INTO "crm_contact_channels" ("id", "contactId", "type", "value", "normalizedValue", "isPrimary", "createdAt", "updatedAt")
SELECT
  'bf_email_' || c.id,
  c.id,
  'EMAIL'::"CrmContactChannelType",
  c.email,
  lower(TRIM(c.email)),
  CASE WHEN c.phone IS NULL OR TRIM(c.phone) = '' THEN true ELSE false END,
  NOW(),
  NOW()
FROM "crm_contacts" c
WHERE c.email IS NOT NULL AND TRIM(c.email) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM "crm_contact_channels" ch WHERE ch."contactId" = c.id AND ch.type = 'EMAIL'
  );
