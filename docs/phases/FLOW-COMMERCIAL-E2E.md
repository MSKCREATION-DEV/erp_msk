# Flow commercial bout en bout — ce qu’on voit, dans quel ordre, qui voit quoi

> Cible UX de la **Phase COMMERCIAL complète** — **implémenté** sur `dev` (GO CRM + UX).  
> Vocabulaire : [`SPEC-CRM-MSK-COMPLET.md`](./SPEC-CRM-MSK-COMPLET.md) §1bis.  
> Droits packs : `commercial` · `admin_crm` · Direction / Super Admin · `comptable`.

---

## 1. Sidebar

**Une seule entrée sidebar : Commercial** → hub **Menu** `/commercial`.

| Sidebar | Route hub | Qui la voit |
|---|---|---|
| **Commercial** | `/commercial` | Packs `commercial`, `admin_crm`, Direction, Super Admin (+ `crm.access` / `com.access`) |
| Offres | via carte / tab **Offres** (`/catalogue`) | idem + `com.catalogue.view` |
| Comptabilité | `/comptabilite` | Comptable / Direction — pièces, pas le suivi prospects |

### 1.1 Menu = grille de cartes ; sous-pages = tabs filtrées

Clic sidebar **Commercial** → **Menu** `/commercial` (cartes, **pas** de tabs).

Sur les sous-pages, sous-nav (`commercialNavItems`) :

`Menu` · `Tableau de bord` · `Prospects` · `Relances` · `Scripts` · `Vue Équipe`* · `Rapport` · `Clients` · `Devis` · `Factures` · `Offres`

\* **Vue Équipe** uniquement si visibilité CRM ≠ `own` (`crm.view_team` / `crm.reports.global` / Super Admin).

| Lien | Route | Intention |
|---|---|---|
| **Menu** | `/commercial` | Hub cartes (indicateurs badges) |
| **Tableau de bord** | `/crm` | Indicateurs live + graphs + urgences |
| Prospects | `/crm/prospects` | Liste + vue **Par étapes** (`?vue=etapes`) |
| Relances | `/crm/relances` | File du jour / retards |
| Scripts | `/crm/scripts` | Messages à copier |
| Vue Équipe | `/crm/equipe` | Portefeuille par collab — **lead / Direction** |
| Rapport | `/crm/rapport-semaine` | Chiffres auto + synthèse (pas saisie manuelle des KPI) |
| Clients / Devis / Factures | `/commercial/...` | Chaîne documentaire |
| Offres | `/catalogue` | Catalogue / prix |

Création = pages dédiées (`…/nouveau`), jamais formulaire collé à la liste.

### 1.2 Collab « own only » (sans Vue Équipe)

Pas de tab / carte **Vue Équipe**. En haut de **Prospects** : 3 KPI radiaux personnels —

- **Portefeuille** (dossiers suivis)  
- **Intéressés** (à convertir)  
- **Retards** (relances dues)

---

## 2. Qui est qui (personas MSK)

| Persona | Exemples | Pack / droits cibles |
|---|---|---|
| **Commercial** | Madina, Fatoumata, Yaye… | Pack `commercial` ; scope souvent **own** → KPI sur Prospects, pas Vue Équipe |
| **Responsable** (pôle) | Mathieu | `admin_crm` / `crm.view_team` : Vue Équipe, import, scripts, changer Suivi par |
| **Direction** | Mathieu / Andile | Indicateurs live + global |
| **Comptable** | — | Pas le suivi prospects ; factures via Compta |
| **Super Admin** | Samba | Tout |

### 2.1 Matrice « qui voit quoi » (sous-nav)

| Écran | Commercial (own) | Resp. / team | Direction | Comptable |
|---|---|---|---|---|
| Menu | Oui (sans carte Vue Équipe) | Oui | Oui | Non (ou Compta) |
| Tableau de bord | Oui (son périmètre) | Oui | Oui global | Non |
| Prospects / Relances | Son portefeuille + KPI radiaux | Équipe | Global | Non |
| Scripts | Voir + copier | + gérer | + gérer | Non |
| Vue Équipe | **Non** | Oui | Oui | Non |
| Rapport | Le sien | Tous / filtre | Tous | Non |
| Clients / Devis / Factures | Selon `com.*` | Oui | Oui | Via **Comptabilité** |
| Offres | Voir | + gérer prix / plancher | + gérer | Non |
| Import | Non | Oui | Oui | Non |

---

## 3. Flow du matin — Commercial (ex. Madina)

```
Connexion
  → Sidebar « Commercial »
  → Menu (cartes) ou tab Tableau de bord
  → Prospects (KPI Portefeuille / Intéressés / Retards en tête)
  → Relances → fiche → journal / statut / relance
  → Scripts si besoin
```

---

## 4. Flow lead / Direction

```
Menu → Tableau de bord (vue large)
  → Vue Équipe → carte collab → Voir le portefeuille
  → Rapport (filtres collab / période)
```

---

## 5. Suivi instantané + rapport

**Tableau de bord & Vue Équipe = temps réel** à chaque ouverture.  
**Rapport** = chiffres auto depuis le CRM + zones qualitatives (vendredi), pas la source des KPI live.

---

## 6. Routes livrées (réel)

| Route | Écran |
|---|---|
| `/commercial` | Menu (hub cartes) |
| `/crm` | Tableau de bord |
| `/crm/prospects` | Liste (+ `?vue=etapes`) |
| `/crm/prospects/nouveau` · `/[id]` · `/import` | Création / fiche / import |
| `/crm/relances` · `/crm/scripts` | Relances · Scripts |
| `/crm/equipe` | Vue Équipe (redirect Prospects si `own`) |
| `/crm/rapport-semaine` | Rapport |
| `/crm/objectifs` | Objectifs (admin) |
| `/commercial/clients|devis|factures` | Documentaire |
| `/catalogue` | Offres |

Code : `src/lib/commercial/nav.ts` · `modules.ts` · `CommercialShell`.

---

## 7. Suite

1. Parcours hub carte par carte avec le terrain.  
2. Durcir COM-5 plancher / COM-6–7 finance si besoin.  
3. Gate [`REGLES-EVOLUTION-CRM.md`](./REGLES-EVOLUTION-CRM.md) §6.

---

*Document de parcours — aligné implémentation 2026-10-12.*
