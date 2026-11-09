# Manuel — Commercial (clients, devis — factures/paiements : voir Comptabilité)

**Version** : 2026-11-09 (ownership Comptabilité factures/paiements) · historique P0 devis vs convert · LOT-A  
**Public** : Commerciaux (devis limité), Comptabilité (devis + factures + paiements), Direction

## À retenir

Chaîne **vente formalisée** :

Client (Commercial) → Devis (Commercial limité / Comptabilité) → Facture → Paiements (**Comptabilité**) → Compta VE.

**Ownership (2026-11-09)** : la **facturation et les paiements** sont possédés par **Comptabilité** (`/comptabilite/factures`) — Commercial ne crée plus de facture ni n’enregistre de paiement. Les **devis** restent une création **Commercial limitée** (créer / éditer / envoyer / accepter-refuser) mais sont aussi **gérés par Comptabilité** (mêmes pages `/commercial/devis`, droits `com.devis.*` accordés au pack `comptable`/`admin_compta`). Voir `docs/guides/SUIVI-GUIDES.md` §8 (2026-11-09) pour le détail RBAC.

Sur fiche prospect **Intéressé** : **Créer un devis** prépare une fiche client liée au prospect **sans** transformer le dossier (le CRM reste Intéressé). **Transformer en client** (confirmation) = acte distinct : client + passage CRM **Client**.

**Gel menu (Direction 13/10) — obsolète** : conservé ci-dessous à titre historique ; le hub Commercial réexpose désormais devis/factures quand les permissions le permettent.

Numérotation séquentielle (quand réouvert). PDF rangés en GED client. Signature PDF = **responsable** du devis/facture (owner).

## Navigation

| Intention | Route | État |
|---|---|---|
| Menu hub | `/commercial` | Live |
| Clients | `/commercial/clients` · `/nouveau` · `/[id]` | Live |
| Devis | `/commercial/devis` · `/nouveau` · `/[id]` | Live — dual Commercial (limité) + Comptabilité (droits `com.devis.*`) |
| Factures | `/comptabilite/factures` · `/[id]` | Live — **ownership Comptabilité** (droits `com.factures.*`/`com.paiements.record`). `/commercial/factures` → redirect automatique (pas de 404) |
| Offres (catalogue) | `/catalogue` | Live |

Liste et création = **pages séparées**. Tabs Commercial partagées avec le CRM (Devis visible si droits ; plus d’onglet Factures côté Commercial — voir Comptabilité).

## Cycle devis *(réouverture ultérieure)*

```
BROUILLON → ENVOYÉ → ACCEPTE | REFUSE | ANNULE
                 ↓
              Facture
```

- Depuis un prospect **Intéressé** : bouton **Créer un devis** → prépare la fiche client si besoin **sans** passer le CRM en Client, puis ouvre la page **`/commercial/devis/nouveau`** (stepper Client → Cadre → Composition → Récap). Lignes préremplies si offres liées au prospect. Déplacement = ligne catalogue (**+ Déplacement**), pas une case à cocher.  
- **Plancher** catalogue (XOF) : le P.U. ne peut pas descendre sous le plancher.  
- Marquer **Envoyé** → le prospect passe en **Devis envoyé** s’il était Intéressé.

## Cycle facture & paiements *(ownership Comptabilité — `/comptabilite/factures`)*

```
BROUILLON → ÉMISE → PARTIELLEMENT PAYÉE → PAYÉE
```

1. **Émettre** la facture (droit `com.factures.issue`, pack `comptable`/`admin_compta`/`direction`)
2. **Générer le PDF** (après émission uniquement) → GED
3. Enregistrer les paiements (droit `com.paiements.record`)
4. Colonne **Compta** sur la liste : À faire / Brouillon / Validée

Commercial ne crée plus de facture ni n’enregistre de paiement (droits retirés des packs `commercial`/`admin_crm`) — vue lecture de la facture encore possible via les liens depuis la fiche client/contrat commerciale, le détail bascule sur `/comptabilite/factures/[id]`.

## Lien comptabilité

Sur une facture émise : **Proposer l’écriture comptable** (si droit `cpt.ecritures.manage`)  
ou file **Comptabilité → À comptabiliser**.  
Détail : [manuel 08](./08-comptabilite.md) §3.

## Packs

| Profil | Packs | Devis | Factures/Paiements |
|---|---|---|---|
| Commercial | `commercial`, `admin_crm` | Créer/éditer/envoyer/accepter (limité) | — (ownership Comptabilité) |
| Compta | `comptable`, `admin_compta` | Créer/éditer/envoyer/accepter | Créer/émettre/encaisser |
| Direction | `direction` | Oui | Oui (inchangé) |

## Changelog

| Date | Note |
|---|---|
| 2026-11-09 | Ownership Comptabilité : factures/paiements déplacés vers `/comptabilite/factures` (redirect depuis `/commercial/factures`) ; devis dual Commercial (limité) + Comptabilité ; RBAC packs mis à jour |
| 2026-11-06 | P0 : devis sans convert CRM implicite ; CTA Transformer en client séparé ; table routes devis/factures live |
| 2026-10-14 | LOT-A : gel Devis/Factures (hub + nav + URL) ; CTA Transformer en client |
| 2026-10-12 | Prefill devis CRM ; plancher ; bridge VE ; PDF owner ; colonne Compta |
| 2026-10-10 | Phase 3 clients / devis / factures / PDF |
