# Intent — Suivi Mali / Togo (V1)

**Statut :** **V1 done** — Phases A–C **OK** (2026-11-23) · Suite = TB multi-pays **Phase 2**  
**Date :** 2026-11-23  
**Module :** Suivi tampon (`/suivi`, `sv_*`) — ne pas industrialiser comme le reste plateforme  
**Rollback défaut :** SHA `f38d09ff7154bf260d30d4cfe77c20a42580c68f` + migration down ; pas de purge data sauf demande explicite

---

## 1. Outcome / User / Success / Out of scope

### Outcome

Permettre de **piloter séparément** la trésorerie tampon et les stocks Suivi pour **deux pays** (Mali, Togo), sans mélange des soldes, sans transferts inter-pays, sans toucher aux autres piliers Suivi ni au reste ERP.

### Utilisateurs

| Qui | Accès pays |
|-----|------------|
| Super Admin | Toujours Mali **et** Togo |
| Admins système / pack `admin_plateforme` | Mali **et** Togo (défaut) |
| Direction (pack `direction`) | Mali **et** Togo (défaut) |
| Espoir (`e.awesso@mskcreation.net`) | **Togo seulement** — toutes manip des 3 piliers dans ce pays |
| Autres (ex. collab marketing) | Rien Suivi sauf grant explicite |

### Succès V1 (done)

1. **Régression Mali** : comptes / mouvements / stocks inchangés fonctionnellement (données backfillées Mali).
2. **Coquille Togo** : 2 comptes (physique + banque) à 0, mêmes familles stock à 0, 0 mouvements — seed/prod idempotent.
3. **Droits** : modèle pays + capacités ; Direction/admins voient les deux ; Espoir Togo only ; Super Admin toujours les deux.
4. **Entrée** : écran choix pays → navigation avec pays dans l’URL ; deep-link sans pays sur routes scopées → 404.
5. Pays **imposé** par le contexte URL (pas de cookie / localStorage).

### Hors scope V1

- Charges, factures clients, GED, clients scindés, absences/retards
- Commercial / Compta / RH hors Suivi
- Inter-pays (transferts, consolidation live)
- Autres pays dans le schéma
- Industrialiser `OrganizationSettings.countryCode` (reste `ML`)
- Tableau de bord différencié (**Phase 2**)
- Labels « … Togo » sur les libellés métier (le contexte pays suffit)
- Date / bascule Togo (soldes 0, pas d’archive pre-bascule Togo)

---

## 2. Q1 — Enum pays vs table site / filiale

### Option A — Enum (ou code pays figé) sur les entités scopées

Ex. `enum SvCountry { MALI TOGO }` (UI : « Mali » / « Togo », codes `ML` / `TG`) sur `SvAccount`, `SvStockItem`, et filtre mouvements via le compte (ou colonne dénormalisée).

| Avantages | Inconvénients |
|-----------|----------------|
| Simple, 2 valeurs V1, pas d’autre pays | Pas de métadonnées riches (adresse, responsable site…) |
| `@@unique([country, kind])` → 4 comptes naturels | Extension « 3ᵉ pays » = migration enum |
| Cohérent module **tampon** jetable | — |
| Peu de jointures, seed trivial | — |

### Option B — Table `SvSite` / filiale

Ex. table sites avec id, label, countryCode, timezone… ; FK depuis comptes / stocks.

| Avantages | Inconvénients |
|-----------|----------------|
| Extensible (plusieurs sites / pays) | Sur-ingénierie pour un tampon à 2 pays |
| Métadonnées (fuseau Lomé, etc.) | CRUD admin, RLS mental, seed plus lourd |
| Proche d’un vrai multi-filiale | Contredit « ne pas industrialiser Suivi » |

### Recommandation (verrouillée pour V1)

**Enum `SvCountry` (`MALI` | `TOGO`) + libellés FR + codes `ML`/`TG` en UI.**  
Timezone Lomé = constante code (`Africa/Lome`) côté Togo si besoin d’affichage dates — **pas** une table site. Devise XOF déjà partout.

---

## 3. Permissions existantes (constat)

### Catalogue actuel (`src/lib/rbac/catalog.ts`)

Capacités Suivi **plates**, sans notion de pays :

