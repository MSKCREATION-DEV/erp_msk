# Inventaire factuel — documents module Suivi (tampon)

**Date d’extraction :** 2026-11-10  
**Règle :** uniquement données lues dans les fichiers listés. Aucun client / montant / facture inventé.  
**Légende :** **Fait** = extrait textuellement · **À valider** = conflit, OCR incertain, champ vide, ou interprétation

Méthodes : `pdftotext`, `tesseract` (contrats scannés), `openpyxl` / parse OOXML Strict (xlsx), unzip XML (docx).

---

## 1. Synthèse

| Domaine | Fait (extrait) | À valider / gaps |
|---------|----------------|------------------|
| Clients avec au moins 1 facture documentée | **6** uniques | Variantes de noms (ISDALINIA / ISDALINIA SAS) |
| Clients listés seulement dans le tableau Devis Excel | **+14** (hors des 6) | **V1 : IGNORER** (décision humaine B) — pas de seed devis-only |
| Factures / docs facture (fichiers + lignes Excel) | **~12–15** refs | Conflits analysés → [`DECISIONS-SEED.md`](./DECISIONS-SEED.md) ; n° Ecosol 29-10 = **22910263** |
| Mouvements (dépenses) — pas « caisse métier » | **34** lignes (MSK-…-0001 → 0034) | Pas d’entrées IN dans ce fichier (décision C) |
| Lignes achats 09/09/2026 | **19** lignes détail | Totaux 21 300 / 28 050 = **formules cassées** ; somme lignes = **29 850** |
| Articles stock | **32** codes | Beaucoup à stock 0 ; mapping achats↔codes incomplet |
| Contrats PDF | **2** (ECOSOL + KOUNDJI) | ECOSOL montant mensuel = **200 000** (re-OCR) ; case offre encore ambiguë |

**Décisions seed :** voir [`DECISIONS-SEED.md`](./DECISIONS-SEED.md) (priorité fichier facture · devis exclus · mouvements ≠ caisse · Prosperity 122 seul).

### Clients uniques — factures documentées (Fait)

| # | Client | Contact / notes | Sources |
|---|--------|-----------------|---------|
| 1 | ECOSOL | M. DOUCOURE · Énergie solaire · Bamako | Factures PDF/DOCX + contrat presta + caisse |
| 2 | KOUNDJI SERVICES | M. TRAORÉ · Agence Immobilière · Bamako | Factures PDF/DOCX + contrat engagement + caisse |
| 3 | BOMOYI | M. BOMOYI · France | FAC-01 PDF + Excel |
| 4 | DELMORIAN | M. DELMORIAN · France | FAC-02 PDF + Excel |
| 5 | ISDALINIA | Mme. ISDALINIA · France · Excel : « ISDALINIA SAS » | FAC-03 PDF + Excel |
| 6 | PROSPERITY MANAGEMENT | Mr. TRAORE · Agence de voyage · Bamako | FAC-122 PDF ×3 + DOCX + Excel + caisse |

### Clients Excel « Devis » sans fichier facture dans ce lot — **hors seed V1** (décision B)

FOROTONI · MALI GARDIENNAGE · RENOVISE · SKIN INSTITUT · MY HOSPITALITY CORNER · API MALI · NEXOVIA SARL · SEYBA CAMARA HOLDING · SOW AFRIQUE IMMO · SOUMOTORS · UNIVERSITE MONTPLAISIR · JEEYA SERVICE · GESTION RESEAUX HOTEL RESIDENCE LES COLONNES · Charte Graphique HOTEL RESIDENCE LES COLONNES (ligne devis, peut être même client hôtel).

→ Inventaire conservé pour traçabilité ; **ne pas** créer ces clients ni entités devis dans le module Suivi V1.

---

## 2. Factures — par document source

### 2.1 `FACTURE_BOMOYI_N° 01.pdf` — Fait

| Champ | Valeur |
|-------|--------|
| N° | FACTURE - 01 |
| Émission | 09/01/2026 |
| Validité | 06/02/2026 |
| Client | M. BOMOYI · France |
| Ligne | Conception de site vitrine (Design responsive) · Qté 1 · 524 488 F |
| Total | 524 488 FCFA |
| Paiement | Virement · IBAN ML1810 1001 0043 9122 4101 57 |
| Conditions | 30 % acompte signature devis · 70 % livraison |
| Statut | **FACTURE INTÉGRALEMENT ACQUITTÉE** (virement) |

