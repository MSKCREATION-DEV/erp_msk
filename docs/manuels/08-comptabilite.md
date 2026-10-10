# 08 — Comptabilité SYSCOHADA

Public : **Comptable** · **Admin Compta** · **Direction** (lecture états / budget).  
Module : `/comptabilite` — devise légale **FCFA (XOF)**, plan **SYSCOHADA**.

## Qui voit quoi

| Pack | Accès typique |
|---|---|
| `comptable` | Saisie / validation écritures, banques, rapprochement, états, fiscalité assistée, budget lecture |
| `admin_compta` | + plan de comptes, clôture, budget saisie |
| `direction` | Accès module + états + budget lecture |
| `commercial` | **Pas** de Comptabilité (proposition écriture = rôle compta) |

## Parcours clés (manuel = gate humaine)

### 1. Plan de comptes

1. Nav **Comptabilité** → **Plan de comptes**
2. Filtrer (ex. `411` ou `706`)
3. Admin Compta : **Nouveau compte** (`/comptabilite/plan/nouveau`)

### 2. Saisir une écriture équilibrée

1. **Écritures** → **Nouvelle écriture**
2. Choisir journal (**OD**, **VE**, **BQ**…)
3. Remplir ≥ 2 lignes : un débit **ou** un crédit par ligne
4. L’indicateur passe vert « Équilibrée » → **Créer (brouillon)**
5. Sur la fiche → **Valider** (verrouille la pièce)

### 3. Lien Commercial → écriture VE

1. **Comptabilité → À comptabiliser** (file des factures sans écriture)  
   *ou* fiche facture Commercial (si droits COM + CPT)
2. Bouton **Proposer l’écriture comptable** (`cpt.ecritures.manage`)
3. Brouillon journal **VE** : D clients (4111/4112) / C 706 / C 4432 TVA
4. Si facture **EUR** : conversion via taux `EUR/XOF` (Fiscalité)
5. Valider l’écriture après contrôle

### 4. Banques ECOBANK + rapprochement

1. **Banques** → Compte 1 ou 2
2. **Nouveau mouvement** (crédit = encaissement, débit = décaissement : montant signé)
3. Sur la fiche compte : associer le mouvement à une **écriture validée** (rapprochement)

### 5. États (Bilan / CR)

1. **États** : Balance, Bilan simplifié, Compte de résultat
2. **Grand livre** : détail par compte / période
3. Montants en FCFA

### 6. Budget & fiscalité assistée

- **Budget** : lignes Capex/Opex par mois (saisie = `bud.manage`)
- **Fiscalité** : TVA collectée / déductible / nette période ; échéance **patente** ; taux **EUR→XOF**

## Hors scope (rappel)

- Paie → écritures PA automatiques : Phase 5  
- Stocks / achats → écritures : Phase 7  
- Télédéclaration DGI : Phase 8+

## Changelog

| Date | Note |
|---|---|
| 2026-10-10 | Création Phase 6 — hub, plan, écritures, banques, états, budget, fiscalité |
