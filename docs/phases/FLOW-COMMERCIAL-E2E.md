# Flow commercial bout en bout — ce qu’on voit, dans quel ordre, qui voit quoi

> **Implémenté** sur `dev` / `main` (CRM + COM-4…7, 2026-10-12).  
> Vocabulaire : [`SPEC-CRM-MSK-COMPLET.md`](./SPEC-CRM-MSK-COMPLET.md) §1bis.  
> Plan global : [`PLAN-2-PHASES-COM-RH.md`](./PLAN-2-PHASES-COM-RH.md).

---

## 1. Sidebar

**Une seule entrée sidebar : Commercial** → hub **Menu** `/commercial`.

| Sidebar | Route hub | Qui la voit |
|---|---|---|
| **Commercial** | `/commercial` | `commercial`, `admin_crm`, Direction, Super Admin |
| Offres | tab / carte → `/catalogue` | + `com.catalogue.view` |
| Comptabilité | `/comptabilite` | Comptable / Direction — pas le suivi prospects |

### 1.1 Menu = hub par sections (proposition v2)

Menu `/commercial` (**pas** de tabs) :

1. CTAs **Nouveau prospect** / **Nouveau devis**  
2. **Pilotage** — Tableau de bord · Vue Équipe* · Rapport *(sans badges)*  
3. **Prospection** — Prospects · Relances · Scripts  
4. **Vente et facturation** — Offres · Devis · Factures · Clients  

Cartes blanches (`MetricNavCard`) : icône + titre/sous-titre alignés, flèche ; KPI en bas à droite (Relances / Factures une seule fois dans leur section).

### Tableau de bord `/crm`

Grille **Indicateurs** (3 ou 4 colonnes égales) — `MetricNavCard` + `HubMiniRadial` :

| Carte | Contenu | Lien |
|---|---|---|
| Sans devis *(si SLA)* | Intéressés > 24 h sans devis | `?devisRetard=1` |
| Ouverts | Dossiers hors Client / Perdu | `?stages=` ouverts |
| Intéressés | Statut Intéressé | `?stages=INTERESSE` |
| Relances | **À venir** + **en retard** (2 radiaux) | `/crm/relances` |

Puis :

- **Conversion prospects → clients** (`ConversionPipelineCard`) : Signé \| En cours — montants = `budgetXof` ; taux = clients ÷ dossiers visibles  
- **Répartition des prospects** : `STAGE_COLORS` distinctes ; légende + segments cliquables → `/crm/prospects?stages=…`  
- Priorités + **Objectifs semaine** (bandeau minimal → `/crm/objectifs`)  
- CTA header : **Nouveau prospect** (`ActionLink` + icône)

### Objectifs — droits & écrans

| Qui | Tableau de bord | `/crm/objectifs` | Vue Équipe | Rapport |
|---|---|---|---|---|
| Commercial | Ses 4 radiaux (lecture) | Ma semaine (lecture) — pas d’édition | Si `view_team` : collabs + objectifs (même radiaux) | Ses objectifs |
| Lead / Direction (`crm.reports.global`) | + « Assigner » | **Synthèse** · **Assignation globale** (`?vue=equipe`) · **Par collaborateur** (`?collab=`) | Filtre collaborateur · Objectifs → `?collab=` | Semaines (`?semaine=`) · **Toute l’équipe** / collab (`?owner=`) |

**Parcours Direction (libellés UI simples — jamais jargon)** :

1. `/crm/objectifs` — synthèse (ligne → par collaborateur) + CTA **Assignation globale**
2. `/crm/objectifs?vue=equipe` — **Assignation globale** (objectifs communs à l’équipe)
3. `/crm/objectifs?collab=<id>` — **Par collaborateur** (liens Vue Équipe / Rapport / Prospects)
4. Vue Équipe : clic nom → filtre collaborateur ; Objectifs → même personne

Pages réceptrices : bandeau **Focus collaborateur** quand un filtre est actif.

Cascade technique (jamais en UI) : USER > TEAM > défauts. Édition = Direction uniquement.  
**Interdit UI** : Portefeuille, pôle, TEAM/USER, focuser, « Paramétrer le pôle ».  
Statuts : **En qualification** ≠ **Devis envoyé**.  
Pending : `usePendingAction` / `useLinkStatus` / `GetFilterForm`.