### 2.2 `FACTURE_DELMORIAN_N° 02.pdf` — Fait

| Champ | Valeur |
|-------|--------|
| N° | FACTURE - 02 |
| Émission | 10/01/2026 |
| Validité | 07/02/2026 |
| Client | M. DELMORIAN · France |
| Ligne | Branding & Identité visuelle · Qté 1 · 524 488 F |
| Total | 524 488 FCFA |
| Statut | **FACTURE INTÉGRALEMENT ACQUITTÉE** (virement) |

### 2.3 `FACTURE_ISDALINIA_N° 03.pdf` — Fait (+ décimales À valider)

| Champ | Valeur |
|-------|--------|
| N° | FACTURE - 03 |
| Émission | 17/01/2026 |
| Validité | 10/02/2026 |
| Client | Mme. ISDALINIA · France |
| Ligne | Conception de site vitrine · Qté 1 · 2 097 952 F |
| Total | 2 097 952 FCFA |
| Acompte reçu (30 %) | 629 385,6 F CFA |
| Reste à payer | 1 468 566,4 F CFA |
| Mode | Virement bancaire |

**À valider :** stocker en centimes ou arrondir à l’entier FCFA (Excel : encaissé 629385.06 / reste 1468566.04 — légère divergence avec PDF).

### 2.4 `FACTURE_KOUNDJI_SERVICES N° 04.pdf` — Fait

| Champ | Valeur |
|-------|--------|
| N° | FACTURE- 114 |
| Émission | 16/04/2026 |
| Validité | 15/05/2026 |
| Client | M. TRAORÉ · KOUNDJI SERVICES · Bamako |
| Lignes forfait démarrage | Site vitrine 110 000 · Charte 90 000 · Logiciel 200 000 · Migration 0 · Formation 0 (TVA 18 % sur payantes) |
| Abonnements (mensuels, options) | Avec engagement 50 000 F/mois · Sans engagement 70 000 F/mois |
| Total HT / TVA / TTC | 400 000 / 72 000 / **472 000** FCFA |
| Règlement | Chèque N° 1179836 (BIM) |
| Reste à payer | **0 F CFA** |

**À valider :** adresse PDF « Cambyse1 » vs autres docs « Gambyla1 » (probable OCR/typo source).

### 2.5 `FACTURE_ECOSOL .pdf` — Fait

| Champ | Valeur |
|-------|--------|
| N° | FACTURE- 116 |
| Émission | 25/06/2026 |
| Validité | 24/07/2026 |
| Client | M. DOUCOURE · ECOSOL · Bamako |
| Lignes | Gestion RS PREMIUM 01/07/2026 · 600 000 · TVA 18 % ; Déplacement 60 000 |
| HT / TVA / TTC | 660 000 / 118 800 / **778 800** FCFA |
| Mode | Espèce |
| Reste à payer | **0 F CFA** |

**Écart Excel résolu (analyse) :** feuille Facture FAC-06 · Montant **660 000** = **HT** du PDF (TTC réel **778 800**). Seed → TTC PDF. Voir [`DECISIONS-SEED.md`](./DECISIONS-SEED.md).

### 2.6 `FACTURE_ECOSOLS NVF N°155.docx` — Fait

| Champ | Valeur |
|-------|--------|
| N° | FACTURE-155 |
| Émission | 02/10/2026 |
| Validité | 01/11/2026 |
| Client | M. DOUCOURE · ECOSOL |
| Lignes | Gestion RS PREMIUM 200 000 ; Déplacement 60 000 |
| HT / TVA / TTC | 260 000 / 46 800 / **306 800** FCFA |

**Écart Excel résolu (analyse) :** Montant facturé Excel **306 000** = TTC fichier **−800** — cause : saisie Excel incomplète. Seed → **306 800** (fichier). Voir [`DECISIONS-SEED.md`](./DECISIONS-SEED.md).

### 2.7 `FACTURE ECOSOL 29-10-2026.docx` — Fait (confirmé humain 2026-11-10)

