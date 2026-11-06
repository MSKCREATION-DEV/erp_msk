# Analyse des modèles de contrats MSK CREATION

**Date :** 2026-11-06  
**Source :** extraction texte (pdftotext + OCR Tesseract `fra`) — **aucune modification applicative**.  
**Objectif :** paramétrer la génération de documents / templates Commercial dans l’ERP MSK.

| Fichier | Méthode | Pages |
|---|---|---|
| `docs/CONTRAT DE PRESTATION DE SERVICES.pdf` | OCR (scan) | 5 |
| `docs/MODELE CONTRAT GESTION DES RESEAUX SOCIAUX (1).pdf` | pdftotext | 5 |
| `docs/02_Contrat d'engagement Application Web.pdf` | pdftotext | 7 |
| `docs/CONTRAT D'ENGAGEMENT.pdf` | OCR (scan) | 5 |

> **Note OCR :** le scan « Prestation » / « Engagement » peut contenir des artefacts (caractères manquants sur tableaux). Les titres d’articles et clauses juridiques ont été recoupés avec le modèle texte extractible (réseaux sociaux) et le CDC Application Web.

---

## Vue d’ensemble — 2 familles de documents

Les 4 PDF se regroupent en **deux familles** :

| Famille | Nature | PDFs concernés |
|---|---|---|
| **A — Contrat de prestation (abonnement / forfait)** | Contrat juridique articlé + grille d’offre + annexes | Prestation de services (ECOSOL) · Modèle Réseaux sociaux |
| **B — Contrat d’engagement / Cahier des charges (projet)** | CDC projet + planning + livrables + renvoi CGV | Application Web (KOUNDJI) · Site vitrine & charte (KOUNDJI) |

Les deux PDFs « Réseaux sociaux » partagent **la même ossature juridique** (Articles 1–13) ; le premier est une **instance remplie**, le second un **modèle / devis joint**.

Les deux PDFs « Engagement » partagent **la même ossature CDC** (contexte → objectifs → périmètre → planning → ressources client → conditions + signature) ; l’un cible une **app métier**, l’autre un **site vitrine + charte**.

---

## 1. `CONTRAT DE PRESTATION DE SERVICES.pdf`

### 1.1 Type / finalité

- **Type :** Contrat de prestation de services — **Gestion des réseaux sociaux** (instance client).
- **Finalité :** Encadrer abonnement community management / contenus / validation / paiement / IP / résiliation.
- **Client (rempli) :** ECOSOL — Aboubacar DOUCOURE — Grand Marché de Bamako.
- **Date d’effet (OCR) :** Mercredi 1er juillet 2026 · **Montant :** ~200 000 FCFA / mois · Offre type PRO/PREMIUM (cases OCR partielles).

### 1.2 Plan des sections (titres)

1. En-tête marque + titre + méta (date d’effet, durée, droit applicable)
2. **Entre les soussignés** — Prestataire / Client
3. **Article 1** — Objet
4. **Article 2** — Offre souscrite et prestations (+ tableau STANDARD / PRO / PREMIUM)
5. **Article 2.1** — Prestations complémentaires (déplacement, captation photo/vidéo)
6. **Article 3** — Processus de validation et accès
7. **Article 4** — Durée et résiliation (4.1–4.4)
8. **Article 5** — Rémunération et modalités de paiement
9. **Article 6** — Obligations du Prestataire
10. **Article 7** — Obligations du Client
11. **Article 8** — Propriété intellectuelle
12. **Article 9** — Confidentialité
13. **Article 10** — Protection des données personnelles (APDP Mali)
14. **Article 11** — Responsabilité et force majeure
15. **Article 12** — Droit applicable et règlement des litiges (+ avenants / séparabilité)
16. **Article 13** — Signatures (+ Annexe 1 devis)
17. Pied de page récurrent (adresse, NIF/SIRET, contacts)

### 1.3 Champs / paramètres variables

