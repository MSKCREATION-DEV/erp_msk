# Inventaire d'alignement — documents générés par la plateforme vs références métier

**Date :** 2026-11-08  
**MàJ :** 2026-11-09 — les PDF/DOCX nominatifs et instances clients sont **hors dépôt Git** (gitignorés). Les noms ci-dessous restent des **libellés de référence locale** ; ne pas les re-committer.
**Mandat :** aligner chaque document généré par l'ERP (gabarit `DocumentTemplate` + fonction `generate*Pdf`) sur son fichier de référence (structure, sections, paragraphes), en adaptant explicitement les cas à rôles inversés (ex. RH presta).
**Méthode :** `pdftotext -layout` pour les PDF/DOCX extractibles ; `pdftoppm -r 200/300` + `tesseract -l fra` (OCR) pour les scans ; lecture du code générateur réel (pas seulement `structureJson`, qui n'est que la métadonnée — le texte juridique est codé en dur dans `src/lib/pdf/*.ts`).

---

## 1. Inventaire des références (hors dépôt)

| Fichier référence (locale) | Nature | Type de document ERP concerné |
|---|---|---|
| `CONTRAT DE PRESTATION DE SERVICES.pdf` (OCR, scan) | Instance réelle ECOSOL — contrat agence→client RS | `generateContractPdf` (famille A) **et** `generateContractPrestaPdf` (RH, rôles inversés) |
| `MODELE CONTRAT GESTION DES RESEAUX SOCIAUX (1).pdf` | Modèle vierge RS (texte extractible) | `generateContractPdf` (famille A) |
| `02_Contrat d'engagement Application Web.pdf` (OCR, scan) | CDC projet app web (KOUNDJI) | `generateContractPdf` (famille B) |
| `CONTRAT D'ENGAGEMENT.pdf` (OCR, scan) | CDC site vitrine + charte (KOUNDJI) | `generateContractPdf` (famille B) |
| `DEVIS HOTEL RESIDENCE LES COLONNES.docx` | Devis réel (offre RS + grille packs) | `generateCommercialPdf` (type DEVIS) |
| `DEVIS-2 PROSPERITY MANAGEMENT (Logo).docx` | Devis réel (branding, acompte 30/70) | `generateCommercialPdf` (type DEVIS) |
| `DEVIS CHARTRES GRAPHIQUE HOTEL COLONNES.docx` | Devis réel (charte graphique) | `generateCommercialPdf` (type DEVIS) |
| `FACTURE  ECOSOL 29-10-2026.docx` | Facture réelle (avec solde reporté mois précédent) | `generateCommercialPdf` (type FACTURE) |
| `Contrat de Travail Guiro Amadou Samba.pdf` | **Génération antérieure de la plateforme elle-même** (CDI réel, 14 articles) | `generateContractTravailPdf` |
| `Contrat de Stage de Yaye Bah.docx` | **Génération antérieure de la plateforme** (stage réel, 11 articles) | `generateContractStagePdf` |
| `ATTESTATION DE STAGE DE MANGARA ASSETOU.pdf` (OCR, scan) | **Génération antérieure de la plateforme** | `generateAttestationStagePdf` |
| `Solde de tout compte Mangara Assetou.pdf` | **Génération antérieure de la plateforme** | `generateSoldeToutComptePdf` |
| `Fiche de Paie de Guiro Amadou Samba du 01-09-2026 au 31-09-2026.pdf` | **Génération antérieure de la plateforme** (bulletin détaillé) | `generateFichePaiePdf` |
| `Document – Règlement intérieur – Fatoumata.pdf` (OCR, scan, ~10 p.) | Document source RH officiel (22 articles, 6 chapitres) | `generateReglementInterieurPdf` (résumé + accusé, pas reproduction intégrale) |

> **Point clé** : les 6 références RH (`Contrat de Travail Guiro`, `Contrat de Stage Yaye Bah`, `Attestation Mangara`, `Solde Mangara`, `Fiche de Paie Guiro`, `Règlement Fatoumata`) sont elles-mêmes d'**anciennes sorties du générateur de la plateforme**, à une version antérieure du code où le texte comportait encore les accents français et une structure plus riche (14/11 articles). Une régression progressive (accents perdus, articles simplifiés) s'était introduite au fil des itérations — ce lot la corrige.

Aucune référence `docs/` sans document ERP correspondant, et aucun type de `DocumentTemplate` sans référence identifiable (voir §2).

---

## 2. Matrice de couverture — `DocumentTemplate` (seed) ↔ `generate*Pdf` ↔ statut

| Code gabarit | Type | Générateur (`src/lib/pdf/`) | Version | Statut après ce lot |
|---|---|---|---|---|
| `devis_standard` | DEVIS | `generateCommercialPdf` (commercial.ts) | 1 | ✅ **Vérifié aligné** (structure déjà conforme depuis 2026-11-06 ; voir §3) |
| `facture_standard` | FACTURE | `generateCommercialPdf` (commercial.ts) | 1 | ✅ **Vérifié aligné** ; écart mineur assumé : pas de ligne « solde reporté » (facturation avec arriéré, cas ECOSOL) |
| *(pas de code seed dédié — contrats commerciaux créés via `ComClient`/`Contract`)* | CONTRAT (A/B) | `generateContractPdf` (commercial.ts) | — | ✅ **Vérifié aligné** depuis le lot 2026-11-06 (13 articles famille A / sections CDC famille B) — non retouché ce lot, `test:pdf-contract` non régressé |
| `contrat_travail_msk` | CONTRAT_TRAVAIL | `generateContractTravailPdf` (rh.ts) | 1→**2** | ✅ **Aligné ce lot** — accents + 7 articles légaux ajoutés (Congés payés, Sécurité sociale INPS/CANAM, Matériel, Discipline, Achats logiciels, Résiliation, Dispositions générales) |
| `contrat_stage_msk` | CONTRAT_STAGE | `generateContractStagePdf` (rh.ts) | 1→**2** | ✅ **Aligné ce lot** — accents + 5 articles légaux ajoutés (Matériel, Discipline, Achats logiciels, Résiliation, Dispositions générales) |
| `contrat_presta_msk` | CONTRAT_PRESTA | `generateContractPrestaPdf` (rh.ts) | 2→**3** | ✅ **Aligné ce lot** (priorité 1 du mandat) — 9→13 articles + 3 tableaux ; détail complet `COMPARAISON-CONTRAT-PRESTA-MSK-v2.md` §6/§9 |
| `attestation_stage_msk` | ATTESTATION_STAGE | `generateAttestationStagePdf` (rh.ts) | 1→**2** | ✅ **Aligné ce lot** — accents + phrases de qualification + ordre des paragraphes |
| `reglement_interieur_msk` | REGLEMENT_INTERIEUR | `generateReglementInterieurPdf` (rh.ts) | 1→**2** | ⚠️ **Partiellement aligné** — résumé enrichi aux 6 vrais chapitres + accents, mais le document intégral (22 articles) reste hors scope du PDF dynamique (voir §4, dette assumée et documentée) |
| `solde_tout_compte_msk` | SOLDE_TOUT_COMPTE | `generateSoldeToutComptePdf` (rh.ts) | 1→**2** | ✅ **Aligné ce lot** — accents restaurés, structure déjà conforme |
| `fiche_paie_msk` | FICHE_PAIE | `generateFichePaiePdf` (rh.ts) | 1→**2** | ✅ **Aligné ce lot** — accents + formule de gross-up (brut reconstitué depuis le net, taux 26,56 %) vérifiée chiffre pour chiffre contre la référence ; reste « indicatif » (Phase 5 Paie officialisera) |

**Versions bumpées dans `prisma/seed.ts`** : `contrat_travail_msk`, `contrat_stage_msk`, `attestation_stage_msk`, `reglement_interieur_msk`, `solde_tout_compte_msk`, `fiche_paie_msk` → `version: 2` ; `contrat_presta_msk` → `version: 3`. Seed exécuté en base (Supabase) le 2026-11-08, comptes `ACTIVE` protégés (voir `auth-password-safety.mdc`).

---

## 3. Commercial (devis/factures/contrats A-B) — vérification sans réécriture

Le lot du **2026-11-06** (voir `docs/guides/SUIVI-GUIDES.md` §8, entrée « Contrats PDF complets ») avait déjà aligné `generateContractPdf` (commercial.ts) sur les 13 articles / sections CDC des 4 PDF de référence contractuels. Ce lot (2026-11-08) a **vérifié** cet alignement (test `test:pdf-contract` toujours vert, lecture du code confirmée) sans le retoucher, et a en plus vérifié `generateCommercialPdf` (devis/factures) contre 4 documents DOCX réels non comparés jusqu'ici :

- Structure déjà conforme : émetteur/client, objet + note de mission, table de lignes avec quantité/PU/montant, totaux HT/TVA/TTC (configurable par ligne pour les factures), bloc conditions, signature, pied de page légal.
- Écarts mineurs **non implémentés, assumés** (pas des oublis — fonctionnalités de collatéral commercial spécifiques, pas des éléments structurels du gabarit) :
  - Pas de **tableau comparatif d'offres** (STANDARD/PRO/PREMIUM) rendu visuellement dans le devis générique (le devis réel `HOTEL COLONNES` en contient un) — l'offre est actuellement portée par les lignes libres, pas une matrice dédiée.
  - Pas de ligne **« solde reporté »** pour la facturation récurrente avec arriéré (cas `FACTURE ECOSOL`, report de 106 800 F du mois précédent) — scénario de facturation récurrente non généralisé dans `CommercialPdfInput`.

---

## 4. Dette assumée et documentée (pas des oublis)

| Document | Écart résiduel | Pourquoi ce n'est pas corrigé ce lot |
|---|---|---|
| `reglement_interieur_msk` | Document intégral (22 articles, 6 chapitres, ~10 pages) non reproduit dans le PDF dynamique | Le texte complet est un document juridique officiel (dress code, charte numérique, procédures disciplinaires détaillées) géré comme document source (GED/intranet), pas recalculé à chaque génération. Le gabarit génère un **résumé fidèle des 6 chapitres + l'accusé signable** (seule partie variable par collaborateur) — transcrire les 22 articles verbatim depuis l'OCR sans relecture humaine aurait introduit un risque de coquilles dans un document à portée disciplinaire/légale. Recommandation : dédier un lot séparé avec le texte source propre (pas l'OCR) si une reproduction intégrale dynamique est requise. |
| `fiche_paie_msk` | Champs "Département" / "État civil" du bulletin officiel non repris | Absents de `RhPersonInput` — ajouter ces champs est une évolution de modèle RH (pas un simple ajustement de rendu), à traiter avec la Phase 5 Paie/INPS déjà planifiée (voir `docs/phases/PHASE-05-PAIE.md`). |
| `contrat_presta_msk` | Grille d'offres packagées, bon de commande, processus de validation de contenus (articles 2/2.1/3 du PDF réel) non transposés | Mission RH individuelle (une personne, pas un abonnement agence→client) — ces clauses n'ont pas d'équivalent sans inventer un mécanisme commercial qui n'existe pas côté RH. Voir adaptation documentée dans `COMPARAISON-CONTRAT-PRESTA-MSK-v2.md` §6 pts 8-9. |
| `devis_standard` / `facture_standard` | Tableau d'offres packagées, ligne « solde reporté » | Cf. §3 — fonctionnalités de collatéral commercial spécifiques à certains clients, pas un écart structurel du gabarit générique. |
| `contrat_travail_msk` | Avantages en nature détaillés, télétravail hebdomadaire fixe, prime de 13ᵉ mois | Politique RH par poste (varie selon le rôle), pas du socle contractuel générique applicable à tout employé — les appliquer en blanc à tout futur contrat serait factuellement incorrect pour des postes différents. |

---

## 5. Tests

| Commande | Résultat |
|---|---|
| `npm run test:pdf-rh` | ✅ 8 PDF générés, assertions étendues (13 articles + 3 tableaux presta, 9 articles travail/stage additionnels, montants fiche de paie exacts, confidentialité réciproque, pas de trou de numérotation) |
| `npm run test:pdf-contract` | ✅ non régressé (13 articles / sections CDC familles A/B) |
| `npx tsc --noEmit` | ✅ aucune erreur |
| `npm run lint` | ✅ aucun nouveau warning |
| `npm run build` | ✅ 103 pages, build complet OK |

Voir aussi `docs/commercial/COMPARAISON-CONTRAT-PRESTA-MSK-v2.md` (détail article par article du gabarit presta) et `docs/guides/SUIVI-GUIDES.md` §8 (entrée 2026-11-08) pour le changelog complet.
