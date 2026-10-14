# Manuel — Commercial (clients, devis, factures, offres)

**Version** : 2026-10-14 · LOT-A (devis/facture gelés)  
**Public** : Commerciaux, Comptabilité (factures), Direction

## À retenir

Chaîne **vente formalisée** sous l’entrée **Commercial** :

Client → Devis → Facture → Paiements → (Compta VE).

**Gel temporaire (Direction 13/10) :** les modules **Devis** et **Factures** sont grisés dans le Menu Commercial. Continuer le process devis hors plateforme tant que la numérotation et les règles comptables ne sont pas figées. Les **Clients**, le **CRM** et le **catalogue** restent ouverts.

Depuis un prospect **Intéressé** (ou plus) : bouton **Transformer en client** (sans ouvrir un devis).

Numérotation séquentielle (quand réouvert). PDF rangés en GED client. Signature PDF = **responsable** du devis/facture (owner).

## Navigation

| Intention | Route | État |
|---|---|---|
| Menu hub | `/commercial` | Live |
| Clients | `/commercial/clients` · `/nouveau` · `/[id]` | Live |
| Devis | `/commercial/devis` · `/nouveau` · `/[id]` | **Gelé** (redirect Menu) |
| Factures | `/commercial/factures` · `/[id]` | **Gelé** (redirect Menu) |
| Offres (catalogue) | `/catalogue` | Live |

Liste et création = **pages séparées**. Tabs Commercial partagées avec le CRM (sans Devis/Factures tant que gel actif).

## Cycle devis *(réouverture ultérieure)*

```
BROUILLON → ENVOYÉ → ACCEPTE | REFUSE | ANNULE
                 ↓
              Facture
```

- Depuis un prospect **Intéressé** : bouton **Créer un devis** (quand le gel sera levé) → lignes préremplies si offres liées.  
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
| 2026-10-14 | LOT-A : gel Devis/Factures (hub + nav + URL) ; CTA Transformer en client |
| 2026-10-12 | Prefill devis CRM ; plancher ; bridge VE ; PDF owner ; colonne Compta |
| 2026-10-10 | Phase 3 clients / devis / factures / PDF |
