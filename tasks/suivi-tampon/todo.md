# Todo — Module Suivi (tampon)

Réf. plan : [`plan.md`](./plan.md) · Spec : [`docs/specs/suivi-tampon/SPEC.md`](../../docs/specs/suivi-tampon/SPEC.md)

**Note conflit :** `tasks/plan.md` / `tasks/todo.md` absents à la création — travail isolé ici. Ne pas écraser d’autres plans futurs.

---

## Task 1: Schema Prisma `sv_*` + migration RLS

**Description:** Ajouter modèles `SvClient`, `SvInvoice`, `SvInvoiceLine`, `SvPayment`, `SvContractMeta`, `SvCashMovement`, `SvStockItem`, `SvStockMovement` mappés `sv_*`, migration SQL avec `ENABLE ROW LEVEL SECURITY` (sans policy ouverte).

**Acceptance criteria:**
- [x] Modèles compilent (`prisma generate`)
- [x] Tables créées avec préfixe `sv_`
- [x] RLS activé sur chaque table publique nouvelle

**Verification:**
- [x] `npx prisma validate` / migrate deploy OK (`20261110110000`)
- [x] Build succeeds: `npm run build`
- [x] Manual: inspect migration SQL RLS

**Dependencies:** None

**Files likely touched:**
- `prisma/schema.prisma`
- `prisma/migrations/*/migration.sql`

**Estimated scope:** M

---

## Task 2: Permissions `sv.*` + packs

**Description:** Étendre `src/lib/rbac/catalog.ts` avec codes `sv.*` ; attribuer au SuperAdmin + packs Admin/Direction uniquement (pas commercial terrain).

**Acceptance criteria:**
- [x] Codes listés dans SPEC présents
- [x] Pack commercial terrain sans `sv.access`
- [x] SuperAdmin conserve accès total

**Verification:**
- [x] Typecheck OK
- [ ] Manual: user commercial → pas `sv.access` (à retester en smoke)

**Dependencies:** Task 1 (idéal) ou parallel après design codes

**Files likely touched:**
- `src/lib/rbac/catalog.ts`
- seed packs si applicable

**Estimated scope:** S

---

## Task 3: Nav + hub `/suivi` skeleton

**Description:** Entrée sidebar « Suivi », layout segment, `page.tsx` hub cards (Clients / Factures / **Mouvements** / Stocks), `loading.tsx`, garde `sv.access`.

**Acceptance criteria:**
- [x] Hub visible si `sv.access`
- [x] Redirect `/accueil` sinon
- [x] Cards naviguent vers sous-routes (même vides)
- [x] Charte MSK, pattern Commercial

**Verification:**
- [x] Build OK
- [ ] Manual: nav + skeleton loading

**Dependencies:** Task 2

**Files likely touched:**
- `src/lib/nav.ts`
- `src/app/(app)/suivi/**`
- `src/lib/suivi/nav.ts` / `modules.ts`
- `src/components/suivi/*`

**Estimated scope:** M

---

## Checkpoint: Fondation (après Tasks 1–3)

- [x] Build + lint OK (typecheck + build 2026-11-10)
- [x] Accès restreint codé (`requireSvAccess`)
- [x] Clarifications KOUNDJI / contrat ECOSOL / miroir clos (DECISIONS-SEED)

---

## Task 4: Seed inventaire clients + factures

**Description:** Script/section seed : 6 clients + factures/lignes/paiements selon inventaire + [`DECISIONS-SEED.md`](../../docs/specs/suivi-tampon/DECISIONS-SEED.md) ; conflits → `notes`/`NEEDS_REVIEW` ; **zéro invention** ; priorité fichier facture.

**Acceptance criteria:**
- [ ] 6 clients seedés (ECOSOL, KOUNDJI SERVICES, BOMOYI, DELMORIAN, ISDALINIA, PROSPERITY MANAGEMENT)
- [ ] Factures documentées présentes avec sourceDocument ; **FAC-122 seul** (pas 143) ; Ecosol 116 TTC 778800 ; 155 = 306800 ; n° 22910263
- [ ] Écarts Excel documentés en notes, pas « corrigés » silencieusement hors décisions
- [ ] Clients devis-only **absents** (décision B)

**Verification:**
- [ ] Relecture croisée `INVENTAIRE-DOCUMENTS.md` + `DECISIONS-SEED.md`
- [ ] Query Prisma counts

**Dependencies:** Task 1

**Files likely touched:**
- `prisma/seed.ts` ou `prisma/seed-suivi.ts`
- helpers `src/lib/suivi/seed-data.ts`

**Estimated scope:** M

---

## Task 5: Liste clients cliquable

**Description:** `/suivi/clients` — table riche (totale, payé, restant, nb factures), `ClickableRowLink` ligne entière, pagination/search basique, CTA Nouveau → `/nouveau`.

