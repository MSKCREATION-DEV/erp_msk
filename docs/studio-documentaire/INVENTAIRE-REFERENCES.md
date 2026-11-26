# Studio documentaire — Inventaire exhaustif `docs/` ↔ gabarits

**Date** : 2026-11-13 · **MàJ** : 2026-11-26 (chrome document + Charte liée) · **Branche** : `dev`  
**Règle** : aucune invention — chaque ligne est traçable à un fichier du dépôt ou à une référence locale documentée (hors Git).

Sources croisées : `docs/commercial/INVENTAIRE-ALIGNEMENT-DOCUMENTS-2026-11-08.md`, `docs/specs/suivi-tampon/INVENTAIRE-DOCUMENTS.md`, `prisma/seed.ts` / `prisma/seed-studio.ts`, code `src/lib/pdf/*`, ADR `docs/architecture/ADR-studio-pipeline-unifie.md`, ADR `docs/architecture/ADR-studio-document-chrome.md`.

---

## 1. Synthèse

| Statut | Décompte | Détail |
|--------|----------|--------|
| Gabarits ERP actifs (`DocumentTemplate`) | **13+** | 10 métier migrés `ENGINE_BLOCKS` + démo `attestation_presence_libre` + 2 coques charges (`à valider`) |
| Pipeline | **Unifié** | DSL/blocs + variables → HTML live → PDF (`renderBlocksToPdf` + régions `[[COMPOSITE]]`) |
| Chrome | **`DocumentChrome`** | En-tête / pied / aligns / logo Charte dans `structureJson.chrome` — Playground onglet Chrome |
| PDF/DOCX de référence dans `docs/` (versionnés) | **2** | Factures charges internes uniquement (§4) |
| PDF/DOCX métier hors dépôt (gitignore) | **~25+** | Inventoriés dans commercial / suivi tampon — contenu déjà aligné dans DSL + régions |
| Manuels `docs/manuels/*.md` | **12 + README** | Procédures UI — **pas** de clauses à seed comme gabarit |
| Charte `docs/brand/CHARTE-GRAPHIQUE-MSK.pdf` | **1** | Tokens via `src/lib/brand.ts` — pas un gabarit documentaire |

---

## 2. Gabarits enregistrés (source de vérité runtime)

| Code gabarit | Type | `generatorKind` | Texte / contenu | Référence documentaire | OCR / relecture |
|--------------|------|-----------------|-----------------|------------------------|-----------------|
| `devis_standard` | DEVIS | ENGINE_BLOCKS | DSL + région `commercial_devis` (lignes + totaux) | DEVIS *.docx (hors dépôt) — §3 commercial | Aligné structure |
| `facture_standard` | FACTURE | ENGINE_BLOCKS | DSL + région `commercial_facture` | FACTURE ECOSOL / KOUNDJI… | Aligné ; **solde reporté** = à valider |
| `contrat_commercial_msk` | CONTRAT_COMMERCIAL | ENGINE_BLOCKS | DSL art. 1–13 + région annexe BDC | CONTRAT PRESTATION / ENGAGEMENT (OCR) | Aligné |
| `contrat_travail_msk` | CONTRAT_TRAVAIL | ENGINE_BLOCKS | Articles 1–16 DSL | Contrat Guiro | v2 |
| `contrat_stage_msk` | CONTRAT_STAGE | ENGINE_BLOCKS | Articles stage DSL | Contrat Yaye Bah.docx | v2 |
| `contrat_presta_msk` | CONTRAT_PRESTA | ENGINE_BLOCKS | DSL art. 1–10 + région parties | CONTRAT PRESTATION SERVICES (OCR) | v3 |
| `attestation_stage_msk` | ATTESTATION_STAGE | ENGINE_BLOCKS | Texte Mangara DSL | Attestation Mangara | v2 |
| `reglement_interieur_msk` | REGLEMENT_INTERIEUR | ENGINE_BLOCKS | 6 chapitres + accusé | Règlement Fatoumata | Accusé ; 22 art. GED |
| `solde_tout_compte_msk` | SOLDE_TOUT_COMPTE | ENGINE_BLOCKS | Texte solde DSL | Solde Mangara.pdf | v2 |
| `fiche_paie_msk` | FICHE_PAIE | ENGINE_BLOCKS | DSL ID/rémun + région cotisations | Fiche paie Guiro 09/2026 | Indicatif Paie |
| `facture_charge_edm_msk` | DOCUMENT_LIBRE | ENGINE_BLOCKS | Coque — **à valider** | `docs/Fac-edm-octobre.pdf` | Pas d’OCR clauses |
| `facture_charge_loyer_msk` | DOCUMENT_LIBRE | ENGINE_BLOCKS | Coque — **à valider** | `docs/Fac-location-novembre.pdf` | Idem |
| `attestation_presence_libre` | DOCUMENT_LIBRE | ENGINE_BLOCKS | Contenu DSL seed | Aucun PDF papier | N/A |

