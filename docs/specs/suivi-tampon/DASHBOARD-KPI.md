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
| Charges à traiter | charges en retard · bientôt dues (≤ 7 j) | Panneau **séparé** (pas mélangé aux clients) |
| Dettes clients à traiter | dettes clients ≥ 100 kF | Panneau **séparé** (pas mélangé aux charges) |
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
| **Solde brut Entrées−Sorties sur tout le registre** (liste `/suivi/mouvements`) | Mélange archive pré-bascule + ouverture + ops → chiffres trompeurs (ex. Solde −123 185) |

---

## Mouvements liste — KPI (2026-11-13)

Route : `/suivi/mouvements`.

| Libellé UI | Source | Pourquoi |
|------------|--------|----------|
| Sorties d’activité | `sumFlows` sur filtre + `countsTowardBalance=true` | Dépenses du filtre, hors archive / ouverture / transferts |
| Entrées d’activité | idem | Encaissements / rentrées du filtre |
| Net activité | `inOps − outOps` | Explicitement « activité », pas le cash en caisse ; négatif = plus de sorties |
| Solde physique / banque | `accountBalanceFromMoves` (ledger courant) | Cash réel, **indépendant** du filtre liste (masqué si filtre `compte`) |

Aide UI courte sous les cartes. Aligné sur les flux TB (même `sumFlows`).

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

Liens listes : `/suivi/mouvements?direction=&from=&to=&compte=&categorie=` · `/suivi/factures?reste=1` · `/suivi/charges?impaye=1` · `/suivi/charges?impaye=1&type=…` · `/suivi/charges?echeance=retard|bientot` · `/suivi/comptes` · `/suivi/clients`.

**Différenciation UI (absolu, comme Commercial) :**  
- Sections TB séparées : **Comptes** · **Trésorerie** · **Factures clients** · **Charges fournisseurs** — jamais un KPI hybride « Impayés clients / charges ».  
- Hub `/suivi` : sections Pilotage / Clients et encaissements / Charges et trésorerie / Stocks ; KPI **par carte module** (pas de bandeau fusionné).  
- Alertes : deux panneaux (**Charges à traiter** ≠ **Dettes clients à traiter**).

### Alertes

| Type | Critère | Sévérité | Panneau |
|------|---------|----------|---------|
| Charge en retard | ouvert + reste > 0 + échéance passée | urgent | Charges à traiter |
| Charge bientôt due | idem + échéance ≤ **7 jours** | attention | Charges à traiter |
| Dette client critique | reste ≥ **100 000** F (≥ 500 k = urgent) | attention / urgent | Dettes clients à traiter |

Libellé alerte charge : **« Échéance le JJ/MM/AAAA · X jours de retard »** (ou « dans X jours »).  
Carte Charges : pastilles **En retard** / **Bientôt dues** → `/suivi/charges?echeance=retard|bientot`.  
Liste Charges : colonne **Échéance** + badge Retard/Bientôt.  
Timezone dates : **UTC** (= Bamako UTC+0).  
Factures clients : alerte par **solde**, pas par `dueAt` (champ seed existant, non exposé en alerte échéance V1).

Liens directs vers fiche charge / client. FR simple uniquement.

---

## Graphiques livrés

1. **Aire** — entrées / sorties sur la période (buckets)
2. **Donut** — dépenses caisse par famille (cliquable → mouvements filtrés) — **≠** répartition charges fournisseurs
3. **Barres** comparatif — période courante vs précédente (entrées / sorties)
4. **Cartes KPI par section** — soldes comptes · flux trésorerie · factures clients (grille 4) · charges fournisseurs (grille 4) · alertes séparées

Lib : **recharts** + `ChartContainer` (déjà CRM / Commercial).