| Zone | Champs |
|---|---|
| Méta contrat | `dateEffet`, `dureeInitiale`, `renouvellement`, `preavisJours`, `droitApplicable`, `juridiction` |
| Prestataire | raison sociale, forme, SIRET/NIF, siège, représentant, e-mail, téléphone |
| Client | nom/raison sociale, forme, NINA/RCCM, adresse, représentant, e-mail, téléphone |
| Offre | `offreCode` (STANDARD\|PRO\|PREMIUM), publications/mois, réseaux, visuels/vidéos, CM fréquence, rapport, audit/appels, ads inclus, `montantMensuelFcfa` |
| Compléments | lignes barème (type, tarif 3 mois, statut bon de commande) |
| Validation | délai validation contenus (ici **72 h** ouvrées), délai fourniture accès admin (ici **48 h**), délégation validation, canal (dossier cloud MSK) |
| Paiement | facturation mensuelle (avant le 5), acompte 50 % 1er mois, modes (virement / OM / Wave / chèque), pénalité retard 1 %/semaine, suspension |
| Résiliation | préavis 30 j, mise en demeure 15 j, restitution accès 48 h |
| PI / conf / données | clauses standards (durée conf. 5 ans, APDP, rôles RT / sous-traitant) |
| Responsabilité | plafond = sommes 3 derniers mois ; exclusion perf. commerciales / algos / FM |
| Signature | lieu, date, 2 exemplaires, « Lu et approuvé », Annexe 1 |

---

## 2. `MODELE CONTRAT GESTION DES RESEAUX SOCIAUX (1).pdf`

### 2.1 Type / finalité

- **Type :** **Modèle** de contrat de prestation — Gestion des réseaux sociaux (champs client à compléter).
- **Finalité :** Template commercial réutilisable + grille d’offres packagées + devis Annexe 1.
- **Instance exemple :** PROSPERITY MANAGEMENT MALI / SIRIMAN SISSOKO (bloc signatures) · Date d’effet Mardi 1er septembre 2026 · **150 000 FCFA / mois**.

### 2.2 Plan des sections (titres)

Identique à §1.2 (Articles 1–13) — document de référence textuel propre.

Différences de valeurs vs instance ECOSOL :

| Paramètre | Modèle (extractible) | Instance Prestation (OCR) |
|---|---|---|
| Date d’effet | 01/09/2026 | 01/07/2026 |
| Montant mensuel | 150 000 FCFA | ~200 000 FCFA |
| Délai validation contenus | **24 h** ouvrées | **72 h** ouvrées |
| Délai accès admin | **24 h** après signature | **48 h** |
| Obligation client validation | 48 h ouvrées (Art. 7) | 48 h ouvrées |
| Client | (vide / signatures Prosperity) | ECOSOL |

### 2.3 Champs / paramètres variables

Même modèle que §1.3, avec **client souvent vide** (placeholders) et **offre cochée** dans le tableau packagé.  
Annexe 1 = devis signé ; **le devis prévaut** en cas de contradiction avec l’Article 2.

---

## 3. `02_Contrat d'engagement Application Web.pdf`

### 3.1 Type / finalité

- **Type :** **Contrat d’engagement / Cahier des charges** — Application web de gestion locative.
- **Finalité :** Fixer le périmètre fonctionnel, planning, ressources client, recette, hors-périmètre ; engagement mutuel sous CGV + référence devis/contrat `MSK-CONTRAT-2026-114`.
- **Client :** KOUNDJI SERVICES — M. TRAORÉ — Bamako · Avril 2026.

### 3.2 Plan des sections (titres)

1. Couverture — titre, sous-titre projet, client, mois
2. **1 — Contexte et problématiques** (client, interlocuteur, localisation, outils actuels, prestataire)
   - 1.1 Problèmes identifiés
   - 1.2 Vision cible
