-- Harden Commercial: unique GED folder codes + one invoice per quote

-- 1) gedFolderCode on clients
ALTER TABLE "com_clients" ADD COLUMN IF NOT EXISTS "gedFolderCode" TEXT;

UPDATE "com_clients"
SET "gedFolderCode" = upper(
  left(
    regexp_replace(
      regexp_replace(
        translate(coalesce("name", 'CLIENT'), 'àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ', 'aaaeeeeiioouuucAAAEEEEIIOOUUUC'),
        '[^a-zA-Z0-9]+', '_', 'g'
      ),
      '^_+|_+$', '', 'g'
    ),
    40
  )
) || '_' || upper(right(replace("id", '-', ''), 8))
WHERE "gedFolderCode" IS NULL OR "gedFolderCode" = '';

-- Dedup if any collision after backfill
WITH ranked AS (
  SELECT id, "gedFolderCode",
    row_number() OVER (PARTITION BY "gedFolderCode" ORDER BY "createdAt") AS rn
  FROM "com_clients"
)
UPDATE "com_clients" c
SET "gedFolderCode" = c."gedFolderCode" || '_' || ranked.rn::text
FROM ranked
WHERE c.id = ranked.id AND ranked.rn > 1;

ALTER TABLE "com_clients" ALTER COLUMN "gedFolderCode" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "com_clients_gedFolderCode_key"
  ON "com_clients"("gedFolderCode");

-- 2) At most one invoice per quote (NULLs allowed multiple times in PG unique)
-- Keep oldest invoice if duplicates already exist
DELETE FROM "com_invoices" a
USING "com_invoices" b
WHERE a."quoteId" IS NOT NULL
  AND a."quoteId" = b."quoteId"
  AND a."createdAt" > b."createdAt";

DROP INDEX IF EXISTS "com_invoices_quoteId_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "com_invoices_quoteId_key"
  ON "com_invoices"("quoteId");
