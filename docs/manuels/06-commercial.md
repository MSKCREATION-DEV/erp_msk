# Manuel — Commercial (clients, devis, factures, offres)

**Version** : 2026-10-12 · Phase COM E2E  
**Public** : Commerciaux, Comptabilité (factures), Direction

## À retenir

Chaîne **vente formalisée** sous l’entrée **Commercial** :

Client → Devis → Facture → Paiements → (Compta VE).

Numérotation séquentielle. PDF rangés en GED client. Signature PDF = **responsable** du devis/facture (owner).

## Navigation

| Intention | Route |
|---|---|
| Menu hub | `/commercial` |
| Clients | `/commercial/clients` · `/nouveau` · `/[id]` |
| Devis | `/commercial/devis` · `/nouveau` · `/[id]` |
| Factures | `/commercial/factures` · `/[id]` |
| Offres (catalogue) | `/catalogue` |

Liste et création = **pages séparées**. Tabs Commercial partagées avec le CRM.

## Cycle devis

```
BROUILLON → ENVOYÉ → ACCEPTE | REFUSE | ANNULE
                 ↓
              Facture
```

- Depuis un prospect **Intéressé** : bouton **Client + devis** → lignes préremplies si offres liées.  
- **Plancher** catalogue (XOF) : le P.U. ne peut pas descendre sous le plancher.  
- Marquer **Envoyé** → le prospect passe en **Devis envoyé** s’il était Intéressé.

## Cycle facture & paiements

```
BROUILLON → ÉMISE → PARTIELLEMENT PAYÉE → PAYÉE
```

1. **Émettre** la facture  
2. **Générer le PDF** (après émission uniquement) → GED  
3. Enregistrer les paiements  
4. Colonne **Compta** sur la liste : À faire / Brouillon / Validée  

## Lien comptabilité

Sur une facture émise : **Proposer l’écriture comptable** (si droit `cpt.ecritures.manage`)  
ou file **Comptabilité → À comptabiliser**.  
Détail : [manuel 08](./08-comptabilite.md) §3.

## Packs

| Profil | Packs |
|---|---|
| Commercial | `commercial` |
| Compta | `comptable` (+ proposition VE) |
| Direction | vue large |

## Changelog

| Date | Note |
|---|---|
| 2026-10-12 | Prefill devis CRM ; plancher ; bridge VE ; PDF owner ; colonne Compta |
| 2026-10-10 | Phase 3 clients / devis / factures / PDF |
