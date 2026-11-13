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
| **C** | « Caisse » historique : **pas** de caisse métier isolée sans ledger — registre **Mouvements** + (complément 2026-11-10) sous-menu **Comptes** (physique / banque). Seed sorties depuis `Suivi_Depenses_Quotidiennes_MSK.xlsx`. |
| **D** | Prosperity FAC-143 vs 122 : **si même facture → une seule**, priorité fichier facture réel. |
| **E** | Miroir paiements → mouvement IN : en V1, **enregistrer un paiement client peut créer** un mouvement `IN` lié (`linkedInvoiceId` / `linkedClientId`) pour la traçabilité. **Pas** de double saisie obligatoire : le paiement facture reste la source de vérité du solde client ; le miroir est optionnel côté action (flag / comportement par défaut ON recommandé). Aucun IN inventé au seed (fichier dépenses = OUT only). |
| **F** | **Comptes** (nom produit) : 2 comptes `sv_accounts` — **physique** + **banque**. Solde courant = Σ mouvements liés (`accountId`) avec `countsTowardBalance=true` (voir **I**). Transfert = 2 mouvements même `transferId`. Source de vérité unique = `sv_cash_movements`. *(Ouverture seed 0 obsolète — remplacée par bascule Direction I.)* |
| **G** | **Paiements / soldes clients (confirmation Direction 2026-11-10)** — voir §8. KOUNDJI & ISDALINIA = **tout payé / reste 0** (compléments datés `2026-11-10` + note « confirmation Direction » si date exacte inconnue). ECOSOL = paiements cash **uniquement** 200 000 (02/10 → FAC-155) + 260 000 (04/11 → 22910263) ; arriéré 106 800 reporté FAC-155→22910263 via écriture `Report facture` (pas un encaissement). Prosperity **387 000** = TTC **FAC-22710262** (pas FAC-122=424 000) ; FAC-122 reste Excel absorbé par report récap. |
| **H** | **Stocks inventaire courant (confirmation Direction 2026-11-11)** — voir §9. Remplace le snapshot Excel ~33 lignes par **18 articles** listés par Direction (quantités exactes). Unités : pièce / paquet / paire / pack / sachet. Codes stables `PAP-` / `ECR-` / `BUR-` / `ALI-` / `HYI-` / `INF-`. Lignes Excel hors liste → **archivées** (`archivedAt`), pas supprimées. Resync soldes forcé via `SV_STOCK_FORCE_QTY=1` (`scripts/fix-suivi-stocks.ts`) — le seed normal ne réécrit pas les qté après go-live. |
| **I** | **Comptes bascule Direction (confirmation 2026-11-12)** — voir §10. Soldes d’ouverture : **physique 145 000** · **banque 204 815** FCFA. Date de bascule = **12/11/2026 début de journée** Bamako (UTC+0 = `2026-11-12T00:00:00.000Z`). Historique antérieur (OUT seed, miroirs pre-bascule…) reste **visible** mais `countsTowardBalance=false` (exclu du solde). Solde courant = écriture d’ouverture IN + mouvements ≥ bascule. Pas de soldes négatifs dus au passé inconnu. |
| **J** | **Charges / factures internes (2026-11-12)** — voir §11. Table **`sv_expense_invoices`** séparée des factures clients. UI **Charges** (`/suivi/charges`). Seed OCR 6 PDF (`docs/`). **Non payées (3)** : Orange oct. CB503620261001, EDM oct., loyer nov. **Payées (3)** : Orange août + sept. (confirmation Direction — passé ; date exacte inconnue → paidAt = échéance + note « soldé selon confirmation Direction (passé) ») ; loyer oct. (OCR « Pour acquit » signé, confirmé). GED `08_SUIVI_TAMPON/charges/{orange\|edm\|loyer}`. Paiement UI peut créer OUT lié (miroir). Script `scripts/fix-suivi-expenses.ts`. |