| Code | Rôle |
|------|------|
| `sv.access` | Entrée module |
| `sv.clients.*` / `sv.invoices.*` / `sv.expenses.*` | Clients / factures / charges |
| `sv.accounts.view` / `manage` | Comptes |
| `sv.movements.view` / `manage` | Mouvements |
| `sv.stock.view` / `manage` | Stocks |
| `sv.hr.view` / `manage` | Absences / retards |

Pack `SV_PERMISSIONS` = **toutes** les `sv.*` ci-dessus.

### Qui les a aujourd’hui

| Acteur | Source | `sv.*` |
|--------|--------|--------|
| Super Admin | `isSuperAdmin` | Tout (court-circuit) |
| Pack `direction` | `...SV_PERMISSIONS` | Tout Suivi |
| Pack `admin_plateforme` | `...SV_PERMISSIONS` | Tout Suivi |
| Espoir (`e.awesso@…`) | Pack `collaborateur` seul (ops marketing) | **Aucun** `sv.*` |
| Mathieu / Andile (seed team) | `direction` + `admin_plateforme` | Tout Suivi |

Garde page : `requireSvAccess` puis `requireSvPermission` (`src/lib/suivi/access.ts`).  
Admin peut déjà **GRANT/DENY** finement via overrides (`users.manage_access` / `overrides.manage`).

### Problème si on duplique naïvement

`sv.accounts.view.mali` × `sv.accounts.manage.mali` × … × Togo → **explosion** (~14 codes × 2), UI admin illisible, packs impossibles à maintenir.

---

## 4. Modèle permissions proposé (propre)

### Principe : **capacité × portée pays** (2 axes, pas de produit cartésien)

**Axe A — Capacités** (inchangées pour les 3 piliers + `sv.access`) :

- `sv.access`
- `sv.accounts.view` / `sv.accounts.manage`
- `sv.movements.view` / `sv.movements.manage`
- `sv.stock.view` / `sv.stock.manage`

**Axe B — Portée pays** (2 codes **nouveaux** seulement) :

| Code | Signification |
|------|----------------|
| `sv.country.mali` | Peut ouvrir / lire / écrire le contexte **Mali** (sous réserve des capacités) |
| `sv.country.togo` | Idem **Togo** |

Règle d’accès ressource scopée :

```
autorisé(pays, capacité) ⇔
  SuperAdmin
  OR ( has(capacité) AND has(sv.country.{pays}) )
```

Écran de choix pays : n’afficher que les pays pour lesquels `sv.country.*` est présent.  
Deep-link `?pays=tg` sans `sv.country.togo` → refus (redirect hub / 403 métier — même esprit que `requireSvPermission`).

### Ce qu’on ne fait **pas**

- Pas de `sv.accounts.mali.view`, etc.
- Pas de 2ᵉ pack Direction « Togo ».
- Pas de mélange « Mali = défaut implicite sans permission » : **explicite** dès V1 (backfill : Direction/admins reçoivent les deux pays).

### Matrice défaut V1

| Acteur | Capacités 3 piliers | `sv.country.mali` | `sv.country.togo` |
|--------|---------------------|-------------------|-------------------|
| Super Admin | (implicite) | oui | oui |
| Packs `direction` + `admin_plateforme` | via `SV_PERMISSIONS` (inchangé) | **ajouter** | **ajouter** |
| Espoir | GRANT `sv.access` + accounts/movements/stock view+manage | non | **GRANT** |
| Autre collab | rien | non | non |

Clients / factures / charges / HR : **hors scope pays V1** — restent permissions actuelles ; Espoir **n’a pas** besoin de les recevoir pour « gérer le Togo » (sauf décision contraire ultérieure).

### Comment donner Togo à Espoir **sans casser Mali**

1. **Ne pas** retirer `sv.country.mali` des packs Direction / admin.
2. Sur la fiche admin Espoir (`/administration/utilisateurs/[id]`) :
   - cocher les capacités 3 piliers + `sv.country.togo` → overrides **GRANT** (mécanisme déjà en place) ;
   - **ne pas** cocher `sv.country.mali`.
3. Option UX future (hors V1 code) : pack léger `sv_togo_ops` = capacités 3 piliers + `sv.country.togo` — assignable en 1 clic ; V1 overrides suffisent.

### Helper proposé (intent, pas code)

