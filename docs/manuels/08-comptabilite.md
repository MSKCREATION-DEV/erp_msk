# 08 — Comptabilité SYSCOHADA

**Version** : 2026-10-12  
Public : **Comptable** · **Admin Compta** · **Direction** (lecture états / budget).  
Module : `/comptabilite` — devise légale **FCFA (XOF)**, plan **SYSCOHADA**.

## Qui voit quoi

| Pack | Accès typique |
|---|---|
| `comptable` | Saisie / validation, banques, états, fiscalité, budget lecture, **À comptabiliser** |
| `admin_compta` | + plan de comptes, clôture, budget saisie |
| `direction` | Module + états + budget lecture |
| `commercial` | Pas de module Compta (sauf ouverture fiche facture si droits mixtes) |

## Parcours clés

### 1. Plan de comptes

1. **Comptabilité → Plan de comptes**  
2. Filtrer (ex. `411`, `706`)  
3. Admin : **Nouveau compte**

### 2. Saisir une écriture équilibrée

1. **Écritures → Nouvelle écriture**  
2. Journal (OD, VE, BQ…)  
3. ≥ 2 lignes équilibrées → **Créer (brouillon)** → **Valider**

### 3. Lien Commercial → écriture VE (COM-6)

1. Hub Compta : KPI **Factures à comptabiliser**  
2. **À comptabiliser** — file des factures sans écriture  
   *ou* fiche facture Commercial (badge Compta)  
3. **Proposer l’écriture comptable**  
4. Brouillon journal **VE** : D **4111** (ML) / **4112** (FR) · C **706** · C **4432** (TVA)  
5. Facture **EUR** : conversion `EUR/XOF`  
6. Si déjà liée : bouton **Ouvrir l’écriture** (pas de double proposition)  
7. **Valider** après contrôle  

Section **Déjà liées** : liens facture + écriture + statut.

### 4. Banques ECOBANK + rapprochement

1. **Banques** → compte  
2. **Nouveau mouvement**  
3. Rapprocher à une écriture validée  

> Bridge automatique **paiement Commercial → écriture BQ** : non livré (saisie manuelle / OD).

### 5. États

Balance, Bilan, Compte de résultat, Grand livre — montants FCFA.

### 6. Budget & fiscalité

Budget Capex/Opex · TVA période · patente · taux EUR→XOF.

## Hors scope

- Paie → écritures PA auto  
- Stocks → écritures  
- Télédéclaration DGI  
- Paiement COM → BQ auto (optionnel)

## Changelog

| Date | Note |
|---|---|
| 2026-10-12 | COM-6 : liens facture↔écriture, revalidation file, KPI hub, gate comptes 4111/4112/706/4432 |
| 2026-10-10 | Phase 6 — hub, plan, écritures, banques, états, budget, fiscalité |