3. **2 — Objectifs fonctionnels**
4. **03 — Modules fonctionnels** (Modules 1–6 : biens, agents, contrats, loyers, dépenses, ventilation)
5. **04 — Fonctionnalités incluses** (architecture, mobile, hébergement, sécu, perf, langues…)
6. **05 — Gestion des accès et rôles utilisateurs** (Admin / Gestionnaire / Agent / Propriétaire)
7. **06 — Planning d’exécution** (étapes 01–07 + durée totale)
8. **07 — Ressources à fournir par le client**
9. **08 — Critères de recette et validation**
10. **09 — Hors périmètre – non inclus**
11. **10 — Conditions contractuelles** (renvoi **CGV** ; maintenance ; devis complémentaires)
12. Bloc **Validation et approbation** + signatures + n° contrat
13. Pied de page récurrent

### 3.3 Champs / paramètres variables

| Zone | Champs |
|---|---|
| Projet | `titreProjet`, `sousType` (app web / …), `moisAnnee`, `numeroContrat` (ex. MSK-CONTRAT-2026-114) |
| Parties | client (raison + activité), interlocuteur + fonction, localisation, prestataire |
| Contexte | outils actuels, problèmes (liste), vision cible (texte) |
| Objectifs | liste d’objectifs fonctionnels |
| Modules / périmètre | modules[] { titre, fonctionnalités[] } ; mention « une phase » / devis complémentaire hors scope |
| Specs techniques | architecture, mobile, users max, techno (choix prestataire), BDD, hébergement, backup, sécu, perf, langues |
| Rôles | matrice rôle × accès × description |
| Planning | étapes[] { n°, nom, contenu, durée } ; `dureeTotaleEstimee` ; règle de décalage si retard client |
| Fenêtre calendaire | `dateDebutPhase`, `dateFinPhase` (ex. 20/04 → 10/07/2026) |
| Ressources client | lignes { ressource, description, délai } |
| Recette | délai validation (7 j ouvrés), validation tacite, canal échanges (dossier partagé), devis hors périmètre |
| Hors périmètre | liste (vitrine, app native, intégrations, compta certifiée, langues, formations extra…) |
| Conditions | renvoi CGV (paiement, réalisation, responsabilités, résiliation, maintenance) ; **CGV prévalent** vs CDC |
| Livrables annexes | guide utilisateur, formation, proposition contrat maintenance |
| Signature | prestataire (gérant), client, dates, « Lu et approuvé » |

---

## 4. `CONTRAT D'ENGAGEMENT.pdf`

### 4.1 Type / finalité

- **Type :** **Contrat d’engagement / Cahier des charges** — **Site vitrine & chartes graphiques**.
- **Finalité :** Périmètre site immobilier + charte, planning court (~3 semaines), ressources contenus, CGV.
- **Client :** KOUNDJI SERVICES (même affaire `MSK-CONTRAT-2026-114`, phase 1).

### 4.2 Plan des sections (titres)

1. Couverture — CONTRAT D’ENGAGEMENT · Cahier des charges Site Vitrine & Chartes graphique
2. **01 — Contexte du projet**
3. **02 — Objectifs du site**
4. **03 — Structure du site** (pages 1–6 : Accueil → Contact ; mention maintenance catalogue)
5. **04 — Fonctionnalités incluses** (navigation, contact, biens, SEO)
6. **05 — Livrables** (site, mise en ligne, hébergement MSK, chartes)
7. **06 — Planning d’exécution** (cadrage → mise en ligne ; 2 cycles de corrections inclus)
8. **07 — Ressources à fournir par le client**
9. **08 —** *(section non lue de façon fiable à l’OCR — probable « Critères de recette » et/ou « Hors périmètre », comme sur le CDC App Web ; à confirmer sur original)*
10. **09 — Conditions contractuelles** (CGV prévalent)
11. Validation / signatures + référence devis/contrat
12. Pied de page

### 4.3 Champs / paramètres variables

| Zone | Champs |
|---|---|
| Projet | type = site vitrine + charte ; client ; mois ; n° contrat |
| Contexte | besoin (présence en ligne, biens, diaspora) |
| Objectifs | liste marketing / SEO |
| Structure site | pages[] { ordre, titre, description } |
| Fonctionnalités | groupes (navigation, contact, biens, visibilité) |
| Livrables | liste numérotée (incl. **charte graphique**) |
| Planning | étapes courtes (jours) ; durée totale ~3 semaines ; cycles corrections = 2 |
| Calendrier phase | ex. 20/04 → 08/05/2026 |
| Ressources client | textes, photos agence/biens, coordonnées, RS, texte Diaspora, référent |
| Conditions / signature | idem famille B (CGV, référent projet, signatures) |

