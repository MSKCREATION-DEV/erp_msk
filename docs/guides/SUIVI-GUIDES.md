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
| Dernière mise à jour | 2026-10-28 (affectations fiche → historique) |

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
| `crm-creer-prospect` | Créer un prospect | commercial | `to_validate` | live doublons 3 car. + ack contact — revalider UI |
| `crm-suivre-relancer` | Suivre et relancer un prospect | commercial | `outdated` | CRUD relances + RDV + Perdu sans min 3× — à réécrire |
| `crm-transformer-client` | Transformer un prospect en client | commercial | `validated` | manuel 05 (Intéressé → Client) |
| `com-hub-naviguer` | Naviguer dans le hub Commercial | commercial | `to_validate` | dual total/suivis + owner URL own — à revalider UI |
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