Lien croisé : [`SPEC.md`](./SPEC.md) · [`docs/intent/module-suivi-tampon.md`](../../intent/module-suivi-tampon.md)

---

## Clarifications closes (2026-11-10 — Étape 0)

Plus de questions **bloquantes** seed/spec. Détail ci-dessous + flags `NEEDS_REVIEW` non bloquants.

| # | Sujet | Verdict seed | Flag / note |
|---|-------|--------------|-------------|
| K1 | KOUNDJI chevauchement sept. FAC-2710261 / FAC-167 | **Seed les 2 fichiers** (décision A) | `NEEDS_REVIEW:KOUNDJI_SEPTEMBER_OVERLAP` — double comptage septembre possible (humain) |
| K2 | Chèque FAC-117 = HT ou TTC ? | Excel documente **100 000** (= HT fichier 2710261) ; complément 18 000 soldé **confirmation Direction 2026-11-10** (décision G) — pas inventé comme chèque Excel | `amountPaid=118000` PAYEE ; notes conservent `NEEDS_REVIEW:KOUNDJI_117_HT_VS_TTC` |
| C1 | Contrat ECOSOL montant mensuel | Re-OCR 2026-11-10 : **200 000 FCFA** lisible (`‘200.000`) | Champ seed `monthlyAmount=200000` ; case offre STANDARD/PRO/PREMIUM encore ambiguë OCR → note `NEEDS_REVIEW:ECOSOL_CONTRACT_OFFER_CHECKBOX` (factures 155/22910263 confirment PREMIUM 200k) |
| M1 | Miroir paiement → IN | **Décision E** — miroir autorisé V1, pas obligatoire | Pas de seed IN |
| G1 | Soldes clients Direction | **Décision G** — KOUNDJI/ISDALINIA/Prosperity reste 0 ; Ecosol reste **153 600** | Voir §8 |

---

## Méthode (appliquée)

Pour chaque conflit : ligne Excel exacte (OOXML Strict / sharedStrings) + contenu fichier (`pdftotext` / XML docx) → comparaison n° / date / client / HT·TVA·TTC / lignes → conclusion + valeur seed.

---

## Tableau synthèse — conflits majeurs

| Conflit | Conclusion | Cause probable | Seed retenir | Notes Excel |
|---------|------------|----------------|--------------|-------------|
| ECOSOL FAC-116 / Excel FAC-06 660k | **Même pièce** | Excel = **HT** ; PDF = **TTC 778 800** | PDF : HT 660 000 · TVA 118 800 · **TTC 778 800** ; payée (reste 0 PDF) | Ligne Facture R16 `FAC-06` G=H=660000 |
| ECOSOL FAC-155 306800 vs 306000 | **Même pièce** | Excel **oublie +800** (TTC réel HT+TVA) | DOCX : **306 800** ; cash 200 000 (02/10) ; reste 106 800 **reporté** sur 22910263 (décision G) → FAC-155 PAYEE via Report | R17 G=306000 H=200000 I=106000 |
| Ecosol 29-10 n° | **Résolu** (humain) | — | N° **22910263** · net **413 600** ; cash **260 000** (04/11) → reste **153 600** | Pas encore de ligne Excel dédiée |
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

**Seed (décision G) :** totaux DOCX **306 800** ; paiement cash **200 000** (02/10/2026) ; arriéré **106 800** reporté sur 22910263 via `Report facture` (FAC-155 PAYEE, sans 2e encaissement inventé).  
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

**Seed exact KOUNDJI V1 (+ décision G 2026-11-10 — tout payé) :**