| Champ | Valeur |
|-------|--------|
| N° | **22910263** (libellé « FACTURE – 22910263 ») |
| Émission | 29/10/2026 |
| Validité | 30/11/2026 |
| Client | ECOSOL (M. DOUCOURE) — Énergie solaire · Bamako, Mali |
| Émetteur | MSK CREATION, ACI 2000, 2e étage, Porte B4, immeuble Gambyla1, Bamako |
| Ligne 1 | Gestion des Réseaux Sociaux — Offre PREMIUM (Facebook, Instagram, TikTok, YouTube, Community Management…) — Qté 1 — PU 200 000 FCFA — TVA 18 % — Montant 200 000 FCFA |
| Ligne 2 | Déplacement sur site – Mission de suivi et création de contenu — Qté 1 — PU 60 000 FCFA — TVA 18 % — Montant 60 000 FCFA |
| Report | Facture mois précédent 306 800 − versement reçu 200 000 = solde restant 106 800 (arriéré septembre 2026) |
| Mois en cours HT / TVA 18 % | 260 000 / 46 800 FCFA |
| **Total NET À PAYER** | **413 600 FCFA** (TTC, arriéré sept. inclus) |
| Notes | Montants FCFA · TVA 18 % Mali · modes paiement Virement · Orange Money · Wave |

**Source n° / totaux :** confirmation utilisateur 2026-11-10 (fichier `FACTURE ECOSOL 29-10-2026.docx`). Gap « n° manquant » **résolu**.

### 2.8 `FACTURE ABNMT M_KOUNDJI_SERVICES.docx` — Fait

| Champ | Valeur |
|-------|--------|
| N° | FACTURE- 167 |
| Émission | 07/10/2026 |
| Validité | 06/11/2026 |
| Client | M. TRAORÉ · KOUNDJI SERVICES |
| Lignes | Gestion RS + maintenance + suivi · 01/09/2026 · 100 000 F/mois ; idem 01/10/2026 |
| HT / TVA / TTC | 200 000 / 36 000 / **236 000** FCFA |

### 2.9 `FACTURE ABNMT M_KOUNDJI_SERVICES FAC-2710261.docx` (NBSP dans le nom) — Fait

| Champ | Valeur |
|-------|--------|
| N° | FAC-2710261 |
| Émission | 05/08/2026 |
| Validité | 04/09/2026 |
| Client | M. TRAORÉ · KOUNDJI SERVICES |
| Ligne | Gestion RS, maintenance site, suivi logiciel · Septembre · 100 000 |
| HT / TVA / TTC | 100 000 / 18 000 / **118 000** FCFA |

**Écart Excel (analyse) :** ligne Excel `FAC – 2710261` date **2026-10-07**, montant **100 000** = **erreur de saisie** (n° du DOCX du 05/08 + date du FAC-167). Ne pas seed cette ligne comme facture distincte. Mapping détaillé → [`DECISIONS-SEED.md`](./DECISIONS-SEED.md).

### 2.10 `FACTURE_KOUNDJI` vs abonnements Excel FAC-117 / FAC-153 — Fait Excel + gap docs

| Excel N° | Date | Montant facturé | Encaissé | Statut |
|----------|------|-----------------|----------|--------|
| FAC-117 (réel FAC-04-1) | 2026-08-05 | 100 000 | 100 000 | Payée · Chèque 9587411 |
| FAC-153 (réel FAC-04-2) | 2026-09-25 | 100 000 | 100 000 | Statut / reste / mode **vides** |

Fichiers DOCX : FAC-167 (236 000) et FAC-2710261 (118 000 TTC). **Mapping :** FAC-117 Excel ≈ FAC-2710261 fichier (même date 05/08, Excel en HT) ; ligne Excel FAC-2710261 du 07/10 = erreur ; FAC-153 sans fichier → hors seed reco. Détail → [`DECISIONS-SEED.md`](./DECISIONS-SEED.md).

### 2.11 Prosperity — PDFs identiques + DOCX

#### `FACTURE PROSPERITY MANAGEMENT.pdf` (= `… 1.pdf` = `… 2 1.pdf`) — Fait

MD5 identique (`cdbef31a9b0a3fe80d015ca0323c99d7`) → **1 facture logique**, 3 copies fichier.

