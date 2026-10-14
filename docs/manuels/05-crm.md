# Manuel — CRM / Suivi commercial (prospects, relances, scripts)

**Version** : 2026-10-14 · LOT-G (compteur relances)  
**Public** : Commerciaux, Admin CRM, Direction

## À retenir

**Lecture partagée / écriture affectée :** tous les commerciaux voient tous les prospects (anti-doublon). Journaliser, changer le statut ou éditer = réservé au **suivi**. Sinon : **Demander le suivi** sur la fiche → traité dans **Affectations** (Direction / Admin CRM). Les **Clients** n’apparaissent jamais dans le listing Prospects.

**En discussion** (ex-« En qualification ») : échange en cours — besoin / budget / timing à clarifier ; pas encore prêt pour un devis.

**Création :** contrôle doublons (nom exact → ouvrir fiche existante ; nom proche → alerte + continuer) · multi-moyens de contact · réseaux sociaux entreprise optionnels.

**Relancé N× :** historique des actions de suivi (appel, WhatsApp, e-mail, RDV… — pas les notes). Visible sur dashboard, liste, fiche, relances et Vue Équipe. **Perdu** exige au moins **3** de ces relances.

Le suivi commercial vit sous l’entrée sidebar **Commercial** :

- **Menu** `/commercial` = hub cartes (`MetricNavCard`)  
- **Tableau de bord** `/crm` = Indicateurs + Conversion + Répartition  
- Tabs filtrées selon droits (pas de **Vue Équipe** pour un collab « own only »)

| Zone | Route | Notes |
|---|---|---|
| Menu | `/commercial` | Cartes modules |
| Tableau de bord | `/crm` | Indicateurs (Ouverts / Intéressés / Relancés 3×+ / Relances à venir+retard / Sans devis) · Conversion Signé\|En cours · Répartition · Objectifs |
| Prospects | `/crm/prospects` | Liste · badge Relancé N× · filtres `?stages=` · `?relancesMin=3` |
| Relances | `/crm/relances` | Aujourd’hui / retard / semaine · badge N× |
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
| 2026-10-14 | LOT-G Relancé N× partout + GUIDE Perdu ; LOT-F doublons ; LOT-I En discussion ; LOT-E…B |
| 2026-10-13 | Objectifs : dashboard tous collabs, page admin assignation, Vue Équipe enrichie, rapport reflète cibles |
| 2026-10-13 | Tableau de bord : MetricNavCard, Conversion Signé/En cours, Répartition filtres URL |
| 2026-10-12 | Menu / Tableau de bord / Vue Équipe / Rapport ; client dès Intéressé ; SLA 24h |
| 2026-10-10 | Conversion CRM → Commercial (v1) |
