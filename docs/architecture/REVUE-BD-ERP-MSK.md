# Revue base de données — ERP MSK

**Statut :** référence pour nettoyage futur (ne pas supprimer).  
**Date d’analyse :** 2026-10-21  
**Sources :** `prisma/schema.prisma` · counts exacts schéma `public` · usage `prisma.*` dans `src/`  
**Canvas interactif (Cursor) :**  
`~/.cursor/projects/Users-pro-asguiro-Desktop-PRO-MSK-labs-erp-msk/canvases/erp-msk-db-review.canvas.tsx`  
**Copie source canvas (repo) :** [`erp-msk-db-review.canvas.tsx`](./erp-msk-db-review.canvas.tsx)

---

## Verdict

Schéma ERP **single-tenant** classique : hub `User` + domaines par préfixe. Le **CRM concentre ~70 % des lignes** (import). Beaucoup de tables à 0 row = **scaffolds de phase**, pas forcément inutiles.

**Vrai gras à nettoyer plus tard :**
1. Doublon contact (`phone`/`email` sur contact **+** `crm_contact_channels`)
2. Deux façons d’attacher une offre au deal (`catalogOfferId` **vs** `crm_opportunity_offers`)
3. Miroir `ComClient` ↔ champs déjà sur `CrmOrganization`
4. Soft FKs (`gedDocumentId` sans relation Prisma)
5. Orpheline : `document_acls` (0 row **et** 0 usage dans `src/`)

**Accès data (inchangé) :** Prisma serveur + RBAC. PostgREST anon bloqué (RLS sans policy).

---

## Chiffres clés

| Métrique | Valeur |
|---|---|
| Tables métier | 71 (+ `_prisma_migrations`) |
| Tables vides (0 row) | 20 |
| Orpheline code | `document_acls` |
| Lignes (ordre de grandeur) | ~3,3k |

### Volumes par domaine

| Domaine | Tables | Lignes (approx.) | Note |
|---|---|---|---|
| IAM / Auth app | 10 | ~694 | Users, packs, groups, audit |
| GED / Org | 8 | ~197 | Folders, docs, templates, org chart |
| CRM Commercial | 13 | ~2225 | Cœur data — 333 orgs/deals |
| Devis / Factures (COM) | 7 | ~9 | Pipeline naissant |
| Compta / Budget | 12 | ~131 | Plan + écritures + budget |
| RH / Paie | 13 | ~59 | Employés, contrats, paie |
| Stocks | 4 | ~16 | Articles + mouvements |
| Patrimoine | 1 | 0 | Scaffold vide |
| Projets | 3 | 0 | Scaffold vide |
| Anomalies (Ops) | 1 | 0 | Scaffold vide |

### Top tables (données réelles)

| Table | Rows | Domaine |
|---|---|---|
| crm_contact_channels | 367 | CRM |
| crm_organizations | 333 | CRM |
| crm_contacts | 333 | CRM |
| crm_opportunities | 333 | CRM |
| crm_activities | 325 | CRM |
| pack_permissions | 280 | IAM |
| audit_logs | 260 | IAM |
| crm_tasks | 190 | CRM |
| permissions | 108 | IAM |
| document_folders | 93 | GED |

---

## Chaîne métier cœur

```
User
  ├─► CrmOrganization ─► CrmContact ─► CrmContactChannel
  │         └─► CrmOpportunity ─► CrmActivity
  │                    │        └─► CrmTask
  │                    └─► ComClient ─► ComQuote ─► ComInvoice
  │                           └─► Document (GED)
```

---

## Liaisons critiques & risques

| De | Vers | Comment c’est pris | Risque / dette |
|---|---|---|---|
| User | ~40 relations | Hub owner/creator/assignee | Couplage fort — normal ERP |
| CrmOrganization | Contact → Channel | 1 org · N contacts · N canaux | phone/email aussi sur Contact (legacy) |
| CrmOrganization | CrmOpportunity | 1 org · N deals (souvent 1:1 import) | title = orgName souvent redondant |
| CrmOpportunity | Activity / Task | Timeline + file relances | OK — cœur opérationnel |
| CrmOpportunity | ComClient / ComQuote | Conversion gagné → dossier client | Duplication champs entreprise |
| CrmOpportunity | CatalogOffer | FK directe + M2M opportunity_offers | Deux modèles d’attache offre |
| DocumentFolder / Document | Link / Acl | GED + liens | ACL jamais peuplée |
| RhEmployee | User? | Lien optionnel userId | RH ≠ Auth — volontaire |
| RhContract / RhPayslip | GED | gedDocumentId String soft | Pas de FK Prisma |
| ComInvoice | CptEntry | Lien compta soft / lookup | À durcir si COM mature |

