# Suivi du centre de guides — ERP MSK

**Fichier vivant.** À alimenter à **chaque** modification (règle absolue `.cursor/rules/guides-suivi.mdc`).  
Branche de travail : `dev`.

---

## 1. État global

| Champ | Valeur |
|---|---|
| Statut incrément | **Fondations livrées** — lot CRM Nov-2026 (filtres Prospects multi + Rapport 4 KPI + Clients équipe/historique) à valider terrain |
| Route app | `/guides` |
| Contenu source | `src/lib/guides/` (TypeScript typé + Zod) |
| Manuels techniques | `docs/manuels/` (référence éditoriale) |
| Dernière mise à jour | 2026-11-09 (PDF contrat : en-tête / parties alignés modèle MSK ; voir §8) |

### Légende statuts documentaires

| Code | Sens |
|---|---|
| `draft` | Brouillon — non publié comme procédure fiable |
| `to_validate` | Contenu rédigé, à confirmer humain / parcours UI |
| `validated` | Étapes essentielles vérifiées dans le code / manuels alignés |
| `outdated` | UI ou droits ont changé — ne plus suivre tel quel |

---

## 2. Audit (Phase 1) — synthèse

### Architecture technique

| Élément | Réalité dépôt |
|---|---|
| Stack | Next.js 15 App Router · React 19 · Prisma · Supabase Auth · Zod · Tailwind 4 |
| Données métier | **Prisma uniquement** (RLS PostgREST fermé) |
| Auth / droits | `requireUser` + `hasPermission` · packs / groupes / overrides |
| Nav | `src/lib/nav.ts` → sidebar filtrée par permission |
| Charte | tokens `msk-*`, Jost / Bricolage / Instrument Serif |
| Manuels existants | `docs/manuels/01` … `12` (+ README) — **pas** encore de centre UI |

### Modules nav (Principal)

| Id nav | Route | Permission | Doc guides |
|---|---|---|---|
| accueil | `/accueil` | `home.view` | partiel |
| ged | `/ged` | `ged.view_scoped` | partiel |
| organisation | `/organisation` | `orgchart.view` | stub module |
| commercial | `/commercial` (+ `/crm`, `/catalogue`) | `com.access` | prioritaire / partiel |
| comptabilite | `/comptabilite` | `cpt.access` | stub module |
| rh | `/rh` | `rh.access` | stub module |
| stocks | `/stocks` | `stk.access` | stub module |
| patrimoine | `/patrimoine` | `pat.access` | stub module |
| projets | `/projets` | `prj.access` | stub module |
| anomalies | `/ops/anomalies` | `ops.access` | stub module |

### Groupes / packs (libellés UI)

Groupes : Direction, Commerciaux, RH, Comptabilité, Stock, Projets, Collaborateur.  
Packs : Collaborateur, Commercial, Admin CRM, Admin RH, Comptable, Admin Compta, Projets, Stock, Direction, Admin plateforme (+ Super Admin).

### Contraintes / risques

- Ne pas inventer de procédures. Devis/factures **rouverts** (COM-FACTU 2026-11-04) — guides commerciaux à repasser en `to_validate`.
- Visibilité guide ≠ droit d’agir : filtrer l’affichage par `viewPermission` sans dupliquer le RBAC métier.
- Pas de nouvelle dépendance sans besoin (recherche locale index TS).
- Préserve manuels `docs/manuels` ; le centre app les complète, ne les remplace pas d’un coup.

---

## 3. Architecture livrée

| Zone | Chemin |
|---|---|
| Modèle + index + recherche | `src/lib/guides/` |
| UI composants | `src/components/guides/` |
| Pages | `src/app/(app)/guides/**` |
| Nav | item `guides` dans `NAV_GROUPS` (permission `home.view`) |
| Tests | `src/lib/guides/guides.test.ts` · `npm run test:guides` |

### Pages

| Route | Rôle |
|---|---|
| `/guides` | Accueil + recherche |
| `/guides/modules` | Catalogue modules |
| `/guides/modules/[moduleId]` | Fiche module |
| `/guides/roles` | Catalogue rôles / packs |
| `/guides/roles/[roleId]` | Parcours par rôle |
| `/guides/taches` | Catalogue tâches |
| `/guides/taches/[taskId]` | Guides d’une tâche |
| `/guides/faq` | FAQ / dépannage |
| `/guides/[guideId]` | Lecture procédure |

---

## 4. Inventaire des guides

| Id | Titre | Module | Statut | Vérifié |
|---|---|---|---|---|
| `demarrage-accueil` | Premiers pas dans l’ERP | accueil | `validated` | routes accueil, packs chips |
| `iam-inviter-utilisateur` | Inviter un collaborateur | administration | `validated` | manuel 01 + routes admin |
| `ged-comprendre-acces` | Comprendre son accès GED | ged | `validated` | manuel 02 + permissions |
| `crm-creer-prospect` | Créer un prospect | commercial | `to_validate` | live doublons 3 car. + ack contact — revalider UI |
| `crm-suivre-relancer` | Suivre et relancer un prospect | commercial | `outdated` | CRUD relances + RDV + Perdu sans min 3× — à réécrire |
| `crm-transformer-client` | Transformer un prospect en client | commercial | `to_validate` | UX 2026-11-09 : identité figée CRM, source préremplie, composition picker + déplacement tarifé, récap crayons ; hors Perdu |
| `com-hub-naviguer` | Naviguer dans le hub Commercial | commercial | `outdated` | Rapport semaine : grille 4 KPI période + liens liste ; hub/cartes — revalider captures et libellés |
| `com-clients-equipe-historique` | Clients COM : équipe, filtres, historique | commercial | `draft` | liste/fiche + URL `owners=` — parcours à valider humain |
| `espace-conges` | Demander un congé (Mon espace) | espace | `to_validate` | routes espace — détails UI à confirmer |
| `faq-acces-refuse` | Accès refusé / module absent | accueil | `validated` | redirect `acces_refuse` |
| `faq-mot-de-passe` | Mot de passe / reset | accueil | `validated` | parcours auth connus |

*Les modules sans guide `validated` apparaissent en fiche « stub » (objectif + liens manuels, sans fausse procédure).*

---

## 5. Couverture modules / rôles / tâches

### Modules

| Module id | Fiche | Guides publiables | Suite |
|---|---|---|---|
| accueil | oui | 2+ | onboarding enrichi |
| administration | oui | 1 | overrides, reset MDP détaillés |
| ged | oui | 1 | upload / corbeille pas à pas |
| commercial | oui | 4 | objectifs, import, devis (si réouverture) |
| espace | oui | 1 (`to_validate`) | absences, heures, bulletins |
| organisation | stub | 0 | après lecture orgchart UI |
| comptabilite | stub | 0 | prioriser bridge VE facture |
| rh | stub | 0 | collaborateurs / contrats |
| stocks | stub | 0 | |
| patrimoine | stub | 0 | |
| projets | stub | 0 | |
| anomalies | stub | 0 | |
| catalogue | via commercial | 0 | offres / planchers |

### Rôles documentés (packs / groupes)

| roleId | Guides liés | Statut |
|---|---|---|
| collaborateur | demarrage, espace, ged, faq | partiel |
| commercial | CRM + hub COM | partiel |
| admin_crm | + affectations / équipe (à rédiger) | dette |
| comptable | — | dette |
| admin_rh | — | dette |
| direction | — | dette |
| admin_plateforme | IAM invite | partiel |

### Tâches (verbes) couvertes

créer · consulter · suivre · transformer · demander · dépanner — à étendre (valider, envoyer, télécharger…).

---

## 6. Dette / à valider