---

## 5. Chevauchements vs clauses uniques

### 5.1 Commun aux 4 (socle MSK)

| Élément | Présent |
|---|---|
| Identité prestataire MSK CRÉATION SARL | Oui (SIRET/NIF `085156924A`, ACI 2000 Bamako, contacts) |
| Tagline « Agence de communication et de création digitale » | Oui |
| Pied de page adresse / e-mail / tél. Mali + FR | Oui |
| Parties Prestataire / Client + représentants | Oui |
| Signature « Lu et approuvé », Bamako, dates | Oui |
| Ton professionnel francophone, droit malien / Bamako (explicite famille A ; implicite via CGV famille B) | Oui |
| Renvoi devis / n° contrat / annexe | Oui (Annexe 1 ou MSK-CONTRAT-…) |

### 5.2 Commun famille A (prestation / réseaux) — pas dans les CDC purs

- Articles juridiques complets (objet → litiges)
- Grille d’**offres packagées** (STANDARD / PRO / PREMIUM)
- Abonnement **mensuel** + renouvellement tacite + préavis 30 j
- Processus **validation contenus** + accès admin comptes
- **Obligation de moyens** (pas de résultat commercial)
- PI contenus jusqu’à paiement intégral
- Confidentialité **5 ans** post-contrat
- **APDP** Mali (loi 2013-015) — RT client / sous-traitant MSK
- Plafond responsabilité **3 mois** de sommes perçues
- Force majeure (48 h info / 30 j résiliation)
- Conciliation amiable **30 j** puis tribunaux Bamako
- Pénalités retard 1 %/semaine + modes OM / Wave
- Prestations complémentaires sur **bon de commande**

### 5.3 Commun famille B (engagement / CDC) — pas dans le contrat réseaux « pur »

- Structure **CDC** numérotée (contexte, objectifs, périmètre détaillé)
- **Planning** par étapes + durée totale estimée
- **Ressources à fournir par le client** (bloquantes)
- Critères de **recette** / validation tacite (App Web : 7 j)
- **Hors périmètre** explicite (App Web ; à confirmer Site)
- Renvoi **CGV MSK** qui **prévalent** sur le CDC
- Proposition / mention **contrat de maintenance**
- Formation / guide utilisateur (App Web)
- Matrice **rôles & accès** (App Web) ou **structure de pages** (Site)
- Fenêtre calendaire de phase + n° `MSK-CONTRAT-YYYY-NNN`

### 5.4 Uniques par modèle

| Document | Spécifique |
|---|---|
| Réseaux (A) | Packs pubs/visuels/CM/Ads ; validation 24–72 h ; barème captation |
| App Web (B) | 6 modules métier immobilier ; users ≤ 25 ; migration Excel ; ventilation financière ; hors-périmètre (vitrine, native, compta…) |
| Site vitrine (B) | Pages Diaspora / WhatsApp / SEO local ; livrable **charte** ; planning ~3 sem. ; 2 cycles corrections |
| Instance vs modèle A | Valeurs client, montant, délais validation/accès |

### 5.5 Lien croisé métier (KOUNDJI)

Les deux CDC KOUNDJI se **complètent** sous le même n° contrat `MSK-CONTRAT-2026-114` :

- Phase 1 ≈ Site vitrine + charte  
- Phase 2 ≈ Application web gestion locative  

Le CDC App Web exclut explicitement le « Site vitrine (objet du CDC Site Vitrine — document séparé) ».

---

## 6. Modèle unifié de paramètres — ERP MSK

Cible : un **document généré** (PDF/DOCX) à partir d’une opportunité / devis / offre commerciale, avec **template family** + blocs conditionnels.

