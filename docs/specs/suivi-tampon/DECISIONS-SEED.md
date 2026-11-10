# Décisions seed & résolution conflits — Suivi (tampon)

**Date :** 2026-11-10  
**Règle data :** aucune donnée inventée. Sources = inventaire + extractions ci-dessous.  
**Inventaire :** [`INVENTAIRE-DOCUMENTS.md`](./INVENTAIRE-DOCUMENTS.md)

---

## Décisions humaines (figées)

| Code | Décision |
|------|----------|
| **A** | Conflits montants/refs : **analyser la cause** ; en seed, **priorité au fichier facture** (PDF/DOCX) quand c’est la même pièce. Documenter chaque écart. |
| **B** | **Devis-only (~14) : IGNORER en V1** — pas de devis dans le module Suivi. Seed uniquement clients avec factures / contrats / mouvements / stocks issus des sources retenues. |
| **C** | « Caisse » : **pas de module caisse métier** — juste **retracer tous les mouvements** (entrées/sorties) avec **historique**. Seed sorties depuis `Suivi_Depenses_Quotidiennes_MSK.xlsx`. UI = registre de mouvements + historique. Naming produit : **Mouvements** (trésorerie tampon) ; module menu reste **« Suivi »**. |
| **D** | Prosperity FAC-143 vs 122 : **si même facture → une seule**, priorité fichier facture réel. |
| **E** | Miroir paiements → mouvement IN : en V1, **enregistrer un paiement client peut créer** un mouvement `IN` lié (`linkedInvoiceId` / `linkedClientId`) pour la traçabilité. **Pas** de double saisie obligatoire : le paiement facture reste la source de vérité du solde client ; le miroir est optionnel côté action (flag / comportement par défaut ON recommandé). Aucun IN inventé au seed (fichier dépenses = OUT only). |

Lien croisé : [`SPEC.md`](./SPEC.md) · [`docs/intent/module-suivi-tampon.md`](../../intent/module-suivi-tampon.md)

---

## Clarifications closes (2026-11-10 — Étape 0)

Plus de questions **bloquantes** seed/spec. Détail ci-dessous + flags `NEEDS_REVIEW` non bloquants.

| # | Sujet | Verdict seed | Flag / note |
|---|-------|--------------|-------------|
| K1 | KOUNDJI chevauchement sept. FAC-2710261 / FAC-167 | **Seed les 2 fichiers** (décision A) | `NEEDS_REVIEW:KOUNDJI_SEPTEMBER_OVERLAP` — double comptage septembre possible (humain) |
| K2 | Chèque FAC-117 = HT ou TTC ? | Excel documente **100 000** (= HT fichier 2710261) ; **ne pas inventer** 18 000 TVA encaissés | `amountPaid=100000`, statut **PARTIELLE**, `NEEDS_REVIEW:KOUNDJI_117_HT_VS_TTC` |
| C1 | Contrat ECOSOL montant mensuel | Re-OCR 2026-11-10 : **200 000 FCFA** lisible (`‘200.000`) | Champ seed `monthlyAmount=200000` ; case offre STANDARD/PRO/PREMIUM encore ambiguë OCR → note `NEEDS_REVIEW:ECOSOL_CONTRACT_OFFER_CHECKBOX` (factures 155/22910263 confirment PREMIUM 200k) |
| M1 | Miroir paiement → IN | **Décision E** — miroir autorisé V1, pas obligatoire | Pas de seed IN |

---

## Méthode (appliquée)

Pour chaque conflit : ligne Excel exacte (OOXML Strict / sharedStrings) + contenu fichier (`pdftotext` / XML docx) → comparaison n° / date / client / HT·TVA·TTC / lignes → conclusion + valeur seed.

---

## Tableau synthèse — conflits majeurs

| Conflit | Conclusion | Cause probable | Seed retenir | Notes Excel |
|---------|------------|----------------|--------------|-------------|
| ECOSOL FAC-116 / Excel FAC-06 660k | **Même pièce** | Excel = **HT** ; PDF = **TTC 778 800** | PDF : HT 660 000 · TVA 118 800 · **TTC 778 800** ; payée (reste 0 PDF) | Ligne Facture R16 `FAC-06` G=H=660000 |
| ECOSOL FAC-155 306800 vs 306000 | **Même pièce** | Excel **oublie +800** (TTC réel HT+TVA) | DOCX : **306 800** ; encaissé 200 000 ; reste **106 800** | R17 G=306000 H=200000 I=106000 |
| Ecosol 29-10 n° | **Résolu** (humain) | — | N° **22910263** · net **413 600** | Pas encore de ligne Excel dédiée |
| KOUNDJI n° / dates | **Mapping Excel↔fichiers partiel** | Ancien n° Excel + confusion de lignes | Voir § KOUNDJI | Plusieurs causes |
| Prosperity **143 vs 122** | **Même facture** → **1 seule** | 143 = **version obsolète / brouillon** | **FAC-122** (PDF ×3 MD5 id.) | 143 **absent** Excel |
| Prosperity TTC PDF 424000 vs HT+TVA 424800 | Anomalie **dans le PDF** (+ Excel devis) | TTC PDF/Excel facture **−800** vs 360k+64,8k | Suivre **TTC document facture 424 000** (décision A) | Devis R13 G=424800 |
| ISDALINIA décimales | **Même pièce** | PDF 0,6 F ; Excel float/typo **.06** | PDF : acompte **629 385,6** · reste **1 468 566,4** → entiers FCFA arrondis pour sommer le total | R10 H≈629385.06 I=1468566.04 |
| Achats 21300 vs 28050 | **Erreur formules Excel** | Voir § Achats | **Pas de seed « total achats » inventé** ; snapshot stock = fichier stocks | True sum lignes = **29 850** |

