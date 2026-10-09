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
| Implémentation | **Livrée sur `dev`** — 2026-10-09 (`b96b06c`) |
| Gate technique | **OK** (`gate:phase2` + `build` + `smoke:ui` 32/32) |
| Gate Phase 2 OK (humaine) | **OK** — 2026-10-09 |

## Règle de gate

1. Plan validé (« Phase 2 GO ») ← **fait**  
2. Implémentation complète de **ce** plan seulement  
3. Tests / vérifications  
4. Validation « Phase 2 OK » ← **fait**  
5. Seulement ensuite → Phase 3 (Commercial documentaire — URGENT)

## Objectif

Remplacer l’Excel CRM et brancher le **catalogue 5 piliers** pour que les commerciaux travaillent dans l’ERP :

- Catalogue services MSK (SKU, pilier, prix indicatif FCFA)
- Organisations / contacts / opportunités (pipeline)
- Activités + relances dues
- Scripts canaux (seed + CRUD)
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
| Catalogue | 5 piliers CDC · offres seedées (prix Marinas) · CRUD admin |
| Import | CSV type `CRM_Prospection_MSK` (séparateur `;`) |
| UI | PageShell + list/create séparés + `backHref` + ConfirmDialog MSK |
| Liens aval | `opportunityId` prêt pour Phase 3 |

## Livrables (checklist implémentation)

### Catalogue
- [x] Modèle `CatalogOffer` + enum `CatalogPillar` (5 piliers)
- [x] Seed prix réels (RS STD/PRO/PREMIUM + add-ons)
- [x] Page `/catalogue` pricing cards + `/catalogue/nouveau` + `/catalogue/[id]/edit`
- [x] Permission `com.catalogue.view` / `com.catalogue.manage`
- [x] Règle list/create : pas de formulaire create sur le listing

### CRM cœur
- [x] `CrmOrganization`, `CrmContact`, `CrmOpportunity`, `CrmActivity`, `CrmTask`, `CrmScript`
- [x] Pipeline + motif perte si Perdu
- [x] Pages `/crm`, `/crm/prospects`, `/crm/prospects/nouveau`, `/crm/prospects/import`, `/crm/prospects/[id]`, `/crm/relances`
- [x] Scripts : `/crm/scripts` + `/crm/scripts/nouveau` + `/crm/scripts/[id]/edit`
- [x] Quick-log activité + tâche relance (fiche détail uniquement)
- [x] Filtrage ownership selon droits (`own` / `team` / `global`)
- [x] Retour arrière (`backHref`) sur create / edit / détail

### UX / Next.js (absolu)
- [x] `loading.tsx` segments CRM / catalogue / admin…
- [x] Layout shell sans await cookies bloquant (`AppSidebar` + Suspense)
- [x] `NavigationProgress` + `usePendingAction` (UI jamais figée)
- [x] Règles Cursor `list-create-separation` + `ui-never-freeze`

### Import & seed
- [x] Action import CSV (format Excel `;`, max 200) — page dédiée
- [x] Seed scripts IG / LinkedIn / WhatsApp / téléphone
- [x] Seed prospects démo optionnel — **non requis** (import CSV suffit)

### Nav / RBAC
- [x] Débloquer nav CRM + Catalogue
- [x] Enrichir permissions packs `commercial` / `admin_crm` / `direction` / `admin_plateforme`

### Gate
- [x] `npm run build` / `lint` / `test:nav` / `gate:phase0|1|2`
- [x] `npm run smoke:ui` (32 checks OK, 2026-10-09)
- [x] Checklist humaine (ci-dessous)

## Gate humaine

| # | Parcours | Critère | Résultat |
|---|---|---|---|
| 1 | Catalogue | 5 piliers / offres ; édition admin | **OK** |
| 2 | Prospect | Créer org + contact + opportunité | **OK** |
| 3 | Pipeline | Changer d’étape ; Perdu exige motif | **OK** |
| 4 | Activité | Logger note ; relance visible | **OK** |
| 5 | Import | CSV Excel | **OK** (page dédiée) |
| 6 | Visibilité | own / team / global | **OK** (droits) |
| 7 | Scripts | Consulter / copier / CRUD manage | **OK** |

## Critères d’acceptation

Un commercial peut gérer son pipeline dans l’ERP (sans Excel), proposer une offre du catalogue, logger des activités et voir ses relances. Un Admin CRM / Direction voit le global. Aucun devis transactionnel (Phase 3).

## Suite

**Phase 2 OK** — plan [PHASE-03-COMMERCIAL.md](./PHASE-03-COMMERCIAL.md) ouvert · attendre **« Phase 3 GO »**.

---

## Validation historique

- **« Phase 2 GO »** — 2026-10-09.
- **« Phase 2 OK »** — 2026-10-09 (gate humaine + push `dev` `b96b06c`).
