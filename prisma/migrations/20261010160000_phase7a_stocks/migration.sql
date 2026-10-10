-- Phase 7A — Stocks MVP

CREATE TYPE "StkMovementType" AS ENUM ('ENTREE', 'SORTIE', 'AJUSTEMENT');

CREATE TABLE "stk_articles" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "subFamily" TEXT,
    "designation" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'U',
    "qtyOnHand" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "stockMin" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "location" TEXT,
    "unitCostXof" INTEGER,
    "observations" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "stk_articles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stk_articles_code_key" ON "stk_articles"("code");
CREATE INDEX "stk_articles_family_active_idx" ON "stk_articles"("family", "active");
CREATE INDEX "stk_articles_qtyOnHand_stockMin_idx" ON "stk_articles"("qtyOnHand", "stockMin");

CREATE TABLE "stk_movements" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "type" "StkMovementType" NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "qtyBefore" DECIMAL(14,3) NOT NULL,
    "qtyAfter" DECIMAL(14,3) NOT NULL,
    "reason" TEXT,
    "movedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stk_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stk_movements_articleId_movedAt_idx" ON "stk_movements"("articleId", "movedAt");
CREATE INDEX "stk_movements_type_movedAt_idx" ON "stk_movements"("type", "movedAt");

ALTER TABLE "stk_articles" ADD CONSTRAINT "stk_articles_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stk_movements" ADD CONSTRAINT "stk_movements_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "stk_articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stk_movements" ADD CONSTRAINT "stk_movements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
