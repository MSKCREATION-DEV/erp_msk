# Manuel — CRM / Suivi commercial (prospects, relances, scripts)

**Version** : 2026-10-12 · Phase COM E2E  
**Public** : Commerciaux, Admin CRM, Direction

## À retenir

Le suivi commercial vit sous l’entrée sidebar **Commercial** :

- **Menu** `/commercial` = hub cartes  
- **Tableau de bord** `/crm` = indicateurs live  
- Tabs filtrées selon droits (pas de **Vue Équipe** pour un collab « own only »)

| Zone | Route | Notes |
|---|---|---|
| Menu | `/commercial` | Cartes modules |
| Tableau de bord | `/crm` | KPI, graphs, urgences (SLA devis 24h) |
| Prospects | `/crm/prospects` | Liste · Par étapes (`?vue=etapes`) · filtres |
| Relances | `/crm/relances` | Aujourd’hui / retard / semaine |
| Scripts | `/crm/scripts` | Copier messages |
| Vue Équipe | `/crm/equipe` | Lead / Direction seulement |
| Rapport | `/crm/rapport-semaine` | Chiffres auto + qualitatif |
| Objectifs | `/crm/objectifs` | Param. collab / équipe |

## Vocabulaire

| UI | Sens |
|---|---|
| **Suivi par** | Qui porte le dossier |
| **Créé par** | Qui a créé la fiche |
| **Statut** | 7 étapes LISTES (Négociation absente) |
| **Origine** | Source du contact |
| **Client** | Statut gagné (plus « Gagné ») |

## Cycle prospect

1. **Nouveau** `/crm/prospects/nouveau` (wizard)  
2. Enrichir fiche (contacts, offres, journal, relance)  
3. Relances + scripts  
4. Dès **Intéressé** → **Client + devis** (crée le client Commercial si besoin)  
5. Devis envoyé → statut CRM **Devis envoyé** automatiquement  
6. Accord → statut **Client** + facturation côté Commercial  

## Collab sans Vue Équipe

En haut de Prospects : **Portefeuille** · **Intéressés** · **Retards** (radiaux).

## Packs

| Profil | Packs |
|---|---|
| Commercial terrain | `commercial` |
| Admin CRM / lead | + `admin_crm` (`crm.view_team`, import, scripts) |

## Changelog

| Date | Note |
|---|---|
| 2026-10-12 | Menu / Tableau de bord / Vue Équipe / Rapport ; client dès Intéressé ; SLA 24h |
| 2026-10-10 | Conversion CRM → Commercial (v1) |