`canSvCountry(user, "MALI" | "TOGO")` + `requireSvCountry(user, pays)` en plus de `requireSvPermission`.

---

## 5. URL / App Router

### Recommandation V1 : query `?pays=ml|tg`

| Critère | Query `?pays=` | Path `/suivi/[pays]/…` |
|---------|----------------|-------------------------|
| Alignement listes MSK (`q`, `page`, `sort`) | Excellent — même pattern | OK mais refonte routes |
| Persistance « URL seule » | Oui | Oui |
| Deep-link sans pays → 404 | Guard sur pages scopées | Segment manquant = autre route |
| Charge migration | Faible | Forte (layouts, subnav, liens) |
| Contexte imposé | Oui (parse + refuse si absent) | Plus « structurel » |

**Entrée :** hub `/suivi` = **écran de choix** (cartes Mali / Togo selon droits) → push vers `/suivi/comptes?pays=ml` (ou stocks / mouvements).  
**Routes hors 3 piliers** (clients, charges, HR, TB V1) : **pas** de `pays` obligatoire.  
**Routes 3 piliers** : `pays` obligatoire ; absent / invalide → **404**.

Codes URL : `ml` | `tg` (minuscules). Affichage : « Mali (ML) » / « Togo (TG) ».

---

## 6. Données / schéma (intent)

- `SvAccount` : ajouter `country` ; remplacer `@unique(kind)` par `@@unique([country, kind])` → 4 comptes.
- Backfill existant → `MALI`.
- `SvCashMovement` : pays **via le compte** (pas de mouvement orphelin inter-pays) ; interdit transfert entre comptes de pays différents.
- `SvStockItem` : `country` + `@@unique([country, code])` (codes uniques **par pays**).
- Archives pre-bascule Mali : visibles **uniquement** en contexte Mali.
- Seed Togo prod : 2 comptes 0, clones familles stock qté 0, 0 mouvements ; Mali seed idempotent OK.
- `OrganizationSettings.countryCode` reste `ML`.

---

## 7. Empty states FR (proposition métier)

| Contexte | Titre | Corps | CTA |
|----------|-------|-------|-----|
| Comptes Togo (soldes 0, OK) | Comptes Togo prêts | Caisse physique et banque sont ouvertes à 0 FCFA. Les mouvements saisis ici n’affectent pas le Mali. | Nouveau mouvement / Créditer |
| Mouvements Togo vide | Aucun mouvement Togo | Aucune entrée ni sortie enregistrée pour le Togo. Commencez par un crédit de caisse ou de banque. | Saisir un mouvement |
| Mouvements Mali filtre vide | Aucun mouvement sur ce filtre | Aucun résultat pour ces critères (période, compte, sens…). | Réinitialiser les filtres |
| Stocks Togo qté 0 (liste non vide) | — (pas empty liste) | Badge / hint : « Quantités à 0 — inventaire Togo à renseigner » | Ajuster |
| Stocks Togo aucun article (échec seed) | Aucun article Togo | Les familles stock Togo ne sont pas encore créées. Contactez un administrateur. | — |
| Choix pays — un seul pays autorisé | — | Auto-rediriger vers ce pays (pas d’écran vide) | — |
| Choix pays — aucun `sv.country.*` | Accès pays Suivi manquant | Votre compte n’a pas de périmètre Mali ou Togo. Demandez l’accès à la Direction. | Retour accueil |
| 404 deep-link sans `pays` | Page introuvable | Les comptes, mouvements et stocks Suivi exigent un pays dans l’adresse (Mali ou Togo). | Choisir un pays |

---

## 8. Plan V1 exact (phases)

### Phase A — Fondations data + droits

1. Enum `SvCountry` + colonnes / uniques comptes & stocks ; backfill Mali.
2. Permissions `sv.country.mali` / `sv.country.togo` ; sync packs Direction + admin ; seed catalog.
3. Helpers accès pays + garde 404 / refus.
4. Seed Togo (comptes 0, stocks familles 0) idempotent prod.

**Gate A :** ✅ 2026-11-23 — migration déployée ; 4 comptes (Mali soldes inchangés conceptuellement, Togo 0) ; Espoir GRANT 8/8 Togo ; helpers + tests verts. Listes 3 piliers = Mali implicite jusqu’à Phase B.

### Phase B — Contexte URL + UI 3 piliers