---

## Détail par conflit

### 1. ECOSOL — FAC-116 vs Excel FAC-06 (660 000)

**Excel** (`Facture` R16) :

| Col | Valeur |
|-----|--------|
| B / n° réel | FAC-06 (A vide) |
| C Date | 2026-06-25 |
| D Client | ECOSOL |
| E Devis | DEV-08 |
| G Facturé | **660000** |
| H Encaissé | **660000** |
| I Reste | 0 |
| L Mode | Espèce |
| M Statut | Payée |

**Fichier** `FACTURE_ECOSOL .pdf` :

- N° FACTURE- **116** · émission 25/06/2026  
- Lignes : RS PREMIUM 600 000 + déplacement 60 000  
- HT **660 000** · TVA **118 800** · TTC **778 800**  
- Reste à payer **0** · mode Espèce  

**Conclusion :** même pièce (date, client, prestation, HT). Excel a reporté le **HT** dans « Montant Facturé / Encaissé », pas le TTC.

**Seed :** `legacyNumber` FAC-116 (et FAC-06 en note) ; `totalHt=660000`, `totalVat=118800`, `totalTtc=778800` ; `amountPaid=778800` (acquittée selon PDF).  
`notes` : `NEEDS_REVIEW:ECOSOL_116_EXCEL_HT_NOT_TTC` (écart documenté, pas bloquant).

---

### 2. ECOSOL — FAC-155 (306 800 vs 306 000)

**Excel** R17 : A=FAC-155 · C=2026-10-02 · G=**306000** · H=200000 · I=**106000** · Partiellement · Espèce.

**Fichier** `FACTURE_ECOSOLS NVF N°155.docx` :

- FACTURE-**155** · 02/10/2026  
- HT 260 000 · TVA 46 800 · TTC **306 800**  
(260 000 + 46 800 = 306 800 ✓)

**Recoupement** `FACTURE ECOSOL 29-10-2026.docx` : report « Facture mois précédent **306 800** − versement 200 000 = solde **106 800** ».

**Conclusion :** même pièce. Excel a saisi **306 000 / 106 000** (−800) — même ordre d’écart que Prosperity TTC (−800).

**Seed :** totaux DOCX **306 800** ; paiement 200 000 ; reste dérivé 106 800.  
`notes` : `NEEDS_REVIEW:ECOSOL_155_EXCEL_MINUS_800`.

---

### 3. KOUNDJI — n° / fichiers vs Excel

| Source fichier | N° | Émission | Contenu | TTC |
|----------------|----|----------|---------|-----|
| `FACTURE_KOUNDJI_SERVICES N° 04.pdf` | FAC-**114** | 16/04/2026 | Forfait démarrage | **472 000** |
| `… FAC-2710261.docx` | **FAC-2710261** | **05/08/2026** | RS mois **Septembre** HT 100k | **118 000** |
| `FACTURE ABNMT M_KOUNDJI_SERVICES.docx` | FAC-**167** | **07/10/2026** | RS sept **+** oct (2×100k HT) | **236 000** |

| Excel | Date | Facturé | Encaissé | Alignement |
|-------|------|---------|----------|------------|
| FAC-114 / FAC-04 | 2026-**04-14** | 472000 | 472000 Payée chèque 1179836 | **Même pièce** que PDF 114 (date Excel −2 j vs PDF 16/04) |
| FAC-117 / FAC-04-1 | 2026-**08-05** | **100000** | 100000 Payée chèque 9587411 | **Même pièce probable** que DOCX FAC-2710261 (même date émission) ; Excel = **HT**, n° legacy **117** |
| FAC-153 / FAC-04-2 | 2026-09-25 | 100000 | 100000 (statut vide) | **Pas de fichier** dédié ; mois unitaire — **ne pas inventer** de PDF |
| FAC – 2710261 | 2026-**10-07** | 100000 | (vide) | **Erreur Excel** : n° du DOCX août + **date** du DOCX 167 ; montant ≠ 118k ni 236k |

