# Studio documentaire — Audit (Phase 1)

**Date** : 2026-11-13 · **Branche** : `dev` · **Auteur** : agent (session Studio documentaire)

But de ce document : inventaire **factuel** (grep + lecture code) de tout ce
qui génère ou référence un document PDF / gabarit dans l’ERP, avant toute
conception. Rien ici n’est inventé — chaque ligne est traçable à un fichier.

---

## 1. Génération PDF — points d’entrée recensés

| Fichier | Rôle | Statut vs Studio (après cette session) |
|---|---|---|
| `src/actions/commercial.ts` — `generateQuotePdfAction` | PDF Devis (`devis_standard`) | ✅ **Hooké** — passe par `requireActiveTemplate` + `resolveTemplateSignature` (moteur central) |
| `src/actions/commercial.ts` — `generateInvoicePdfAction` | PDF Facture (`facture_standard`) | ✅ **Hooké** — idem |
| `src/actions/templates.ts` — `generateDemoPdfAction` | PDF démo depuis la fiche Gabarit (tous types) | ✅ Supporte désormais aussi `generatorKind: "ENGINE_BLOCKS"` (branche ajoutée) en plus du switch legacy existant |
| `src/actions/rh.ts` (3 call sites : lignes ~843, ~944, ~1022) | PDF contrats collaborateur / stage / presta, attestations, règlement, solde, fiche paie | ⚠️ **Non migré** — appelle encore `getSignaturePngBytes` directement (signature toujours injectée si une signature ACTIVE existe, pas de garde `requireActiveTemplate`) |
| `src/actions/contracts.ts` (1 call site, ligne ~498) | PDF contrat commercial (`contrat_commercial_msk`) | ⚠️ **Non migré** — idem |
| `src/lib/pdf/rh.ts` | Primitives pdf-lib (header/footer/paragraphe/titre/signature) réutilisées par RH **et** par le nouveau moteur Studio (`src/lib/studio/render-blocks.ts`) | ✅ Primitives exportées, zéro régression (tests `test:pdf-rh` / `test:pdf-contract` toujours verts) |
| `src/lib/pdf/commercial.ts` | Mise en page PDF devis/facture | Non modifié — consommé tel quel par `commercial.ts` |
| `src/lib/signatures/resolve.ts` — `getSignaturePngBytes` | Résolution brute signature ACTIVE d’un user, **sans** notion de gabarit ni de toggle ON/OFF | Toujours utilisé directement par RH/contrats (dette ci-dessus) ; encapsulé par `resolveTemplateSignature` pour les flux migrés |

**Conclusion audit génération** : il existe **6 points d’entrée PDF** distincts
dans le code, tous indépendants avant cette session (chacun décidait seul
s’il fallait injecter une signature). Un seul moteur central n’existait pas.
Deux points d’entrée (Devis, Facture) sont désormais raccordés au moteur
central ; quatre (RH ×3, contrat commercial ×1) restent sur l’ancien
mécanisme direct — **dette explicite**, pas une régression (comportement
inchangé).

## 2. Registre des gabarits — état avant cette session

| Élément | Constat |
|---|---|
| Modèle Prisma | `DocumentTemplate` existait déjà (`id`, `code` unique, `type`, `name`, `version`, `active`, `structureJson`) — **aucune notion** de version historisée, de variable, de signature togglable, ni de contenu éditable en base |
| Génération du contenu | 100 % **code TypeScript en dur** (`src/lib/pdf/rh.ts`, `src/lib/pdf/commercial.ts`, `src/lib/pdf/contract.ts`) — le `DocumentTemplate` ne stockait qu’une **métadonnée** (nom, slots déclaratifs, référence), jamais le texte réel du document |
| UI Admin | `/administration/gabarits` listait les gabarits en 2 sections fixes (Commercial, RH) — pas de création possible depuis l’UI, uniquement via `prisma/seed.ts` |
| 10 gabarits actifs en seed | `devis_standard`, `facture_standard`, `contrat_commercial_msk`, `contrat_travail_msk`, `contrat_stage_msk`, `contrat_presta_msk`, `attestation_stage_msk`, `reglement_interieur_msk`, `solde_tout_compte_msk`, `fiche_paie_msk` |

## 3. Signature — état avant cette session

| Élément | Constat |
|---|---|
| Résolution | `getSignaturePngBytes({ ownerUserId })` — retourne l’image PNG de la signature **ACTIVE** du user si elle existe, sinon `undefined` |
| Activation | **Inconditionnelle** : si une signature ACTIVE existe pour le propriétaire du document, elle est injectée. Aucun gabarit ne pouvait désactiver ce comportement. |
| Risque identifié | Violation de la règle « signature OFF par défaut ». **Corrigé** : seed + migration data forcent `signatureEnabled=false` sur tous les gabarits (legacy inclus) ; activation uniquement via bascule admin (`CONCEPTION.md` §4). |

## 4. Documents de référence (`docs/`)

| Dossier | Constat |
|---|---|
| `docs/manuels/*.md` | 12 manuels + README, texte **procédural** (parcours UI), **pas** de clauses juridiques/contractuelles à extraire |
| `docs/brand/CHARTE-GRAPHIQUE-MSK.pdf` | Référence visuelle (couleurs/typo), déjà exploitée via `src/lib/brand.ts` — non concerné par le contenu des gabarits |
| `docs/studio-documentaire/` | N’existait pas avant cette session (créé ici) |

**Aucun PDF de référence contractuel/juridique (contrat type, CGV, modèle
papier) n’a été trouvé dans `docs/` nécessitant une extraction OCR.** Le texte
des contrats RH/commercial existant est déjà en dur dans
`src/lib/pdf/{rh,contract}.ts` (vérifié par lecture directe du code — pas de
PDF source séparé à relire). Si des gabarits papier existent hors dépôt
(ex. dans un espace partagé non versionné), ils n’ont pas été fournis à
l’agent dans cette session — **dette à combler si de tels documents
existent** (cf. `CONCEPTION.md` §6 Dette).

## 5. Contraintes plateforme vérifiées avant conception

| Contrainte | Vérification |
|---|---|
| RLS Supabase | Toutes les tables `public` doivent avoir RLS actif — `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` ajouté dans la migration pour les 2 nouvelles tables |
| Permission | Une seule permission `cfg.templates` gouvernait déjà `/administration/gabarits` — réutilisée pour tout le Studio (pas de nouvelle permission créée dans cette tranche) |
| Migration Prisma 7 | `prisma migrate dev` bloqué par un problème pré-existant de shadow DB (migration `20261021140000_enable_rls_public_tables` incompatible avec le bootstrap shadow) — contourné via `migrate diff` + migration manuelle + `migrate deploy` (voir détail dans le changelog `SUIVI-GUIDES.md`) |