### 6.1 Discriminant racine

```text
ContractDocument
├── family: "prestation_abonnement" | "engagement_cdc"
├── serviceKind: "reseaux_sociaux" | "application_web" | "site_vitrine" | "charte_graphique" | "autre"
├── brand: MSK_CREATION (fixed)
└── legalTone: "formal_fr_ml"  // droit malien, Bamako, CGV/APDP
```

### 6.2 Sections à supporter (catalogue template)

| ID section | Famille | Obligatoire | Contenu généré |
|---|---|---|---|
| `cover` | A+B | oui | Titre, sous-titre, client, mois/année, logo MSK |
| `meta_header` | A | oui | dateEffet, durée, droit, juridiction |
| `parties` | A+B | oui | Prestataire (souvent fixe) + Client |
| `article_objet` | A | oui | Objet lié à `serviceKind` |
| `offre_pack` | A | si abonnement | Matrice packs + offre cochée + montant |
| `prestations_complementaires` | A | optionnel | Barème BC |
| `validation_acces` | A | oui (contenus) | Délais, canal cloud, délégation |
| `duree_resiliation` | A | oui | Initiale, tacite, préavis, manquement, effets |
| `remuneration` | A | oui | Facturation, acompte, modes, pénalités |
| `obligations_prestataire` | A | oui | Diligence, charte client, conf., obligation de moyens |
| `obligations_client` | A | oui | Fournitures, validation, paiement |
| `propriete_intellectuelle` | A | oui | Transfert après paiement |
| `confidentialite` | A | oui | Durée post-contrat |
| `donnees_personnelles` | A | oui | APDP, RT / sous-traitant |
| `responsabilite_fm` | A | oui | Plafond, exclusions, FM |
| `droit_litiges` | A | oui | Amiable + Bamako + avenants |
| `contexte` | B | oui | Parties projet + problème / vision |
| `objectifs` | B | oui | Liste |
| `perimetre_modules` **ou** `structure_pages` | B | selon serviceKind | Modules app **ou** arborescence site |
| `fonctionnalites_incluses` | B | oui | Specs / features |
| `roles_acces` | B | si app | Matrice RBAC |
| `livrables` | B | oui | Liste |
| `planning` | B | oui | Étapes + durée totale + fenêtre calendaire |
| `ressources_client` | B | oui | Checklist + délais |
| `recette` | B | recommandé | Délai, tacite, canal |
| `hors_perimetre` | B | recommandé | Liste + devis complémentaire |
| `conditions_cgv` | B | oui | Renvoi CGV + primauté CGV |
| `maintenance_mention` | B | optionnel | Proposition maintenance / évolutions |
| `signatures` | A+B | oui | 2 blocs + « Lu et approuvé » + lieu/date |
| `annexes` | A+B | oui | Devis signé, n° contrat, éventuellement CGV |
| `footer_brand` | A+B | oui | Adresse / NIF / contacts |

### 6.3 Schéma de champs unifié (proposé)

