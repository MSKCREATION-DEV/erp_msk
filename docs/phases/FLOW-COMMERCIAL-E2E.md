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

### 1.1 Menu = cartes ; sous-pages = tabs filtrées

Menu `/commercial` = grille de cartes (**pas** de tabs).

Sous-pages — `commercialNavItems` (`src/lib/commercial/nav.ts`) :

`Menu` · `Tableau de bord` · `Prospects` · `Relances` · `Scripts` · `Vue Équipe`* · `Rapport` · `Clients` · `Devis` · `Factures` · `Offres`

\* **Vue Équipe** si `crmVisibility ≠ own`.

| Lien | Route | Intention |
|---|---|---|
| Menu | `/commercial` | Hub cartes + badges |
| Tableau de bord | `/crm` | Indicateurs live + graphs + urgences |
| Prospects | `/crm/prospects` | Liste + Par étapes (`?vue=etapes`) |
| Relances | `/crm/relances` | File du jour / retards |
| Scripts | `/crm/scripts` | Messages à copier |
| Vue Équipe | `/crm/equipe` | Portefeuille par collab (lead) |
| Rapport | `/crm/rapport-semaine` | Chiffres auto + synthèse |
| Clients / Devis / Factures | `/commercial/...` | Documentaire |
| Offres | `/catalogue` | Catalogue / planchers |

Création = pages `…/nouveau` dédiées.

### 1.2 Collab « own only »

Pas de Vue Équipe. En tête de **Prospects** : Portefeuille · Intéressés · Retards (radiaux).

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
Tableau de bord → Vue Équipe → portefeuille collab
  → Rapport (filtres)
  → Hub Compta : KPI « Factures à comptabiliser »
```

---

## 4. Routes livrées

| Route | Écran |
|---|---|
| `/commercial` | Menu |
| `/crm` | Tableau de bord |
| `/crm/prospects` (+ `?vue=etapes`, `?devisRetard=1`) | Prospects |
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

*Aligné implémentation 2026-10-12.*