**Signature** : tous → `signatureEnabled = false` par défaut.

---

## 3. Pipeline unifié (2026-11-17) + chrome (2026-11-26)

```
Réf docs → corps DSL (spécifique) + variables
        → DocumentChrome (structureJson.chrome + Charte logos ACTIVE)
        → renderBlocksToHtml (preview live, régions peuplées)
        → generateOfficialPdfFromTemplate → renderBlocksToPdf (+ drawCompositeRegion)
```

| Avant | Après |
|-------|-------|
| Composite présent → ignore DSL, appelle `generateCommercialPdf` / `generateContractPdf` / … | Composite = **région** à sa place dans le flux blocs |
| Playground `playgroundTextMode` strippe composites | Même pipeline métier ; overrides variables optionnels |
| Header/footer hardcodés | Chrome éditable + logo uniquement Charte ACTIVE |

Point d’entrée modules : Commercial / Contrats / RH → `generateOfficialPdfFromTemplate` (chrome persisté appliqué).

---

## 4. Matrice couverture vs refs (livrable)

| Code | Pipeline unifié ? | Couverture vs ref `docs/` / locale | Région composite |
|------|-------------------|-------------------------------------|------------------|
| `devis_standard` | **oui** | Sections émetteur/client/objet/mission/conditions — tableau = région | `commercial_devis` |
| `facture_standard` | **oui** | Idem + règlement ; solde reporté = dette | `commercial_facture` |
| `contrat_commercial_msk` | **oui** | Art. 1–13 DSL ; annexe lignes = région | `commercial_contract` |
| `contrat_presta_msk` | **oui** | Art. 1–10 DSL ; récap parties = région | `rh_contract_presta` |
| `fiche_paie_msk` | **oui** | ID/rémun DSL ; grille cotisations = région | `rh_payslip` |
| `contrat_travail_msk` | **oui** (déjà DSL) | Art. 1–16 | — |
| `contrat_stage_msk` | **oui** | Articles stage | — |
| `attestation_stage_msk` | **oui** | Corps attestation | — |
| `reglement_interieur_msk` | **oui** | 6 chapitres + accusé (22 art. hors PDF) | — |
| `solde_tout_compte_msk` | **oui** | Corps solde | — |
| `attestation_presence_libre` | **oui** | Démo Studio | — |

---

## 5. Fichiers `docs/` — classification (inchangé)

### Ne deviennent pas gabarit PDF

Manuels, phases, architecture, brand, xlsx, canvas — hors mission contenu.

### PDF versionnés charges

`Fac-edm-octobre.pdf` / `Fac-location-novembre.pdf` → module Suivi charges, pas `DocumentTemplate` métier client.

### Lot métier hors Git

Voir inventaires commercial / suivi tampon. Contenu porté en DSL + régions.

---

## 6. Intégrations modules

| Module | Gabarit(s) | Statut |
|--------|------------|--------|
| Commercial | `devis_standard`, `facture_standard` | ✅ pipeline unifié |
| Contrats | `contrat_commercial_msk` | ✅ |
| RH | codes §2 | ✅ |
| Studio Playground | tous | ✅ HTML + PDF même source |

---

## 7. Reste à faire

1. OCR / validation Direction coques charges EDM & loyer.
2. Édition cellules tableau (WYSIWYG) — Option B partielle.
3. Playground drag-and-drop blocs.
4. Guide `/guides` Studio — `draft`.
5. Règlement 22 articles si texte extractible.
6. **`npm run db:seed`** en chaque env pour republier `bodyJson`.