**Chevauchement septembre (clarifié 2026-11-10, non bloquant) :** FAC-2710261 facture « Septembre » (émission 05/08) ; FAC-167 facture lignes **01/09/2026** + **01/10/2026**. Les deux fichiers facturent septembre → risque double comptage soldes. **Seed les deux** (décision A) + `NEEDS_REVIEW:KOUNDJI_SEPTEMBER_OVERLAP` (`needsHumanReview`).

**Chèque FAC-117 HT vs TTC (clarifié 2026-11-10) :** Excel FAC-117 = date **05/08/2026**, facturé/encaissé **100 000**, chèque **9587411**, statut Payée — aligné date/pièce avec DOCX FAC-2710261 (TTC **118 000**). Excel = **HT** (même pattern ECOSOL 116). Aucune preuve fichier que le chèque couvre la TVA → **ne pas inventer** 18 000.

**Seed exact KOUNDJI V1 :**

| Facture | Source | HT / TVA / TTC | amountPaid | Statut | Paiement | Notes |
|---------|--------|----------------|------------|--------|----------|-------|
| FAC-114 | PDF `… N° 04.pdf` | 400k / 72k / **472 000** | **472 000** | PAYEE | Chèque 1179836 (PDF) ; date émission PDF **16/04** (Excel 14/04 → note) | `NEEDS_REVIEW:KOUNDJI_114_DATE_EXCEL` |
| FAC-2710261 | DOCX `… FAC-2710261.docx` | 100k / 18k / **118 000** | **100 000** | PARTIELLE | Excel FAC-117 chèque **9587411** (100 000) | `NEEDS_REVIEW:KOUNDJI_117_HT_VS_TTC` + `KOUNDJI_SEPTEMBER_OVERLAP` |
| FAC-167 | DOCX `… SERVICES.docx` | 200k / 36k / **236 000** | **0** | EMISE | Aucun paiement documenté | `NEEDS_REVIEW:KOUNDJI_SEPTEMBER_OVERLAP` |

**Exclus :** ligne Excel erronée « FAC – 2710261 » du **07/10** ; **FAC-153** sans fichier (Excel only — note inventaire).

---

### 4. PROSPERITY — FAC-143 vs FAC-122 (**verdict**)

| | FAC-122 | FAC-143 |
|--|---------|---------|
| Fichier | `FACTURE PROSPERITY MANAGEMENT.pdf` (+ `1.pdf`, `2 1.pdf`) MD5 **identique** `cdbef31a…` | `FACTURE  PROSPERITY MANAGEMENT (Logo).docx` |
| N° | **122** | **143** |
| Émission | **28/09/2026** | **25/09/2026** (−3 j) |
| Client / objet | PROSPERITY · Branding & identité visuelle | **identique** |
| Ligne | Qté **3** · PU **120 000** · Montant 360 000 | Qté **3** · PU **360 000** · Montant 360 000 (**PU incohérent** : 3×360k ≠ 360k) |
| HT / TVA / TTC | 360 000 / 64 800 / **424 000** | **mêmes totaux** |
| Excel | Ligne R15 FAC-122 | **Aucune** ligne 143 |
| Récap 27-10 | Réf. explicite **« Facture N°122 »** branding 424 000 | **Jamais cité** |

Fichier annexe : `DEVIS-2 PROSPERITY MANAGEMENT (Logo).docx` — contenu = **FACTURE-122** (PU 120 000 corrects), pas un devis distinct utile au seed factures.

**Verdict :** **même facture logique**. FAC-143 = **version obsolète / brouillon** (date antérieure, PU cassé, hors Excel, hors récap).

**Seed :** **une seule** facture **FAC-122** depuis le PDF (et éventuellement le docx « DEVIS-2 » comme copie GED, pas 2ᵉ facture). **Ne pas** créer FAC-143.

**Anomalie TTC :** 360 000 + 64 800 = **424 800**, mais PDF/DOCX/Excel facture affichent **424 000** (−800). Devis Excel DEV-05-2 (R13) a TTC **424 800**.  
**Seed montants :** TTC **424 000** (fichier facture, décision A) ; note `NEEDS_REVIEW:PROSPERITY_122_TTC_VS_HT_PLUS_VAT_800`.

**Paiements / récap :** Excel FAC-122 H=300000 I=124000 ; récap 27-10 acomptes globaux 450 000 sur 121+122 ; FAC-22710262 solde 387 000 payée. Seed paiements **strictement** depuis Excel/récap sans inventer la ventilation 121 vs 122 au-delà du documenté ; flags review si double comptage solde récap vs lignes.

---

### 5. ISDALINIA — arrondi / décimales