| Champ | Valeur |
|-------|--------|
| N° | FACTURE - 122 |
| Émission | 28/09/2026 |
| Client | Mr. TRAORE · PROSPERITY MANAGEMENT |
| Ligne | Branding & identité visuelle · Qté 3 · 120 000 = 360 000 |
| HT / TVA / TTC | 360 000 / 64 800 / **424 000** FCFA |
| Acompte versé (sur doc) | **0 FCFA** |
| Échéancier note | 30 % signature 127 440 · 70 % livraison 296 560 |

#### `FACTURE  PROSPERITY MANAGEMENT (Logo).docx` — Fait

| Champ | Valeur |
|-------|--------|
| N° | FACTURE - **143** |
| Émission | 25/09/2026 |
| Validité | 24/10/2026 |
| Contenu montants | HT 360 000 · TVA 64 800 · TTC **424 000** (même structure que 122) |
| Acompte | libellé « Acompte » sans montant extrait |

**Décision (2026-11-10) :** FAC-143 = **même facture** que 122 (version obsolète / brouillon : date −3 j, PU incohérent 3×360k, absent Excel, absent récap 27-10). **Seed : FAC-122 seul** (PDF). Voir [`DECISIONS-SEED.md`](./DECISIONS-SEED.md).

#### `FACTURE  PROSPERITY MANAGEMENT 27-10-2026.docx` — Fait (récap)

| Élément | Montant |
|---------|---------|
| Branding (réf. Facture N°122) | 424 000 F |
| Charte (réf. Facture N°121) | 100 000 F |
| Gestion RS (réf. N°121) | 150 000 F |
| Site internet (réf. N°121) | 100 000 F |
| Total factures 121+122 | 837 000 F |
| 1er acompte | −300 000 |
| 2e acompte | −150 000 |
| Total acomptes | −450 000 |
| **Total à payer** | **387 000 FCFA** |

**À valider :** Excel FAC-121 facturé 413 000 (≠ 350 000 HT devis / ≠ somme lignes récap 350 000 HT?) ; Excel FAC-122 encaissé 300 000 / reste 124 000 ; Excel FAC-22710262 = 387 000 Payée chèque 000038 le 2026-10-30.

### 2.12 Tableau Excel — feuille Facture (Fait strict OOXML)

Fichier : `Tableau de Suivi des Devis & Factures Clients.xlsx`  
Note : openpyxl ne lit pas les sheets (OOXML Strict) → parse XML manuel.

| N° facture | N° réel | Date | Client | Devis | Facturé | Encaissé | Reste | Statut / mode |
|------------|---------|------|--------|-------|---------|----------|-------|----------------|
| FAC-01 | FAC-01 | 2026-01-09 | BOMOYI | DEV-01 | 524488 | 524488 | 0 | Payée · Virement |
| FAC-02 | FAC-02 | 2026-01-10 | DELMORIAN | DEV-02 | 524488 | 524488 | 0 | Payée · Virement |
| FAC-03 | FAC-03 | 2026-01-17 | ISDALINIA SAS | DEV-03 | 2097952 | 629385.06 | 1468566.04 | Partiellement · Virement |
| FAC-114 | FAC-04 | 2026-04-14 | KOUNDJI SERVICES | DEV-04 | 472000 | 472000 | 0 | Payée · Chèque 1179836 |
| FAC-117 | FAC-04-1 | 2026-08-05 | KOUNDJI SERVICES | DEV-04-1 | 100000 | 100000 | 0 | Payée · Chèque 9587411 |
| FAC-153 | FAC-04-2 | 2026-09-25 | KOUNDJI SERVICES | DEV-04-2 | 100000 | 100000 | (vide) | (vide) |
| FAC-121 | FAC-05-1 | 2026-08-10 | PROSPERITY MANAGEMENT | DEV-05-1 | 413000 | 150000 | 263000 | Partiellement · Chèque 0000024 |
| FAC-122 | FAC-05-2 | 2026-09-28 | PROSPERITY MANAGEMENT | DEV-05-2 | 424000 | 300000 | 124000 | Partiellement |
| (vide) | FAC-06 | 2026-06-25 | ECOSOL | DEV-08 | 660000 | 660000 | 0 | Payée · Espèce |
| FAC-155 | (vide) | 2026-10-02 | ECOSOL | (vide) | 306000 | 200000 | 106000 | Partiellement · Espèce |
| FAC – 2710261 | (vide) | 2026-10-07 | KOUNDJI SERVICES | (vide) | 100000 | (vide) | (vide) | (vide) |
| FAC-22710262 | (vide) | 2026-10-23 | PROSPERITY MANAGEMENT | DEV-05-1 / 05-2 | 387000 | 387000 | 0 | Payée · Chèque 000038 |

