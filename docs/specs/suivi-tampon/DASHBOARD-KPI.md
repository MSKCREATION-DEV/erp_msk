# Tableau de bord Suivi — KPI retenus / exclus

**Date :** 2026-11-12  
**Route :** `/suivi/tableau-de-bord`  
**Objectif :** préparer le vote de budgets (conso jour / semaine / mois / année) + vision trésorerie complète.

---

## ASSUMPTIONS

1. Bascule comptes (décision I) **livrée** : physique **145 000** F · banque **204 815** F · **12/11/2026**. Soldes = `accountBalanceFromMoves` (ignore `countsTowardBalance=false`). Flux TB = mouvements **ledger courant** uniquement.
2. Pas de permission `sv.dashboard` dédiée : accès `sv.access` + sections gated par `sv.accounts.view` / `sv.movements.view` / `sv.invoices.view` / `sv.clients.view`.
3. Hub `/suivi` reste le menu modules ; le TB est une page dédiée (nav « Tableau de bord »).
4. Mapping catégories au **runtime** (pas de migration des strings seed Excel) — incl. `Ouverture / Bascule Direction`.

---

## KPI retenus

| KPI | Source | Pourquoi |
|-----|--------|----------|
| Solde compte physique | `sv_accounts` PHYSICAL + mouvements | Trésorerie cash réelle (post-bascule) |
| Solde compte banque | idem BANK | Idem |
| Sorties période (OUT ops) | `sv_cash_movements` OUT hors transferts / hors ouverture | Conso budgétaire |
| Entrées période (IN ops) | IN hors transferts / hors ouverture | Encaissements / rentrées |
| Répartition dépenses par famille | OUT groupé (mapping catégories) | Alimentation, transport, internet… |
| Facturé période / payé / reste dû | `sv_invoices` + `amountPaid` | Dettes clients |
| Top débiteurs | clients avec `reste > 0` | Priorisation recouvrement |
| Run-rate mois & année (estimation) | OUT ops / jours × projection | Aide vote budget — **libellé « estimation »** |
| Comparatif période N vs N−1 | mêmes agrégats période précédente | Tendance sans sur-ingénierie |
| Série temporelle IN/OUT | buckets jour ou semaine selon période | Graphique tendance |

## KPI exclus (vanity / hors scope V1)

| Exclu | Pourquoi |
|-------|----------|
| Nombre de mouvements seul | Volume ≠ santé financière |
| Stocks à zéro sur le TB | Déjà hub ; pas trésorerie |
| Taux de conversion / pipeline | Domaine Commercial/CRM |
| Solde « mouvements globaux » sans compte | Trompeur si legacy `accountId` null + bascule |
| Projection ML / saisonnalité | Sur-ingénierie |
| Cash-flow forecast multi-scénarios | V2 budgets |
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

Liens listes : `/suivi/mouvements?direction=&from=&to=&compte=&categorie=` · `/suivi/factures?reste=1` · `/suivi/comptes` · `/suivi/clients`.

---

## Charts livrés

1. **Area** — entrées / sorties sur la période (buckets)
2. **Donut** — dépenses par famille (cliquable → mouvements filtrés)
3. **Bar** comparatif — période courante vs précédente (IN / OUT)
4. **KPI cards** — soldes comptes + run-rate

Lib : **recharts** + `ChartContainer` (déjà CRM / Commercial).