| Facture | Source | HT / TVA / TTC | amountPaid | Statut | Paiement | Notes |
|---------|--------|----------------|------------|--------|----------|-------|
| FAC-114 | PDF `… N° 04.pdf` | 400k / 72k / **472 000** | **472 000** | PAYEE | Chèque 1179836 (PDF) ; date émission PDF **16/04** (Excel 14/04 → note) | `NEEDS_REVIEW:KOUNDJI_114_DATE_EXCEL` |
| FAC-2710261 | DOCX `… FAC-2710261.docx` | 100k / 18k / **118 000** | **118 000** | PAYEE | Excel chèque **9587411** (100 000) + complément 18 000 daté **2026-11-10** confirmation Direction | `NEEDS_REVIEW:KOUNDJI_117_HT_VS_TTC` + `KOUNDJI_SEPTEMBER_OVERLAP` |
| FAC-167 | DOCX `… SERVICES.docx` | 200k / 36k / **236 000** | **236 000** | PAYEE | **236 000** daté **2026-11-10** confirmation Direction (pas de fichier encaissement) | `NEEDS_REVIEW:KOUNDJI_SEPTEMBER_OVERLAP` |

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

**Paiements / récap (décision G) :** Excel FAC-122 H=300000 I=124000 ; récap 27-10 acomptes 450 000 ; **FAC-22710262 = 387 000** Payée chèque 000038 le **2026-10-30** (humain a pu écrire 30/11 — retenu date Excel/docs).  
**Flag :** humain a associé 387 000 à « FAC-122 » — **écart** : FAC-122 TTC = **424 000** ≠ 387 000 ; 387 000 = TTC **FAC-22710262**. Seed : 387 000 sur 22710262 ; reste 124 000 de FAC-122 absorbé par `Report facture` → 22710262 (évite double-comptage) → Prosperity **reste 0**.

---

### 5. ISDALINIA — arrondi / décimales

**PDF** `FACTURE_ISDALINIA_N° 03.pdf` : total **2 097 952** ; acompte 30 % **629 385,6** ; reste **1 468 566,4**.  
(Check : 2 097 952 × 0,3 = 629 385,6 ✓)

**Excel** R10 : G=2097952 · H=**629385.06000000006** · I=**1468566.04**.

**Cause :** PDF en dixièmes de FCFA ; Excel ≈ **corruption float / saisie .06** au lieu de ,6 — **pas** une autre facture.

**Seed :** total **2 097 952** ; acompte **629 386** (somme-conservant).  
**Décision G :** soldée au **2026-11-10** confirmation Direction → complément **1 468 566**, statut **PAYEE**, reste **0** (date exacte du solde non documentée dans les fichiers).  
`notes` : `NEEDS_REVIEW:ISDALINIA_DECIMAL_FCFA`.

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
| **18 articles stock** (décision H) | Snapshot Excel ~33 hors liste (archivés) ; totaux achats 21300/28050 |

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

## 8. Décision G — paiements / soldes (confirmation Direction 2026-11-10)

**Source :** confirmation humaine Direction (chat 2026-11-10). Pas d’autres encaissements inventés.

### Tableau client → factures → paiements → reste

| Client | Facture | TTC | Paiements (seed) | Reste | Statut |
|--------|---------|-----|------------------|-------|--------|
| **KOUNDJI** | FAC-114 | 472 000 | 472 000 chèque 1179836 | **0** | PAYEE |
| | FAC-2710261 | 118 000 | 100 000 chèque 9587411 (05/08) + 18 000 conf. Direction (10/11) | **0** | PAYEE |
| | FAC-167 | 236 000 | 236 000 conf. Direction (10/11) | **0** | PAYEE |
| **ISDALINIA** | FAC-03 | 2 097 952 | 629 386 acompte + 1 468 566 conf. Direction (10/11) | **0** | PAYEE |
| **ECOSOL** | FAC-116 | 778 800 | 778 800 (PDF acquittée) | **0** | PAYEE |
| | FAC-155 | 306 800 | **200 000** cash 02/10 + **106 800** Report → 22910263 | **0** | PAYEE |
| | 22910263 | 413 600 | **260 000** cash 04/11 | **153 600** | PARTIELLE |
| **PROSPERITY** | FAC-122 | 424 000 | 300 000 Excel + 124 000 Report → 22710262 | **0** | PAYEE |
| | FAC-22710262 | **387 000** | **387 000** chèque 000038 le **30/10/2026** | **0** | PAYEE |
| BOMOYI / DELMORIAN | FAC-01 / 02 | … | déjà acquittées PDF | **0** | PAYEE |

