# Tableau de bord Suivi — indicateurs retenus / exclus

**Date :** 2026-11-12  
**Route :** `/suivi/tableau-de-bord`  
**Objectif :** préparer le vote de budgets (dépenses jour / semaine / mois / année) + vision trésorerie complète.

**Langue UI :** français simple uniquement (pas d’anglais ni jargon : pas de run-rate, OPS, Hub, remix…).

---

## ASSUMPTIONS

1. Bascule comptes (décision I) **livrée** : physique **145 000** F · banque **204 815** F · **12/11/2026**. Soldes = `accountBalanceFromMoves` (ignore `countsTowardBalance=false`). Flux TB = mouvements **ledger courant** uniquement.
2. Pas de permission `sv.dashboard` dédiée : accès `sv.access` + sections gated par `sv.accounts.view` / `sv.movements.view` / `sv.invoices.view` / `sv.clients.view` / `sv.expenses.view`.
3. Menu `/suivi` reste l’accueil modules ; le TB est une page dédiée (nav « Tableau de bord »).
4. Mapping catégories au **runtime** (pas de migration des strings seed Excel) — incl. `Ouverture / Bascule Direction`.

---

## Indicateurs retenus (libellés UI)

| Libellé UI | Source | Pourquoi |
|-----|--------|----------|
| Solde compte physique | `sv_accounts` PHYSICAL + mouvements | Trésorerie caisse réelle (post-bascule) |
| Solde compte banque | idem BANK | Idem |
| Sorties | `sv_cash_movements` sorties hors transferts / hors ouverture | Conso budgétaire |
| Entrées | entrées hors transferts / hors ouverture | Encaissements / rentrées |
| Dépense / jour | sorties ÷ jours de la période | Rythme de dépenses |
| Estimation mensuelle (/ mois · / an) | dépense/jour × 30 / 365 | « Si on continue comme ça » — **pas un budget voté** |
| Répartition dépenses par famille | sorties groupées (mapping catégories) | Alimentation, transport, internet… |
| Factures clients — reste dû / ouvertes / encaissé période | `sv_invoices` + paiements | Dettes **clients** (encaisser) |
| Charges fournisseurs — à payer / non payées / payé période | `sv_expense_invoices` + `sv_expense_payments` | Dettes **entreprise** (Orange / EDM / loyer) |
| Répartition charges par type | reste dû groupé `ORANGE_INTERNET` / `EDM` / `LOYER` | Liens filtrés `/suivi/charges?impaye=1&type=` |
| À traiter / Alertes | charges en retard · bientôt dues (≤ 7 j) · dettes clients ≥ 100 kF | Zone unifiée urgente |
| Top débiteurs | clients avec `reste > 0` | Priorisation recouvrement |
| Comparatif période vs précédente | mêmes agrégats période précédente | Tendance sans sur-ingénierie |
| Série temporelle entrées / sorties | buckets jour ou semaine selon période | Graphique tendance |

## Indicateurs exclus (vanity / hors scope V1)

| Exclu | Pourquoi |
|-------|----------|
| Nombre de mouvements seul | Volume ≠ santé financière |
| Stocks à zéro sur le TB | Déjà menu ; pas trésorerie |
| Taux de conversion / pipeline | Domaine Commercial/CRM |
| Solde « mouvements globaux » sans compte | Trompeur si legacy `accountId` null + bascule |
| Projection ML / saisonnalité | Sur-ingénierie |
| Prévision de trésorerie multi-scénarios | V2 budgets |
| Ratio salaires / CA inventé | CA Suivi ≠ CA compta ; pas assez fiable |

---

## Filtres URL (shareable)

| Param | Valeurs | Défaut |
|-------|---------|--------|
| `periode` | `jour` · `semaine` · `mois` · `annee` | `mois` |
| `on` | `YYYY-MM-DD` | aujourd’hui (si jour) |
| `semaine` | lundi ISO | semaine courante |
| `mois` | `YYYY-MM` | mois courant |
| `annee` | `YYYY` | année courante |
| `compte` | `PHYSICAL` · `BANK` · omit = tous | tous |
| `categorie` | slug famille (ex. `transport`) | omit = toutes |

Barre filtres UI : segment Jour/Semaine/Mois/Année + stepper date (← → + choix calendrier) + menus Compte / Catégorie (« Tous » / « Toutes » en placeholder, pas de pastille trompeuse).

Liens listes : `/suivi/mouvements?direction=&from=&to=&compte=&categorie=` · `/suivi/factures?reste=1` · `/suivi/charges?impaye=1` · `/suivi/charges?impaye=1&echeance=retard|bientot` · `/suivi/comptes` · `/suivi/clients`.

**Différenciation UI :** carte **Factures clients** (anneau bleu) ≠ carte **Charges fournisseurs** (anneau encre) — libellés et liens distincts, pas de KPI fusionné.

---

## Graphiques livrés

1. **Aire** — entrées / sorties sur la période (buckets)
2. **Donut** — dépenses mouvements par famille (cliquable → mouvements filtrés) — distinct des charges fournisseurs
3. **Barres** comparatif — période courante vs précédente (entrées / sorties)
4. **Cartes** — soldes comptes + estimation mensuelle + factures clients + charges + alertes

Lib : **recharts** + `ChartContainer` (déjà CRM / Commercial).