Totaux Excel (ligne Total) : Facturé **6 108 928** · Encaissé **3 460 361,06** · Reste **1 961 566,04** — **À valider** (somme visuelle des lignes / cases vides).

### 2.13 Tableau Excel — feuille Devis (extrait Fait)

Devis **Accepté** avec montants : DEV-01 BOMOYI · DEV-02 DELMORIAN · DEV-03 ISDALINIA SAS · DEV-04/114 KOUNDJI · DEV-05-1/121 PROSPERITY · DEV-08 ECOSOL.

Autres : En attente / montants « - » — utiles pour « à venir » seulement si l’humain confirme l’inclusion (sinon hors seed factures).

Écart notable : DEV-05-2 / DEV-137 Montant TTC Excel **424 800** vs facture 122 TTC **424 000** — **À valider**.

---

## 3. Contrats

### 3.1 `CONTRAT DE PRESTATION DE SERVICES.pdf` — Fait (OCR)

| Champ | Valeur |
|-------|--------|
| Titre | Contrat de prestation de services — Gestion des Réseaux Sociaux |
| Client | **ECOSOL** · Représentant Aboubacar DOUCOURE |
| E-mail client (OCR) | ecosol550@gmail.com |
| Tél. client (OCR) | +1 (541) 539-5031 |
| Adresse client | Grand Marché de Bamako |
| Prestataire | MSK CREATION SARL · Mathieu DIARRA — Gérant |
| Date d’effet | Mercredi 1ᵉʳ Juillet 2026 |
| Durée | 3 mois, renouvelable mensuel, préavis 30 jours |
| Offre | Tableau STANDARD / PRO / PREMIUM (cases OCR ambiguës) |
| Captation vidéo (complément) | 60 000 FCFA sur bon de commande |
| Signatures (p.5) | MSK CRÉATION / ECOSOL |

**Clarifié 2026-11-10 (re-OCR @200 dpi) :** « Montant mensuel retenu (FCFA) » → **200 000 FCFA**. Case offre STANDARD/PRO/PREMIUM encore ambiguë OCR — factures PREMIUM 200k confirment le montant ; flag `NEEDS_REVIEW:ECOSOL_CONTRACT_OFFER_CHECKBOX`.

### 3.2 `CONTRAT D'ENGAGEMENT.pdf` — Fait (OCR)

| Champ | Valeur |
|-------|--------|
| Titre | Contrat d’engagement — Cahier des charges Site Vitrine & Charte graphique |
| Client | **KOUNDJI SERVICES** · M. TRAORÉ — Dirigeant |
| Prestataire | MSK CRÉATION SARL |
| Période | Avril 2026 |
| Contenu | Structure site 6 pages, objectifs diaspora, durée estimée ~3 semaines |
| Signatures (p.5) | MSK / KOUNDJI |

**À valider :** montants contractuels détaillés (pages OCR partielles) — se fier aussi à FAC-114 / devis DEV-04 pour le seed financier.

---

## 4. Mouvements / dépenses (trésorerie tampon — pas « caisse métier »)

**Décision C :** le module Suivi **retrace les mouvements** (entrées/sorties) avec historique ; **pas** de gestion de caisse métier. Naming UI/spec : **Mouvements**. Seed V1 = sorties de ce fichier.

### 4.1 `Suivi_Depenses_Quotidiennes_MSK.xlsx` — Fait

Feuille **Dépenses** : 34 opérations du **2026-10-02** au **2026-11-06**.

Colonnes : Date · Heure · Référence · Catégorie · Description · Client/projet · Bénéficiaire · Montant (FCFA) · Mode · Payé par.