**Soldes client attendus :** KOUNDJI **0** · ISDALINIA **0** · Prosperity **0** · Ecosol **153 600**.

### Raisonnement Ecosol (FAC-155 + 22910263)

1. FAC-155 (02/10) : TTC **306 800** ; versement réel **200 000** le **02/10/2026** → arriéré **106 800**.
2. Facture 29-10 (**22910263**) : prestations mois HT **260 000** + TVA **46 800** = **306 800** TTC mois + report arriéré **106 800** → **NET À PAYER historique 413 600**.
3. Pour ne **pas double-compter** l’arriéré au solde client : écriture `Report facture` 106 800 sur FAC-155 (réf. 22910263) — **pas un encaissement**.
4. Versement réel **260 000** le **04/11/2026** sur 22910263 → reste **413 600 − 260 000 = 153 600**.
5. Aucun autre paiement Ecosol inventé.

### Prosperity — flag 387 000 vs FAC-122

- Humain : « 387 000 payés … facture = FAC-122 ».
- **Écart :** FAC-122 TTC seed/PDF = **424 000** ; **387 000** = TTC **FAC-22710262** (récap 27-10 / Excel).
- Retenu : paiement 387 000 sur **FAC-22710262** (date docs **2026-10-30**) ; FAC-122 soldée via report du reste Excel dans le récap.

**Script correction DB déjà seedée :** `npx tsx --env-file=.env.local scripts/fix-suivi-payments.ts` (resync idempotent ; **ne touche pas** Auth).

---

## 9. Décision H — stocks inventaire Direction (2026-11-11)

**Source :** confirmation humaine Direction (chat 2026-11-11). Priorité = liste humaine comme inventaire courant.

### Unités (choix seed)

| Article | Unité affichée | Packing |
|---------|----------------|---------|
| Crayon noir | **paquet** | 1 paquet = 12 crayons (observation) |
| Piles bouton / petites | **paire** | 6 paires |
| Piles AA | **pack** | 3 packs × 4 piles (observation) |
| Enveloppes 90 g/m² | **pack** | 1 pack = 25 (observation) |
| Sucre 1 kg | **sachet** | 2 sachets |
| Autres | **pièce** | quantité unitaire |

Orthographe : « Scotch » (pas « scoche ») ; « Ôte-agrafes » (staple remover).

### Mapping code → libellé → qté

| Code | Libellé | Unité | Qté |
|------|---------|-------|-----|
| PAP-010 | Règle pour tracer 30 cm | pièce | 1 |
| ECR-010 | Crayon noir | paquet | 1 |
| INF-010 | Souris | pièce | 3 |
| ECR-001 | Stylo bleu | pièce | 7 |
| INF-011 | Casque Logitech (appels) | pièce | 2 |
| INF-012 | Clé USB 4 Go | pièce | 1 |
| INF-013 | Piles bouton / petites (souris) | paire | 6 |
| INF-003 | Piles AA | pack | 3 |
| PAP-011 | Bloc-notes moyen (~20 cm) | pièce | 5 |
| BUR-007 | Scotch | pièce | 1 |
| INF-014 | Support / pose ordinateur | pièce | 1 |
| HYI-008 | Sacs poubelle (petites poubelles) | pièce | 6 |
| ALI-001 | Sucre 1 kg | sachet | 2 |
| BUR-010 | Ôte-agrafes | pièce | 1 |
| PAP-012 | Enveloppes 90 g/m² | pack | 1 |
| BUR-001 | Agrafeuse | pièce | 1 |
| HYI-003 | Mouchoirs 200 feuilles | pièce | 7 |
| INF-015 | PC portable | pièce | 2 |

Codes **réutilisés** depuis Excel quand le sens matchait (ECR-001, BUR-001, BUR-007, ALI-001, HYI-003, HYI-008, INF-003) — libellé / unité / qté mis à jour.

