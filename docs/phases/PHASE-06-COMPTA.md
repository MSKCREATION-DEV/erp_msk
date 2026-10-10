# Phase 6 — Comptabilité SYSCOHADA + banques + budget — **URGENT**

> Plan de phase dédié.  
> Prérequis : **Phase 3 OK** (2026-10-10).  
> Branche de travail : **`dev`**.  
> Priorité : cash / finance — [PRIORITES.md](./PRIORITES.md).  
> CDC : §9 Comptabilité + permissions `cpt.*` / `bud.*`.

## Statut

| Étape | État |
|---|---|
| Plan rédigé | Oui — 2026-10-10 |
| Validation « Phase 6 GO » | — attendre validation humaine |
| Implémentation | — |
| Gate technique | — |
| Gate Phase 6 OK (humaine) | — |

## Règle de gate

1. Plan validé (« Phase 6 GO ») ← **attendre validation humaine**  
2. Implémentation complète de **ce** plan seulement  
3. Tests / vérifications (`build`, lint, gate, smoke UI)  
4. Validation « Phase 6 OK »  
5. Ensuite → Phase 4 RH **ou** 7 stocks selon besoin terrain (PRIORITES cash déjà couvert)

## Objectif

Passer des **paiements Commercial** à une **comptabilité formalisée** MSK :

```
Facture payée / émise → écritures SYSCOHADA (FCFA)
                     → journaux · GL · états
                     → banques ECOBANK · rapprochement
                     → budget / TVA / patente (assisté)
```

Le comptable (Issiaka) peut saisir / valider des écritures, rattacher les pièces GED, suivre les comptes bancaires, produire bilans / CR de base — sans Excel hors ERP.

## Hors scope (strict — Phase 6.x / 7+)

| Reporté | Phase cible |
|---|---|
| Paie / écritures PA automatiques complètes | Phase 5 |
| Stocks / achats → écritures | Phase 7 |
| Export DGI enrichi / digests Direction | Phase 8 |
| Multi-entité / multi-tenant | hors produit actuel |
| PSP / prélèvement bancaire auto | 6.x+ |

## Décisions verrouillées (MVP Phase 6)

| Sujet | Valeur |
|---|---|
| Référentiel | **SYSCOHADA** (plan de comptes OHADA paramétrable) |
| Devise comptable | **FCFA (XOF)** — conversion ventes EUR→FCFA (taux jour ou fixe saisi) |
| Lien Commercial | Factures / paiements Phase 3 → proposition d’écritures (validation humaine) |
| Banques | Comptes ECOBANK (2) + rapprochement manuel assisté |
| Budget | Suivi budgétaire de base (lecture + saisie lignes) |
| Fiscal | Assisté TVA / patente (paramètres CFG) — pas de télédéclaration auto |
| UI | list/create séparés · `loading.tsx` · pending · charte MSK |
| Permissions | Packs `comptable` / `admin_compta` / `direction` (`cpt.*`, `bud.*`) |
| GED | Pièces sous arbo Comptabilité (déjà scoped pour packs browse) |

## Livrables (checklist — à cocher à l’implémentation)

### Données
- [ ] Plan de comptes OHADA (seed + CRUD admin)
- [ ] Journaux (VE, OD, BQ, …) + pièces / lignes
- [ ] Exercice / période + statut brouillon / validé / clôturé (MVP)
- [ ] Comptes bancaires + mouvements
- [ ] Lien optionnel `ComInvoice` / `ComPayment` → écriture
- [ ] Paramètres taux de change EUR→XOF

### UI Comptabilité
- [ ] Hub `/comptabilite`
- [ ] Plan de comptes, journaux, saisie écriture, GL, états (bilan / CR simplifiés)
- [ ] Banques + rapprochement
- [ ] Budget (liste + saisie)

### Nav / RBAC / UX
- [ ] Nav Comptabilité (plus « bientôt »)
- [ ] Permissions `cpt.*` / `bud.*` branchées UI + actions
- [ ] `loading.tsx` / pending / list-create / backHref
- [ ] `gate:phase6` + smoke UI parcours clés
- [ ] Manuel [docs/manuels/08-comptabilite.md](../manuels/08-comptabilite.md) (à créer à l’implémentation)

## Gate humaine (après implémentation)

| # | Parcours | Critère |
|---|---|---|
| 1 | Plan | Consulter / filtrer un compte OHADA |
| 2 | Écriture | Saisir une OD / VE → lignes équilibrées |
| 3 | Lien COM | Depuis facture payée → proposition écriture validable |
| 4 | Banque | Mouvement + rapprochement simple |
| 5 | États | Bilan / CR période OK en FCFA |
| 6 | Droits | Comptable ≠ commercial sur CPT ; Direction lecture élargie |

## Critères d’acceptation

Le comptable tient un journal SYSCOHADA en FCFA, rattache les ventes Commercial, suit les banques ECOBANK et produit des états de base. Pas de paie (P5), pas de stocks (P7).

## Après gate technique

Répondre : **« Phase 6 OK »** → suite PRIORITES (RH ou stocks).

---

## Validation historique

- Plan ouvert — 2026-10-10 (après Phase 3 OK + manuels).
