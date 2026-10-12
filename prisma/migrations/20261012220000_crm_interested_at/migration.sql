-- Horodatage entrée statut Intéressé (SLA devis 24h)
ALTER TABLE "crm_opportunities" ADD COLUMN IF NOT EXISTS "interested_at" TIMESTAMP(3);
