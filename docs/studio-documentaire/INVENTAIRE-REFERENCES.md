# Studio documentaire — Inventaire exhaustif `docs/` ↔ gabarits

**Date** : 2026-11-13 · **Branche** : `dev`  
**Règle** : aucune invention — chaque ligne est traçable à un fichier du dépôt ou à une référence locale documentée (hors Git).

Sources croisées : `docs/commercial/INVENTAIRE-ALIGNEMENT-DOCUMENTS-2026-11-08.md`, `docs/specs/suivi-tampon/INVENTAIRE-DOCUMENTS.md`, `prisma/seed.ts` / `prisma/seed-studio.ts`, code `src/lib/pdf/*`.

---

## 1. Synthèse

| Statut | Décompte | Détail |
|--------|----------|--------|
| Gabarits ERP actifs (`DocumentTemplate`) | **13+** | 10 métier migrés `ENGINE_BLOCKS` + démo `attestation_presence_libre` + 2 coques charges (`à valider`) |
| PDF/DOCX de référence dans `docs/` (versionnés) | **2** | Factures charges internes uniquement (§4) |
| PDF/DOCX métier hors dépôt (gitignore) | **~25+** | Inventoriés dans commercial / suivi tampon — contenu déjà aligné dans `src/lib/pdf/*.ts` |
| Manuels `docs/manuels/*.md` | **12 + README** | Procédures UI — **pas** de clauses à seed comme gabarit |
| Charte `docs/brand/CHARTE-GRAPHIQUE-MSK.pdf` | **1** | Tokens via `src/lib/brand.ts` — pas un gabarit documentaire |
| XLSX / canvas / phases | **nombreux** | Hors périmètre gabarits PDF métier (pas de conversion en cours) |

---

## 2. Gabarits enregistrés (source de vérité runtime)

| Code gabarit | Type | `generatorKind` | Texte / contenu | Référence documentaire | OCR / relecture |
|--------------|------|-----------------|-----------------|------------------------|-----------------|
| `devis_standard` | DEVIS | ENGINE_BLOCKS | DSL + `[[COMPOSITE: commercial_devis]]` → `commercial.ts` | DEVIS *.docx (hors dépôt) — §3 commercial | Aligné 2026-11-08 (structure) |
| `facture_standard` | FACTURE | ENGINE_BLOCKS | idem `commercial_facture` | FACTURE ECOSOL / KOUNDJI… (hors dépôt + `docs/specs/suivi-tampon`) | Aligné ; **ligne solde reporté** = à valider métier |
| `contrat_commercial_msk` | CONTRAT_COMMERCIAL | ENGINE_BLOCKS | `[[COMPOSITE: commercial_contract]]` | CONTRAT PRESTATION / ENGAGEMENT PDF (OCR) | Aligné 2026-11-06 |
| `contrat_travail_msk` | CONTRAT_TRAVAIL | ENGINE_BLOCKS | Articles 1–16 en base (`template-dsl-bodies.ts`) | Contrat Guiro (sortie plateforme antérieure) | v2 seed |
| `contrat_stage_msk` | CONTRAT_STAGE | ENGINE_BLOCKS | Articles stage en base | Contrat Yaye Bah.docx | v2 seed |
| `contrat_presta_msk` | CONTRAT_PRESTA | ENGINE_BLOCKS | `[[COMPOSITE: rh_contract_presta]]` | CONTRAT PRESTATION SERVICES (OCR ECOSOL) | v3 — adaptation rôles |
| `attestation_stage_msk` | ATTESTATION_STAGE | ENGINE_BLOCKS | Texte Mangara v2 en base | Attestation Mangara (scan) | v2 |
| `reglement_interieur_msk` | REGLEMENT_INTERIEUR | ENGINE_BLOCKS | Résumé 6 chapitres + accusé | Règlement Fatoumata (~10 p. OCR) | **Partiel** — pas 22 art. intégral |
| `solde_tout_compte_msk` | SOLDE_TOUT_COMPTE | ENGINE_BLOCKS | Texte solde v2 en base | Solde Mangara.pdf | v2 |
| `fiche_paie_msk` | FICHE_PAIE | ENGINE_BLOCKS | `[[COMPOSITE: rh_payslip]]` | Fiche paie Guiro 09/2026 | v2 — indicatif (Phase Paie) |
| `facture_charge_edm_msk` | DOCUMENT_LIBRE | ENGINE_BLOCKS | Coque — **à valider** | `docs/Fac-edm-octobre.pdf` | Pas d’OCR clauses ce lot |
| `facture_charge_loyer_msk` | DOCUMENT_LIBRE | ENGINE_BLOCKS | Coque — **à valider** | `docs/Fac-location-novembre.pdf` | Idem |
| `attestation_presence_libre` | DOCUMENT_LIBRE | ENGINE_BLOCKS | Contenu DSL en base (`seed-studio.ts`) | **Aucun PDF papier** — texte seed explicite | N/A |

