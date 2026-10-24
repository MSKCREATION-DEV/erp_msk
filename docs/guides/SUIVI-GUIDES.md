# Suivi du centre de guides — ERP MSK

**Fichier vivant.** À alimenter à **chaque** modification (règle absolue `.cursor/rules/guides-suivi.mdc`).  
Branche de travail : `dev`.

---

## 1. État global

| Champ | Valeur |
|---|---|
| Statut incrément | **Fondations livrées** (P1 + P2 partielles) |
| Route app | `/guides` |
| Contenu source | `src/lib/guides/` (TypeScript typé + Zod) |
| Manuels techniques | `docs/manuels/` (référence éditoriale) |
| Dernière mise à jour | 2026-10-24 (audit CRM hub / Équipe / relances) |

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

- Ne pas inventer de procédures (devis gelés Direction 13/10 — documenter l’état réel).
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
| `crm-creer-prospect` | Créer un prospect | commercial | `validated` | manuel 05 + `/crm/prospects/nouveau` |
| `crm-suivre-relancer` | Suivre et relancer un prospect | commercial | `validated` | manuel 05 |
| `crm-transformer-client` | Transformer un prospect en client | commercial | `validated` | manuel 05 (Intéressé → Client) |
| `com-hub-naviguer` | Naviguer dans le hub Commercial | commercial | `to_validate` | compteurs hub = périmètre rôle (own ≠ liste partagée) — à revalider UI |
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
