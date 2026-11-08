# Comparaison — Gabarit `contrat_presta_msk` v2 (plateforme) vs PDF réel « CONTRAT DE PRESTATION DE SERVICES »

**Date :** 2026-11-08
**Méthode :** extraction intégrale du PDF (`pdftoppm -r 300` + `tesseract -l fra`, scan non extractible par `pdftotext`) + lecture exacte du code qui génère le PDF démo du gabarit (`prisma/seed.ts` → `generateDemoPdfAction` dans `src/actions/templates.ts` → `generateContractPrestaPdf` dans `src/lib/pdf/rh.ts`). **Aucune modification de code applicatif.**

> **Point clé à garder en tête pendant toute la lecture** :
> - Le PDF source est une **instance remplie ECOSOL** (Gestion des Réseaux Sociaux), où **MSK CREATION = Le Prestataire** et **ECOSOL = Le Client**.
> - Le gabarit plateforme `contrat_presta_msk` sert un cas **différent et volontairement inversé** : c'est le contrat **RH** d'un **prestataire indépendant qui travaille pour MSK** → **MSK = Le Client**, **la personne = Le Prestataire**. Ce n'est donc pas une copie attendue du PDF, mais une **adaptation**. L'écart pertinent n'est pas « rôles inversés » (voulu, documenté dans le code) mais **les clauses/sections qui manquent ou sont affaiblies** dans cette adaptation.
> - Le `DocumentTemplate` en base (`prisma/seed.ts`, code `contrat_presta_msk`, `version: 2`) **ne contient aucun texte de clause** : c'est une simple fiche de métadonnées (`structureJson.slots`, liste de 13 entrées). **Le texte juridique réel est entièrement codé en dur** dans la fonction `generateContractPrestaPdf` (`src/lib/pdf/rh.ts`). C'est cette fonction qui fait foi pour le contenu du PDF « Contrat de prestation MSK » généré depuis `/administration/gabarits` (bouton « Générer PDF démo ») ou depuis une vraie fiche `RhContract` de type `PRESTA`.

---

## 1. Plan détaillé du PDF réel (5 pages, OCR)

### Page 1 — Couverture / en-tête / parties

