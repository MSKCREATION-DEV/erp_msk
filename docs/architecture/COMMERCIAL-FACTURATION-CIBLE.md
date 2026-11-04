# Architecture cible — Commercial · Facturation · Créances clients

**Statut :** Accepted  
**Date :** 2026-11-04  
**Branche :** `dev`  
**Contexte :** dégel Direction (`COM_DOCS_GATED`) après figement numérotation + règles comptables.

---

## 1. Contexte

MSK CREATION dispose déjà de :

- CRM + conversion → `ComClient`
- Catalogue (`CatalogOffer`, seed RS STD/PRO/PREMIUM…)
- Cycle documentaire Phase 3 (devis / factures / paiements) — **gelé UI**
- Compta SYSCOHADA Phase 6 + bridge VE `COM_INVOICE`

Le terrain réel (ECOSOL, Prosperity, Colonnes, Excel de suivi) exige : contrats récurrents, arriérés sans double-comptage, historique financier, import, numérotation atomique à l’émission.

## 2. Décision

**Évoluer** les modèles `Com*` / `CatalogOffer` / pont `CptEntry` — ne pas créer un second système clients/factures.

Ajouter :

| Domaine | Entités |
|---|---|
| Catalogue versionné | `CatalogOffer` enrichi + `CatalogOfferVersion` |
| Contrats | `ComContract`, `ComContractLine`, avenants |
| Facturation | périodes, échéances, arriérés-réf, avoirs |
| Paiements | `ComPayment` au niveau client + `ComPaymentAllocation` |
| Numérotation | lib `document-numbering` + séquences kind×jour |
| Import | batches + anomalies |
| Pilotage AR | vues créances / aging sous `/comptabilite` |

## 3. Alternatives rejetées

| Option | Pourquoi non |
|---|---|
| Nouveau module « Finance » parallèle | Duplique `ComClient` / factures ; rompt pont VE |
| Numéro au brouillon (statu quo) | Contravient à la règle légale / métier MSK |
| Arriéré comme nouvelle ligne créance | Double-comptage ECOSOL |
| Float JS pour montants | Erreurs XOF — garder **entiers** |

## 4. Flux métier cible

```
Prospect CRM → ComClient
     → Devis (brouillon sans n° officiel)
     → Émission DEV-YYYYMMDD-XXXX + PDF GED
     → Acceptation → ComContract (snapshot lignes)
     → Facturation période / one-shot
     → Émission FAC-YYYYMMDD-XXXX
     → Paiements + allocations
     → Soldes / aging / relances
     → Proposition écriture VE (existant)
```

## 5. Règles financières

1. Totaux calculés **serveur** (`src/lib/billing/*`).
2. TVA configurable (défaut ML 18 %) — jamais hardcodée multi-endroits UI.
3. Snapshot lignes contrat/facture/devis : modification catalogue **non rétroactive**.
4. Arriéré affiché = référence au solde d’une facture antérieure ; créance reste sur la facture d’origine.
5. Solde client = Σ(TTC factures ouvertes) − Σ(allocations) − avoirs imputés.
6. Acompte non affecté = paiement client sans allocation complète.
7. Document émis : numéro immuable ; annulation sans recyclage de séquence.
8. Import : conserver `legacyNumber` / `legacyInternalRef` ; anomalies non corrigées en silence.

## 6. Numérotation

| Kind | Préfixe | Période | Exemple |
|---|---|---|---|
| DEVIS | DEV | jour `YYYYMMDD` | `DEV-20261104-0001` |
| FACTURE | FAC | jour | `FAC-20261104-0001` |
| AVOIR | AVO | jour | `AVO-20261104-0001` |
| BDC | BDC | jour | `BDC-20261104-0001` |

- Allocation atomique en transaction (`SELECT FOR UPDATE` / upsert + increment).
- Brouillon : `draftCode` interne (`DRF-…`) — **ne consomme pas** la séquence officielle.
- Anciens `DEV-2026-0001` / numéros Word (`1510261`, `FAC-122`) : champs legacy.

## 7. Emplacement UI

- **Commercial** : clients 360°, contrats, devis, factures, paiements, import
- **Comptabilité** : créances, aging, à facturer, prévisions (+ SYSCOHADA existant)
- Catalogue reste `/catalogue` (shell commercial)

## 8. Permissions

Réutiliser / étendre `com.*` :

- `com.contrats.*`, `com.avoirs.*`, `com.import`, `com.relances`
- Actions sensibles (émission, annulation, imputation) : permissions dédiées + audit

## 9. Import historique

Sources : Excel OOXML *strict* (parser dédié), DOCX, PDF scannés (saisie manuelle).

Cas tests :

- **ECOSOL** : sept. 306 800 / payé 200 000 / solde 106 800 → oct. net 413 600
- **Prosperity** : écart 63 000 (837 000 vs 774 000) → anomalie ouverte
- Excel ECOSOL 306 000 vs DOCX 306 800 → anomalie

## 10. Phases

Voir [`docs/phases/PHASE-COM-FACTU.md`](../phases/PHASE-COM-FACTU.md).

## 11. Conséquences

- Migrations Prisma non destructives (ajouter colonnes / tables ; backfill paiements → allocations).
- `COM_DOCS_GATED` reste `true` jusqu’à gate Phase 8.
- Guides / manuels : maj obligatoire (`SUIVI-GUIDES.md`) au dégel.