| Réf. | Date | Catégorie | Motif (abrégé) | Client/projet | Montant | Payé par |
|------|------|-----------|----------------|---------------|---------|----------|
| MSK-yy10dd-0001 | 2026-10-02 | Transport / carburant | Ecosol recouvrement | Ecosol | 2 000 | Guiro |
| MSK-yy10dd-0002 | 2026-10-06 | Prospection / RDV | Teravie (prospect Yaye Bah) | Teravie | 8 000 | Guiro |
| MSK-yy10dd-0003 | 2026-10-07 | Transport | Banque Coris | | 2 000 | Guiro |
| MSK-yy10dd-0004 | 2026-10-07 | Prospection / RDV | Niuma Beliza | Niuma Beliza | 3 500 | Guiro |
| MSK-yy10dd-0005 | 2026-10-08 | Transport | Ecosol tournage | Ecosol | 4 000 | Fatimatou |
| MSK-yy10dd-0006 | 2026-10-10 | Transport | Banque Coris versement | | 4 000 | Guiro |
| MSK-yy10dd-0007 | 2026-10-10 | Banque / transfert | Versement Coris | | 70 000 | Guiro |
| MSK-yy10dd-0008 | 2026-10-12 | Repas / eau | Pain | | 500 | Guiro |
| MSK-yy10dd-0009 | 2026-10-12 | Transport | Koundji | Koundji Services | 3 000 | Fatimatou |
| MSK-yy10dd-0010 | 2026-10-14 | Transport | China Mall | | 2 000 | Guiro |
| MSK-yy10dd-0011 | 2026-10-14 | Fournitures | Achats China Mall | | 16 500 | Guiro |
| MSK-yy10dd-0012 | 2026-10-15 | Transport | Ecosol tournage | Ecosol | 1 000 | Fatimatou |
| MSK-yy10dd-0013 | 2026-10-16 | Transport | PPM | PPM | 2 000 | Guiro |
| MSK-yy10dd-0014 | 2026-10-16 | Transport | Imprimerie cartes | | 1 000 | Guiro |
| MSK-yy10dd-0015 | 2026-10-16 | Téléphone / Internet | Internet Espoir | | 7 000 | Guiro |
| MSK-yy10dd-0016 | 2026-10-20 | Transport | INPS | | 1 500 | Guiro |
| MSK-yy10dd-0017 | 2026-10-21 | Transport | INPS | | 1 500 | Guiro |
| MSK-yy10dd-0018 | 2026-10-22 | Transport | Ecosol tournage | Ecosol | 3 000 | Fatimatou |
| MSK-yy10dd-0019 | 2026-10-23 | Transport | PPM | PPM | 4 500 | Fatimatou |
| MSK-yy10dd-0020 | 2026-10-27 | Transport | Koundji | Koundji Services | 2 000 | Fatimatou |
| MSK-yy10dd-0021 | 2026-10-28 | Transport | Koundji terrain | Koundji Services | 7 000 | Fatimatou |
| MSK-yy10dd-0022 | 2026-10-28 | Transport | Koundji recouvrement | Koundji Services | 4 000 | Guiro |
| MSK-yy10dd-0023 | 2026-10-29 | Transport | Ecosol tournage | Ecosol | 1 000 | Fatimatou |
| MSK-yy10dd-0024 | 2026-10-29 | Salaires | Paie Fatimatou | | 165 000 | Guiro |
| MSK-yy10dd-0025 | 2026-10-29 | Salaires | Paie Djouldé Keita | | 70 000 | Guiro |
| MSK-yy10dd-0026 | 2026-10-29 | Salaires | Paie Yaye Bah | | 70 000 | Guiro |
| MSK-yy10dd-0027 | 2026-10-30 | Transport | Prosperity Travel | Prosperity Management | 2 000 | Fatimatou |
| MSK-yy11dd-0028 | 2026-11-02 | Transport | Prosperity BTP | Prosperity Management | 2 000 | Fatimatou |
| MSK-yy11dd-0029 | 2026-11-03 | Transport | INPS | | 1 000 | Guiro |
| MSK-yy11dd-0030 | 2026-11-03 | Transport | Banque Coris | | 1 000 | Guiro |
| MSK-yy11dd-0031 | 2026-11-04 | Transport | Banque Coris | | 1 000 | Guiro |
| MSK-yy11dd-0032 | 2026-11-04 | Banque / transfert | Money Gram Espoir | | 2 000 | Guiro |
| MSK-yy11dd-0033 | 2026-11-05 | Transport | Ecosol tournage | Ecosol | 3 000 | Fatimatou |
| MSK-yy11dd-0034 | 2026-11-06 | Transport | Prosperity tournage | Prosperity Management | 5 000 | Fatimatou |