**PDF** `FACTURE_ISDALINIA_N° 03.pdf` : total **2 097 952** ; acompte 30 % **629 385,6** ; reste **1 468 566,4**.  
(Check : 2 097 952 × 0,3 = 629 385,6 ✓)

**Excel** R10 : G=2097952 · H=**629385.06000000006** · I=**1468566.04**.

**Cause :** PDF en dixièmes de FCFA ; Excel ≈ **corruption float / saisie .06** au lieu de ,6 — **pas** une autre facture.

**Seed :** total **2 097 952** ; pour entiers FCFA (stack ERP) : arrondir pour **conserver la somme** → acompte **629 386** + reste **1 468 566** (= 2 097 952), **ou** stocker paiements dérivés du PDF avec note.  
`notes` : `NEEDS_REVIEW:ISDALINIA_DECIMAL_FCFA` (choix d’arrondi figé ici : **half-up sur acompte + complément reste**).

---

### 6. Achats 09/09 — 21 300 vs 28 050

**Détail** (19 lignes montant) : somme arithmétique = **29 850**.

| Sous-total doc | Montant |
|----------------|---------|
| Ticket #014523 | 6 900 |
| Piles China Mali | 900 |
| Facture PNG&F26-6619 | 9 100 |
| China Mali | 4 400 |
| Boutique (boisson 6 750 + sucre 1 800) | 8 550 |
| **Somme réelle** | **29 850** |

**Causes des totaux affichés :**

1. **TOTAL résumé 21 300** = 6 900+900+9 100+4 400 (**Boutique exclue**). Cellule Boutique = texte `8550FCFA` → `SUM` Excel ignore souvent le texte.  
2. **TOTAL GÉNÉRAL détail 28 050** = somme F2:F19 = **tout sauf Sucre** (ligne 20 hors plage de formule).

**Seed V1 :** ne pas inventer un mouvement stock « total achats » ; stocks = snapshot `TABLEAU DE SUIVI DES STOCKS…`. Si import achats plus tard : retenir **lignes détail** (29 850) ou mapping validé — pas les totaux formules cassés.

---

## Périmètre seed V1 (après décisions)

| Inclure | Exclure |
|---------|---------|
| 6 clients facturés | **~14 clients devis-only** (décision B) |
| Factures fichier + Excel alignées selon tableau ci-dessus | FAC-143 ; ligne Excel KOUNDJI 2710261 du 07/10 ; FAC-153 sans fichier (reco) |
| 2 contrats PDF (meta + GED) | Devis comme entités module |
| 34 mouvements **OUT** dépenses | Module « caisse » métier / approvisionnement inventé |
| 32 articles stock | Totaux achats 21300/28050 comme vérité |

**Entrées (IN) mouvements :** aucune ligne IN dans le fichier dépenses. V1 = saisie libre IN en UI + **miroir paiement → IN** autorisé (décision **E**) — sans inventer de flux au seed.

---

## 7. Contrat ECOSOL — montant mensuel (clarifié 2026-11-10)

**Fichier :** `docs/CONTRAT DE PRESTATION DE SERVICES.pdf`  
**Méthode :** re-OCR Tesseract fra @ 200 dpi (page 2).

| Champ | Lecture |
|-------|---------|
| Ligne « Montant mensuel retenu (FCFA) » | OCR : `‘200.000 C` → **200 000 FCFA** |
| Case offre STANDARD / PRO / PREMIUM | Toujours ambiguë (`Offre souscrite : . j -` / marques OCR) |
| Recoupement factures | FAC-155 & **22910263** : ligne RS PREMIUM **200 000** HT/mois (+ déplacement 60k hors abo) |

**Seed contrat meta :**

- `title` = Contrat de prestation de services — Gestion des Réseaux Sociaux  
- `partyName` = ECOSOL · Aboubacar DOUCOURE  
- `effectiveFrom` = 2026-07-01  
- `durationNote` = 3 mois, renouvelable mensuel, préavis 30 jours  
- `monthlyAmount` = **200000** (entier FCFA, OCR lisible — **pas inventé**)  
- `notes` : `NEEDS_REVIEW:ECOSOL_CONTRACT_OFFER_CHECKBOX` (case offre) ; montant confirmé OCR + aligné factures PREMIUM

Si un futur re-scan contredisait le montant → remettre `monthlyAmount` null + note ; **ne pas** inventer un autre chiffre.

---

## Confirmation

- Devis exclus V1 : **oui** (B)  
- Mouvements ≠ caisse métier : **oui** (C)  
- Prosperity : **une** facture (122) : **oui** (D)  
- Miroir paiement → IN : **oui** (E)  
- Priorité fichier facture : **oui** (A)  
- KOUNDJI / contrat ECOSOL / miroir : **clarifiés** (flags review non bloquants)  
- **Aucune data inventée** dans ce document