### Ancien inventaire Excel (~33 lignes)

| Action | Codes |
|--------|-------|
| **Conservés / mis à jour** | ECR-001, BUR-001, BUR-007, ALI-001, HYI-003, HYI-008, INF-003 |
| **Archivés** (`archivedAt`) | PAP-001…007 (hors 010–012), ECR-002/003/004/006, BUR-002…005/008, ALI-002/003, HYI-002/004…007, NET-001, INF-001/002, DIV-002 — liste complète `SV_SEED_STOCK_EXCEL_ARCHIVED_CODES` |
| **Créés** | PAP-010/011/012, ECR-010, BUR-010, INF-010…015 |

Pas de hard delete : historique mouvements éventuel conservé. Soft archive hors inventaire UI (`archivedAt IS NULL` sur la liste).

**Script :** `npx tsx --env-file=.env.local scripts/fix-suivi-stocks.ts` (force qté + archive ; **ne touche pas** Auth).

---

## 10. Décision I — bascule Comptes Direction (2026-11-12)

**Source :** confirmation humaine Direction (chat 2026-11-12). Montants = réalité terrain au jour de bascule, **pas** reconstruits depuis l’historique Excel (passé incomplet → soldes négatifs artificiels).

### Montants & instant

| Compte | Solde d’ouverture | Instant |
|--------|-------------------|---------|
| **Physique** (`PHYSICAL`) | **145 000** FCFA | 12/11/2026 **début de journée** Bamako |
| **Banque** (`BANK`) | **204 815** FCFA | idem |

Fuseau : Bamako = UTC+0 → `baselineAt = 2026-11-12T00:00:00.000Z`.

### Modèle technique retenu (B + flag A)

| Élément | Choix |
|---------|--------|
| Approche | **Écriture d’ouverture IN** (réf. `sv-baseline:{KIND}:2026-11-12`) + flag **`countsTowardBalance`** sur chaque mouvement |
| Pre-bascule | `countsTowardBalance=false` — visible en « Historique archivé », **exclu** du solde courant |
| Post-bascule / ouverture | `countsTowardBalance=true` — impacte le solde |
| Meta compte | `sv_accounts.baselineAt` + `baselineBalance` pour l’UI « Solde au 12/11/2026 » |
| Source ledger | Toujours `sv_cash_movements` (décision F enrichie) — pas de 2ᵉ ledger |

**Non retenu :** soft-close / nouveau ledger (C) — trop cassant pour l’UI historique.

### Soldes affichés

- Après bascule, sans nouveau mouvement : **exactement** 145 000 / 204 815.
- Tout crédit/débit/transfert daté ≥ bascule débite/crédite ces soldes.
- Saisie datée **avant** bascule → archivée automatiquement (`countsTowardBalanceForDate`).

**Script DB déjà seedée :** `npx tsx --env-file=.env.local scripts/fix-suivi-accounts-baseline.ts` (idempotent ; **ne touche pas** Auth).

---

## 11. Décision J — charges / factures internes (2026-11-12)

**Besoin :** suivre les factures **fournisseurs** (charges entreprise) distinctement des factures **clients**.

| Élément | Choix |
|---------|--------|
| Modèle | `SvExpenseInvoice` / `sv_expense_invoices` (+ `sv_expense_payments`) |
| UI | Nav / hub **Charges** — libellé simple ; factures clients = **Factures clients** |
| Types | `ORANGE_INTERNET` · `EDM_ELECTRICITE` · `LOYER` · `AUTRE` |
| GED | `/{year}/08_SUIVI_TAMPON/charges/{orange\|edm\|loyer\|autre}` · `DocumentLink` `sv_expense_invoice` |
| Permissions | `sv.expenses.view` / `sv.expenses.manage` |
| Paiement | Enregistrement + miroir OUT optionnel (`linkedExpenseInvoiceId`) |
| Seed | Inventaire §12 — PAYEE uniquement avec preuve OCR **ou** confirmation Direction |
| Fix DB | `npx tsx --env-file=.env.local scripts/fix-suivi-expenses.ts` |