**Somme sorties (calcul) :** 2 000+8 000+2 000+3 500+4 000+4 000+70 000+500+3 000+2 000+16 500+1 000+2 000+1 000+7 000+1 500+1 500+3 000+4 500+2 000+7 000+4 000+1 000+165 000+70 000+70 000+2 000+2 000+1 000+1 000+1 000+2 000+3 000+5 000 = **473 000 FCFA**

Feuille **Paramètres** (listes) : catégories, modes (Espèces/caisse, OM, Wave, virement…), types d’opération incl. **Approvisionnement caisse** / **Transfert entre caisses** — mais **aucune ligne d’entrée** dans le journal actuel.

**Gap (non bloquant) :** pas de journal d’encaissements clients dans ces fichiers → entrées (IN) V1 = saisie manuelle et/ou lien optionnel aux paiements factures — **sans inventer** de flux. Paramètres Excel « Approvisionnement caisse » = listes techniques du fichier source, **pas** un module caisse à reproduire.

Mentions clients hors des 6 facturés (Teravie, Niuma Beliza, PPM) : **ne pas créer comme clients facturation** ; lier en texte libre « client/projet » sur le mouvement.

---

## 5. Achats & stocks

### 5.1 `Achats_du_09-09-2026.xlsx` — Fait

Date unique **09/09/2026**. Lignes détail (Ticket #014523, China Mali, Facture PNG&F26-6619, Boutique…).

| Document | Total résumé (CFA) |
|----------|---------------------|
| Ticket #014523 | 6 900 |
| Piles / China Mali | 900 |
| Facture PNG&F26-6619 | 9 100 |
| China Mali | 4 400 |
| Boutique | 8 550 |
| **TOTAL résumé** | **21 300** |

**Écart totaux (analyse) :** somme réelle des 19 montants détail = **29 850**. TOTAL résumé **21 300** = docs sans Boutique (cellule `8550FCFA` en texte ignorée par SUM). TOTAL GÉNÉRAL **28 050** = plage F2:F19 **sans Sucre**. Remarque fichier : 3 lignes ticket « Je sais pas » + note « Désolée… ». Détail → [`DECISIONS-SEED.md`](./DECISIONS-SEED.md).

### 5.2 `TABLEAU DE SUIVI DES STOCKS MSK CREATION.xlsx` — Fait

| Code | Famille | Désignation | Unité | Stock | Emplacement |
|------|---------|-------------|-------|-------|-------------|
| PAP-001 | Papeterie | Papier A4 80g | Ramette | **1** | Armoire 1 |
| PAP-002 | Papeterie | Bloc-notes | Unité | 0 | |
| PAP-003 | Papeterie | Cahier 100 pages | Unité | 0 | |
| PAP-004 | Papeterie | Post-it | Bloc | 0 | |
| PAP-006 | Papeterie | Chemise cartonnée Deli | Unité | **8** | Armoire 1 |
| PAP-007 | Papeterie | Pochette plastique | Paquet | **2** | Armoire 1 |
| ECR-001 | Écriture | Stylo bleu | Unité | **3** | Armoire 1 |
| ECR-002 | Écriture | Stylo noir | Unité | **4** | Armoire 1 |
| ECR-003 | Écriture | Stylo rouge | Unité | **2** | Armoire 1 |
| ECR-004 | Écriture | Crayon à papier | Unité | 0 | |
| ECR-006 | Écriture | Marqueur permanent | Unité | 0 | |
| BUR-001 | Bureau | Agrafeuse | Unité | **1** | Armoire 2 |
| BUR-002 | Bureau | Agrafes | Boîte | **1** | Armoire 1 |
| BUR-003–005,008 | Bureau | Perforateur, Ciseaux, Cutter, Élastiques | | 0 (élastiques loc Armoire 2) | |
| BUR-007 | Bureau | Scotch | Rouleau | **1** | Armoire 1 |
| ALI-001–003 | Alimentaire | Sucre, Thé, Café | | 0 | |
| HYI-002–003,006–007 | Hygiène | Essuie-tout, Mouchoirs, Désodorisant, Gel | | 0 | |
| HYI-004 | Hygiène | Savon lave vitre | Bidon | **1** | Armoire 2 |
| HYI-005 | Hygiène | Savon liquide lave | Bidon | **1** | Armoire 2 |
| HYI-008 | Hygiène | Sac poubelle | Rouleau | **2** | Armoire 2 |
| NET-001 | Entretien | Eau de javel | Bidon | **3** | Armoire 2 |
| INF-001–003 | Informatique | Toner, Cartouche, Piles AA | | 0 | |
| DIV-002 | Divers | Étiquettes | Paquet | 0 | |

**Articles avec stock > 0 :** 14 codes · **stock 0 :** 18 codes.

**Gap :** achats du 09/09 (ex. Piles AA, stylos, sacs poubelle, sucre) **non rapprochés automatiquement** aux codes INF-003 / ECR-* / HYI-008 / ALI-001 — seed stocks = snapshot fichier ; mouvements achat = saisie séparée ou mapping manuel **À valider**.

---

## 6. Gaps / conflits — statut (2026-11-10)

Analyse complète + décisions seed : [`DECISIONS-SEED.md`](./DECISIONS-SEED.md).

| # | Sujet | Statut |
|---|-------|--------|
| 1 | ECOSOL FAC-116 TTC 778 800 vs Excel 660 000 | **Tranché** — Excel = HT ; seed TTC PDF |
| 2 | ECOSOL FAC-155 306 800 vs Excel 306 000 | **Tranché** — Excel −800 ; seed DOCX |
| 3 | KOUNDJI FAC-167 / 2710261 vs Excel 117 / 153 / 2710261 | **Clos seed** — 114 + 2710261 (paid 100k PARTIELLE) + 167 (paid 0) ; flags overlap / HT≠TTC ; pas 153 ; pas ligne Excel 07/10 |
| 4 | Prosperity FAC-143 vs 122 | **Tranché** — **même facture → 122 seul** |
| 5 | ISDALINIA décimales | **Analysé** — seed PDF + arrondi entiers somme-conservante |
| 6 | Achats 28 050 vs 21 300 | **Analysé** — formules cassées ; vrai total lignes 29 850 ; pas seed total inventé |
| 7 | Mouvements : sorties seules / entrées V1 | **Clos** — OUT seed ; IN UI + miroir paiement (décision E) ; zéro invention |
| 8 | Contrats : montant mensuel ECOSOL OCR | **Clos** — **200 000 FCFA** (re-OCR) ; case offre flag non bloquant |
| 9 | 14 clients devis-only | **Tranché** — **IGNORER V1** |

**Résolu (2026-11-10, confirmation utilisateur) :** Facture Ecosol 29-10 → n° officiel **22910263** · net 413 600 FCFA (détail §2.7).

---

## 7. Fichiers analysés (checklist)

| Fichier | Statut extraction |
|---------|-------------------|
| FACTURE  ECOSOL 29-10-2026.docx | OK |
| FACTURE_ECOSOL .pdf | OK |
| FACTURE_ECOSOLS NVF N°155.docx | OK |
| Tableau de Suivi des Devis & Factures Clients.xlsx | OK (OOXML Strict) |
| FACTURE_BOMOYI_N° 01.pdf | OK |
| FACTURE_DELMORIAN_N° 02.pdf | OK |
| FACTURE_ISDALINIA_N° 03.pdf | OK |
| FACTURE ABNMT M_KOUNDJI_SERVICES FAC-2710261.docx | OK |
| FACTURE ABNMT M_KOUNDJI_SERVICES.docx | OK |
| FACTURE_KOUNDJI_SERVICES N° 04.pdf | OK |
| FACTURE  PROSPERITY MANAGEMENT (Logo).docx | OK |
| FACTURE  PROSPERITY MANAGEMENT 27-10-2026.docx | OK |
| FACTURE PROSPERITY MANAGEMENT.pdf / 1.pdf / 2 1.pdf | OK (identiques) |
| Suivi_Depenses_Quotidiennes_MSK.xlsx | OK |
| Achats_du_09-09-2026.xlsx | OK |
| TABLEAU DE SUIVI DES STOCKS MSK CREATION.xlsx | OK |
| CONTRAT DE PRESTATION DE SERVICES.pdf | OK OCR (partiel montants) |
| CONTRAT D'ENGAGEMENT.pdf | OK OCR (partiel) |

**Confirmation :** aucune donnée inventée dans cet inventaire.  
**Décisions seed / résolution conflits :** [`DECISIONS-SEED.md`](./DECISIONS-SEED.md).