```yaml
# Identité document
document:
  family: prestation_abonnement | engagement_cdc
  serviceKind: reseaux_sociaux | application_web | site_vitrine | charte_graphique | bundle
  title: string
  subtitle: string?
  contractNumber: string?          # MSK-CONTRAT-YYYY-NNN
  quoteRef: string?                # Annexe 1 / devis
  language: fr
  currency: FCFA
  copies: 2
  placeOfSignature: Bamako

# Marque / prestataire (defaults ERP)
provider:                          # souvent figé en config org
  legalName: MSK CREATION
  legalForm: SARL
  taxId: "085156924A"              # SIRET / NIF
  address: string
  country: "République du Mali"
  representativeName: string
  representativeTitle: Gérant
  email: string
  phones: string[]
  tagline: "Agence de communication et de création digitale"

# Client
client:
  legalName: string
  legalForm: string?
  registryIds:                     # NINA / RCCM
    nina: string?
    rccm: string?
  activityLabel: string?           # ex. Agence Immobilière
  address: string?
  city: string?
  country: string?
  contactName: string
  contactTitle: string?
  email: string?
  phone: string?

# Offre / pricing (famille A + montants B via devis)
commercial:
  offerTier: STANDARD | PRO | PREMIUM | CUSTOM | null
  offerMatrix:                     # packs réseaux
    - tier: STANDARD
      publicationsPerMonth: number
      networks: string[]
      visualsVideos: string
      communityManagement: string
      monthlyReport: string
      auditCalls: string
      adsIncluded: boolean
  monthlyAmount: number?
  complementaryServices:
    - type: string
      amount: number?
      status: "sur_bon_de_commande"
  billing:
    frequency: monthly | milestone | custom
    invoiceDayRule: string?        # avant le 5
    depositPercent: number?        # 50
    paymentMethods: [virement, orange_money, wave, cheque]
    latePenaltyPercentPerWeek: number?
    suspendOnLate: boolean?

# Durée / résiliation (surtout A ; B via CGV)
term:
  startDate: date?
  initialMonths: number?
  autoRenew: boolean?
  renewPeriodMonths: number?
  noticeDays: number?
  curePeriodDays: number?          # mise en demeure
  accessReturnHours: number?
  contentValidationHours: number?
  adminAccessHours: number?
  acceptanceDays: number?          # recette CDC

# Périmètre projet (surtout B)
scope:
  contextProblems: string[]
  vision: string?
  objectives: string[]
  modules:
    - name: string
      features: string[]
  pages:
    - order: number
      name: string
      description: string
  includedFeatures:                # key/value ou listes groupées
    - group: string
      items: string[]
  roles:
    - role: string
      accessLevel: string
      description: string
  deliverables: string[]
  outOfScope: string[]
  technicalDefaults:               # app web
    architecture: string?
    maxUsers: number?
    hosting: string?
    languages: string[]

# Planning
schedule:
  phases:
    - number: number
      name: string
      content: string
      durationLabel: string
  totalDurationLabel: string?
  windowStart: date?
  windowEnd: date?
  correctionCyclesIncluded: number?
  delayRule: string?               # retard client décale planning

# Obligations client (ressources)
clientObligations:
  - resource: string
    description: string
    dueLabel: string

# Légal partagé
legal:
  governingLaw: "Droit malien"
  jurisdiction: "Juridictions de Bamako"
  amicableDays: 30
  confidentialityYearsAfter: 5
  liabilityCapMonths: 3
  personalDataLawRef: "loi n° 2013-015 du 21 mai 2013 (APDP)"
  meansNotResults: boolean         # true pour marketing / RS
  cgvPrevailOverCdc: boolean       # true famille B
  forceMajeureNotifyHours: 48
  forceMajeureTerminateDays: 30

# Signature
signatures:
  providerSignedAt: date?
  clientSignedAt: date?
  providerStatement: "Lu et approuvé"
  clientStatement: "Lu et approuvé"
```

### 6.4 Règles de génération recommandées

1. **`family` pilote le template** : ne pas mélanger Articles 1–13 et sections CDC dans le même rendu sans mode `bundle`.
2. **Devis / Annexe 1** : lier `quoteRef` dès qu’un devis existe ; pour A, **devis > Article offre** ; pour B, **CGV > CDC**.  
   *Arbitrage ERP (plan Client/Contrat Q3) :* la **composition commerciale** (lignes / offres / abo / montants) est une shape unique — préremplie depuis un devis `ACCEPTE` (éditable) **ou** construite in-flow sans devis ; le contrat consomme toujours cette shape. Voir [`PLAN-CLIENT-CONTRAT.md`](./PLAN-CLIENT-CONTRAT.md) §4.2.
3. **Prestataire** = données organisation ERP (éditable admin, pas saisi à chaque contrat).
4. **Client** = fiche compte / opportunité CRM.
5. **`serviceKind`** sélectionne blocs : `offre_pack` (RS), `modules`+`roles` (app), `pages`+`livrables` charte (site).
6. Montants toujours en **FCFA** ; modes de paiement locaux (OM / Wave) supportés.
7. Délais (validation, accès, recette) = **paramètres numériques** — les modèles montrent déjà de la variance (24 / 48 / 72 h).
8. Numérotation `MSK-CONTRAT-YYYY-NNN` + phases (1 site / 2 app) pour dossiers multi-documents.