1. **Logo** MSK CREATION (icône + wordmark bleu) + **tagline** « Agence de communication et de création digitale » + filet bleu horizontal.
2. **Bandeau titre** (forme « parchemin/ruban ») : **« CONTRAT DE PRESTATION DE SERVICES »** + sous-titre **« Gestion des Réseaux Sociaux »**.
3. **Tableau méta** (3 lignes, cellules d'en-tête foncées) :
   - `Date d'effet` → Mercredi 1ᵉʳ Juillet 2026
   - `Durée initiale` → 3 mois - renouvelable par mois (préavis 30 jours)
   - `Droit applicable` → Droit malien - Juridictions de Bamako
4. **Titre centré « ENTRE LES SOUSSIGNÉS »**.
5. **Tableau « LE PRESTATAIRE »** (7 lignes) : Raison sociale, Forme juridique, SIRET, Siège social, Représentant légal, E-mail, Téléphone → rempli avec les données MSK CREATION (SARL, SIRET `085156924A`, ACI 2000 Bamako, Mathieu DIARRA - Gérant, `contact@mskcreation.com`, `+33 751 325 238`).
6. **Tableau « LE CLIENT »** (7 lignes, même structure) → rempli avec ECOSOL (forme juridique et NINA/RCCM laissés « [à compléter] », adresse Grand Marché de Bamako, représentant Aboubacar DOUCOURE, e-mail, téléphone).
7. Phrase de clôture : « Ci-après désignés ensemble **« les Parties »** et individuellement **« la Partie »**. Il a été convenu et arrêté ce qui suit : »
8. **Pied de page** (répété sur les 5 pages) : adresse complète, « Numéro d'identifiant fiscal : 085156924A », e-mail `contact@mskcreation.net`, 3 numéros de téléphone, + mention classification **« PUBLIC - MSKCREATION »**.

### Pages 2 à 5 — Corps articlé (13 articles)

| Article | Titre | Contenu clé |
|---|---|---|
| **1** | Objet | Gestion des réseaux sociaux du Client par MSK, renvoi à l'Article 2 pour l'offre |
| **2** | Offre souscrite et prestations | **Tableau comparatif STANDARD / PRO / PREMIUM** (publications/mois, réseaux, visuels/vidéos, CM, rapport, audit+appel, Ads, montant mensuel) + offre cochée + clause « le devis prévaut en cas de contradiction » |
| **2.1** | Prestations complémentaires | **Tableau barème** (type prestation / tarif 3 mois / statut) pour déplacement, captation photo, captation vidéo — toutes « sur bon de commande » |
| **3** | Processus de validation et accès | Dossier cloud MSK ; délégation validation possible ; sinon **validation tacite sous 72 h ouvrées** ; accès admin fournis **sous 48 h** après signature |
| **4** | Durée et Résiliation | **4.1** Durée initiale 3 mois + renouvellement auto mensuel · **4.2** Résiliation ordinaire : préavis 30 j après période initiale, mois de préavis dû · **4.3** Résiliation pour manquement grave : MED 15 j · **4.4** Effets : restitution accès 48 h, sommes dues exigibles, contenus réglés acquis au Client |
| **5** | Rémunération et modalités de paiement | **Tableau** : montant selon offre, facturation mensuelle avant le 5, **acompte 50 % au démarrage**, modes (virement/OM/Wave/chèque), retard 1 %/semaine + **suspension possible**, résiliation anticipée = mois en cours dû |
| **6** | Obligations du Prestataire | 4 puces (diligence/professionnalisme, respect identité visuelle, validation préalable avant publication, information des difficultés) + confidentialité + **obligation de moyens, pas de résultat** |
| **7** | Obligations du Client | 4 puces (fournir visuels/accès à temps, valider/refuser sous 48 h ouvrées, régler les sommes dues, ne pas modifier la stratégie unilatéralement) |
| **8** | Propriété intellectuelle | Contenus restent à MSK jusqu'au paiement intégral ; droit d'utilisation Client après paiement ; éléments fournis par le Client restent sa propriété |
| **9** | Confidentialité | **Réciproque** (« Chaque Partie s'engage... ») — 5 ans après cessation |
| **10** | Protection des données personnelles | Loi n° 2013-015 (APDP Mali) ; Client = Responsable du traitement, MSK = Sous-traitant ; MSK s'engage à sécuriser **et à notifier sans délai** tout incident |
| **11** | Responsabilité et Force majeure | Responsabilité de MSK plafonnée aux sommes des **3 derniers mois** ; exclusion perf. commerciales / algorithmes plateformes / FM ; FM : info 48 h, résiliation si > 30 j |
| **12** | Droit applicable et règlement des litiges | Droit malien, amiable 30 j, puis juridictions de Bamako ; **+ avenant écrit obligatoire** pour toute modification ; **+ clause de divisibilité** (nullité d'une clause n'entraîne pas celle du contrat) |
| **13** | Signatures | Déclaration « lu et accepté » ; **rattachement explicite à l'Annexe 1 (devis signé), « dont il est inséparable »** ; bloc signatures Prestataire/Client avec noms, mention manuscrite **« Lu et approuvé »**, lieu et date |

---

## 2. Contenu actuel de la plateforme (`contrat_presta_msk` v2)

### 2.1 Fiche `DocumentTemplate` (`prisma/seed.ts`, ~L.420-449) — métadonnées seules

```ts
code: "contrat_presta_msk"
type: "CONTRAT_PRESTA"
name: "Contrat de prestation MSK"
version: 2
structureJson: {
  layout: "msk_rh_v1",
  slots: [
    "header", "parties",
    "article_objet", "duree_resiliation", "remuneration", "independance",
    "propriete_intellectuelle", "confidentialite", "donnees_personnelles",
    "responsabilite_fm", "droit_litiges",
    "signatures", "footer",
  ],
  ref: "docs/CONTRAT DE PRESTATION DE SERVICES.pdf",
}
```

→ **13 entrées** dans `slots`, mais seulement **9 slots de contenu juridique** (`article_objet` → `droit_litiges`) ; `header`/`parties`/`signatures`/`footer` sont structurels. Cette liste **ne contient aucun texte** — elle décrit juste la table des matières visée à l'écran admin `/administration/gabarits`.

### 2.2 Rendu réel (`src/lib/pdf/rh.ts`, fonction `generateContractPrestaPdf`, ~L.551-677)

Utilisée à la fois pour le **PDF démo** (`generateDemoPdfAction`, données fictives « Fatoumata Diallo – Consultante content ») et pour **tout vrai contrat RH** de type `PRESTA` (`generateContractPdfAction`, données réelles du collaborateur `RhContract.employee`).

Plan réellement généré (titre de page : **« CONTRAT DE PRESTATION DE SERVICES »**, identique au PDF) :

1. **En-tête** : logo `public/brand/lockup.png` (ou fallback texte bleu) + tagline + filet bleu — **sans sous-titre, sans tableau méta, sans bandeau « ruban »**.
2. **Intro Client** (paragraphe, pas de tableau) : phrase `employerIntro()` avec raison sociale, forme SARL, capital, siège, RCCM, représentant légal — **sans e-mail, sans téléphone** (champs disponibles dans `company.ts` mais non insérés dans la phrase).
3. **Intro Prestataire** (« Et : ... ») : nom, qualité « prestataire independant », poste, adresse — **sans e-mail ni téléphone** (pourtant transmis dans `RhPersonInput.email/phone` et bien peuplés depuis `contract.employee.email/phone` en usage réel, `src/actions/rh.ts` ~L.849-851, mais jamais lus par la fonction de rendu).
4. Phrase de clôture : `Ci-apres designes ensemble "les Parties". Il a ete convenu et arrete ce qui suit :` (guillemets droits, pas de « les Parties » **individuellement** « la Partie »).
5. **Article 1 : Objet** — une phrase générique autour de `input.title`.
6. **Article 2 : Durée et resiliation** — début/fin + préavis 30 j + manquement grave/MED 15 j (fusionné en un seul article, sans sous-numérotation).
7. **Article 3 : Remuneration et modalites de paiement** — montant + modes de paiement + pénalité retard 1 %/semaine.
8. **Article 4 : Independance** — clause anti-requalification salariale (« ne constitue ni un contrat de travail ni un lien de subordination »).
9. **Article 5 : Propriete intellectuelle** — cession à MSK après paiement intégral.
10. **Article 6 : Confidentialite** — **unilatérale** (« Le Prestataire s'engage... »), 5 ans.
11. **Article 7 : Protection des donnees personnelles** — APDP, MSK = Responsable, Prestataire = Sous-traitant, mesures de sécurité — **sans clause de notification d'incident**.
12. **Article 8 : Responsabilite et force majeure** — plafond = honoraires de la mission, FM 48 h / 30 j — **sans clause d'exclusion** (perf., algorithmes...).
13. **Article 9 : Droit applicable et reglement des litiges** — droit malien, amiable 30 j, Bamako — **sans clause avenant/divisibilité**.
14. **Article 10 : Dispositions particulieres** (optionnel, seulement si `notes` renseignées).
15. **Article 11 : Signatures** — déclaration + « Fait à Bamako, le [date du jour], en deux (2) exemplaires originaux. » + bloc signatures `Pour MSK CREATION` / `Le Prestataire` — **sans mention « Lu et approuvé » imprimée**, sans référence à une annexe/devis.
16. **Pied de page** : adresse + `NIF : ... · e-mail · téléphones` sur 2 lignes — **sans mention de classification**.

→ **9 articles numérotés** de contenu juridique (+ signatures), contre **13 articles** (dont 2 tableaux chiffrés) dans le PDF réel.

---

## 3. Analyse d'écarts — MANQUANT / AFFAIBLI / EXTRA

### 3.1 Première page (le plus gros écart structurel)

| Élément PDF réel | Présent côté plateforme ? | Écart |
|---|---|---|
| Bandeau titre + **sous-titre** (ex. « Gestion des Réseaux Sociaux ») | Titre seul, pas de sous-titre | **AFFAIBLI** — perte d'un niveau d'info (nature de la mission non mise en avant visuellement) |
| **Tableau méta** Date d'effet / Durée initiale / Droit applicable (lecture en 2 secondes) | Absent — infos diluées dans les paragraphes des Art. 2 et 9 | **MANQUANT** |
| Titre **« ENTRE LES SOUSSIGNÉS »** | Absent (on passe directement aux paragraphes) | **MANQUANT** (mineur, cosmétique) |
| **Tableau « LE PRESTATAIRE »** avec Raison sociale / Forme / SIRET / Siège / Représentant / **E-mail** / **Téléphone** | Remplacé par une phrase narrative ; **e-mail et téléphone de MSK absents** malgré leur disponibilité dans `company.ts` | **AFFAIBLI** |
| **Tableau « LE CLIENT »** avec les mêmes 7 champs, dont **E-mail** / **Téléphone** | Remplacé par une phrase narrative ; **e-mail et téléphone de la personne absents**, alors que `contract.employee.email/phone` sont bien récupérés par `src/actions/rh.ts` mais jamais transmis à l'affichage | **AFFAIBLI** (perte de données déjà saisies en base) |
| Guillemets français « » et formule complète « les Parties » / « la Partie » | Guillemets droits `"..."`, mention « la Partie » individuelle absente | **AFFAIBLI** (mineur, typographie) |
| Accents complets (« création », « digitale ») | `company.tagline` et plusieurs phrases du code sont écrites **sans accents** (« creation », « societe », « arrete »...) alors que `toWinAnsi` supporte le Latin-1 accentué sans problème | **AFFAIBLI** (qualité rédactionnelle, pas une contrainte technique) |
| Mention classification **« PUBLIC - MSKCREATION »** en pied de page | Absente | **MANQUANT** (mineur) |

### 3.2 Corps du contrat — tableau de synthèse par article

| Bloc PDF réel | Équivalent plateforme | Statut |
|---|---|---|
| Art. 1 Objet | Art. 1 Objet | ✅ équivalent (adapté au sens inversé) |
| Art. 2 **Offre souscrite** (tableau STANDARD/PRO/PREMIUM) + « le devis prévaut » | — | **MANQUANT** (non transposable tel quel au cas RH individuel, mais aucune alternative — pas de grille d'honoraires/bon de commande) |
| Art. 2.1 **Prestations complémentaires** (barème + bon de commande) | — | **MANQUANT** |
| Art. 3 **Processus de validation et accès** (délais, dossier cloud, délégation) | — | **MANQUANT** (aucune clause de validation des livrables) |
| Art. 4.1-4.4 Durée et Résiliation (sous-articles, renouvellement tacite mensuel explicite, **« effets »** de la résiliation) | Art. 2 Durée et résiliation — un seul paragraphe, pas de renouvellement tacite par défaut (duree indéterminée générique), **pas de clause « effets » (restitution, sommes dues exigibles, contenus acquis)** | **AFFAIBLI** |
| Art. 5 Rémunération (tableau : **acompte 50 %**, facturation « avant le 5 », **suspension possible**) | Art. 3 Rémunération — pas d'acompte, pas de règle de date de facturation, pas de clause de suspension | **AFFAIBLI** |
| — (aucun équivalent dans le PDF) | Art. 4 **Indépendance** (anti-requalification salariale) | **EXTRA — pertinent** : nécessaire car les rôles sont inversés (personne physique indépendante vs MSK), absent du PDF agence→client, mais c'est un ajout juridiquement justifié |
| Art. 6 **Obligations du Prestataire** (4 puces + obligation de moyens) | — | **MANQUANT** |
| Art. 7 **Obligations du Client** (4 puces) | — | **MANQUANT** |
| Art. 8 Propriété intellectuelle | Art. 5 Propriété intellectuelle | ✅ équivalent, rôles correctement inversés |
| Art. 9 Confidentialité — **réciproque** (« Chaque Partie ») | Art. 6 Confidentialité — **unilatérale** (seul le Prestataire est engagé) | **AFFAIBLI** (déséquilibre juridique : MSK n'est engagée à rien) |
| Art. 10 Données personnelles — + **notification d'incident sans délai** | Art. 7 Données personnelles — rôles bien inversés (MSK = Responsable, personne = Sous-traitant), mais **sans clause de notification d'incident** | **AFFAIBLI** |
| Art. 11 Responsabilité/FM — plafond **3 derniers mois** + **exclusions** (perf. commerciales, algorithmes, FM) | Art. 8 Responsabilité/FM — plafond = honoraires de la mission (logique différente mais cohérente), **sans clause d'exclusion** | **AFFAIBLI** (partiel) |
| Art. 12 Droit/litiges + **avenant écrit obligatoire** + **clause de divisibilité** | Art. 9 Droit/litiges — droit malien/amiable/Bamako identiques, **sans avenant ni divisibilité** | **AFFAIBLI** |
| — | Art. 10 **Dispositions particulières** (si `notes` renseignées) | **EXTRA — neutre** : flexibilité utile, sans équivalent direct nécessaire |
| Art. 13 Signatures — rattachement **Annexe 1 (devis)**, mention manuscrite **« Lu et approuvé »** imprimée | Art. 11 Signatures — déclaration similaire, **pas de mention « Lu et approuvé » imprimée**, pas d'annexe (cohérent, pas de devis dans ce cas RH) | **AFFAIBLI** (mention signature) |

### 3.3 Rien d'« EXTRA / erroné » de type incohérence ou inexactitude

Aucune clause fausse ou contradictoire identifiée côté plateforme. Les deux ajouts (Art. 4 Indépendance, Art. 10 Dispositions particulières) sont des **extras justifiés** par le contexte RH inversé, pas des erreurs.

---

## 4. Du premier article jusqu'aux signatures — vue linéaire

| Repère | PDF réel | Plateforme | Écart |
|---|---|---|---|
| Objet | Art. 1 | Art. 1 | OK |
| Offre / pricing | Art. 2 + 2.1 (tableaux) | — | MANQUANT |
| Validation / accès | Art. 3 | — | MANQUANT |
| Durée / résiliation | Art. 4 (4 sous-articles) | Art. 2 (1 bloc) | AFFAIBLI |
| Rémunération | Art. 5 (tableau, acompte, suspension) | Art. 3 (paragraphe simple) | AFFAIBLI |
| Indépendance (anti-salariat) | — | Art. 4 | EXTRA (justifié) |
| Obligations Prestataire | Art. 6 | — | MANQUANT |
| Obligations Client | Art. 7 | — | MANQUANT |
| Propriété intellectuelle | Art. 8 | Art. 5 | OK |
| Confidentialité | Art. 9 (réciproque) | Art. 6 (unilatérale) | AFFAIBLI |
| Données personnelles | Art. 10 (+ notif. incident) | Art. 7 (sans notif.) | AFFAIBLI |
| Responsabilité / FM | Art. 11 (plafond 3 mois + exclusions) | Art. 8 (plafond mission, sans exclusions) | AFFAIBLI |
| Droit / litiges | Art. 12 (+ avenant + divisibilité) | Art. 9 (sans avenant/divisibilité) | AFFAIBLI |
| Dispositions particulières | — (hors slots standards) | Art. 10 (optionnel) | EXTRA (justifié) |
| **Signatures** | Art. 13 : déclaration + **Annexe 1 devis inséparable** + bloc Prestataire/Client + **« Lu et approuvé »** imprimé + lieu/date | Art. 11 : déclaration + « Fait à Bamako, le [date], en 2 exemplaires » + bloc `Pour MSK CREATION` / `Le Prestataire` | **AFFAIBLI** : pas de « Lu et approuvé » imprimé ; pas d'annexe (cohérent ici) |
| **Dates** | Date d'effet affichée en tête (tableau méta) + date de signature en pied | Date de début/fin seulement dans l'Art. 2 (texte), date du jour auto-générée pour la signature (`formatDateFr()`) — pas de date d'effet mise en avant en tête de document | AFFAIBLI (visibilité) |

---

## 5. Constat vs changelog existant

Le changelog `docs/guides/SUIVI-GUIDES.md` (§8, entrée 2026-11-06) annonce que `generateContractPrestaPdf` a été étendu « de 6 à 11 articles... même socle juridique que les contrats clients ». Cette présente comparaison **confirme l'extension (6→9 articles numérotés + signatures, soit 11 blocs si on compte signatures et dispositions particulières)**, mais montre que **le « même socle juridique »** reste partiel par rapport au PDF réel : il manque notamment l'**offre/tarification**, le **processus de validation**, les **deux articles « Obligations »**, et plusieurs clauses de sécurité juridique (confidentialité réciproque, notification d'incident, exclusions de responsabilité, avenant/divisibilité, mention « Lu et approuvé »).

---

## 6. Pistes (statut après implémentation du 2026-11-08 — voir §9)

1. ✅ Tableau méta en tête (date d'effet / durée / droit applicable) + tableaux Parties (Client MSK / Prestataire, avec e-mail/téléphone).
2. ✅ Article Durée/Résiliation scindé en sous-points 2.1 à 2.4 (durée initiale, résiliation ordinaire, manquement grave, **effets**).
3. ✅ Articles 5 **Obligations du Prestataire** et 6 **Obligations du Client** ajoutés (adaptés au sens RH inversé).
4. ✅ Confidentialité rendue **réciproque** (« Chaque Partie s'engage... »).
5. ✅ Clause de **notification d'incident** (données personnelles) + **exclusions de responsabilité** (performances commerciales, algorithmes de plateformes) ajoutées à l'Art. 9/10.
6. ✅ **Avenant écrit obligatoire** + **clause de divisibilité** ajoutés à l'Art. 11 (Droit/litiges).
7. ✅ Mention **« Lu et approuvé »** imprimée sous chaque bloc signature.
8. ⏸️ **Acompte** / règle de facturation mensuelle (avant le 5) — non ajouté : jugé non pertinent pour une mission RH individuelle ponctuelle (vs abonnement agence→client). Écart assumé et documenté (pas un oubli). Une clause de **suspension après 15 jours de retard** a en revanche été ajoutée (Art. 3), reprenant l'esprit de la clause de suspension du PDF réel.
9. ⏸️ Grille d'offres packagées (STANDARD/PRO/PREMIUM), processus de validation des contenus (Art. 2/2.1/3 du PDF réel) — **non transposés**, car sans équivalent dans une mission RH individuelle (pas d'abonnement, pas de bon de commande). Écart assumé.

Voir `src/lib/pdf/rh.ts` → `generateContractPrestaPdf` pour le code (13 articles + 3 tableaux).

---

## 9. Mise en œuvre (2026-11-08)

- **Gabarit** : `prisma/seed.ts` → `contrat_presta_msk` passé en **version 3** (slots étendus : `meta_header`, `obligations_prestataire`, `obligations_client`). Seed exécuté en production (Supabase) le 2026-11-08 — comptes `ACTIVE` (Guiro, Diarra, Boussari) protégés (`⛔ MDP Auth NON modifié`, conforme `auth-password-safety.mdc`).
- **Rendu** : `src/lib/pdf/rh.ts` → `generateContractPrestaPdf` réécrite (tableau méta + 2 tableaux Parties + 13 articles, cf. §6 ci-dessus). Accents français restaurés dans `src/lib/company.ts` et tout `rh.ts` (plus de "societe"/"creation" sans accent). Guillemets français « » utilisés pour « les Parties » / « la Partie ». Mention de classification **« PUBLIC - MSKCREATION »** ajoutée au pied de page de tous les PDF RH.
- **Tests** : `src/lib/pdf/rh.test.ts` étendu — vérifie la présence des 13 articles, des 3 tableaux (`INFORMATIONS CLES`, `LE CLIENT`, `LE PRESTATAIRE`) et de la confidentialité réciproque. `npm run test:pdf-rh` ✓ (8 PDF OK) et `npm run test:pdf-contract` ✓ (non régressé).
- **Correctif transverse** : `src/lib/pdf/winansi.ts` — `toWinAnsi()` ne gérait pas la ligature `œ/Œ` (hors plage encodée) ; ajout d'une décomposition sûre (`œ`→`oe`). Corrige un bug latent qui aurait affecté tout texte futur utilisant cette ligature (ex. « œuvre »).
- **Reste à faire (hors scope de ce lot, cf. pistes 8-9)** : rien de bloquant — écarts résiduels documentés et assumés (pas des oublis).