### Statuts paiement — confirmation Direction (2026-11-12)

| N° | Fichier | Statut final | amountPaid | paidAt | Note |
|----|---------|--------------|------------|--------|------|
| CB503620261001 | `facture_CB503620261001.pdf` | **EMISE** (non payée) | 0 | — | Confirmation Direction |
| 455053 | `Fac-edm-octobre.pdf` | **EMISE** (non payée) | 0 | — | Confirmation Direction |
| 2026/01597 | `Fac-location-novembre.pdf` | **EMISE** (non payée) | 0 | — | Confirmation Direction |
| CB503620260901 | `facture_CB503620260901.pdf` | **PAYEE** | 71 390 (= TTC) | 2026-11-13 (= échéance) | soldé selon confirmation Direction (passé) — date exacte inconnue |
| CB503620260801 | `facture_CB503620260801.pdf` | **PAYEE** | 79 113 (= TTC) | 2026-10-12 (= échéance) | soldé selon confirmation Direction (passé) — date exacte inconnue |
| 2026/01435 | `FACTURE_LOYER_OCT_2026-10-08.pdf` | **PAYEE** | 400 000 | 2026-10-08 | OCR Pour acquit + confirmé Direction |

**Règle date :** ne pas inventer une date de paiement exacte inconnue → `paidAt` = échéance (sinon émission) + note Direction. **Pas** de mouvement caisse OUT inventé pour ces soldes passés (compte/mode non documentés).

---

## 12. Décision K — Absences & retards Suivi (2026-11-13)

**Besoin :** tampon Direction pour tracer absences / retards sans polluer ni casser le module RH (`rh_absences`, congés, soldes).

| Élément | Choix |
|---------|--------|
| Modèles | `SvAbsence` / `sv_absences` · `SvLate` / `sv_lates` |
| Collaborateur | FK `rh_employees` (annuaire RH existant — **pas** de 2ᵉ annuaire) |
| Motifs absence | `MALADIE` · `PERSONNEL` · `AUTORISEE` · `FORMATION` · `AUTRE` |
| Statuts absence | `ENREGISTREE` · `JUSTIFIEE` · `NON_JUSTIFIEE` · `ANNULEE` |
| Congés | Flag `deductLeave` + `deductLeaveNote` — **traçabilité seule** ; aucun write `RhLeaveMovement` / solde |
| Justificatif | GED optionnel à la création ; ajoutable en édition → `/{year}/08_SUIVI_TAMPON/rh/absences` · `DocumentLink` `sv_absence` |
| Retards | Date + heure arrivée + heure prévue optionnelle → `minutesLate` calculé |
| UI | `/suivi/absences` · `/suivi/retards` (+ `/nouveau`, fiche, `/edit`) · nav Absences / Retards · hub section « Absences et retards » |
| Permissions | `sv.hr.view` / `sv.hr.manage` (pack Suivi Direction / Admin) |
| Seed | **Aucun** — ne pas inventer de collaborateurs ni d’absences |

---

## Confirmation

- Devis exclus V1 : **oui** (B)  
- Mouvements ≠ caisse métier : **oui** (C)  
- Prosperity : **une** facture branding (122) + récap 22710262 : **oui** (D)  
- Miroir paiement → IN : **oui** (E)  
- Priorité fichier facture : **oui** (A)  
- Paiements / soldes Direction : **oui** (G)  
- Stocks inventaire Direction : **oui** (H)  
- Comptes bascule Direction : **oui** (I)  
- Charges / factures internes : **oui** (J)  
- Absences & retards tampon : **oui** (K)  
- KOUNDJI / contrat ECOSOL / miroir : **clarifiés** (flags review non bloquants)  
- **Aucune data inventée** dans ce document (compléments Direction explicitement notés ; reports = transfert de dette documenté)
