# Manuels d’utilisation ERP MSK

Documentation **vivante** pour l’équipe (commerciaux, finance, admin, direction).  
À **mettre à jour à chaque évolution** de module — même règle que le code : pas de dette volontaire.

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
| [04 — Catalogue](./04-catalogue.md) | Offres & tarifs | Lecture : commercial · Édition : Admin CRM |
| [05 — CRM](./05-crm.md) | Prospects, pipeline, scripts, conversion | Commerciaux / Admin CRM |
| [06 — Commercial](./06-commercial.md) | Clients, devis, factures, paiements | Commerciaux / Compta |
| [07 — Signatures & gabarits](./07-signatures-gabarits.md) | Signature perso, PDF | Collaborateur / Admin |
| [08 — Comptabilité](./08-comptabilite.md) | Plan SYSCOHADA, écritures, banques, états, budget | Comptable / Admin Compta / Direction |

## Chaîne de cause → effet (vue d’ensemble)

```
Invitation user → groupes (+ packs défaut) → packs directs optionnels → overrides
        ↓
  Permissions effectives → Nav + boutons UI + Server Actions
        ↓
  Prospect gagné → Client COM → Devis → Facture → Paiement → PDF → GED client
        ↓
  Facture émise/payée → proposition écriture VE SYSCOHADA (FCFA) → validation → états
```

Branche de travail : `dev`.  
Réf. phases : [docs/phases/](../phases/).
