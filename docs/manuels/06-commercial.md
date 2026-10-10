# Manuel — Commercial (clients, devis, factures)

**Version** : 2026-10-10 · Phase 3  
**Public** : Commerciaux, Comptabilité (factures), Direction

## À retenir

Module de **vente formalisée** : Client → Devis → (acceptation) → Facture → Paiements.

Numérotation séquentielle (devis / factures). PDFs générés et rangés en GED client. Mentions légales en pied de page PDF (pas de badge décoratif « MSK CREATION »).

## Navigation

| Intention | Route | Permission |
|---|---|---|
| Hub | `/commercial` | `com.access` |
| Clients liste | `/commercial/clients` | `com.clients.view` |
| Nouveau client | `/commercial/clients/nouveau` | `com.clients.create` |
| Fiche client | `/commercial/clients/[id]` | `com.clients.view` |
| Devis liste | `/commercial/devis` | `com.quotes.view` |
| Nouveau devis | `/commercial/devis/nouveau` | `com.quotes.create` |
| Fiche devis | `/commercial/devis/[id]` | `com.quotes.view` |
| Factures | `/commercial/factures` · `/[id]` | `com.invoices.view` |

Liste et création sont **toujours** sur des pages séparées.

## Cycle devis

```
BROUILLON → ENVOYÉ → ACCEPTE | REFUSE | EXPIRE
                 ↓ (si accepté)
              Facture (émission)
```

| Action UI | Effet |
|---|---|
| Enregistrer brouillon | Totaux recalculés (HT / TVA / TTC) |
| Envoyer | Statut ENVOYÉ + PDF GED + e-mail si configuré |
| Accepter | Ouvre la facturation |
| Refuser / Expirer | Clôture commerciale du devis |
| Convertir en facture | Crée facture liée, numérotée, PDF GED |

## Cycle facture & paiements

```
BROUILLON / ÉMISE → PARTIELLEMENT PAYÉE → PAYÉE
                 → ANNULÉE (selon droits)
```

| Action | Effet |
|---|---|
| Enregistrer un paiement | Montant restant ↓ ; statut mis à jour |
| PDF | Document versionné sous `Clients/{Client}/Factures/` |

## Scope commercial

Selon packs : un commercial peut être limité à **ses** clients / devis (`com.scope.own` vs vue équipe / globale). Voir `src/lib/commercial/scope.ts`.

## Lien CRM & GED

| Amont | Aval |
|---|---|
| Prospect converti | Client + dossiers GED |
| Devis / facture | PDF dans GED client |
| Catalogue | Lignes devis (snapshot) |

## Packs recommandés

| Profil | Packs |
|---|---|
| Commercial | `commercial` (+ groupes `commerciaux` / `collaborateur`) |
| Compta | packs factures / paiements (lecture + encaissement) |
| Direction | vue large + reporting (phases suivantes) |

## Tests de non-régression

- `npm run gate:phase3`  
- Smoke UI : parcours clients / devis / factures  
- Smoke RBAC : commercial ≠ admin CRM sur GED / catalogue

## Changelog manuel

- 2026-10-10 — Durcissement : machine d’états devis, 1 facture/devis, dossier GED client unique (`gedFolderCode`), plafond paiements.
- 2026-10-10 — Phase 3 livrée : flux, PDF, GED, scope.
