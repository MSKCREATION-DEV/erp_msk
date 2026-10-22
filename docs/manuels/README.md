# Manuels d’utilisation ERP MSK

Documentation **vivante** pour l’équipe (commerciaux, finance, admin, direction).  
À **mettre à jour à chaque évolution** de module — même règle que le code : pas de dette volontaire.

**Centre de guides in-app** : `/guides` · suivi obligatoire [`docs/guides/SUIVI-GUIDES.md`](../guides/SUIVI-GUIDES.md) · règle Cursor `guides-suivi.mdc`.  
Les manuels MD restent la référence technique détaillée ; le centre app expose les procédures UX structurées.

## Comment maintenir

| Quand | Action |
|---|---|
| Nouveau parcours UI | Ajouter / mettre à jour la section du manuel concerné |
| Nouveau droit `*.*` | Mettre à jour [01-iam-droits.md](./01-iam-droits.md) + tableau « qui voit quoi » |
| Changement GED / scope | Mettre à jour [02-ged.md](./02-ged.md) |
| Gate de phase OK | Ajouter une ligne au changelog en bas de chaque fichier touché |

**Convention** : une intention = une page produit. Les manuels décrivent le **parcours réel**, pas la théorie CDC.

## Index

| Manuel | Module | Public |
|---|---|---|
| [01 — IAM & droits](./01-iam-droits.md) | Groupes, packs, overrides, invitation | Admin plateforme / Direction |
| [02 — GED](./02-ged.md) | Dossiers, dépôt, scope `view_scoped` / `browse` | Tous + Admin |
| [03 — Organisation](./03-organisation.md) | Structure, rattachements | Direction / Admin |
| [04 — Offres / Catalogue](./04-catalogue.md) | Offres, tarifs, planchers | Lecture : commercial · Édition : Admin CRM |
| [05 — CRM / Suivi](./05-crm.md) | Menu, bord, prospects, équipe, rapport | Commerciaux / Admin CRM |
| [06 — Commercial](./06-commercial.md) | Clients, devis, factures, bridge VE | Commerciaux / Compta |
| [07 — Signatures & gabarits](./07-signatures-gabarits.md) | Signature perso, PDF | Collaborateur / Admin |
| [08 — Comptabilité](./08-comptabilite.md) | Plan SYSCOHADA, écritures, banques, états, budget | Comptable / Admin Compta / Direction |
| [09 — RH](./09-rh.md) | Collaborateurs, contrats, congés, absences, heures | Admin RH / Direction / Collaborateur |
| [10 — Paie & INPS](./10-paie-inps.md) | Périodes, bulletins, cotisations | Admin RH / Direction / Collaborateur |
| [11 — Stocks](./11-stocks.md) | Articles, mouvements, alertes | Pack Stock / Direction |
| [12 — Ops 7B](./12-ops-7b.md) | Achats, patrimoine, projets, anomalies | Stock / Projets / Direction |
| *13 — Notifications* | Cloche, automatisations, digests | Tous — **Phase 8** (manuel à créer) |

Phases : [07A](../phases/PHASE-07A-STOCKS.md) · [07B](../phases/PHASE-07B-OPS.md) · [08 Automations](../phases/PHASE-08-AUTOMATIONS.md).

## Chaîne de cause → effet (vue d’ensemble)

```
Invitation user → groupes (+ packs) → permissions → Nav Commercial
        ↓
  Prospect (Intéressé) → Client COM → Devis (plancher) → Facture → Paiement
        ↓
  PDF GED (signature owner) → proposition écriture VE → validation → états
```

Branche : `dev` · prod : `main`.  
Plan Direction : [PLAN-2-PHASES-COM-RH](../phases/PLAN-2-PHASES-COM-RH.md) (COM ✅ · RH suivant).  
Réf. phases : [docs/phases/](../phases/).