**Signature** : tous les gabarits ci-dessus → `signatureEnabled = false` par défaut (seed + migration data).

---

## 3. Fichiers `docs/` — classification

### 3.1 Ne deviennent **pas** de gabarit PDF (hors mission contenu)

| Fichier / dossier | Rôle |
|-------------------|------|
| `docs/manuels/**` | Guides procéduraux ERP |
| `docs/phases/**`, `docs/architecture/**`, `docs/deploy/**`, `docs/ops/**`, `docs/quality/**`, `docs/intent/**`, `docs/msk/**` | Specs, plans, ops |
| `docs/guides/SUIVI-GUIDES.md` | Suivi documentation |
| `docs/studio-documentaire/*` | Conception / audit Studio |
| `docs/brand/CHARTE-GRAPHIQUE-MSK.pdf` | Charte graphique |
| `docs/*.xlsx` | Données tampon (stocks, dépenses, achats) |
| `docs/architecture/*.canvas.tsx` | Artefact Cursor |

### 3.2 PDF versionnés dans `docs/` (charges / fournisseurs)

| Fichier | Nature | Gabarit ERP | Statut |
|---------|--------|-------------|--------|
| `docs/Fac-edm-octobre.pdf` | Facture EDM (charge) | **Aucun** — module Suivi charges (`sv_expense_invoices`), pas `DocumentTemplate` | OCR fait — voir suivi tampon §12 |
| `docs/Fac-location-novembre.pdf` | Loyer | **Aucun** | Idem |
| `facture_CB5036*.pdf` (réf. suivi, hors `docs/` racine) | Orange Mali | **Aucun** | Idem |

→ **Dette** : gabarits PDF pour factures fournisseurs récurrentes (Orange, EDM, loyer) si la Direction souhaite les émettre depuis le Studio — non implémenté (pas d’invention de clauses).

### 3.3 Lot métier client (hors dépôt Git — références locales)

Liste complète : `docs/commercial/INVENTAIRE-ALIGNEMENT-DOCUMENTS-2026-11-08.md` §1 et `docs/specs/suivi-tampon/INVENTAIRE-DOCUMENTS.md` §2–3.

Tous les types DEVIS / FACTURE / CONTRAT client listés sont **couverts** par les gabarits legacy §2 (contenu dans le code, pas re-OCR en base pour cette session).

Points **à valider** (reprise inventaires existants, non bloquants seed) :

- Grille offres STANDARD/PRO/PREMIUM visuelle dans devis générique
- Ligne « solde reporté » facture (ECOSOL 413 600 F)
- Case offre contrat ECOSOL OCR
- Règlement intérieur : reproduction intégrale 22 articles

---

## 4. Moteur & exemplaires (cette session)

| Composant | Fichier |
|-----------|---------|
| Génération exemplaire (legacy + Studio) | `src/lib/studio/generate-sample-pdf.ts` |
| Téléchargement / iframe | `GET /api/administration/gabarits/[id]/exemplaire` |
| Playground POST (Studio) | `POST` même route — corps / logo / signature preview |
| UI Playground | `/administration/gabarits/[id]/playground` |
| Cartes bibliothèque | `TemplateLibraryCard` — Voir / Télécharger / Playground |

Le bouton « PDF démo » (GED) reste optionnel ; l’exemplaire ne dépend plus d’un upload préalable.

---

## 5. Intégrations modules métier (`requireActiveTemplate`)

| Module | Actions | Gabarit(s) | Statut |
|--------|---------|------------|--------|
| Commercial | `generateQuotePdfAction`, `generateInvoicePdfAction` | `devis_standard`, `facture_standard` | ✅ |
| Contrats commerciaux | `generateContractPdf` (contracts.ts) | `contrat_commercial_msk` | ✅ |
| RH | contrats, attestation, règlement (+ autres PDF RH) | codes §2 | ✅ hook signature + template |
| Studio | `generateDemoPdfAction` | tous | ✅ via `generateSamplePdfForTemplate` |

**Composites** : marqueurs `[[COMPOSITE:…]]` — tableaux Devis/Facture, contrat commercial multipages, fiche paie et contrat presta RH restent rendus par `src/lib/pdf/*` (fidélité charte) ; le DSL porte l’entête / clauses éditables.

---

## 6. Reste à faire (explicite)

1. **OCR / validation Direction** des coques charges EDM & loyer + éventuels gabarits Orange.
2. **Réduction des composites** — porter progressivement tableaux en blocs Studio dédiés.
3. **Playground WYSIWYG** 3 zones (au-delà du DSL + iframe actuel).
4. **Guide utilisateur** `/guides` Studio — statut `draft` dans `SUIVI-GUIDES.md`.
5. **Documents papier** non fournis au dépôt — à importer humainement avant OCR.
