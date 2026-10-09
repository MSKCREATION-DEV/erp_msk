# Phase 2 — Catalogue + CRM — **URGENT**

> Plan de phase dédié.  
> Prérequis : **Phase 1 OK** (2026-10-09).  
> Branche de travail : **`dev`**.  
> Priorité : COM / cash — [PRIORITES.md](./PRIORITES.md).

## Statut

| Étape | État |
|---|---|
| Plan rédigé | Oui — 2026-10-09 |
| Validation « Phase 2 GO » | **GO** — 2026-10-09 |
| Implémentation | **Livrée sur `dev`** — 2026-10-09 |
| Gate technique | **OK** (`gate:phase2` + `build` + `test:nav`) |
| Gate Phase 2 OK (humaine) | En attente — checklist ci-dessous |

## Règle de gate

1. Plan validé (« Phase 2 GO ») ← **fait**  
2. Implémentation complète de **ce** plan seulement  
3. Tests / vérifications  
4. Validation « Phase 2 OK »  
5. Seulement ensuite → Phase 3 (Commercial documentaire — URGENT)

## Objectif

Remplacer l’Excel CRM et brancher le **catalogue 5 piliers** pour que les commerciaux travaillent dans l’ERP :

- Catalogue services MSK (SKU, pilier, prix indicatif FCFA)
- Organisations / contacts / opportunités (pipeline)
- Activités + relances dues
- Scripts canaux (seed)
- Visibilité `own` / `team` / `global`
- Import CSV prospects (mapping Excel actuel)
- Dashboard CRM minimal (KPI perso + équipe si droits)

## Hors scope (strict — Phase 2.x / 3+)

| Reporté | Phase cible |
|---|---|
| Clients COM transactionnels + conversion win → Client | Phase 3 |
| Devis / factures depuis opportunité | Phase 3 |
| Cron e-mail relances / digests Direction | 2.x / 8 |
| Rapports hebdo structurés | 2.x |
| Merge dédup assisté avancé | 2.x |
| Objectifs commerciaux paramétrables | 2.x |
| WhatsApp Business API | 8 |
| UI corbeille GED / ACL / pad signature | 1.x (parallèle hors URGENT) |

## Décisions verrouillées

| Sujet | Valeur |
|---|---|
| Devise CRM | **FCFA (XOF)** — budgets Excel € convertis / saisis en XOF |
| Pipeline défaut | Nouveau → Contacté → Qualification → Intéressé → Devis envoyé → Négociation → Gagné / Perdu |
| Visibilité | `own` (commercial) · `team` (groupe Commerciaux) · `global` (`crm.reports.global` / Super Admin) |
| Catalogue | 5 piliers CDC · offres seedées · CRUD admin (`com.catalogue.manage`) |
| Import | CSV type `CRM_Prospection_MSK` (séparateur `;`) |
| UI | PageShell + tables + drawers + ConfirmDialog MSK |
| Liens aval | `opportunityId` prêt pour Phase 3 (pas de devis encore) |

## Livrables (checklist implémentation)

### Catalogue
- [x] Modèle `CatalogOffer` + enum `CatalogPillar` (5 piliers)
- [x] Seed offres représentatives (prix indicatifs XOF)
- [x] Page `/catalogue` (lecture) + admin create / toggle
- [x] Permission `com.catalogue.view` / `com.catalogue.manage`

### CRM cœur
- [x] `CrmOrganization`, `CrmContact`, `CrmOpportunity`, `CrmActivity`, `CrmTask`, `CrmScript`
- [x] Pipeline + motif perte si Perdu
- [x] Pages `/crm`, `/crm/prospects`, `/crm/prospects/[id]`, `/crm/relances`, `/crm/scripts`
- [x] Quick-log activité + tâche relance
- [x] Filtrage ownership selon droits (`own` / `team` / `global`)

### Import & seed
- [x] Action import CSV (format Excel `;`, max 200)
- [x] Seed scripts IG / LinkedIn / WhatsApp / téléphone
- [ ] Seed prospects démo (optionnel — import CSV suffit)

### Nav / RBAC
- [x] Débloquer nav CRM + Catalogue
- [x] Enrichir permissions packs `commercial` / `admin_crm` / `direction` / `admin_plateforme`

### Gate
- [x] `npm run build` / `test:nav` / `gate:phase2`
- [ ] Checklist humaine (ci-dessous)

## Gate humaine (après implémentation)

| # | Parcours | Critère |
|---|---|---|
| 1 | Catalogue | Voir les 5 piliers / offres ; édition admin |
| 2 | Prospect | Créer org + contact + opportunité |
| 3 | Pipeline | Changer d’étape ; Perdu exige motif |
| 4 | Activité | Logger un appel / note ; relance visible |
| 5 | Import | Importer un extrait CSV Excel |
| 6 | Visibilité | Commercial ne voit que `own` ; Admin CRM voit global |
| 7 | Scripts | Consulter / copier un script |

## Critères d’acceptation

Un commercial peut gérer son pipeline dans l’ERP (sans Excel), proposer une offre du catalogue, logger des activités et voir ses relances. Un Admin CRM / Direction voit le global. Aucun devis transactionnel (Phase 3).

## Après validation

Répondre : **« Phase 2 OK »** → ouvrir plan Phase 3 (Clients + devis/factures — URGENT).

---

## Validation historique

- **« Phase 2 GO »** — 2026-10-09.
