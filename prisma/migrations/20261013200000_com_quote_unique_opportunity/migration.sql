-- Deduplicate: keep oldest quote per opportunity, unlink the rest.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "opportunityId"
      ORDER BY "createdAt" ASC, id ASC
    ) AS rn
  FROM "com_quotes"
  WHERE "opportunityId" IS NOT NULL
)
UPDATE "com_quotes" q
SET "opportunityId" = NULL
FROM ranked r
WHERE q.id = r.id
  AND r.rn > 1;

-- Drop plain index if present (unique replaces it).
DROP INDEX IF EXISTS "com_quotes_opportunityId_idx";

-- One quote per linked prospect (multiple NULL ok in PostgreSQL).
CREATE UNIQUE INDEX "com_quotes_opportunityId_key" ON "com_quotes"("opportunityId");