**Acceptance criteria:**
- [ ] Ligne cliquable → fiche
- [ ] KPI colonnes calculés
- [ ] Pas de formulaire create inline
- [ ] `loading.tsx` segment

**Verification:**
- [ ] Manual: clic ligne + pending
- [ ] Build OK

**Dependencies:** Tasks 3, 4

**Files likely touched:**
- `src/app/(app)/suivi/clients/page.tsx`
- `src/app/(app)/suivi/clients/loading.tsx`
- composants liste

**Estimated scope:** M

---

## Task 6: Fiche client riche

**Description:** `/suivi/clients/[id]` — KPI solde/restant/à venir/totale ; listes factures & paiements ; zone contrats (placeholder jusqu’à Task 14) ; CTA remix.

**Acceptance criteria:**
- [ ] 4 KPI visibles
- [ ] Factures du client listées avec statut/reste
- [ ] CTA « Nouvelle facture » vers remix prérempli `?clientId=`

**Verification:**
- [ ] Manual: ECOSOL / Prosperity seed
- [ ] Build OK

**Dependencies:** Task 5

**Files likely touched:**
- `src/app/(app)/suivi/clients/[id]/page.tsx`
- `src/lib/suivi/balances.ts`

**Estimated scope:** M

---

## Task 7: Création / édition client

**Description:** `/suivi/clients/nouveau` (+ edit si besoin) avec validation Zod, FormShell, redirect fiche.

**Acceptance criteria:**
- [ ] Create séparé de la liste
- [ ] Zod serveur + pending
- [ ] `redirect()` post-succès

**Verification:**
- [ ] Manual create
- [ ] Build OK

**Dependencies:** Task 5

**Files likely touched:**
- `src/app/(app)/suivi/clients/nouveau/page.tsx`
- `src/actions/suivi/clients.ts`

**Estimated scope:** S–M

---

## Task 8: Liste + fiche facture + paiement

**Description:** Routes factures ; enregistrement paiement (modal courte, pattern Commercial actions) ; maj `amountPaid` / statut.

**Acceptance criteria:**
- [ ] Liste filtrable reste > 0
- [ ] Fiche lignes + totaux
- [ ] Paiement → PARTIELLE ou PAYEE
- [ ] CTA danger non applicable (paiement = primary)

**Verification:**
- [ ] Manual: paiement partiel ISDALINIA seed
- [ ] Build OK

**Dependencies:** Tasks 4, 6

**Files likely touched:**
- `src/app/(app)/suivi/factures/**`
- `src/actions/suivi/invoices.ts`
- `src/components/suivi/payment-modal.tsx`

**Estimated scope:** M

---

## Task 9: Remix facture (FormSteps)

**Description:** `/suivi/factures/nouveau` — étapes Client → Source historique → Édition lignes → Récap ; add/remove/adjust ; `remixedFromId` ; redirect.

**Acceptance criteria:**
- [ ] Stepper `FormSteps` avec validation par étape
- [ ] Préremplissage depuis facture passée
- [ ] Pas d’ID technique à coller (picker client/facture)
- [ ] Pending + redirect

**Verification:**
- [ ] Manual: remix depuis FAC-155 ECOSOL
- [ ] Build OK

**Dependencies:** Task 8

**Files likely touched:**
- `src/app/(app)/suivi/factures/nouveau/**`
- `src/components/suivi/invoice-remix-form.tsx`
- `src/actions/suivi/invoices.ts`

**Estimated scope:** M

---

## Checkpoint: Clients/Factures (après Tasks 4–9)

- [ ] Impayés visibles et cohérents inventaire
- [ ] Remix E2E OK
- [ ] Review conflits `NEEDS_REVIEW`

---

## Task 10: Seed mouvements + registre

**Description:** Seed 34 mouvements OUT ; UI `/suivi/mouvements` registre + historique + solde + filtres. Libellés produit **Mouvements** (pas « caisse métier »).

**Acceptance criteria:**
- [ ] 34 refs MSK-yy… présentes
- [ ] Solde + historique consultables
- [ ] Lien texte client/projet conservé
- [ ] Aucune UI « gestion de caisse » / multi-caisses

**Verification:**
- [ ] Somme sorties ≈ 473 000 FCFA (inventaire)
- [ ] Build OK

**Dependencies:** Tasks 1, 3

**Files likely touched:**
- seed mouvements
- `src/app/(app)/suivi/mouvements/page.tsx`

**Estimated scope:** M

---

## Task 11: Saisie mouvement

**Description:** `/suivi/mouvements/nouveau` — IN/OUT, catégories (listes paramètres inventaire), pending, redirect registre.