- [x] Captures d’écran réelles (`public/guides/shots/`, script `npm run guides:shots`) — à régénérer si UI change.
- [ ] Pastilles annotées positionnées pixel-perfect sur les PNG (légende sous capture pour l’instant).
- [ ] Guide devis / factures : **gel Direction** — ne pas documenter comme parcours ouvert sans confirmation.
- [ ] `espace-conges` : confirmer libellés boutons exacts sur UI.
- [ ] Packs Admin CRM : procédures Vue Équipe / Affectations / Import.
- [ ] Comptabilité : VE depuis facture (manuel 08) → premier guide `to_validate`.
- [ ] Page contrôle qualité auto (liens cassés) — script optionnel.
- [ ] Synchroniser automatiquement manuels MD ↔ guides TS (hors scope P1).
- [ ] **Client/Contrat P4** (plan `PLAN-CLIENT-CONTRAT.md`) : génération PDF + classement GED (`gedDocumentId`) codés, build/lint/tests OK, rendu visuel du PDF (familles A et B, rasterisé et relu) conforme charte MSK et pagination correcte ; **mais le parcours complet `generateContractPdfAction`/`generateContractPdfCore` (upload Storage + `Document` + `gedDocumentId`, manuel ou auto à l'activation) n'a pas été rejoué contre un contrat réel en base** (prudence — pas d'écriture de test sur la DB dev/prod partagée sans aval explicite) ; annexes devis/CGV toujours absentes du PDF ; pas encore de doc utilisateur pour les raccourcis « Générer le contrat » / Voir / Télécharger / Partager (`ContractDocActions`, 2026-11-08).
- [ ] **Partager un document contrat** (`ContractDocActions`, 2026-11-08) : implémenté comme copie de l'URL signée GED dans le presse-papiers (pas de lien public dédié / OAuth — la plateforme n'a pas de fonctionnalité de partage externe à ce jour) ; à confirmer que ce comportement correspond à l'attente métier (sinon prévoir un vrai lien de partage avec expiration visible).
- [ ] **Client/Contrat P2 résiduel** : composition sans picker catalogue avancé ; pas de guide dédié « Créer un client direct » (même stepper que transform, jamais documenté seul).
- [ ] Guide `crm-transformer-client` : revalider terrain le nouveau stepper (6 étapes) + l’activation séparée du contrat sur la fiche `/commercial/contrats/[id]`.

---

## 7. Critères d’acceptation (incrément actuel)

| Critère | État |
|---|---|
| Intégré à la nav ERP | ✅ |
| Design charte MSK | ✅ |
| Visuels / captures / schémas | ✅ (captures floutées PII + schémas annotés) |
| Org. module / rôle / tâche | ✅ |
| Recherche locale | ✅ |
| Filtres module / rôle / tâche | ✅ |
| Liens internes valides (guides connus) | ✅ (test) |
| Procédures structurées (modèle) | ✅ |
| Workflows (simples) | ✅ partiel |
| Permissions respectées (filtrage vue) | ✅ |
| Mobile raisonnable | ✅ structure |
| États vides | ✅ |
| Contenu maintenable | ✅ TS + suivi |
| Tests exécutés | ✅ `test:guides` + `test:nav` |
| Limites indiquées | ✅ ce fichier + badges statut |

---

## 8. Changelog

### 2026-11-09 — Gabarits admin : sections Commercial / RH + libellés contrats distincts

- **Pourquoi** : grille / liste plate mélangeait devis, facture et contrats RH — « Contrat de prestation » vs « Contrat client commercial » se lisaient comme un doublon.
- **Quoi** :
  - `/administration/gabarits` : sections **Commercial** puis **RH** (cartes) ; ordre Devis → Facture → Contrat client ; RH Travail → Stage → Prestataire → Attestation → Règlement → Solde → Paie.
  - Seed `name` : « Contrat client (commercial) MSK » / « Contrat prestataire (RH) MSK » ; description carte = but du générateur (`generateContractPdf` vs `generateContractPrestaPdf`).
  - Badges Commercial blue / RH ink ; helpers `src/lib/templates/labels.ts` ; `loading.tsx` segment.
- **Fichiers** : `administration/gabarits/page.tsx`, `loading.tsx`, `lib/templates/labels.ts`, `prisma/seed.ts`, ce suivi.
- **Statut doc** : UX admin clarifiée — `npm run db:seed` pour propager les `name` (upsert). Les deux gabarits restent (générateurs distincts).

### 2026-11-09 — Création devis : stepper plateforme + porte page (plus de modal)

- **Pourquoi** : formulaire devis mono-écran + checkbox déplacement + modal XL prospect — écart vs règles `forms-stepper` / wizard client / list-create.
- **Quoi** :
  - `QuoteCreateForm` : `FormSteps` Client → Cadre → Composition → Récap (crayons) ; client via `OptionPickerSingle` ; **+ Déplacement** = ligne `OPS-DEPL*` (plus de checkbox) ; totaux = toutes les lignes présentes.
  - CTA prospect **Créer un devis** : draft client puis `router.push` `/commercial/devis/nouveau?opportunityId=&clientId=` — PDF sur la fiche devis.
  - `createQuoteAction` : `includeTravel` dérivé des lignes ; plus de `stayOnPage` modal.
- **Fichiers** : `quote-form.tsx`, `prospect-quote-cta.tsx`, `devis/nouveau/page.tsx`, `commercial.ts`, `totals.ts`, manuels 05/06, `RECAP-TEST-CLIENT-CONTRAT.md`.
- **Statut doc** : manuels commercial/CRM mis à jour ; guide devis gel Direction inchangé.

### 2026-11-09 — Gabarit démo contrat client commercial (= `generateContractPdf`)

- **Pourquoi** : le PDF métier `/commercial/contrats` et le mode démo Gabarits doivent partager le **même** layout ; seul `contrat_presta_msk` (RH, rôles inversés) existait en admin.
- **Quoi** : `TemplateType.CONTRAT_COMMERCIAL` + seed `contrat_commercial_msk` ; `generateDemoPdfAction` appelle `generateContractPdf` avec datas démo (Boutique Awa / RS Pro + déplacement).
- **Fichiers** : `prisma/schema.prisma`, migration `20261109140000_…`, `prisma/seed.ts`, `src/actions/templates.ts`, `administration/gabarits/page.tsx`.
- **Statut doc** : gabarit admin — à valider via « Générer PDF démo » après seed.

### 2026-11-09 — PDF contrat commercial : en-tête / parties / pied alignés référence MSK

- **Pourquoi** : `MSK-CONTRAT-2026-001` repris du layout devis (`| CONTRAT - N°` à droite) — logo non centré, pas de tagline, méta flottantes, parties en colonnes libres, écart fort vs `docs/MODELE CONTRAT GESTION DES RESEAUX SOCIAUX`.
- **Quoi** : `generateContractPdf` — logo + tagline centrés, filet pointillé bleu, titre « CONTRAT DE PRESTATION… » / « CONTRAT D'ENGAGEMENT », tableau méta (date / durée / droit), tableaux LE PRESTATAIRE / LE CLIENT (libellé | valeur), pied pointillé + bloc adresse/NIF/tél, en-tête de continuation page 2+.
- **Fichiers** : `src/lib/pdf/commercial.ts`, `src/lib/pdf/contract.test.ts`.
- **Tests** : `npm run test:pdf-contract` (via `contract.test.ts`) OK.
- **Statut doc** : pas de guide parcours UI changé ; dette « accents articles corps » partiellement ouverte (en-tête/parties accentués ; articles 1–13 encore ASCII historiques).

### 2026-11-09 — Wizard « Transformer en client » UX (identité figée, composition, récap)

- **Pourquoi** : conversion terrain trop fragile — nom/contact éditables hors CRM, source non reprise, `<select>` natif catalogue, checkbox déplacement sans prix, récap pauvre, lien « Annuler et revenir » redondant.
- **Quoi** :
  - Depuis prospect : identité + contact **lecture seule** + lien édition fiche CRM ; source / notes préremplies (`deal.source`).
  - Composition : `OptionPickerSingle` (source, devis, catalogue) ; **+ Déplacement** = ligne `OPS-DEPL*` tarifée (`travel-offer.ts`) ; badge déplacement ; plus de checkbox.
  - Devis : même picker catalogue + ligne déplacement catalogue (plus de 15 000 hardcodé).
  - Récap fiche + crayons ; `returnToRecap` → Continuer/Retour reviennent au récap ; suppression « Annuler et revenir ».
- **Fichiers** : `client-wizard-form.tsx`, `clients/nouveau/page.tsx`, `quote-form.tsx`, `travel-offer.ts` (+ test), devis/prospects loaders, guide `crm-transformer-client`, manuels / SUIVI.
- **Statut doc** : `crm-transformer-client` → `to_validate` (revalider terrain).

### 2026-11-09 — Transformer en client sans passage forcé par Intéressé

- **Pourquoi** : cas terrain fréquent (connaissance / recommandation qui décide de signer) — obliger À contacter → relance → Intéressé → Transformer bloquait inutilement la conversion.
- **Quoi** : `canTransformProspectToClient` (hors **Perdu** uniquement) partagé UI + serveur (`prospect-quote-cta`, `createClientWizardAction`, `convertOpportunityToClientAction`, page `/commercial/clients/nouveau?opportunityId=`). **Créer un devis** reste gated sur **Intéressé**. Guide `crm-transformer-client` + manuel CRM mis à jour.
- **Fichiers** : `src/lib/crm/guide-rules.ts` (+ test), `src/components/crm/prospect-quote-cta.tsx`, `src/actions/client-wizard.ts`, `src/actions/commercial.ts`, `src/app/(app)/commercial/clients/nouveau/page.tsx`, `src/app/(app)/crm/prospects/[id]/page.tsx`, `src/lib/guides/content/commercial.ts`, `docs/manuels/05-crm.md`.
- **Statut doc** : `crm-transformer-client` → `to_validate` (assouplissement à revalider terrain).

### 2026-11-09 — Changer le statut : option Client retirée (Q1)

- **Pourquoi** : le modal « Changer le statut » proposait encore **Client** alors que la conversion est l’acte délibéré du CTA **Transformer en client** (stepper) — double porte confuse pour le terrain.
- **Quoi** :
  - UI `StageForm` : liste = `STAGE_CHANGE_ORDER` (sans `GAGNE`) + bandeau renvoyant vers « Transformer en client » ; submit bloqué si le statut courant reste Client sans autre choix.
  - Serveur `updateOpportunityStageAction` : passage **vers** `GAGNE` toujours refusé (plus seulement « sans ComClient ») — message explicite.
  - Constant `STAGE_CHANGE_ORDER` dans `src/lib/crm/labels.ts` ; manuel `05-crm.md` + checklist `RECAP-TEST-CLIENT-CONTRAT.md` scénario I mis à jour.
- **Fichiers** : `src/lib/crm/labels.ts`, `src/components/crm/stage-form.tsx`, `src/actions/crm.ts`, `docs/manuels/05-crm.md`, `docs/commercial/RECAP-TEST-CLIENT-CONTRAT.md`.
- **Statut doc** : `crm-transformer-client` reste `to_validate` ; dette « guidage inline picker Gagné » du 2026-11-06 **fermée** (option retirée + bandeau, plus fort que le simple message d’erreur).

### 2026-11-08 — Contrats legacy : famille / nature avant génération PDF

- **Pourquoi** : fiche client — contrat `ACTIF` (ex. CTR-202611-0001) sans `family` / `serviceKind` en base (création depuis devis avant champs P4) → échec « Famille / nature de prestation manquante » au clic « Générer le contrat » ; auto-PDF à l’activation silencieux pour les mêmes lignes.
- **Quoi** : inférence catalogue + libellés (`resolveContractPrestation`), persistance à la génération ; `createContractFromQuoteAction` renseigne désormais famille/nature ; sélecteur compact sur `ContractDocActions` si absent ; action `setContractPrestationAction`.
- **Fichiers** : `src/lib/commercial/contract-prestation.ts`, `src/actions/contracts.ts`, `src/components/commercial/contract-doc-actions.tsx`, fiches client/contrat.
- **Statut doc** : guide commercial contrats/PDF — dette §6 inchangée (`draft`), comportement UI à valider terrain.

### 2026-11-08 — Alignement gabarits/générateurs PDF vs références `docs/` (contrat_presta_msk v3 + RH)

- **Pourquoi** : mandat « aligner tout document généré par la plateforme avec les fichiers de référence `docs/` ». Inventaire croisé **références `docs/` ↔ `DocumentTemplate` (seed) ↔ `generate*Pdf`** (voir §9 pour la matrice complète) : `contrat_presta_msk` (RH) accusait le plus grand écart documenté (`docs/commercial/COMPARAISON-CONTRAT-PRESTA-MSK-v2.md`, 2026-11-08 matin) ; les PDF RH (contrat travail/stage, attestation, solde, règlement, fiche de paie) avaient perdu leurs accents français au fil des itérations successives alors que les documents de référence réels (`docs/Contrat de Travail Guiro...pdf`, `docs/Solde de tout compte...pdf`, etc. — ce sont d'anciennes générations de la plateforme elle-même) les ont bien.
- **Quoi** :
  - **`contrat_presta_msk` → v3** (`prisma/seed.ts` + `generateContractPrestaPdf` dans `src/lib/pdf/rh.ts`) : passe de 9 à **13 articles** + **3 tableaux** (méta date d'effet/durée/droit applicable, Parties Client/Prestataire avec e-mail/téléphone) — ajoute Obligations Prestataire **et** Client, confidentialité rendue réciproque, clause « effets de la résiliation », notification d'incident (données personnelles), exclusions de responsabilité, avenant écrit + divisibilité, mention « Lu et approuvé » imprimée. Écarts non transposés (grille d'offres packagées, bon de commande, process de validation contenus) **documentés comme adaptation volontaire** au contexte RH individuel (pas un oubli) — détail complet dans le comparatif mis à jour.
  - **Accents français restaurés** partout : `src/lib/company.ts` (tagline, forme juridique, titre gérant, adresse) + tout `src/lib/pdf/rh.ts` (contrat travail, stage, presta, attestation, solde, règlement, fiche de paie). Correctif transverse `src/lib/pdf/winansi.ts` : la ligature `œ/Œ` n'était pas gérée par `toWinAnsi()` (hors plage encodée) → décomposition sûre ajoutée (`œ`→`oe`).
  - **Contrat de travail / stage** (`generateContractTravailPdf`/`generateContractStagePdf`) : articles légaux invariants ajoutés (texte reprenant le modèle MSK réel) — Congés payés + Sécurité sociale INPS/CANAM (travail uniquement), Matériel et outils, Discipline et sanctions, Achats de logiciels, Résiliation du contrat, Dispositions générales. Volontairement non repris : avantages en nature détaillés, télétravail hebdomadaire fixe, prime de 13ᵉ mois — relèvent d'une politique par poste, pas du socle contractuel générique.
  - **Fiche de paie** (`generateFichePaiePdf`) : le salaire brut est désormais **reconstitué par gross-up** du net contractuel (taux 26,56 % identique au modèle réel) au lieu d'assimiler brut = net — vérifié chiffre pour chiffre contre `docs/Fiche de Paie de Guiro...pdf` (165 000 F net → 224 673 F brut, 59 673 F de cotisations, taux horaires 1 296/952 F). Toujours « document indicatif » (mention conservée, Phase 5 Paie/INPS finalisera l'officiel).
  - **Règlement intérieur** (`generateReglementInterieurPdf`) : résumé enrichi aux 6 chapitres réels (`docs/Document – Règlement intérieur – Fatoumata.pdf`, Version 1.0 — 2025, Code du travail malien + OHADA) + accusé de réception reformulé. Le document intégral (22 articles, ~10 pages) **reste un document source géré séparément** (GED/intranet) — non reproduit intégralement dans le PDF généré dynamiquement (hors scope raisonnable, cf. §9).
  - **Attestation de stage / Solde de tout compte** : phrases de qualification (assiduité, professionnalisme) et ordre des paragraphes alignés sur les références réelles.
  - **Pied de page RH** : mention de classification « PUBLIC - MSKCREATION » ajoutée (présente sur les 5 pages du PDF de référence presta).
  - **Commercial (devis/factures `generateCommercialPdf`, contrats A/B `generateContractPdf`)** : vérifiés contre `docs/DEVIS HOTEL RESIDENCE LES COLONNES.docx`, `docs/FACTURE ECOSOL...docx`, `docs/DEVIS-2 PROSPERITY...docx` — structure déjà alignée (émetteur/client, objet/mission, table HT/TVA/TTC par ligne, conditions, signature) depuis le lot du 2026-11-06 ; `npm run test:pdf-contract` non régressé. Écarts mineurs non implémentés (assumés, pas bloquants) : pas de tableau comparatif d'offres (STANDARD/PRO/PREMIUM) rendu dans le devis générique, pas de ligne « solde reporté » pour la facturation récurrente avec arriéré — ce sont des scénarios de collatéral commercial spécifiques, pas des éléments structurels manquants au gabarit.
- **Seed** : `npm run db:seed` exécuté en production (Supabase) — comptes `ACTIVE` protégés (`⛔ m.diarra@...`, `⛔ a.boussari@...`, `⛔ a.guiro@...` → « MDP Auth NON modifié »), conforme `auth-password-safety.mdc`. `contrat_presta_msk` confirmé en base à `version: 3`.
- **Fichiers** : `src/lib/company.ts`, `src/lib/pdf/rh.ts`, `src/lib/pdf/rh.test.ts`, `src/lib/pdf/winansi.ts`, `prisma/seed.ts`, `docs/commercial/COMPARAISON-CONTRAT-PRESTA-MSK-v2.md` (§6/§9 mis à jour).
- **Tests** : `npm run test:pdf-rh` étendu (13 articles + 3 tableaux presta, confidentialité réciproque, 9 articles travail/stage additionnels, montants fiche de paie 224 673/59 673/165 000/1 296/952 F) ✓ 8 PDF OK ; `npm run test:pdf-contract` ✓ non régressé ; `npx tsc --noEmit` ✓ ; `npm run lint` ✓ (aucun nouveau warning) ; `npm run build` ✓ (103 pages).
- **Résiduel / dette (gap connu, honnête)** : règlement intérieur intégral (22 articles) non reproduit dans le générateur dynamique (voir ci-dessus) ; tableau d'offres packagées et « solde reporté » absents du générateur devis/facture générique ; champs « Département »/« État civil » du bulletin de paie officiel non repris (absents de `RhPersonInput`, nécessiteraient une évolution du modèle RH — Phase 5 Paie).

### 2026-11-08 — Fiche client : document contrat auto + raccourcis GED, attribution du suivi en modal

- **Pourquoi** : retour utilisateur sur `/commercial/clients/[id]` — (1) un contrat existant laissait l'utilisateur sans PDF, seul chemin = bouton « Générer PDF » sur la fiche contrat, rien sur la fiche client ; (2) l'attribution du suivi utilisait un `<select>` natif disgracieux, hors charte produit (pattern Commercial de référence = modal + picker, voir `AssignProspectForm`).
- **Quoi** :
  - **A — Document contrat** : `generateContractPdfAction` refactorée en cœur partagé `generateContractPdfCore(actor, teamIds, contractId)` — même idempotence `gedDocumentId`, **aucune réécriture** du générateur `generateContractPdf` ni de `src/lib/pdf/*` (autre lot en cours sur ces fichiers, prudence respectée). `setContractStatusAction` appelle désormais ce cœur **automatiquement à la 1ʳᵉ activation** (BROUILLON → ACTIF = acte de signature) si le PDF n'existe pas déjà — best-effort : une famille/prestation manquante n'empêche pas l'activation, la génération manuelle reste disponible. Nouveau composant `ContractDocActions` (fiche contrat `/commercial/contrats/[id]` + chips contrat sur la fiche client) : CTA « Générer le contrat » **uniquement si le document manque** (jamais de CTA de génération primaire une fois le document présent) ; une fois généré → **Voir** (aperçu modal `GedPreviewModal`, pattern GED existant réutilisé), **Télécharger** (`DocDownloadButton` existant), **Partager** (URL signée GED copiée dans le presse-papiers). Ancien bouton seul `ContractPdfAction` + miniature isolée retirés de la fiche contrat (remplacés par `ContractDocActions`) ; fichier `src/components/commercial/contract-pdf-action.tsx` supprimé (plus référencé nulle part).
  - **B — Attribution du suivi client** : `ClientReassignForm` reconstruit en **modal + étapes** (`FormSteps` : Nouveau suivi → Confirmation) avec picker collaborateur `OptionPickerSingle` (recherche si > 8 collaborateurs) au lieu du `<select>` natif. Historique (`ComClientEvent` / `OWNER_CHANGED`) et `writeAudit` **inchangés côté serveur** (`reassignClientOwnerAction` non modifié) — même comportement métier, UI alignée sur `AssignProspectForm`.
- **Hypothèse assumée (Partager)** : pas de fonctionnalité de partage externe (lien public, OAuth) existante côté plateforme → « Partager » copie l'URL signée GED (même mécanisme que Voir/Télécharger), valable temporairement. À confirmer si Direction attend un vrai lien partageable avec expiration affichée (voir dette §6).
- **Fichiers** : `src/actions/contracts.ts`, `src/components/commercial/contract-doc-actions.tsx` (nouveau), `src/components/commercial/client-reassign-form.tsx`, `src/app/(app)/commercial/clients/[id]/page.tsx`, `src/app/(app)/commercial/contrats/[id]/page.tsx` ; supprimé : `src/components/commercial/contract-pdf-action.tsx`.
- **Vérifié** : `tsc --noEmit` OK, `eslint` ciblé OK, `next build` complet OK (103 pages, routes `/commercial/clients/[id]` et `/commercial/contrats/[id]` incluses). **Pas** de test navigateur réel contre un contrat/document existant en base (prudence — pas d'écriture de test sur la DB dev/prod partagée sans aval explicite, dette déjà ouverte sur `generateContractPdfAction`, complétée ci-dessous).
- **Statut doc** : guide `com-clients-equipe-historique` (`draft`, texte générique « formulaire Nouveau suivi… traces historique + audit ») relu — reste exact, pas de passage `outdated` nécessaire. Aucun guide publié ne décrit le détail des boutons Générer/Voir/Télécharger/Partager — dette mise à jour en §6 au lieu d'un faux `validated`.

### 2026-11-06 — Contrats PDF complets (Articles 1–13 famille A, CDC famille B) + gabarit admin `contrat_presta_msk` v2

- **Pourquoi** : le gabarit admin « Contrat de prestation MSK » (`contrat_presta_msk` · v1, `/administration/gabarits`) générait un PDF démo à 6 articles courts (contrat prestataire indépendant RH), visiblement incomplet au regard des vrais contrats MSK (`docs/CONTRAT DE PRESTATION DE SERVICES.pdf`, `docs/MODELE CONTRAT GESTION DES RESEAUX SOCIAUX (1).pdf`, `docs/02_Contrat d'engagement Application Web.pdf`, `docs/CONTRAT D'ENGAGEMENT.pdf`). Le générateur Commercial `generateContractPdf` (familles A/B, `/commercial/contrats/[id]`) était lui aussi une « fondation » assumée non exhaustive (voir commentaire d'origine, lot P4 ci-dessous) — pas les 13 articles juridiques des modèles réels.
- **Quoi** :
  - **OCR/extraction intégrale** des 4 PDF sources (`pdftotext -layout` pour les 2 extractibles, `pdftoppm` + `tesseract -l fra` pour les 2 scans) pour obtenir le texte exact des articles (pas seulement la structure déjà décrite dans `docs/commercial/ANALYSE-MODELES-CONTRATS.md`).
  - **`generateContractPdf`** (`src/lib/pdf/commercial.ts`) réécrit : famille A (`PRESTATION_ABONNEMENT`) rend désormais les **13 articles** du modèle réseaux sociaux (Objet, Offre souscrite + grille STANDARD/PRO/PREMIUM + prestations complémentaires, Processus de validation et accès, Durée et résiliation 4.1–4.4, Rémunération, Obligations Prestataire, Obligations Client, Propriété intellectuelle, Confidentialité, Données personnelles APDP, Responsabilité/force majeure, Droit applicable et litiges, Signatures) ; famille B (`ENGAGEMENT_CDC`) rend les sections CDC complètes (Contexte, Objectifs, Modules **ou** Structure du site selon `serviceKind`, Fonctionnalités incluses, Rôles & accès si application, Livrables, Planning, Ressources client, Recette, Hors périmètre, Conditions/CGV, Validation). Délais/plafonds (validation 48 h, accès admin 48 h, acompte 50 %, pénalité 1 %/semaine, préavis 30 j, mise en demeure 15 j, confidentialité 5 ans, plafond responsabilité 3 mois, amiable 30 j) = valeurs par défaut du modèle MSK, paramétrables. Variables non alimentées par le dossier ERP → place-holder `---` (jamais une clause silencieusement omise).
  - **`generateContractPrestaPdf`** (`src/lib/pdf/rh.ts`, utilisé par le gabarit admin `contrat_presta_msk`) étendu de 6 à **11 articles** (objet, durée/résiliation, rémunération + pénalité retard, indépendance, propriété intellectuelle, confidentialité 5 ans, données personnelles APDP, responsabilité/force majeure, droit applicable/litiges Bamako, dispositions particulières, signatures) — même socle juridique que les contrats clients, adapté au sens de relation inversé (MSK = Client, personne = Prestataire indépendant).
  - **Gabarit `contrat_presta_msk`** (`prisma/seed.ts`) passé en **v2** (`version: 2`, `structureJson.slots` complet, `ref` pointant le PDF source exact) — le prochain `npx prisma db seed` affichera « v2 » sur `/administration/gabarits` au lieu de « v1 ».
  - **`src/actions/contracts.ts`** : passe désormais `serviceKind`, `contactTitle` (`contactRole` client), `clientRegistryId` (`taxId` client) et un `scope` étendu (superset rétrocompatible : contexte/objectifs/livrables/hors-périmètre existants **+** modules/pages/fonctionnalités/rôles/planning/ressources client/offre packagée optionnels, lus depuis `scopeJson` s'ils existent).
- **Résiduel / dette (gap connu)** : le wizard `ClientWizardForm` (étape Conditions contrat) ne capture encore que contexte/objectifs/livrables/hors-périmètre dans `scopeJson` — les nouveaux champs CDC avancés (modules, pages, rôles, planning détaillé, ressources client, grille d'offre packagée famille A) sont supportés par le générateur PDF (fallback propre en `---` / « à préciser ») mais **pas encore saisissables en UI**. À outiller dans un prochain lot si le besoin se confirme côté commercial.
- **Fichiers** : `src/lib/pdf/commercial.ts`, `src/lib/pdf/rh.ts`, `src/lib/pdf/contract.test.ts`, `src/lib/pdf/rh.test.ts`, `src/actions/contracts.ts`, `prisma/seed.ts`.
- **Tests** : `npm run test:pdf-contract` et `npm run test:pdf-rh` étendus avec extraction de texte (`pdftotext`, dégradation silencieuse si poppler absent) vérifiant la présence de chaque article/section attendu ; `npm run test:com-docs` (gates/totals/quote-transitions/floor-price/billing/pdf-contract) OK ; `npx tsc --noEmit` OK ; `npm run lint` OK (aucun nouveau warning) ; `npx next build` OK.
- **Prudence données** : aucune migration Prisma, aucune réécriture de PDF déjà généré/stocké en GED (`generateContractPdfAction` reste idempotent sur `gedDocumentId`) — seules les **nouvelles** générations bénéficient du corps complet.
- **Statut doc** : pas de guide centre `/guides` dédié au contenu détaillé des contrats PDF à ce jour ; rien à repasser en `outdated` (aucune route/bouton/droit changé, uniquement le corps du document généré).

### 2026-11-09 — Anti-doublon org : moins de faux positifs (scoring)

- **Pourquoi** : saisie « creation client test 1 » bloquait à tort sur « test client Guiro » (~59 %) et « Mali Création S.A » (~54 %) — le Dice à 50 % sur la chaîne brute sur-pondérait des mots génériques / formes juridiques partagés.
- **Quoi** : `scoreOrgNames` ignore formes juridiques & mots vides ; seuil Dice cœur distinctif **0,72** ; Jaccard tokens pour réordonnancement ; sous-ensemble fort (≥ 2 tokens) pour « X Y » ⊂ « X Y Z ». Même moteur côté création client directe.
- **Fichiers** : `src/lib/crm/duplicates.ts`, `src/lib/crm/duplicates.test.ts`, `src/lib/commercial/client-duplicates.ts`, `src/lib/commercial/client-duplicates.test.ts`, `docs/manuels/05-crm.md`.
- **Tests** : `tsx src/lib/crm/duplicates.test.ts` + `client-duplicates.test.ts` OK (cas faux positifs + vrais positifs).
- **Statut doc** : `crm-creer-prospect` reste `to_validate` (comportement anti-doublon affiné, revalider UI) ; manuel CRM aligné.

### 2026-11-06 — Anti-doublon prospect↔client · Relances/compteurs sans « Gagné » · Toolbar fiche prospect

- **Pourquoi** : (1) la création client directe ne détectait que les doublons `ComClient`, pas les prospects CRM proches → risque de fiche client parallèle qui « mélange tout » ; (2) un deal passé **Gagné** restait visible dans Relances / compteurs CRM/Commercial / cron overdue (tâches ouvertes jamais clôturées) alors qu’il n’est plus un prospect ; (3) diagnostic du bug historique Yaye Bah « test yaye » (disparu de Prospects **et** Clients simultanément) ; (4) toolbar de la fiche prospect « vilaine, pas pro » (badges + actions mélangés, 4 CTA bleus en vrac).
- **Quoi** :
  - **A — anti-doublon étendu** : `createClientWizardAction` (chemin création directe, sans `opportunityId`) vérifie désormais aussi les **prospects CRM** proches (`searchOrgDuplicates`, même moteur que la création prospect) après le check `ComClient` existant ; blocage avec lien direct vers la fiche existante (client **ou** prospect). Nouvelle action `findClientWizardDuplicatesAction` + recherche live (debounce, anti-course) sur l’étape Identité du stepper `ClientWizardForm`, avec carte de correspondance et blocage du bouton Continuer — même UX que `prospect-create-form.tsx`.
  - **B — listes/compteurs sans Gagné fantôme** : nouveaux helpers `OPEN_PROSPECT_OPPORTUNITY_FILTER` / `openProspectTaskWhere()` (`src/lib/crm/scope.ts`) appliqués à Relances (`relances-results.tsx`), compteurs `/crm` et `/commercial` (cartes « relances en retard / ouvertes »), et au cron `api/cron/notifications` (digest « relance en retard »). En complément, `updateOpportunityStageAction` et `createClientWizardAction` (chemin conversion) **clôturent désormais les tâches ouvertes** du deal dès le passage en Gagné (même logique que le passage Perdu) pour ne plus laisser d’orphelins.
  - **C — vérif garde P0 + résiduel import** : la garde serveur (commit `735da27`, 2026-11-06 13:41) qui refuse un passage manuel en **Gagné** sans `ComClient` lié est confirmée **live et complète** dans `updateOpportunityStageAction`. Un **chemin résiduel** était cependant resté ouvert : l’**import CSV/Excel** (`applyCrmImport` → `createOneRowNested`) créait directement des deals en `GAGNE` (statut source « CLIENT ✅ ») **sans** `ComClient`, reproduisant le même bug par une autre porte. Fixé : le stage importé est plafonné à `DEVIS_ENVOYE` quand la source est « Client », avec une note CRM explicite et une relance programmée invitant à confirmer via « Transformer en client ».
  - **Diagnostic terrain (lecture seule, aucune écriture)** : requête read-only sur la base partagée → **2 deals orphelins Gagné sans `ComClient`** actuellement en base, tous deux antérieurs à la garde P0 : `Text 1 yaye` (Yaye Bah, `wonAt` 2026-11-06 11:47 — artefact du bug historique rapporté) et `ELVI Creation` (Mathieu Diarra, `wonAt` 2026-10-19 — **prospect potentiellement réel**, à vérifier). **Aucune correction automatique appliquée** (prudence données) : la fiche `/crm/prospects/[id]` de chacun reste accessible directement (non listée, car Gagné filtré des listes) et propose déjà le CTA **Transformer en client** qui complète la conversion sans dupliquer l’historique. Action recommandée côté métier : ouvrir ces deux fiches et soit compléter la conversion (si client réel), soit archiver/supprimer (si test).
  - **D — toolbar fiche prospect réorganisée** (`/crm/prospects/[id]`) : les 5 badges de statut restent dans `PageHeader.actions` ; une nouvelle barre `Surface` dédiée sépare visuellement (gauche) les actions secondaires outline — Modifier, Affecter, Scripts, Planifier un RDV (`ActionLink variant="secondary"`) — de (droite) `ProspectDetailActions`, elle-même scindée par un séparateur vertical en **pipeline** (Changer le statut / Enregistrer une action) et **conversion commerciale** (Transformer en client = seul CTA primaire restant ; Créer un devis repassé en `variant="secondary"`). Toolbar masquée si l’utilisateur n’a aucune action applicable. Fiche client (`/commercial/clients/[id]`) vérifiée déjà conforme (Modifier secondaire + Nouveau devis primaire) — aucun changement nécessaire, utilisée comme référence.
- **Fichiers** : `src/actions/crm.ts`, `src/actions/client-wizard.ts`, `src/components/commercial/client-wizard-form.tsx`, `src/lib/crm/scope.ts` (+ test), `src/lib/crm/import/apply-import.ts`, `src/app/(app)/crm/relances/relances-results.tsx`, `src/app/(app)/crm/page.tsx`, `src/app/(app)/commercial/page.tsx`, `src/app/api/cron/notifications/route.ts`, `src/app/(app)/crm/prospects/[id]/page.tsx`, `src/components/crm/prospect-detail-actions.tsx`, `src/components/crm/prospect-quote-cta.tsx`.
- **Tests** : `npm run test:crm` (dont `scope.test.ts` étendu) ; `npx tsc --noEmit` ; `npm run build` — tous OK.
- **Non fait / dette** : ~~guidage inline picker Gagné~~ → **fermé le 2026-11-09** (option Client retirée du picker + garde serveur stricte). Reste : pas de guide dédié « Créer un client direct » (dette déjà connue §6) — l’anti-doublon prospect y sera à documenter le jour où ce guide existera.
- **Statut doc** : `crm-transformer-client` reste `to_validate` (CTA toujours au même endroit fonctionnel, layout seul a changé) ; pas de nouveau guide requis pour la toolbar (pas de nouvelle route/permission).

### 2026-11-06 — Client/Contrat P1 + P2 + P3 (partiel) : stepper unifié, anti-doublon, contrat honnête

- **Pourquoi** : reprise du plan `docs/commercial/PLAN-CLIENT-CONTRAT.md` après P0 — fermer B4 (orphelins create direct), B5 (copie convert incomplète), B6 (contrat sans vraie signature) et livrer le parcours unique Q2/Q3 (stepper identité→conditions).
- **Quoi** :
  - **Migration P3.1** (`20261106140000_com_contract_family_composition`, appliquée) : enums `ComContractFamily` / `ComServiceKind` / `ComCompositionSource` ; `com_contracts.family|serviceKind|compositionSource|scopeJson|gedDocumentId` ; `ComDocKind.CONTRAT` ; dossier GED client `Contrats`.
  - **P1** : `findClientDuplicateCandidates` (anti-doublon create direct, exact + fuzzy, bloquant) ; convert CRM copie désormais `sector` / `website` / `contactRole` ; fiche client fusionne timeline `ComClientEvent` **+** `CrmActivity` du trail prospect (badges Client/CRM) ; note multi-deals si client déjà rattaché à une autre opportunité.
  - **P2** : parcours unique `createClientWizardAction` (`src/actions/client-wizard.ts`) + UI `ClientWizardForm` (`FormSteps` 6 étapes : Identité → Contact → Origine → Composition → Conditions → Récap). `/commercial/clients/nouveau` accepte `?opportunityId=` (préremplissage identité/contact/devis accepté) ; le CTA « Transformer en client » navigue désormais vers ce même stepper au lieu d’un confirm direct — l’acte délibéré (Q1) est le submit final du récap.
  - **P3.3** : `setContractStatusAction` + `ContractStatusActions` — 1ʳᵉ activation BROUILLON→ACTIF pose `signedAt` (signature explicite, jamais à la création) ; suspendre/reprendre/résilier avec confirmation ; retour à BROUILLON interdit après signature.
  - **P4.3 (anticipé)** : numérotation contrats `MSK-CONTRAT-YYYY-NNN` (séquence annuelle) branchée sur `nextComNumber`.
  - **P4.1/P4.2/P4.4 (foundation génération PDF contrat)** : `generateContractPdf` (`src/lib/pdf/commercial.ts`) — gabarit socle A+B (parties, objet, composition/totaux, conditions, périmètre CDC si famille B, droit applicable, signatures) ; `generateContractPdfAction` (`src/actions/contracts.ts`) génère, uploade en Storage GED (dossier client « Contrats »), crée le `Document` + lien, et pose `gedDocumentId` (idempotent, anti-course via `updateMany` conditionnel) ; bouton `ContractPdfAction` + miniature `DocPdfThumb` câblés sur `/commercial/contrats/[id]`. Signature = tampon/visuel MVP (PNG signature existante si dispo) + date, pas d’e-signature.
- **Fichiers** : `prisma/schema.prisma`, `prisma/migrations/20261106140000_com_contract_family_composition/`, `src/actions/client-wizard.ts`, `src/actions/contracts.ts`, `src/actions/commercial.ts`, `src/components/commercial/client-wizard-form.tsx`, `src/components/commercial/contract-status-actions.tsx`, `src/components/commercial/contract-pdf-action.tsx`, `src/lib/pdf/commercial.ts`, `src/lib/commercial/client-duplicates.ts`, `src/lib/commercial/labels.ts`, `src/lib/commercial/ged-client.ts`, `src/lib/document-numbering/**`, `src/app/(app)/commercial/clients/nouveau/page.tsx`, `src/app/(app)/commercial/contrats/[id]/page.tsx`, `src/app/(app)/commercial/clients/[id]/page.tsx`, `src/components/crm/prospect-quote-cta.tsx`, `src/lib/guides/content/commercial.ts`.
- **Recap test terrain** : [`docs/commercial/RECAP-TEST-CLIENT-CONTRAT.md`](../commercial/RECAP-TEST-CLIENT-CONTRAT.md) — checklist manuelle post-déploiement (P0→P4, routes, invariants, dette).
- **Non fait (reste à faire)** : composition sans picker catalogue avancé (lignes libres + ajout simple depuis offre) ; pas d’annexes CGV/devis jointes au PDF contrat ; rendu `generateContractPdf` vérifié visuellement (PDF rasterisé famille A 1 page / famille B 2 pages, charte + pagination conformes) mais le parcours complet de l’action (`generateContractPdfAction` → Storage + `Document` + `gedDocumentId`) n’a **pas** été rejoué contre un contrat réel en base (prudence DB dev/prod partagée) ni dans le navigateur ; `convertOpportunityToClientAction` reste en code (utilisé par la relance `ensureProspectClientDraftForQuoteAction` / garde GAGNE) mais n’est plus le chemin du CTA transform.
- **Statut doc** : `crm-transformer-client` reste `to_validate` (étapes réécrites pour le stepper, terrain à refaire — y compris le nouveau bouton « Générer PDF » sur la fiche contrat) ; pas encore de guide dédié « Nouveau client direct » (dette, à créer avec le même contenu stepper).

### 2026-11-06 — P0 Client / Contrat (Q1) : devis sans convert CRM implicite · CTA « Transformer en client » · garde GAGNE

- **Pourquoi** : bug B1 — `convertOpportunityToClientAction` (→ GAGNE) avant la modale devis cassait `createQuoteAction` (garde Intéressé) ; la doc et le centre de guides laissaient entendre une convert silencieuse via devis.
- **Quoi** :
  - `ensureProspectClientDraftForQuoteAction` : fiche `ComClient` liée (`crmOrganizationId` / `sourceOpportunityId`) pour ouvrir le devis **sans** passer le deal en GAGNE ; réutilisation si client déjà lié (pas de double création) ; journal CRM + événement client `CREATED`.
  - UI `ProspectQuoteCta` : **Créer un devis** n’appelle plus la convert ; **Transformer en client** visible avec docs dégelés (`COM_DOCS_GATED=false`), confirmation + pending inchangés.
  - `updateOpportunityStageAction` : passage manuel en **GAGNE** refusé sans fiche `ComClient` liée au prospect/org (réduit l’incohérence badge Client sans dossier).
- **Fichiers** : `src/actions/commercial.ts`, `src/components/crm/prospect-quote-cta.tsx`, `src/actions/crm.ts`, `src/lib/guides/content/commercial.ts`, `docs/manuels/05-crm.md`, `docs/manuels/06-commercial.md`
- **Statut doc** : `crm-transformer-client` → `to_validate` ; manuels 05/06 mis à jour ; ce fichier §4.

### 2026-11-06 — Lot CRM/COM : filtres Prospects multi · Rapport 4 KPI période · Clients équipe + traces (Phases 1–6)

Synthèse unique des trois développements parallèles (évite les doublons partiels dans ce fichier).

- **Filtres Prospects (modal + données)**  
  - **Pourquoi** : multi-sélection origines (« sources ») et « Suivi par » (`owners` CSV), roster incluant anciens collabs en consultation ; UI lisible (modal `lg`, badges, mini-tableau owners).  
  - **Quoi** : URL `sources=` / `owners=` (CSV) ; focus `owner=` prioritaire ; `buildProspectWhere` avec `in` ; chips / compteur Filtrer ; parsing + where testés (`prospect-list-filters`).  
  - **Fichiers** : `src/components/crm/prospects-filter-modal.tsx`, `prospects-results.tsx`, `src/lib/crm/prospect-list-filters.ts`, tests associés.

- **Rapport semaine**  
  - **Pourquoi** : indicateurs **période** uniquement ; suppression des stocks « En échange / Prêts à convertir » source de confusion.  
  - **Quoi** : grille fixe **Prospects créés** · **Premiers contacts** · **Relances faites** · **Clients gagnés** (lien clients `event=gagnes` + période) ; hint « clic = liste… » retiré sur le premier KPI ; donut répartition live inchangé.  
  - **Fichiers** : `src/app/(app)/crm/rapport-semaine/page.tsx`, `docs/manuels/05-crm.md` si aligné.

- **Clients Commercial (scope équipe + journal)**  
  - **Pourquoi** : lecture **et** écriture partagées équipe (`com.clients.manage`) avec traçabilité obligatoire ; filtres liste cohérents avec Prospects.  
  - **Quoi** : `comClientListScopeWhere` / `canAccessClient` / `canMutateClient` / `canAccessComDocForClient` ; `ComClientEvent` (création, CRM, MAJ, OWNER_CHANGED, devis, facture, paiement, contrat…) ; fiche : timeline + réassignation ; liste : modal filtre multi `owners=` + badge statut collaborateur ; `reassignClientOwnerAction`.  
  - **Fichiers** : `src/lib/commercial/scope.ts`, `client-events.ts`, `client-filters.ts`, `src/actions/commercial.ts`, `commercial/clients/**`, `clients-filter-modal`, `client-reassign-form`, écosystème devis/factures/contrats sur client parent.

- **Guides**  
  - `com-hub-naviguer` → **`outdated`** (hub + Rapport 4 KPI : ressaisir étapes / captures).  
  - `com-clients-equipe-historique` → **`draft`** (parcours filtre multi + historique + réassign à valider humain).  
  - Filtres liste Prospects : pas de guide dédié §4 — reprise sous parcours CRM / `com-hub-naviguer` après validation UI.  
  - Roster « anciens collabs » (empreinte data / optgroup Anciens) : `src/lib/crm/team.ts`, `collaborator-status.ts`, `crm-scope-bar.tsx`, objectifs — inchangé côté doc sauf reprendre captures une fois le lot validé.

### 2026-11-04 — COM-FACTU fondations + dégel devis/factures
- **Quoi** : ADR facturation ; moteurs billing (ECOSOL/Prosperity) ; numérotation `FAC|DEV-YYYYMMDD-XXXX` à l’émission ; contrats + facture depuis contrat ; créances `/comptabilite/creances` ; fiche client KPI financiers ; import Excel suivi (dry-run anomalies) ; `COM_DOCS_GATED=false`.
- **Pourquoi** : professionnaliser commercial/facturation/AR (Direction).
- **Fichiers** : `docs/architecture/COMMERCIAL-FACTURATION-CIBLE.md`, `docs/phases/PHASE-COM-FACTU.md`, `src/lib/billing/**`, `src/lib/document-numbering/**`, `prisma/migrations/20261104150000_com_factu_foundations`, `commercial/contrats/**`, `comptabilite/creances/**`, `gates.ts`
- **Statut doc** : guides commercial / compta → `to_validate` (parcours à revalider UI)

### 2026-11-03 — Mes documents : vignettes GED + titres humains
- **Quoi** : grille vignettes (aperçu/télécharger ghost comme GED) ; exclusion photo profil du coffre ; titres UI (plus de `avatar-cuid…`) ; `originalName` avatar = « Photo de profil ».
- **Pourquoi** : noms techniques en UI ; actions/liste non alignées GED.
- **Fichiers** : `documents-vault.tsx`, `documents-vault.ts`, `rh-avatar.ts`, `espace/documents`, `overview`
- **Statut doc** : guide documents → `to_validate`

### 2026-11-06 — Fiche `/espace/profil` alignée canon détail ERP
- **Pourquoi** : profil Mon espace trop « hero landing » ; devait ressembler aux fiches utilisateur / prospect.
- **Quoi** : PageHeader au nom ; bandeau identité `brand-gradient` + stats ; grille méta prospect ; sections Surface ; `ProfileEditor` embedded ; règle `fiche-detail-ux.mdc` renforcée (absolu toutes fiches détail).
- **Fichiers** : `espace/profil/page.tsx`, `profile-editor.tsx`, `.cursor/rules/fiche-detail-ux.mdc`
- **Statut doc** : profil → `to_validate`

### 2026-11-03 — GED ↔ Mes documents + shell scroll + RH = pattern Commercial
- **Quoi** : coffre espace lit l’arborescence GED collaborateur (plus seulement DocumentLink) ; html/body + shell `h-dvh` — seul `<main>` scroll ; actions RH (congés/absences/profil/heures) en boutons + modal comme RDV Commercial ; règle `list-actions-commercial-ref.mdc`.
- **Pourquoi** : Yaye Bah — docs GED visibles, espace à 0 ; double scroll désagréable ; listes RH avec textarea inline (mélange responsabilités).
- **Fichiers** : `documents-vault.ts`, `espace/documents`, `overview`, `(app)/layout`, `root layout`, `*-review-*.tsx`, rule commercial-ref
- **Statut doc** : guide documents espace → `to_validate`

### 2026-11-03 — Espace UX : modal photo, enums, activité, copy
- **Quoi** : modal agrandissement photo ; Sexe Masculin/Féminin + pièce CNI/Passeport ; lecture fiche sans faux inputs ; dégradé bleu charte ; timeline profil dans Activité récente ; Mes heures clarifiées ; purge des libellés techniques (badgeuse V1, coffre-fort…).
- **Pourquoi** : retours terrain Guiro — incompréhension heures, activité vide, champs trompeurs, jargon interne.
- **Fichiers** : `avatar-photo-viewer`, `profile-fields`, `profile-editor`, `overview`, `heures/*`, pages espace descriptions, `espace-identity-hero`, `SUIVI`
- **Statut doc** : guides RH espace → `to_validate` / relecture copy

### 2026-11-03 — Avatar photo : 413 + pending + fiche redesign
- **Quoi** : compression client (carré JPEG ~800 px), `serverActions.bodySizeLimit` 3 Mo, overlay pending + messages erreur/succès sur upload ; redesign hero/stats/tuiles fiche `/espace/profil`.
- **Pourquoi** : 413 Payload Too Large (limite défaut Server Actions 1 Mo) + soumission sans feedback ; UI trop basique.
- **Fichiers** : `next.config.ts`, `compress-image.ts`, `avatar-upload.tsx`, `rh-avatar.ts`, `espace/profil/page.tsx`, `use-pending-action.ts`, `profile-editor.tsx`
- **Statut doc** : parcours photo immédiat inchangé (sans validation RH) — guide RH à revalider sur UX pending

### 2026-11-03 — Refonte Mon espace (IA + coffre + list/create)

- **Pourquoi** : hub cartes fragmenté ; profil/contrats/bulletins/règlement dispersés ; formulaires collés aux listes.
- **Quoi** : subnav 5 (vue / heures / congés / absences / documents) ; identité → fiche ; édition multi-champs + avatar ; coffre docs (règlement inclus) ; redirects contrats/bulletins ; pages `/nouveau` ; calendrier congés/heures ; `/rh/horaires` + `/rh/conges/types` ; migration avatar + `RhLeaveTypeConfig`.
- **Fichiers** : `espace/**`, `components/espace/*`, `lib/espace/*`, `rh/horaires`, `rh/conges/types`, `actions/rh-avatar.ts`, migration `20261103140000_*`, `09-rh.md`.
- **Statut doc** : guides espace → `to_validate` / `outdated` à confirmer UI.

### 2026-11-03 — Notifs RH + vault bulletins + pilotage hub

- **Pourquoi** : demandes congés/absences/heures silencieuses ; bulletins sans aperçu ; hub RH sans raccourcis files.
- **Quoi** : kinds `rh.leave.*` / `rh.absence.*` / `rh.timesheet.*` + `notifyUsers` dans actions RH ; vault `/espace/bulletins` (KPI + aperçu GED) ; chips « Files à traiter » sur `/rh`.
- **Fichiers** : `notifications/kinds*`, `actions/rh.ts`, `espace/bulletins`, `payslip-pdf-actions.tsx`, `rh/page.tsx`.
- **Statut doc** : espace bulletins / notifs → `to_validate`.

### 2026-11-03 — Heures : théorique vs déclaré

- **Pourquoi** : feuille d’heures sans référence 40 h / jours fériés.
- **Quoi** : `work-schedule` + calendrier semaine sur `/espace/heures` (horaire `msk_default`, fériés, écart déclaré − théorique) ; FormShell plein largeur.
- **Fichiers** : `lib/rh/work-schedule*`, `work-schedule-db.ts`, `hours-week-compare.tsx`, `espace/heures/page.tsx`, `docs/manuels/09-rh.md`.
- **Statut doc** : guide heures → `to_validate`.

### 2026-11-03 — Ledger CP : consommation, accrual, UI

- **Pourquoi** : solde CP sans traçabilité ni acquisition automatique.
- **Quoi** : `leave-ledger` branché à l’approbation CP ; cron mensuel `/api/cron/rh-leave-accrual` (+2,5 j, idempotent) ; mouvements sur `/espace/conges` + fiche collab ; régularisation RH (`adjustLeaveBalanceAction`) ; ouverture ledger à la création collab.
- **Fichiers** : `lib/rh/leave-ledger*`, `actions/rh.ts`, `actions/rh-leave-ledger.ts`, `api/cron/rh-leave-accrual`, `vercel.json`, `espace/conges`, `leave-movements-list`, `leave-adjust-form`, `docs/deploy/VERCEL.md`, `docs/manuels/09-rh.md`.
- **Statut doc** : `espace-conges` → `to_validate` (mouvements + accrual à confirmer UI).

### 2026-11-03 — Mon espace : workflow profil + preview docs

- **Pourquoi** : modifications perso sans validation ; docs collab sans aperçu in-app.
- **Quoi** : demande de modif profil (`requestProfileChangeAction`) → file RH `/rh/profil-demandes` (approve/refuse + apply) ; notifs `rh.profile_change.*` ; aperçu GED sur `/espace/documents` ; KPI hub RH « Profils à valider ».
- **Fichiers** : `actions/rh-profile.ts`, `espace/profil`, `espace/documents`, `rh/profil-demandes`, `espace-docs-list`, `profile-change-*`, `lib/rh/profile-apply*`, `notifications/kinds.ts`.
- **Statut doc** : profil → `to_validate` ; `espace-conges` reste `to_validate`.

### 2026-11-03 — Hub Mon espace + historiques congés/absences/contrats

- **Pourquoi** : portail collab trop « grille de raccourcis » ; historiques incomplets ; contrats multi-parcours.
- **Quoi** : redesign `/espace` ; historiques congés/absences/contrats ; page `/espace/profil` (lecture + masquage sensibles) ; migration additif profil/ledger CP/horaires ; `leave-policy` (L.151/L.148/L.154) ; e-sign hub toujours grisé.
- **Fichiers** : `espace/**`, `lib/espace/*`, `lib/rh/leave-policy*`, `lib/rh/profile-fields.ts`, `prisma/schema.prisma`, `prisma/migrations/20261103120000_*`, `nav.ts`, `sidebar.tsx`.
- **Statut doc** : `espace-conges` → `to_validate` ; profil → `to_validate`.
- **Ops** : migration `20261103120000_espace_profile_leave_schedule` déployée.

### 2026-10-28 — Audit responsive ERP (shell + primitives + matrice)

- **Pourquoi** : UI cassée selon résolution / OS (Windows, 1366) ; pas de nav mobile ; grilles viewport vs `@container`.
- **Quoi** : drawer nav mobile ; truncate sidebar ; `ListTableScroll` ; `PageHeader`/`FormShell`/`FormSteps`/`Subnav` ; fiches en `@xl`/`@lg` ; script `npm run audit:responsive` + inventaire.
- **Fichiers** : `mobile-nav*`, `topbar`, `sidebar*`, `list-table-scroll`, `globals.css`, fiches CRM/Commercial, listes P0/P1, `RESPONSIVE.md`, `scripts/responsive-audit.mjs`.
- **Statut doc** : parcours mobile / listes → `to_validate` après lecture du rapport `tmp/responsive-audit/`.

### 2026-10-29 — Tris listes + Hub/Équipe SQL + pagination + poll unique

- **Pourquoi** : tris Relances/Affectations incohérents (client sur fenêtre tronquée, un seul `?sort=` pour 2 tables, chips/filtres droppant `sort`/`dir`) ; Hub/Équipe en `findMany` sans limite ; listes users/articles/journaux non paginées ; double poll cloche+page.
- **Quoi** : orderBy Prisma + pagination serveur Relances ; `hsort`/`hdir` Affectations ; conservation tri filtres prospects / chips ; store notifs partagé `live-store` ; agrégats SQL Hub/Équipe ; pagination users/articles/journaux ; colonne Date factures.
- **Fichiers** : `lib/list/sort.ts`, `sortable-th.tsx`, `relances-results.tsx`, `affectations/page.tsx`, `prospects-filter-modal.tsx`, `live-store.ts`, `equipe-aggregates.ts`, `crm/page.tsx`, `equipe/page.tsx`, pages users/articles/journaux/factures.
- **Statut doc** : listes CRM / Commercial → `to_validate` sur tris d’en-têtes.

### 2026-10-29 — Audit perf : notifs Direction, poll, overlays, Relances

- **Pourquoi** : `usersWithPermission` matchait le **code** métier sur `permissionId` (cuid) et ignorait les packs défaut de groupe → Direction non notifiée ; double poll cloche+AffectationsLive (4 s) + `router.refresh` / `revalidatePath("/", "layout")` → lenteurs ; overlays sans Escape / Confirm `unstable_rethrow` avalé ; Relances `take:2000` + `Promise.all` Prisma.
- **Quoi** : résolution destinataires alignée RBAC (packs directs + groupe + GRANT, hors DENY) ; `createMany` notifs ; poll adaptatif 12–25 s + event bus `msk:notif-actionable` (1 poller) ; Escape / safety Confirm 45 s / GED overlay ; filtre SQL dueAt Relances + plafond 500 ; outreach owner via `groupBy`.
- **Fichiers** : `lib/notifications/notify.ts`, `hooks/use-notifications-live.ts`, `affectations-live.tsx`, `notifications-bell.tsx`, `confirm-dialog.tsx`, `crm-week-picker.tsx`, `action-menu.tsx`, `ged-browser.tsx`, `relances-results.tsx`, `follow-up-count.ts`, `poll/route.ts`.
- **Statut doc** : parcours notifs / affectations Direction → `to_validate` (rejouer une demande d’affectation et vérifier tous les destinataires Direction).

### 2026-10-28 — Affectation fiche → Historique + traçabilité lisible

- **Pourquoi** : « Affecter » depuis la fiche écrivait une note avec UUID d’ancien suivi et ne créait pas de `CrmAssignmentRequest` → invisible dans `/crm/affectations` Historique ; timeline mal lisible.
- **Quoi** : corps « Ancien suivi : Nom Prénom » ; création d’une demande APPROVED (affectation directe) + annulation des PENDING ; humanisation des anciens UUID à l’affichage ; notes d’affectation non éditables (⋯ masqué).
- **Fichiers** : `actions/crm.ts` (`reassignProspectAction`), `prospect-timeline.ts`, fiche prospect, `SUIVI-GUIDES.md`.
- **Statut doc** : parcours Affectations → `to_validate`.

### 2026-10-28 — Notifs cloche + affectations (temps réel / UX)

- **Pourquoi** : cloche vide alors que la page notifs avait des items (poll coupé si Realtime « SUBSCRIBED ») ; Approuver sans confirmation / UI figée / double-clic ; CTA e-mail vers preview Vercel ; Traiter visible en lecture seule.
- **Quoi** : poll cloche toujours actif ; `revalidatePath` layout après notif ; CTA e-mail → `publicAppBaseUrl` (prod) ; Approuver avec dialog + état local ; Refuser en ⋯ ; masquer RelanceActions si pas `canMutate`.
- **Fichiers** : `use-notifications-live.ts`, `notify.ts`, `app-url.ts`, `assignment-resolve-actions.tsx`, fiche prospect.
- **Statut doc** : parcours affectations / notifs à revalider.

### 2026-10-28 — Fix crash /notifications (Realtime channel)

- **Pourquoi** : cloche + page notifs partageaient le même topic Supabase → `cannot add postgres_changes callbacks after subscribe()`.
- **Quoi** : topic unique par instance du hook + catch pour ne plus casser la page (fallback poll).
- **Fichiers** : `hooks/use-notifications-live.ts`.
- **Statut doc** : bug runtime.

### 2026-10-28 — Pagination sélection prospect (Nouveau RDV)

- **Pourquoi** : picker prospect sans pages → liste fastidieuse.
- **Quoi** : `ClientListPagination` + `ProspectSelectTable` paginé (20 / page, reset page à la recherche) ; règle listes étendue aux tableaux de sélection.
- **Fichiers** : `client-list-pagination.tsx`, `prospect-select-table.tsx`, `list-pagination-search.mdc`.
- **Statut doc** : UX formulaire RDV.

### 2026-10-28 — Confirmations danger (coral)

- **Pourquoi** : annulation / suppression / déconnexion confirmées en bleu — peu lisible comme risque.
- **Quoi** : `Button variant="danger"` + règle `ui-danger-actions.mdc` (logout, annuler relance/RDV, supprimer activité, refuser affectation, Perdu, archiver, etc.).
- **Fichiers** : `logout-button.tsx`, `relance-actions.tsx`, `activity-journal-actions.tsx`, `appointment-actions.tsx`, `assignment-resolve-actions.tsx`, `stage-form.tsx`, …
- **Statut doc** : UX globale.

### 2026-10-28 — Menu actions ⋯ (portal, plus de découpe tableau)

- **Pourquoi** : menu Actions découpé / chevauché dans les tableaux (`overflow` + sticky) ; lien « Fiche » collé au ⋯.
- **Quoi** : `ActionMenu` en portal `fixed` sous `body` ; « Ouvrir la fiche » dans le menu ; parse date `datetime-local` robuste pour Modifier.
- **Fichiers** : `action-menu.tsx`, `activity-journal-actions.tsx`, `relance-actions.tsx`, `appointment-actions.tsx`, `datetime-local.ts`.
- **Statut doc** : UX listes ; pas de nouveau guide.

### 2026-10-28 — Formulaires stepper + Nouveau RDV (sélection prospect)

- **Pourquoi** : champ « ID prospect » incompréhensible ; formulaires multi-intention trop denses sans étapes.
- **Quoi** : règle absolue `forms-stepper.mdc` ; `ProspectSelectTable` (tableau + recherche) ; Nouveau RDV en 3 étapes (Prospect → Détails → Confirmation) via `FormSteps`.
- **Fichiers** : `.cursor/rules/forms-stepper.mdc`, `prospect-select-table.tsx`, `appointment-form.tsx`, `crm/rdv/nouveau/page.tsx`.
- **Statut doc** : guides RDV / création à revoir (`outdated` si déjà listés) — parcours UI changé.

### 2026-10-28 — Relances : tri colonnes + actions journal (corriger / supprimer)

- **Pourquoi** : file + « Relances faites » sans en-têtes triables visibles ; journal en lecture seule → erreurs de saisie non corrigeables.
- **Quoi** : `SortableTh` sur les deux vues ; colonne Actions (⋯ Modifier / Supprimer) sur le journal ; mêmes actions sur la timeline fiche ; historique Affectations aussi triable.
- **Fichiers** : `relances/relances-results.tsx`, `activity-journal-actions.tsx`, `actions/crm.ts` (`updateActivityAction` / `deleteActivityAction`), fiche prospect, `affectations/page.tsx`.
- **Statut doc** : `crm-suivre-relancer` reste `outdated` jusqu’à relecture parcours.

### 2026-10-28 — Fiche prospect : Suivi allégé (sans card-dans-card)

- **Pourquoi** : bloc Suivi illisible (sous-carte + 5 boutons) ; même anti-pattern à éviter partout.
- **Quoi** : liste à plat « À traiter » ; CTA Traiter + menu ⋯ ; réseaux sociaux aplatis ; règle `fiche-detail-ux.mdc` ; RDV actions alignées.
- **Fichiers** : `prospects/[id]/page.tsx`, `relance-actions.tsx`, `appointment-actions.tsx`, `action-menu.tsx`.
- **Statut doc** : `crm-suivre-relancer` déjà `outdated`.

### 2026-10-28 — Tri colonnes sur les tableaux listing

- **Pourquoi** : en-têtes non cliquables ; règle produit « tout tableau listing doit se trier ».
- **Quoi** : helpers `?sort=`/`?dir=` + `SortableTh` ; règle `.cursor/rules/list-pagination-search.mdc` étendue ; branché sur les listes métier (CRM, commercial, RH, stocks, compta, ops, projets, patrimoine, espace…).
- **Fichiers** : `src/lib/list/sort.ts`, `src/components/ui/sortable-th.tsx`, pages listing concernées.
- **Statut doc** : règle agent ; guides parcours inchangés (comportement UX).

### 2026-10-28 — UI français simple (motifs perte, RDV, jargon)

- **Pourquoi** : libellés anglais (« Timing », « No-show ») et préfixe « GUIDE : » peu clairs pour toute l’équipe.
- **Quoi** : motifs de perte en français simple ; RDV « Absent » ; messages sans jargon GUIDE ; E-mail / Importer / Accès total harmonisés.
- **Fichiers** : `lib/crm/labels.ts`, `appointment-actions.tsx`, pages RDV / fiche prospect, `actions/crm.ts` / `appointments.ts`, modules commercial, RH e-mail, admin accès.
- **Statut doc** : inventaire inchangé ; libellés UI alignés.

### 2026-10-27 — CRM-ops : relances CRUD, RDV, Perdu, notifications

- **Pourquoi** : erreurs de saisie relances non corrigibles ; pas de module RDV ; blocage Perdu à 3 relances incohérent ; pas de notifs instantanées pour demandes à distance.
- **Quoi** : sync tâches / follow-up ; modifier / annuler relances ; Perdu avec motif+note + éléments liés ; timeline fiche ; `/crm/rdv` ; `AppNotification` + cloche Realtime + e-mails ciblés + cron overdue.
- **Fichiers** : `sync-follow-up-tasks.ts`, `actions/crm.ts`, `actions/appointments.ts`, `actions/notifications.ts`, `lib/notifications/*`, pages `/crm/rdv`, `/notifications`, topbar cloche, `affectations-live`, migration `crm_ops_rdv_notifications`.
- **Statut doc** : `crm-suivre-relancer` → `outdated` (à réécrire).

### 2026-10-25 — Création prospect : anti-doublon live + blocage

- **Pourquoi** : détection uniquement au clic Continuer ; scan 400 lignes ; Continuer réactivé trop tôt après match contact ; pas d’ack serveur identité.
- **Quoi** : recherche live org (≥3 car.) / contact (tél≥6, e-mail≥3) debounce + anti-course ; requêtes index `normalizedName` ; **toute correspondance org (exacte ou fuzzy) bloquante** dès 3 car. ; contact identité → Continuer désactivé jusqu’à « Continuer quand même » + refus serveur sans ack ; états pending/erreur/vide.
- **Fichiers** : `duplicates.ts`, `duplicate-search.ts`, `prospect-create-form.tsx`, `use-duplicate-live-search.ts`, `duplicate-search-status.tsx`, `duplicate-match-card.tsx`, `actions/crm.ts`, `duplicates.test.ts`, `LOT-F-DOUBLONS.md`, guide `crm-creer-prospect`.
- **Statut doc** : `crm-creer-prospect` → `to_validate`.

### 2026-10-25 — Libellés « SLA » retirés (UI)

- **Pourquoi** : terme jargon peu clair pour l’équipe terrain.
- **Quoi** : « Sans devis (SLA) » → « Sans devis depuis 24 h » (TB, modal Filtrer, badge liste).
- **Statut doc** : manuel 05 aligné.

### 2026-10-26 — Fil d’Ariane : plus de hub « Commercial » répété

- **Pourquoi** : « Retour … » + crumb « Commercial » + titre = redondance partout (ex. Objectifs).
- **Quoi** : `filterPageBreadcrumbs` retire hubs module (Commercial, Accueil…) et doublons titre/retour — une seule règle dans `PageHeader`.
- **Statut doc** : navigation CRM → `to_validate`.

### 2026-10-26 — Rapport : tendance 4 semaines compacte

- **Pourquoi** : en semaine passée, le donut « à date » disparaît et le bar chart `min-h-55` + `aspect-video` occupe toute la largeur — déséquilibre UX.
- **Quoi** : `StageBarChart` mode `compact` (hauteur fixe ~128 px, total en synthèse) ; en historique largeur `max-w-xl` ; calculs 4 semaines inchangés ; empty sobre.
- **Fichiers** : `stage-bar-chart.tsx`, `crm/rapport-semaine/page.tsx`.
- **Statut doc** : guide rapport / com-hub → `to_validate` si parcours UI.

### 2026-10-26 — Règles collab + nav + affectation (cohérence ERP)

- **Pourquoi** : filtres mélangeaient actifs/inactifs sans libellé ; TB « Assigner » sur archivé ; « Portefeuille » + « Retour Commercial » / fil d’Ariane redondants ; modal affectation trop rudimentaire ; Vue Équipe inactive peu actionnable.
- **Quoi** : `collaborator-status.ts` (règles communes) ; filtres opérationnels = actifs seulement (+ inject deep-link) ; labels « (Archivé) » ; TB sans objectifs/Assigner si inactif ; carte Équipe + CTAs historique ; `FormSteps` + parcours affectation ; PageHeader dédup back/crumb ; vocabulaire Prospects.
- **Statut doc** : guides CRM / FAQ → `to_validate` sur parcours affectation et focus collab.

### 2026-10-26 — Vérif lots audit (hardening recovery)

- **Pourquoi** : livrable trop rapide — trous sur callback recovery (`code` seul), pas de force `mustChangePassword` après lien, échec e-mail recovery silencieux, message login `lien_invalide` absent.
- **Quoi** : e-mail custom via `token_hash` → `/auth/callback` + `verifyOtp` ; filet `/auth/recover` (hash) ; force `mustChangePassword` post-recovery ; fallback MDP temp si lien KO ; clôture `passwordResetRequest` au changement MDP ; libellé vide affectations avec `q`.
- **Marinas** : toujours **aucune écriture** — gate humain inchangé.
- **Statut doc** : FAQ MDP / recovery → `to_validate` (rejouer parcours e-mail réel en prod).

### 2026-10-26 — Lots audit : sécurité MDP, Vue Équipe, objectifs, affectations, relances

- **Pourquoi** : MDP affichés en clair ; oubli MDP = notif admin seule ; cartes collab suspendus trompeuses ; objectifs TB ≠ individuels ; affectations pauvres ; KPI « File ouverte » redondant.
- **Quoi** : recovery e-mail self-service + admin lien/MDP temp sans UI secret ; cartes compactes suspendu/archivé ; somme objectifs collabs actifs sur TB ; tableaux affectations ; retrait KPI File ouverte ; script read-only Marinas (aucune écriture — gate humain).
- **Marinas (lecture)** : org « Restaurant Marinas » Yaye en `DEVIS_ENVOYE` ; ComClient « Marinas » orphelin (`com.client.create` 2026-10-10, sans `sourceOpportunityId`) — correction données **en attente d’OK**.
- **Statut doc** : FAQ MDP → `to_validate` ; `crm-suivre-relancer` déjà `to_validate`.

### 2026-10-26 — Recherche module Relances (`/crm/relances`)

- **Pourquoi** : aucune recherche texte ; volume file difficile à scanner (entreprise / contact / tél. / commercial).
- **Quoi** : `ListSearchForm` (`?q=`) + clauses Prisma (`relance-search.ts`) sur file ouverte et vue « faites » ; combinaison avec vues échéance / owner / période ; KPIs globaux hors `q`, chips & liste filtrés ; états vides + Effacer.
- **Fichiers** : `src/lib/crm/relance-search.ts` (+ test), `crm/relances/page.tsx`, `relances-results.tsx`, `package.json` (`test:crm`), guide `crm-suivre-relancer`, `docs/manuels/05-crm.md`.
- **Statut doc** : `crm-suivre-relancer` → `to_validate` (revalider parcours UI recherche).

### 2026-10-25 — Audit filtres Commercial (P0/P1)

- **Pourquoi** : revue globale compteur ↔ liste (pas seulement TB Prospects).
- **Quoi** : `buildPortfolioProspectsHref` → `stages=OPEN_PIPELINE` ; donut GAGNE → Clients `event=gagnes` ; modal Filtrer préserve/reset `devisRetard` + `event` ; `CrmScopeBar` conserve `owner` ; Équipe exclut PERDU des actifs ; Clients allow-list CRM ; Rapport « Nouveaux » cliquable.
- **Fichiers** : `scope-period.ts` (+test), `stage-donut-chart.tsx`, `prospects-filter-modal.tsx`, `crm-scope-bar.tsx`, `equipe/*`, `clients/page.tsx`, `rapport-semaine`, `prospects-results`, `05-crm.md`.
- **Statut doc** : `com-hub-naviguer` → `to_validate`.

### 2026-10-25 — Prospects : dual jauges + libellés + filtre owner TB

- **Pourquoi** : compteurs « 0 » puis liste pleine (owner non passé en URL pour visibilité own) ; libellés « dossiers » ambigus ; hub Prospects sans dual total/suivis.
- **Quoi** : `crmScopeToSearchParams` écrit toujours `owner` si défini ; hub + TB dual « total / suivis par moi » ; libellés UI « prospects » ; lien hub → mon portefeuille.
- **Fichiers** : `scope-period.ts` (+ test), `commercial/page.tsx`, `commercial-hub-cards.tsx`, `crm/page.tsx`, `crm/prospects/page.tsx`, composants KPI/conversion/équipe, `docs/manuels/05-crm.md`.
- **Statut doc** : `com-hub-naviguer` → `to_validate` (revalider dual + clic TB→liste filtrée).

### 2026-10-24 — Import Excel Yaye (merge) + purge fixtures `[TEST]`

- **Pourquoi** : intégrer le fichier manuel `CRM_Prospection_MSK Copier.xlsx` sans wipe CRM ni doublons.
- **Quoi** : purge seule `[TEST]` + archive `*@test.msk.local` ; import +117 Yaye ; 15 skip doublons ; 9 réaffectations Madina→Yaye ; vérifs KPI 8/8 ; script `scripts/crm-import-yaye-merge.ts`.
- **Résultat** : Yaye 126 dossiers (125 ouverts) · Mathieu 11 (8 ouverts) · 0 org `[TEST]` · idempotence 2ᵉ passe = 0 nouvel import.
- **Statut** : données terrain intégrées ; login UI Yaye à confirmer (hub doit afficher ~125 suivis).

### 2026-10-24 — Audit Commercial : causes racines Mathieu / Yaye / relances

- **Pourquoi** : CTA Vue Équipe « Prospects » filtrait `event=nouveaux` + semaine alors que le KPI affichait le portefeuille ; hub Yaye « 0 » vs liste partagée confuse ; KPI relances semblaient contradictoires.
- **Quoi** : `buildPortfolioProspectsHref` / `buildNouveauxProspectsHref` ; buckets relances centralisés + tests ; hub own « suivis / visibles » ; manuel 05 aligné ; script comptes test `scripts/seed-crm-test-accounts.mjs`.
- **Fichiers** : `src/lib/crm/scope-period.ts`, `relance-buckets.ts` (+ tests), pages `crm/equipe`, `relances`, `rapport-semaine`, `commercial`, `crm/page`, `docs/manuels/05-crm.md`.
- **Statut doc** : `com-hub-naviguer` → `to_validate` ; parcours Équipe→Prospects à revalider après déploiement.

### 2026-10-22 — Review + push (asg-msk)

- **Pourquoi** : review qualité avant push ; PII dans captures ; docs RH hors dépôt ; `generateStaticParams` retiré (pages auth dynamiques).
- **Quoi** : flou renforcé (h1 Bonjour, e-mails, tableaux, sidebar) ; `guideShotExists` isolé ; `.gitignore` docs RH / vtt ; commit lot guides uniquement via `origin`=`git@asg-msk:…`.
- **Statut** : prêt merge `dev`.

### 2026-10-22 — Enrichissement visuel (hero, schémas, captures)

- **Pourquoi** : feedback « trop fade / pas de captures » — guides difficiles à suivre sans repère UI.
- **Quoi** : hero dégradé MSK ; cartes modules illustrées ; étapes split texte + visuel ; schémas annotés ; workflows en frise ; captures Playwright réelles dans `public/guides/shots/` ; modèle `visuals` / `visualId` / `heroVisualId` ; script `npm run guides:shots`.
- **Fichiers** : `src/components/guides/*`, `src/app/(app)/guides/page.tsx`, `[guideId]/page.tsx`, `src/lib/guides/types.ts`, `shots.ts`, `module-visual.ts`, contents (commercial, démarrage, ged, espace, iam), `scripts/capture-guides-shots.mjs`, `public/guides/shots/*.png`.
- **Statut** : captures présentes pour Accueil, Guides, Commercial, CRM, GED, Espace, Admin users.

### 2026-10-22 — Création centre de guides + suivi absolu

- **Pourquoi** : accompagner les utilisateurs ; combler l’absence d’UI guides (manuels MD seuls).
- **Quoi** : règle Cursor `guides-suivi.mdc` ; ce fichier de suivi ; modèle Zod ; pages `/guides/**` ; contenu initial vérifié (accueil, IAM, GED, CRM/COM, FAQ) ; entrée nav ; tests.
- **Fichiers** : `.cursor/rules/guides-suivi.mdc`, `docs/guides/SUIVI-GUIDES.md`, `src/lib/guides/**`, `src/components/guides/**`, `src/app/(app)/guides/**`, `src/lib/nav.ts`, `src/lib/nav.test.ts`, `package.json`, raccourci Accueil → `/guides`.
- **Statut doc** : fondations `validated` pour guides listés §4 ; stubs modules restants.
