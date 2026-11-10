# Implementation Plan: Module Suivi (tampon)

## Overview

Livrer le module ERP temporaire **Suivi** (`/suivi`) : clients/factures avec remix, **mouvements** (registre + historique, pas caisse métier), stocks — data seedée depuis l’inventaire + [`DECISIONS-SEED.md`](../../docs/specs/suivi-tampon/DECISIONS-SEED.md) uniquement, tables `sv_*` isolées, accès direction/admin uniquement. **Pas d’implémentation dans le lot spec/décisions actuel** ; ce plan guide les lots suivants.

**Sources :**

- Intent : `docs/intent/module-suivi-tampon.md`
- Spec : `docs/specs/suivi-tampon/SPEC.md`
- Inventaire : `docs/specs/suivi-tampon/INVENTAIRE-DOCUMENTS.md`
- Décisions seed : `docs/specs/suivi-tampon/DECISIONS-SEED.md`
- Patterns UX : `src/app/(app)/commercial/**`

**Conflit tasks :** le dossier `tasks/` n’existait pas (pas de `plan.md`/`todo.md` avec tâches ouvertes d’un autre sujet). Plan dédié sous `tasks/suivi-tampon/` pour éviter tout écrasement futur.

## Architecture Decisions

| Décision | Rationale |
|----------|-----------|
| Nom **Suivi**, route `/suivi`, préfixe `sv_` | Aligné docs Excel ; isolé de `com_` / `cpt_` |
| Pas de FK vers Commercial/Compta | Constraint tampon ; migration future manuelle |
| GED via `DocumentLink` existant | Pas de 2ᵉ GED |
| Seed inventaire + DECISIONS-SEED + flags `NEEDS_REVIEW` | Priorité fichier facture ; devis exclus ; Prosperity 122 seul |
| UI **Mouvements** (table tech `sv_cash_movements` OK) | Décision C : pas de caisse métier |
| Hub + list-create + FormSteps remix | Règles MSK + ref Commercial |
| Packs Admin/Direction seulement | User confirmé : pas commercial terrain |

## Task List (index)

### Phase 1 — Fondation (`sv-foundation`)

- [x] Task 1: Schema Prisma `sv_*` + migration RLS (`20261110110000_sv_suivi_tampon`)
- [x] Task 2: Catalogue permissions `sv.*` + attribution packs (`direction`, `admin_plateforme`)
- [x] Task 3: Nav sidebar + shell routes `/suivi` + hub skeleton (cards : Clients · Factures · Mouvements · Stocks)

### Checkpoint: Fondation

- [x] Build OK ; tables RLS on ; hub + placeholders sous-routes (2026-11-10)

### Phase 2 — Clients & factures (`sv-clients-invoices`)

- [x] Task 4: Seed clients (6) + factures/paiements selon DECISIONS-SEED (pas devis-only, pas FAC-143)
- [x] Task 5: Liste clients cliquable + KPI colonnes
- [x] Task 6: Fiche client (soldes + listes factures)
- [x] Task 7: CRUD client `/nouveau` + edit
- [x] Task 8: Liste factures + fiche + paiement modal
- [x] Task 9: Remix facture (FormSteps)

### Checkpoint: Clients/Factures

- [x] Seed 6 clients / 11 factures ; UI livrée ; build OK (2026-11-10)

### Phase 3 — Mouvements (`sv-movements`)

- [x] Task 10: Seed 34 mouvements OUT + registre UI `/suivi/mouvements` + historique
- [x] Task 11: Saisie mouvement (IN/OUT) — libellés « Mouvements », pas « caisse »

### Checkpoint: Mouvements

- [x] 34 OUT seedés ; registre + solde ; saisie IN/OUT

### Phase 4 — Stocks (`sv-stock`)

- [x] Task 12: Seed articles inventaire + liste stocks
- [x] Task 13: Mouvements stock

### Checkpoint: Stocks

- [x] Liste + fiche + mouvements ; 3 questions direction couvertes en UI

### Phase 5 — GED contrats & polish

- [ ] Task 14: Dossiers GED + liens contrats/factures seed — **meta contrats seedés** ; dépôt GED fichiers reporté (gitignore `docs/CONTRAT*` / `FACTURE*`)
- [x] Task 15: Hub métriques finales + empty/error/loading
- [x] Task 16: Guides + `SUIVI-GUIDES.md` (changelog draft)
- [x] Task 17: Gate build / typecheck OK

### Checkpoint: Complete

- [x] V1 fonctionnelle hors upload GED binaire ; review humain + push restante

## Parallelization

| Après Task 3 | Parallelisable |
|--------------|----------------|
| Seed domaines | Task 4 puis 10/12 peuvent se préparer en parallèle de UI 5–7 |
| UI mouvements vs stocks | Tasks 10–11 ∥ 12–13 après fondation + clients min si liens optionnels |

**Séquentiel strict :** 1 → 2 → 3 ; 9 après 6+8 ; 14 après 4+6.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Conflits Excel↔PDF (ECOSOL, KOUNDJI, Prosperity) | High | **Tranchés** dans DECISIONS-SEED + flags `NEEDS_REVIEW` restants (KOUNDJI overlap) |
| Décimales ISDALINIA | Med | Arrondi somme-conservant documenté |
| Mouvements sans entrées documentées | Med | Seed OUT only ; IN = saisie libre UI (pas d’invention) |
| Confusion avec Commercial clients | Med | Libellés « Suivi · tampon » ; zéro sync |
| Scope creep GED juridique / caisse métier / devis | High | Hors scope strict (décisions B/C) |
| Seed invente par accident | High | Checklist inventaire + DECISIONS-SEED ; review diff seed |

## Clarifications closes (Étape 0)

Voir SPEC § Clarifications closes + [`DECISIONS-SEED.md`](../../docs/specs/suivi-tampon/DECISIONS-SEED.md).

- KOUNDJI : seed exact 114 / 2710261 / 167 + flags review — **pas bloquant**
- Contrat ECOSOL : monthlyAmount **200 000**
- Miroir paiement → IN : **décision E**
- **Zéro question bloquante** seed/spec

## Definition of Done (phase gate)

- Acceptance criteria tâches cochés
- `npm run build` + lint OK
- Aucune data inventée
- Auth MDP non touché
- Guides suivi à jour si applicable