---

## 7. Contraintes de ton / marque / légal visibles

| Contrainte | Observation |
|---|---|
| **Marque** | En-tête « MSK CREATION » + tagline communication / création digitale ; pied systématique contacts Bamako + FR |
| **Identifiants** | NIF/SIRET `085156924A` ; e-mails `contact@mskcreation.net` / parfois `.com` (à harmoniser en ERP) |
| **Langue** | Français professionnel, formulations contractuelles classiques (« Entre les soussignés », « Lu et approuvé ») |
| **Droit** | Droit **malien**, litiges **Bamako** ; APDP 2013-015 ; pas de droit français / OHADA explicite hors Mali |
| **Responsabilité** | Obligation de **moyens** (RS) ; plafond 3 mois ; exclusion algos plateformes / résultats commerciaux |
| **CGV** | Sur les CDC, les CGV **prévalent** — l’ERP doit pouvoir attacher / versionner les CGV |
| **Design doc** | Documents « print » multi-pages avec footer répété ; pas de ton marketing « AI » ; sobriété agence |
| **Monnaie / paiement** | FCFA ; virement + mobile money maliens |
| **Process** | Validation via **dossier cloud MSK** ; référent projet client obligatoire sur les CDC |

---

## 8. Implications planning ERP (Commercial)

Sans implémenter ici — pistes pour la phase génération docs.  
**Plan d’exécution :** [`PLAN-CLIENT-CONTRAT.md`](./PLAN-CLIENT-CONTRAT.md) (Q3 composition/contrat **décidée** ; autres Q encore ouvertes ; **pas d’implémentation** sans go).

1. Entité `ContractTemplate` (family + serviceKind + schema Zod des champs §6.3).
2. Entité `GeneratedContract` liée à `Opportunity` / `Quote` / `Account` (`ComClient`) — via composition commerciale unique (§4.2 du plan).
3. Blocs conditionnels + annexes (devis PDF, CGV PDF).
4. Packs STANDARD/PRO/PREMIUM comme catalogue d’offres Commercial (RS) — alimentent l’étape Composition.
5. Bibliothèque de modules / pages réutilisables pour CDC app & site.
6. Harmoniser e-mail `.net` vs `.com` et libellé SIRET vs NIF dans la config org.

---

## 9. Synthèse exécutive

| PDF | Famille | Rôle |
|---|---|---|
| Prestation de services | A — Contrat articlé | Instance RS (ECOSOL) |
| Modèle réseaux sociaux | A — Contrat articlé | **Template** RS + packs |
| Engagement Application Web | B — CDC | App métier + recette + hors-scope |
| Engagement (scan) | B — CDC | Site vitrine + charte |

**Modèle unifié ERP :** un document racine (`family` × `serviceKind`) + parties + commercial/pricing + term/legal + scope/planning (B) + signatures/annexes, avec primauté **devis** (A) ou **CGV** (B), droit malien, charte MSK en en-tête/pied.

---

*Fichier destiné à être cité par le planning Commercial / génération documentaire. Extraction seule — pas de changement code (à la rédaction initiale).*

> **Suite (2026-11-06, même jour)** : cette analyse a servi de base à l'implémentation — `generateContractPdf` (`src/lib/pdf/commercial.ts`) et `generateContractPrestaPdf` (`src/lib/pdf/rh.ts`) rendent désormais les 13 articles / sections CDC complets décrits ci-dessus (texte exact des 2 PDF extractibles via `pdftotext -layout`, et confirmation OCR des 2 PDF scannés). Voir `docs/guides/SUIVI-GUIDES.md` §8 et `RECAP-TEST-CLIENT-CONTRAT.md` §6 pour le détail et la dette résiduelle (champs CDC avancés pas encore saisissables en UI).
