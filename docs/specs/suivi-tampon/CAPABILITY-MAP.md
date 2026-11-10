# Capability Map — Module Suivi (tampon)

Initiative : remplacer Excel/Word manuels par un module ERP isolé (clients/factures, **mouvements**, stocks).  
Pas de module caisse métier · pas de devis V1. Décisions : [`DECISIONS-SEED.md`](./DECISIONS-SEED.md).

| Module id | Responsibility | Depends on |
|-----------|----------------|------------|
| `sv-foundation` | Schéma Prisma isolé `sv_*`, permissions `sv.*`, nav/hub `/suivi`, seed infrastructure | — |
| `sv-clients-invoices` | Clients, factures, paiements, soldes, remix facture, liens GED contrats/factures | `sv-foundation` |
| `sv-movements` | Registre mouvements entrées/sorties + historique, catégories, solde ops, lien optionnel client/projet (ex-`sv-cash`) | `sv-foundation` (lien client optionnel → `sv-clients-invoices`) |
| `sv-stock` | Articles, quantités, emplacements, mouvements (entrée/sortie/ajustement) | `sv-foundation` |
| `sv-guides` | Guide centre + MAJ `SUIVI-GUIDES.md` | modules UI livrés |

**Build order :**  
`sv-foundation` → `sv-clients-invoices` ∥ `sv-movements` ∥ `sv-stock` (après fondation ; movements/stock peuvent démarrer en parallèle une fois le hub + RBAC OK) → `sv-guides`.

**Règle d’isolation :** aucun FK Prisma vers `ComClient` / `ComInvoice` / `Cpt*` / CRM. GED partagé via `DocumentLink.entityType` seulement.
