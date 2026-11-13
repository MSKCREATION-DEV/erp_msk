-- Signature OFF sur tous les gabarits déjà à true (règle produit absolue).
-- Idempotent : re-appliquer ne change rien si déjà false.
-- Les admins pourront réactiver gabarit par gabarit via l’UI Studio.

UPDATE "document_templates"
SET "signatureEnabled" = false
WHERE "signatureEnabled" = true;
