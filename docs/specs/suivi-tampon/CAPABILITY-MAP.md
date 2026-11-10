# Capability Map — Module Suivi (tampon)

Initiative : remplacer Excel/Word manuels par un module ERP isolé (clients/factures, **comptes**, mouvements, stocks).  
Pas de devis V1. Décisions : [`DECISIONS-SEED.md`](./DECISIONS-SEED.md).

| Module id | Responsibility | Depends on |
|-----------|----------------|------------|
| `sv-foundation` | Schéma Prisma isolé `sv_*`, permissions `sv.*`, nav/hub `/suivi`, seed infrastructure | — |
| `sv-clients-invoices` | Clients, factures, paiements, soldes, remix facture, liens GED contrats/factures | `sv-foundation` |
| `sv-accounts` | Comptes physique + banque, crédit/débit/transfert, soldes dérivés des mouvements | `sv-foundation` + `sv-movements` (même table `sv_cash_movements`) |
| `sv-movements` | Registre transversal entrées/sorties + historique, catégories, lien optionnel client/projet | `sv-foundation` (lien client optionnel → `sv-clients-invoices`) |
| `sv-stock` | Articles, quantités, emplacements, mouvements (entrée/sortie/ajustement) | `sv-foundation` |
| `sv-guides` | Guide centre + MAJ `SUIVI-GUIDES.md` | modules UI livrés |

**Build order :**  
`sv-foundation` → `sv-clients-invoices` ∥ `sv-movements` ∥ `sv-accounts` ∥ `sv-stock` → `sv-guides`.

**Règle d’isolation :** aucun FK Prisma vers `ComClient` / `ComInvoice` / `Cpt*` / CRM. GED partagé via `DocumentLink.entityType` seulement. 