**Acceptance criteria:**
- [ ] Create séparé
- [ ] Zod + modes paiement
- [ ] Direction IN autorisée (même si seed OUT only) — sans inventer de seed IN

**Verification:**
- [ ] Manual saisie
- [ ] Build OK

**Dependencies:** Task 10

**Files likely touched:**
- `src/app/(app)/suivi/mouvements/nouveau/page.tsx`
- `src/actions/suivi/movements.ts` (ou `cash.ts` technique)

**Estimated scope:** S–M

---

## Checkpoint: Mouvements (après Tasks 10–11)

- [ ] Question « mouvements / trésorerie tampon » répondue
- [ ] Build OK

---

## Task 12: Seed stocks + liste

**Description:** Seed 32 articles ; `/suivi/stocks` liste code/famille/qty/emplacement ; highlight qty 0.

**Acceptance criteria:**
- [ ] 32 codes inventaire
- [ ] Quantités = fichier (PAP-001=1, etc.)
- [ ] Pas de mapping achats inventé

**Verification:**
- [ ] Spot-check 5 codes
- [ ] Build OK

**Dependencies:** Tasks 1, 3

**Files likely touched:**
- seed stock
- `src/app/(app)/suivi/stocks/page.tsx`

**Estimated scope:** M

---

## Task 13: Mouvements stock

**Description:** `/suivi/stocks/mouvements/nouveau` — IN/OUT/ADJUST met à jour `quantity` transactionnellement.

**Acceptance criteria:**
- [ ] Qty ne passe pas négative sans confirm/blocage clair
- [ ] Historique consultable (fiche ou liste mouvements)
- [ ] Pending + redirect

**Verification:**
- [ ] Manual ajustement PAP-001
- [ ] Build OK

**Dependencies:** Task 12

**Files likely touched:**
- `src/app/(app)/suivi/stocks/mouvements/nouveau/page.tsx`
- `src/actions/suivi/stock.ts`

**Estimated scope:** M

---

## Checkpoint: Stocks (après Tasks 12–13)

- [ ] Les 3 questions direction couvertes
- [ ] Build OK

---

## Task 14: GED contrats + liens factures

**Description:** Créer dossiers GED clients Suivi ; déposer les 2 PDF contrats + lier factures seed via `DocumentLink` ; afficher sur fiche client.

**Acceptance criteria:**
- [ ] ECOSOL : contrat presta lié
- [ ] KOUNDJI : contrat engagement lié
- [ ] Factures seed : lien document si fichier source connu
- [ ] Pas d’éditeur juridique

**Verification:**
- [ ] Manual ouverture depuis fiche
- [ ] Build OK

**Dependencies:** Tasks 4, 6

**Files likely touched:**
- seed GED
- `src/lib/suivi/ged.ts`
- fiche client section docs

**Estimated scope:** M

---

## Task 15: Hub métriques + états UI

**Description:** Compléter hub : total impayés, solde mouvements, nb articles qty=0 ; empty/error states ; sous-nav.

**Acceptance criteria:**
- [ ] 3 métriques cliquables vers listes filtrées
- [ ] `error.tsx` / empty soignés
- [ ] UI never freeze respecté

**Verification:**
- [ ] Manual hub
- [ ] Build OK

**Dependencies:** Tasks 8, 10, 12

**Files likely touched:**
- `src/app/(app)/suivi/page.tsx`
- composants hub

**Estimated scope:** S–M

---

## Task 16: Guides + SUIVI-GUIDES.md

**Description:** Guide draft/to_validate parcours Suivi ; changelog inventaire dans `docs/guides/SUIVI-GUIDES.md`.

**Acceptance criteria:**
- [ ] Entrée changelog datée
- [ ] Pas de boutons inventés
- [ ] Statut guide honnête (`draft` / `to_validate`)

**Verification:**
- [ ] Relecture mentale « commercial suit le guide demain » → chemins existent
- [ ] Fichier suivi à jour

**Dependencies:** Tasks 9, 11, 13, 15

**Files likely touched:**
- `docs/guides/SUIVI-GUIDES.md`
- `src/lib/guides/**` si applicable

**Estimated scope:** S–M

---

## Task 17: Gate qualité & review

**Description:** `code-review-and-quality` axes utiles ; build/lint ; checklist SPEC success ; confirmer zéro data inventée.

**Acceptance criteria:**
- [ ] Critères SPEC cochés
- [ ] Build + lint OK
- [ ] Open questions restantes listées pour humain
- [ ] Pas de touche Auth password

**Verification:**
- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] Review humain gate

**Dependencies:** Tasks 1–16

**Files likely touched:** (review only / fixes mineurs)

**Estimated scope:** S

---

## Checkpoint: Complete

- [ ] SPEC acceptance OK
- [ ] Inventaire respecté
- [ ] Prêt review / push (sur demande humaine seulement)