1. Hub `/suivi` = choix pays (selon droits).
2. Listes / fiches / actions Comptes, Mouvements, Stocks : `?pays=` obligatoire ; filtre Prisma strict.
3. Interdit inter-pays côté actions (transfert, mouvement, stock).
4. Empty states FR ci-dessus ; libellés Mali/Togo + ML/TG ; pas de suffixe « Togo » sur labels comptes.
5. Liens internes des 3 piliers propagent `pays`.

**Gate B :** ✅ 2026-11-23 — hub choix Mali/Togo ; `?pays=` obligatoire sur comptes/mouvements/stocks (404 si absent) ; filtres Prisma + actions par pays ; inter-pays interdit ; empty states FR ; Espoir = carte Togo seulement ; Direction = les deux.

### Phase C — Hardening

1. Tests list-sort / guards pays si utile ; `npm run build`.
2. MAJ `docs/guides/SUIVI-GUIDES.md` (changelog + droits pays).
3. Vérif paiement charge → mouvement reste **Mali** (hors scope charges, cohérent).

**Gate C :** ✅ 2026-11-23 — `npm run build` OK ; miroirs charge/facture → `getSvAccountByKind(…, SV_COUNTRY_DEFAULT)` = **MALI** explicite ; tests `country.test.ts` + `accounts.test.ts` verts ; checklist manuelle Direction/Espoir (ci-dessous). **Pas** de browser E2E (credentials hors scope).

**Checklist manuelle (Direction / Espoir)** — à faire en prod / preview :

| # | Qui | Parcours | Attendu |
|---|-----|----------|---------|
| 1 | Direction | `/suivi` | Cartes Mali **et** Togo |
| 2 | Direction | Comptes/Mouvements/Stocks `?pays=ml` puis `tg` | Données séparées ; Togo soldes/qté 0 si coquille neuve |
| 3 | Direction | Deep-link `/suivi/comptes` sans `pays` | 404 |
| 4 | Espoir | `/suivi` | Carte **Togo seulement** |
| 5 | Espoir | `/suivi/comptes?pays=ml` | Redirect hub / refus |
| 6 | Direction | Paiement charge avec miroir mouvement ON | Mouvement **OUT** sur compte **Mali** (pas Togo) |
| 7 | Direction | Transfert / mouvement inter-pays | Refusé |

**Done V1** = gates A–C. **Pas** de TB refait.

### Phase 2 (hors V1) — Tableau de bord

**Pas un simple `?pays=` sur le TB actuel.**  
Le TB doit **représenter** Mali et Togo comme jeux distincts :

- Approach recommandée : **sections / onglets pays** (ou vue « Mali | Togo | Comparer ») avec séries et KPI **calculés séparément** (soldes, flux période, alertes stock) — jamais un mélange silencieux des `sv_cash_movements` des deux pays.
- Vue « Comparer » = deux colonnes / twin charts, pas une somme unique sans libellé pays.
- Accès : n’afficher que les pays autorisés ; Super Admin / Direction = les deux.

---

## 9. Ambiguïtés restantes

**Non bloquantes** pour un go V1 :

| Point | Défaut proposé |
|-------|----------------|
| Espoir : accès hub Suivi hors 3 piliers (clients, HR…) | **Non** — seulement 3 piliers + `sv.access` + `sv.country.togo` |
| Refus droits pays : 404 vs redirect hub | Deep-link **sans** `pays` → 404 ; `pays` OK mais **sans droit** → redirect `/suivi` |
| Pack `sv_togo_ops` | Overrides GRANT en V1 ; pack optionnel plus tard |
| TB V1 | Inchangé / hors scope (peut rester Mali-implicite ou masquer si pas de pays — à trancher en Phase 2) |

→ **Prêt pour go** d’implémentation Phase A dès validation humaine de ce document.

---

## 10. Références code (lecture seule)

- Permissions : `src/lib/rbac/catalog.ts` (`SV_PERMISSIONS`, packs `direction` / `admin_plateforme`)
- Garde : `src/lib/suivi/access.ts`
- Comptes : `src/lib/suivi/accounts.ts`, `SvAccount.kind @unique` actuel
- Espoir : `docs/ops/CREATE-MARKETING-COLLABS.md` — pack collaborateur only
- Overrides admin : `src/actions/users.ts` (`overrides.sync`)
