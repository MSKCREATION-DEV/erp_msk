# Audit tableaux ERP MSK — tri / pagination / perf

Date inventaire : **2026-11-12**  
Branche : `dev` · Next.js **15.5.27** (`useLinkStatus` disponible via `next/link`)  
Réf. règles : `list-pagination-search.mdc`, `list-actions-commercial-ref.mdc`, `ui-never-freeze.mdc`

## Objectifs refonte

1. Feedback visuel immédiat &lt; 100 ms à chaque clic d’en-tête (`useLinkStatus` + `scroll={false}`).
2. p95 serveur listes &lt; 500 ms (hors cold start) ou cause + plan documentés.
3. Comportement identique sur tous les tableaux métier listables.
4. Tri déterministe : `orderBy` primaire + secondaire `{ id: "asc" }`.
5. Suspense `key=listKey(params)` pour rejouer le skeleton quand seuls les searchParams changent (Next #49297).

## Légende statuts

| Statut | Signification |
|--------|----------------|
| `OK_URL` | Déjà `parseListSort` + `SortableTh` — à renforcer (socle + secondary id + Suspense key + Promise.all) |
| `A_MIGRER` | Tableau listable sans tri URL serveur complet |
| `CLIENT` | Tri / filtre en mémoire côté serveur ou client (pas Prisma orderBy page) |
| `EXCEPTION` | Hors scope tri listable — justification écrite |
| `SOCLE` | Composant / helper partagé (pas une page métier) |

**Migration lot** = coché quand le tableau a reçu le socle refonte (secondary id via helper, feedback Link, listKey/Suspense si applicable, Promise.all si findMany+count).

---

## A. Inventaire exhaustif

### A.1 Listings métier déjà en tri URL (`SortableTh` + `parseListSort`)

| # | Chemin | Composant | Modèle Prisma | État avant | Colonnes triables | Défaut | Volume estimé | Pag. | Suspense | Promise.all | Migration |
|---|--------|-----------|---------------|------------|-------------------|--------|---------------|------|----------|-------------|-----------|
| 1 | `administration/utilisateurs/page.tsx` | page | `User` | `OK_URL` | name, status | name asc | 50–200 | oui | non | non | ☐ |
| 2 | `commercial/clients/page.tsx` | page | `ComClient` | `OK_URL` | city, contact, invoices, name, owner, phone, quotes, updatedAt | updatedAt desc | 100–2k | oui | oui (sans key list) | non | ☐ |
| 3 | `commercial/devis/page.tsx` | page | `ComQuote` | `OK_URL` | client, createdAt, number, object, status, totalTtc | createdAt desc | 200–5k | oui | oui | non | ☐ |
| 4 | `comptabilite/a-comptabiliser/page.tsx` | page | `ComInvoice` | `OK_URL` | client, number, status, totalTtc (+ issuedAt défaut) | issuedAt desc | 20–200 | non | non | non | ☐ |
| 5 | `comptabilite/ecritures/page.tsx` | page | `CptJournalEntry` | `OK_URL` | entryDate, journal, label, number, status | entryDate desc | 500–20k | non | non | non | ☐ |
| 6 | `comptabilite/factures/page.tsx` | page | `ComInvoice` | `OK_URL` | amountPaid, client, createdAt, number, status, totalTtc | createdAt desc | 200–10k | oui | oui | non | ☐ |
| 7 | `comptabilite/journaux/page.tsx` | page | `CptJournal` | `OK_URL` | active, code, entries, label | sortOrder asc | &lt;50 | oui | non | non | ☐ |
| 8 | `comptabilite/plan/page.tsx` | page | `CptAccount` | `OK_URL` | classNum, code, label, nature, postable | code asc | 100–500 | non | oui | non | ☐ |
| 9 | `crm/affectations/page.tsx` | page **2 tableaux** | `CrmAssignmentRequest` | `OK_URL` + `hsort`/`hdir` | pending: createdAt, owner, prospect, requester, stage, status · historique: resolvedAt, … | createdAt asc / resolvedAt desc | 50–1k | non | oui | partiel | ☐ |
| 10 | `crm/prospects/prospects-results.tsx` | results | `CrmOpportunity` | `OK_URL` | createdAt, createdBy, followUpAt, nextAction, org, owner, source, stage | followUpAt asc | 500–20k | oui | parent | non | ☐ |
| 11 | `crm/relances/relances-results.tsx` | results **2 tableaux** | activités / tâches | `OK_URL` | action, actor, assignee, dueAt, occurredAt, org, owner, stage, summary, type | occurredAt desc / dueAt asc | 200–10k | oui | oui | non | ☐ |
| 12 | `ops/anomalies/page.tsx` | page | `OpsTicket` | `OK_URL` | assigned, equipment, noticedAt, priority, status | priority desc | 50–500 | non | non | non | ☐ |
| 13 | `patrimoine/page.tsx` | page | `PatAsset` | `OK_URL` | assigned, category, code, designation, status, value | code asc | 50–500 | non | non | non | ☐ |
| 14 | `projets/page.tsx` | page | `PrjProject` | `OK_URL` | budget, code, expenses, name, owner, status | updatedAt desc | 20–200 | non | non | non | ☐ |
| 15 | `rh/collaborateurs/page.tsx` | page | `RhEmployee` | `OK_URL` | hireDate, jobTitle, name, status, type | name asc | 20–200 | non | oui | non | ☐ |
| 16 | `rh/contrats/page.tsx` | page | `RhContract` | `OK_URL` | employee, startDate, status, title, type | startDate desc | 20–300 | non | non | non | ☐ |
| 17 | `rh/inps/page.tsx` | page **2 tableaux** | périodes / déclarations | `OK_URL` | period | period desc | &lt;100 | non | non | non | ☐ |
| 18 | `rh/paie/page.tsx` | page | `PayPeriod` | `OK_URL` | period, slips, status | period desc | &lt;100 | non | non | non | ☐ |
| 19 | `stocks/achats/page.tsx` | page | `StkPurchase` | `OK_URL` | by, createdAt, lines, number, status, supplier | createdAt desc | 50–1k | non | non | non | ☐ |
| 20 | `stocks/articles/page.tsx` | page | `StkArticle` | `OK_URL` | code, designation, family, location, min, qty | code asc | 50–2k | oui | non | non | ☐ |
| 21 | `stocks/mouvements/page.tsx` | page | `StkMovement` | `OK_URL` | article, by, movedAt, quantity, type | movedAt desc | 200–10k | non | non | non | ☐ |
| 22 | `suivi/clients/page.tsx` | page | `SvClient` | `OK_URL` | contact, invoices, name | name asc | 50–500 | oui | oui | non | ☐ |
| 23 | `suivi/factures/page.tsx` | page | `SvInvoice` | `OK_URL` | amountPaid, client, number, status, totalTtc | issuedAt desc | 100–5k | oui | oui | non | ☐ |
| 24 | `suivi/mouvements/page.tsx` | page | `SvMovement` | `OK_URL` | account, amount, category, direction, movedAt | movedAt desc | 200–10k | oui | oui | **oui** | ☐ |
| 25 | `suivi/stocks/page.tsx` | page | `SvStockItem` | `OK_URL` | code, family, label, location, quantity | family asc | 50–1k | oui | oui | non | ☐ |

**Sous-total A.1 : 25 pages / ~27 tableaux UI** (affectations ×2, relances ×2, inps ×2).

### A.2 Tri URL UI mais données triées en mémoire (`CLIENT`)

| # | Chemin | Modèle / source | État | Colonnes | Défaut | Volume | Migration |
|---|--------|-----------------|------|----------|--------|--------|-----------|
| 26 | `comptabilite/clients/clients-results.tsx` | Agrégat `loadClientAccounts()` + `sortClientAccountRows` | `CLIENT` (SortableTh URL, tri JS mémoire) | name, owner, invoiced, paid, balance, overdue, due | name/owner/due → asc sinon desc | clients × factures | ☐ → garder tri mémoire **justifié** (agrégats financiers non colonnes SQL) + secondary id stable + listKey ; documenter |

### A.3 Tableaux listables **sans** `SortableTh` (`A_MIGRER`)

| # | Chemin | Modèle | État | Notes | Volume | Migration |
|---|--------|--------|------|-------|--------|-----------|
| 27 | `commercial/contrats/page.tsx` | `ComContract` | `A_MIGRER` | `orderBy updatedAt`, `take: 100`, th natifs | 50–1k | ☐ |
| 28 | `crm/objectifs/page.tsx` | agrégat goals/roster | `A_MIGRER` / hybride | Table progression équipe ; données dérivées | &lt;50 collabs | ☐ ou EXCEPTION si jeu fixe court |
| 29 | `rh/conges/types/page.tsx` | `RhLeaveType` | `A_MIGRER` | Référentiel court | &lt;20 | ☐ / EXCEPTION référentiel |
| 30 | `components/crm/prospect-select-table.tsx` | props client | `CLIENT` picker | Recherche + pag client ; **pas de tri colonnes** | pageSize 20 | ☐ tri client colonnes optionnel ou EXCEPTION picker |

### A.4 Exceptions justifiées (ne pas forcer tri URL listable)

| # | Chemin | Type | Justification |
|---|--------|------|----------------|
| E1 | `commercial/contrats/[id]/page.tsx` | Micro-liste fiche | Lignes contrat / docs — plafond + lien « voir tout » |
| E2 | `commercial/devis/[id]/page.tsx` | Micro-liste fiche | Lignes devis |
| E3 | `comptabilite/banques/[id]/page.tsx` | Mouvements compte | Listing fiche ; tri date métier fixe ; pagination à traiter séparément si volume |
| E4 | `comptabilite/budget/page.tsx` | Grille saisie | Matrice mois × catégorie — exception règles listes |
| E5 | `comptabilite/clients/[id]/page.tsx` | Micro-listes fiche | Factures / paiements récents |
| E6 | `comptabilite/ecritures/[id]/page.tsx` | Lignes écriture | Formulaire / détail |
| E7 | `comptabilite/etats/page.tsx` | Rapport | États financiers — colonnes fixes |
| E8 | `comptabilite/factures/[id]/page.tsx` | Micro-liste | Paiements / lignes |
| E9 | `comptabilite/grand-livre/page.tsx` | Rapport | Grand livre — ordre comptable |
| E10 | `projets/[id]/page.tsx` | Micro-liste | Dépenses projet |
| E11 | `rh/collaborateurs/[id]/page.tsx` | Micro-liste | Docs / contrats collab |
| E12 | `rh/paie/[id]/page.tsx` | Bulletins période | Ordre métier (matricule) |
| E13 | `stocks/achats/[id]/page.tsx` | Lignes achat | Détail |
| E14 | `suivi/comptes/[id]/page.tsx` | Mouvements compte | Fiche ; ordre chronologique |
| E15 | `suivi/factures/[id]/page.tsx` | Lignes / paiements | Détail |
| E16 | `components/commercial/client-wizard-form.tsx` | Table saisie / sélection wizard | Formulaire multi-étapes |
| E17 | `components/comptabilite/entry-form.tsx` | Lignes écriture éditables | Saisie |
| E18 | `components/crm/prospects-filter-modal.tsx` | Preview filtres | Modale courte |
| E19 | `components/espace/leave-movements-list.tsx` | Micro-historique | Espace collab, plafond |
| E20 | `lib/email/templates.ts` | HTML e-mail | Pas UI ERP |
| E21 | `components/ged/ged-browser.tsx` | Navigateur fichiers | Tri client arborescence locale (prefs) — **pas** listing Prisma paginé ; exception UX explorateur |
| E22 | `rh/horaires/page.tsx` | Config | Cards + évent. table jours fériés courte — référentiel année |
| E23 | `suivi/comptes/page.tsx` | 2 comptes | Jeu fixe court (caisse/banque) — exception règles |
| E24 | `comptabilite/banques/page.tsx` | Comptes banque | Jeu court config |
| E25 | Listes **cartes** (pas `<table>`) : `crm/rdv`, `crm/scripts`, `catalogue`, `rh/conges`, `rh/absences`, `rh/heures`, `rh/profil-demandes`, `notifications`, `espace/*`, `administration/signatures`, `organisation` | Cards / timeline | Hors inventaire « tableau » ; orderBy fixe serveur ; future alignement Commercial si conversion table |

### A.5 Socle partagé

| Chemin | Rôle | Avant refonte |
|--------|------|---------------|
| `src/lib/list/sort.ts` | parseListSort, buildSortHref, appendSortParams | Pas de secondary id, pas de `listKey` |
| `src/lib/list/sort.test.ts` | Tests unitaires | Couverture partielle |
| `src/lib/list/pagination.ts` | page / pageSize (max 100 déjà) | OK |
| `src/components/ui/sortable-th.tsx` | SortableTh / PlainTh | Link prefetch=false ; **pas** scroll=false ; **pas** useLinkStatus |
| `src/components/ui/list-pagination.tsx` | Pagination URL | Pas scroll=false / pending |
| `src/components/ui/list-table-skeleton.tsx` | Skeleton | Existe ; hauteur à stabiliser |
| `src/components/ui/table-body-suspense.tsx` | **à créer** | — |

---

## B. Synthèse inventaire

| Catégorie | Nb |
|-----------|-----|
| Tableaux UI détectés (`<table>` hors e-mail) | **~49** fichiers / **~52** instances (dont 3 pages multi-tableaux) |
| Déjà tri URL serveur (A.1) | **25** pages (~27 tableaux) |
| Tri URL + mémoire (A.2) | **1** |
| À migrer listable (A.3) | **4** |
| Exceptions justifiées (A.4) | **25** |
| Cible « migré socle » (A.1 + A.2 + A.3 utiles) | **~30** |

---

## C. Mesures avant (étape 1)

Méthode : script one-shot `Promise.all([findMany, count])` via Prisma local (`.env.local`), 3 runs warm, médiane.  
Date : _à remplir à l’étape 1_.

| Liste | findMany+count (ms) | Observations |
|-------|---------------------|--------------|
| commercial/clients | _TBD_ | |
| crm/prospects | _TBD_ | |
| commercial/devis | _TBD_ | |
| suivi/mouvements | _TBD_ | déjà Promise.all |
| stocks/articles | _TBD_ | |

Layout / auth : `requireUser()` dans pages (pas layout shell bloquant — conforme `ui-never-freeze`). Mutualisation `React.cache` : à vérifier sur `requireUser` / loaders.

Indexes existants (extrait) : `ComClient` owner/normalizedName/status ; `CrmOpportunity` owner+stage, followUpAt ; `ComQuote` clientId, owner+status ; factures dueDate+status. Manques potentiels documentés à l’étape 3.

---

## D. Checklist migration (mise à jour au fil des lots)

- [ ] Étape 0 — inventaire (ce fichier)
- [ ] Étape 1 — mesures avant
- [ ] Étape 2 — socle (`sort.ts`, SortableTh, TableBodySuspense, ListPagination, skeleton)
- [ ] Étape 3 — Promise.all + indexes
- [ ] Étape 4 — migration A.1–A.3
- [ ] Étape 5 — tests + build
- [ ] Étape 6 — garde-fous

---

## E. Décisions d’exception confirmées

1. **Compta clients** : tri mémoire sur agrégats financiers — pas de SQL orderBy unique ; secondary sort `id` dans `sortClientAccountRows` ; URL `sort`/`dir` conservée.
2. **GED** : explorateur client — exception.
3. **Fiches / rapports / grilles saisie / e-mails / jeux fixes courts** : exceptions règle listes.
4. **Listes cartes** : hors scope « tableau » de cette refonte ; notées E25.
5. **pg_trgm** : non activé sans preuve de lenteur `contains`/`mode: insensitive`.
6. **Cursor pagination** : non sans mesure p95 &gt; 500 ms persistante.
7. **Playwright E2E** : absent du repo → exception ; couverture unitaire `sort.test.ts` (+ smoke composant si possible).
