-- Soft archive for Suivi stock items (replace Excel snapshot by Direction inventory)
ALTER TABLE "sv_stock_items" ADD COLUMN "archivedAt" TIMESTAMP(3);
CREATE INDEX "sv_stock_items_archivedAt_idx" ON "sv_stock_items"("archivedAt");