Sous-pages — `commercialNavItems` (`src/lib/commercial/nav.ts`) :

`Menu` · `Tableau de bord` · `Prospects` · `Relances` · `Scripts` · `Vue Équipe`* · `Rapport` · `Clients` · `Devis` · `Factures` · `Offres`

\* **Vue Équipe** si `crmVisibility ≠ own`.

| Lien | Route | Intention |
|---|---|---|
| Menu | `/commercial` | Hub cartes + badges |
| Tableau de bord | `/crm` | Indicateurs live + graphs + urgences |
| Prospects | `/crm/prospects` | Liste paginée + recherche (`?q=` · `?page=`) · filtres `?stages=` |
| Relances | `/crm/relances` | File du jour / retards |
| Scripts | `/crm/scripts` | Messages à copier |
| Vue Équipe | `/crm/equipe` | Prospects / objectifs par collab (lead) |
| Rapport | `/crm/rapport-semaine` | Semaines (`?semaine=YYYY-MM-DD`) · Direction : `?owner=` ou toute l’équipe (défaut) |
| Clients / Devis / Factures | `/commercial/...` | Documentaire |
| Offres | `/catalogue` | Catalogue / planchers |

Création = pages `…/nouveau` dédiées.

### 1.2 Collab « own only »

Pas de Vue Équipe. En tête de **Prospects** : Prospects · Intéressés · Retards (radiaux).

---

## 2. Personas & droits

| Persona | Packs | Nav typique |
|---|---|---|
| Commercial | `commercial` | Menu…Rapport sans Vue Équipe ; KPI Prospects |
| Responsable | `admin_crm` / `crm.view_team` | + Vue Équipe, import, scripts |
| Direction | global | Tout + indicateurs |
| Comptable | `comptable` | Factures via Compta / À comptabiliser |
| Super Admin | — | Tout |

---

## 3. Flows métier

### 3.1 Matin commercial

```
Menu → Tableau de bord ou Prospects (KPI)
  → Relances → fiche → journal / statut / relance
  → Scripts si besoin
```

### 3.2 Intéressé → devis (COM-4/5)

```
Fiche (Intéressé) → « Client + devis »
  → Devis prérempli (offres liées)
  → Marquer envoyé → CRM « Devis envoyé »
  → (Accepté) → Facture → Paiement
```

SLA 24h : `interestedAt` · alerte bord → `/crm/prospects?devisRetard=1`.  
Plancher XOF : UI + serveur.

### 3.3 Facture → compta (COM-6)

```
Émettre → Générer PDF (GED, signature owner)
  → À comptabiliser → Proposer VE (411/706/4432) → Valider
```

Liste Factures : colonne **Compta** (À faire / Brouillon / Validée).

### 3.4 Lead / Direction

```
Tableau de bord → Vue Équipe → prospects du collaborateur
  → Rapport (filtres)
  → Hub Compta : KPI « Factures à comptabiliser »
```

---

## 4. Routes livrées

| Route | Écran |
|---|---|
| `/commercial` | Menu |
| `/crm` | Tableau de bord |
| `/crm/prospects` (`?q=` · `?page=` · `?stages=` · `?devisRetard=1`) | Prospects (liste paginée) |
| `/crm/prospects/nouveau` · `/[id]` · `/import` | Création / fiche / import |
| `/crm/relances` · `/scripts` · `/equipe` · `/rapport-semaine` · `/objectifs` | Suivi |
| `/commercial/clients` · `/devis` · `/factures` | Documentaire |
| `/catalogue` | Offres |
| `/comptabilite/a-comptabiliser` | File VE |

---

## 5. Suite

1. Retours terrain (polish).  
2. Optionnel : paiement → journal BQ.  
3. Phase RH — [`PLAN-2-PHASES-COM-RH.md`](./PLAN-2-PHASES-COM-RH.md) §3.

---

*Aligné implémentation 2026-10-13 (hub MetricNavCard + tableau de bord Indicateurs / Conversion / Répartition).*
