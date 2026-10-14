# Manuel — CRM / Suivi commercial (prospects, relances, scripts)

**Version** : 2026-10-14 · LOT-I (En discussion)  
**Public** : Commerciaux, Admin CRM, Direction

## À retenir

**Lecture partagée / écriture affectée :** tous les commerciaux voient tous les prospects (anti-doublon). Journaliser, changer le statut ou éditer = réservé au **suivi** (ou Admin CRM / Direction via « Changer le suivi »).

**En discussion** (ex-« En qualification ») : échange en cours — besoin / budget / timing à clarifier ; pas encore prêt pour un devis.

Le suivi commercial vit sous l’entrée sidebar **Commercial** :

- **Menu** `/commercial` = hub cartes (`MetricNavCard`)  
- **Tableau de bord** `/crm` = Indicateurs + Conversion + Répartition  
- Tabs filtrées selon droits (pas de **Vue Équipe** pour un collab « own only »)

| Zone | Route | Notes |
|---|---|---|
| Menu | `/commercial` | Cartes modules |
| Tableau de bord | `/crm` | Indicateurs (Ouverts / Intéressés / Relances à venir+retard / Sans devis) · Conversion Signé\|En cours · Répartition cliquable · Objectifs |
| Prospects | `/crm/prospects` | Liste paginée · recherche · filtres URL `?stages=` |
| Relances | `/crm/relances` | Aujourd’hui / retard / semaine |
| Scripts | `/crm/scripts` | Copier messages |
| Vue Équipe | `/crm/equipe` | Prospects + objectifs semaine (si `view_team` / lead — pas « own only ») |
| Rapport | `/crm/rapport-semaine` | Par **semaine** (lundi–vendredi) · Direction : toute l’équipe ou un collaborateur |
| Objectifs | `/crm/objectifs` | Collab : lecture · Lead : **Assignation globale** ou **Par collaborateur** |

## Vocabulaire

| UI | Sens |
|---|---|
| **Suivi par** | Qui porte le dossier |
| **Créé par** | Qui a créé la fiche |
| **Statut** | 7 étapes LISTES — dont **En discussion** (échange) |
| **Résumé entreprise** | Contexte activité (pas le contact) |
| **Secteur** | Liste MSK + Autre (précision) |
| **Origine** | Source du contact |
| **Client** | Statut gagné (plus « Gagné ») |
| **Prospects** | Jamais « Portefeuille » |
| **Assignation globale** | Objectifs communs à l’équipe |
| **Par collaborateur** | Objectifs d’une personne |

## Cycle prospect

1. **Nouveau** `/crm/prospects/nouveau` (wizard)  
2. Enrichir fiche (contacts, offres, journal, relance) — **Modifier** via `/crm/prospects/[id]/edit`  
3. Relances + scripts  
4. Passage en **Contacté** : **canal + commentaire obligatoires** (comment on a contacté + ce qui a été dit, ou « pas de réponse ») → ligne créée dans le journal  
5. Dès **Intéressé** → **Transformer en client** (confirmation) → crée le client commercial **et** passe le statut CRM à **Client** ; bandeau + lien fiche client  
6. Devis gelés temporairement (Direction 13/10) — réouverture ultérieure depuis la fiche client  
7. Facturation côté Commercial quand devis/factures seront réouverts

## Collab sans Vue Équipe

En haut de Prospects : **Prospects** · **Intéressés** · **Retards** (radiaux).

## Packs

| Profil | Packs |
|---|---|
| Commercial terrain | `commercial` |
| Admin CRM / lead | + `admin_crm` (`crm.view_team`, import, scripts) |

## Changelog

| Date | Note |
|---|---|
| 2026-10-14 | LOT-I : En discussion + secteurs + résumé ; LOT-E lecture partagée ; LOT-D…B |
| 2026-10-13 | Objectifs : dashboard tous collabs, page admin assignation, Vue Équipe enrichie, rapport reflète cibles |
| 2026-10-13 | Tableau de bord : MetricNavCard, Conversion Signé/En cours, Répartition filtres URL |
| 2026-10-12 | Menu / Tableau de bord / Vue Équipe / Rapport ; client dès Intéressé ; SLA 24h |
| 2026-10-10 | Conversion CRM → Commercial (v1) |