---

## Tables vides (20) — 2026-10-21

`bud_lines` · `com_invoice_lines` · `com_invoices` · `com_payments` · `crm_assignment_requests` · `crm_opportunity_offers` · `crm_period_goals` · `crm_weekly_reports` · `document_acls` · `ops_tickets` · `password_reset_requests` · `pat_assets` · `prj_expenses` · `prj_members` · `prj_projects` · `rh_timesheet_lines` · `rh_timesheets` · `stk_purchase_lines` · `stk_purchases` · `user_permission_overrides`

---

## Plan de nettoyage (à valider avant exécution)

### Tier A — Quick wins (faible risque)

- `document_acls` : 0 rows + 0 usage code → drop modèle + migration
- Clarifier `CrmContact.phone/email` vs `crm_contact_channels` (source de vérité = channels)
- Documenter soft FKs (`gedDocumentId`) ou ajouter relations optionnelles

### Tier B — Conception (moyen)

- Choisir **1** modèle offre deal : `catalogOfferId` **OU** `crm_opportunity_offers`
- `ComClient` : ne garder que le delta vs `CrmOrganization`
- `CrmOpportunity.title` redondant avec `org.name` — règle métier explicite

### Tier C — Modules vides (produit)

- `prj_*` / `pat_assets` / `ops_tickets` : garder si roadmap, sinon geler UI
- `stk_purchases` : utile vs mouvements seuls ?
- `rh_timesheets` : activer parcours ou masquer menu

### Tier D — Ne pas toucher maintenant

- IAM (permissions / packs) — fondation
- CRM orgs/contacts/deals/tasks/activities — data importée
- `cpt_*` plan + écritures — compta live
- `crm_period_goals` / `assignment_requests` — UI active même si 0 rows

---

## Cartographie tables (71)

### IAM
`organization_settings` · `users` · `groups` · `group_members` · `permissions` · `permission_packs` · `pack_permissions` · `user_packs` · `user_permission_overrides`(0) · `audit_logs` · `password_reset_requests`(0)

### GED / Org
`document_folders` · `documents` · `document_links` · `document_acls`(0 orpheline) · `brand_assets` · `signature_assets` · `org_nodes` · `document_templates`

### CRM
`catalog_offers` · `crm_organizations` · `crm_contacts` · `crm_contact_channels` · `crm_opportunities` · `crm_activities` · `crm_tasks` · `crm_scripts` · `crm_period_goals`(0) · `crm_weekly_reports`(0) · `crm_opportunity_offers`(0) · `crm_assignment_requests`(0)

### COM
`com_number_sequences` · `com_clients` · `com_quotes` · `com_quote_lines` · `com_invoices`(0) · `com_invoice_lines`(0) · `com_payments`(0)

### Compta / Budget
`cpt_accounts` · `cpt_journals` · `cpt_exercises` · `cpt_periods` · `cpt_entries` · `cpt_entry_lines` · `cpt_bank_accounts` · `cpt_bank_txns` · `cpt_fx_rates` · `bud_exercises` · `bud_lines`(0) · `bud_patente_dues`

### RH / Paie
`rh_employees` · `rh_contracts` · `rh_leave_requests` · `rh_absences` · `rh_timesheets`(0) · `rh_timesheet_lines`(0) · `rh_inps_settings` · `rh_payroll_periods` · `rh_payslips` · `rh_payslip_lines` · `rh_inps_lines` · `rh_contract_type_rules`

### Stocks / Pat / Prj / Ops
`stk_articles` · `stk_movements` · `stk_purchases`(0) · `stk_purchase_lines`(0) · `pat_assets`(0) · `prj_projects`(0) · `prj_members`(0) · `prj_expenses`(0) · `ops_tickets`(0)

---

## Règle absolue liée

Voir `.cursor/rules/supabase-rls-prisma.mdc` — métier via Prisma uniquement ; RLS on ; pas de PostgREST anon sur tables ERP.

---

## Prochaine session

Valider le **tier A** (document_acls + règle channels) puis **B** (offres / ComClient).  
**Aucune suppression** tant qu’il n’y a pas d’OK explicite table par table.
