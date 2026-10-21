-- Sécurité Supabase : activer RLS sur toutes les tables métier `public`.
--
-- Contexte ERP MSK :
-- - L’app lit/écrit via Prisma (connexion Postgres propriétaire / bypass RLS).
-- - L’API PostgREST (clé anon / authenticated) ne doit plus voir les lignes
--   tant qu’aucune policy n’est définie → alerte rls_disabled_in_public fermée.
-- - Aucun changement de code applicatif requis (Server Actions / requireUser / RBAC inchangés).
--
-- Ne PAS utiliser FORCE ROW LEVEL SECURITY : ça casserait Prisma (rôle owner).

ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."brand_assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."bud_exercises" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."bud_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."bud_patente_dues" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."catalog_offers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."com_clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."com_invoice_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."com_invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."com_number_sequences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."com_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."com_quote_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."com_quotes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cpt_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cpt_bank_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cpt_bank_txns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cpt_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cpt_entry_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cpt_exercises" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cpt_fx_rates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cpt_journals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cpt_periods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."crm_activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."crm_assignment_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."crm_contact_channels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."crm_contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."crm_opportunities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."crm_opportunity_offers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."crm_organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."crm_period_goals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."crm_scripts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."crm_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."crm_weekly_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."document_acls" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."document_folders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."document_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."document_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."group_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ops_tickets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."org_nodes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."organization_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pack_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."password_reset_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pat_assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."permission_packs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."prj_expenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."prj_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."prj_projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_absences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_contract_type_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_contracts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_employees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_inps_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_inps_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_leave_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_payroll_periods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_payslip_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_payslips" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_timesheet_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_timesheets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."signature_assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."stk_articles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."stk_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."stk_purchase_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."stk_purchases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_packs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_permission_overrides" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

-- Futures tables CREATE TABLE dans public → RLS auto (évite de réouvrir l’alerte).
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table', 'partitioned table')
  LOOP
    IF cmd.schema_name = 'public' THEN
      BEGIN
        EXECUTE format(
          'ALTER TABLE IF EXISTS %s ENABLE ROW LEVEL SECURITY',
          cmd.object_identity
        );
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed on %', cmd.object_identity;
      END;
    END IF;
  END LOOP;
END;
$$;

DROP EVENT TRIGGER IF EXISTS ensure_rls_public;
CREATE EVENT TRIGGER ensure_rls_public
ON ddl_command_end
WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
EXECUTE FUNCTION public.rls_auto_enable();
