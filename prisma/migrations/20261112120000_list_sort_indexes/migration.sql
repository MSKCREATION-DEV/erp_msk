-- Indexes pour tri URL fréquent (listes Commercial).
-- Justifiés : défauts sort updatedAt/createdAt + filtre status.

CREATE INDEX IF NOT EXISTS "com_contracts_updatedAt_idx" ON "com_contracts"("updatedAt");
CREATE INDEX IF NOT EXISTS "com_contracts_status_updatedAt_idx" ON "com_contracts"("status", "updatedAt");
CREATE INDEX IF NOT EXISTS "com_quotes_createdAt_idx" ON "com_quotes"("createdAt");
