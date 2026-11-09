# Manuel — Commercial (clients, devis, factures, offres)

**Version** : 2026-11-06 (P0 devis vs convert) · historique LOT-A  
**Public** : Commerciaux, Comptabilité (factures), Direction

## À retenir

Chaîne **vente formalisée** sous l’entrée **Commercial** :

Client → Devis → Facture → Paiements → (Compta VE).

**Dégel devis/factures (COM-FACTU, nov. 2026) :** accès selon droits ; numérotation et règles comptables en place côté ERP.

Sur fiche prospect **Intéressé** : **Créer un devis** prépare une fiche client liée au prospect **sans** transformer le dossier (le CRM reste Intéressé). **Transformer en client** (confirmation) = acte distinct : client + passage CRM **Client**.

**Gel menu (Direction 13/10) — obsolète** : conservé ci-dessous à titre historique ; le hub Commercial réexpose désormais devis/factures quand les permissions le permettent.

Numérotation séquentielle (quand réouvert). PDF rangés en GED client. Signature PDF = **responsable** du devis/facture (owner).

## Navigation

| Intention | Route | État |
|---|---|---|
| Menu hub | `/commercial` | Live |
| Clients | `/commercial/clients` · `/nouveau` · `/[id]` | Live |
| Devis | `/commercial/devis` · `/nouveau` · `/[id]` | Live (droits `com.devis.*`) |
| Factures | `/commercial/factures` · `/[id]` | Live (droits facturation) |
| Offres (catalogue) | `/catalogue` | Live |

Liste et création = **pages séparées**. Tabs Commercial partagées avec le CRM (sans Devis/Factures tant que gel actif).

## Cycle devis *(réouverture ultérieure)*

```
BROUILLON → ENVOYÉ → ACCEPTE | REFUSE | ANNULE
                 ↓
              Facture
```

- Depuis un prospect **Intéressé** : bouton **Créer un devis** → prépare la fiche client si besoin **sans** passer le CRM en Client, puis ouvre la page **`/commercial/devis/nouveau`** (stepper Client → Cadre → Composition → Récap). Lignes préremplies si offres liées au prospect. Déplacement = ligne catalogue (**+ Déplacement**), pas une case à cocher.  
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
| 2026-11-06 | P0 : devis sans convert CRM implicite ; CTA Transformer en client séparé ; table routes devis/factures live |
| 2026-10-14 | LOT-A : gel Devis/Factures (hub + nav + URL) ; CTA Transformer en client |
| 2026-10-12 | Prefill devis CRM ; plancher ; bridge VE ; PDF owner ; colonne Compta |
| 2026-10-10 | Phase 3 clients / devis / factures / PDF |
