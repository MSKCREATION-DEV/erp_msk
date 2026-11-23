# Audit Vercel Functions Storage — ERP MSK

**Date** : 2026-11-23  
**Scope** : audit only (pas de refactor)  
**Projet** : `erp-msk` (`prj_lzqdVwctIrePMmYCY5M5nGfUIRpw`)  
**Team** : `mskcreations-projects` (`team_0KESonaIeR7zcKt5Pjgu6tri`)  
**Signal** : Functions Storage ~**8,5 / 10 Go** (dashboard Vercel)

---

## 1. Verdict

Le quota **Functions Storage** est rempli principalement par la **combinaison** :

1. **Beaucoup de Serverless Functions Next.js** (~190 routes/NFT locaux) avec dépendances natives / WASM **dupliquées** dans le tracing (Prisma, Sharp, OCR).
2. **Plusieurs déploiements retenus** (prod + preview) × taille d’artefacts élevée.
3. **Quota team** partagé avec d’autres projets (notamment `site-web-msk` très actif en preview).

Ce n’est **pas** un problème de Bandwidth, ni de Blob, ni d’invocations. C’est le **stockage disque des bundles de fonctions** pour chaque déploiement encore conservé.

**Risque immédiat** : à ~85 % du plafond, le prochain gros push / preview peut faire échouer un deploy ou bloquer de nouveaux artifacts. Priorité : **nettoyer les déploiements** (quick win) puis **réduire la taille unitaire** des lambdas (moyen terme).

---

## 2. Distinction des métriques Vercel

| Métrique | Ce que c’est | Lié à l’OCR / Prisma ? | Observé ici |
|----------|--------------|------------------------|-------------|
| **Functions Storage** | Taille cumulée des artefacts Serverless Functions **stockés** (tous déploiements retenus) | Oui — bundles lourds × N deploys | ~8,5/10 Go signalé |
| **Function Size (par fn)** | Limite par fonction (souvent ~250 Mo unzipped) | Oui si une route OCR dépasse | Charges OCR ~62 Mo NFT local (sous limite) |
| **Invocations / Duration** | Exécutions runtime | Non pour le stockage | Hors scope |
| **Bandwidth** | Trafic CDN / réponses | Non | Hors scope |
| **Blob Storage** | Fichiers `vercel/blob` | Non (GED = Supabase) | Pas le sujet |
| **Build / Source cache** | Cache de build | Indirect | Secondaire |

---

## 3. Preuves runtime / projet (MCP `user-vercel`)

| Élément | Valeur |
|---------|--------|
| Framework | Next.js |
| Node | `24.x` |
| Région | `lhr1` (`vercel.json`) |
| Type déploiement | `LAMBDAS` |
| Domaines | `erp-msk.vercel.app` (+ aliases team) |
| Dernier prod | `dpl_BDCT3gMoCVuqqxLinmBMba1vZ9mC` (branch `main`) |
| Billing FOCUS (`list_billing_charges`) | `costs_not_found` — pas de détail € utilisable via MCP |
| CLI `vercel list` locale | `fetch failed` (réseau/auth agent) — historique via MCP uniquement |

### Déploiements `erp-msk` visibles (API, limit 100)

| Target | Count READY | Notes |
|--------|-------------|-------|
| Production | 3 | `main` — candidats rollback inclus |
| Preview (`target: null`) | 2 | `dev` + branche analytics |
| **Total listé** | **5** | Rétention déjà partiellement courte, mais **chaque** deploy est très lourd |

### Autres projets team (partagent le quota Functions Storage)

| Projet | Deploys listés (échantillon) | Commentaire |
|--------|------------------------------|-------------|
| `site-web-msk` | ≥ 10 (surtout preview `dev`) | Contributeur significatif probable |
| `prosperity-travel` | 3 | Modéré |
| `koundjiservices` | 3 | Ancien / modéré |
| `akwaba`, `gestion-immobiliere`, `societes-maliennes` | (non détaillés) | À auditer si le cleanup erp ne suffit pas |

---

## 4. Preuves repo (build local `.next`)

Mesures sur un build local existant (binaries **darwin** ; ordre de grandeur **similaire** sous linux/Vercel).

| Indicateur | Mesure |
|------------|--------|
| Fichiers `*.nft.json` (fonctions tracées) | **190** |
| Somme naïve des fichiers tracés | **~2,61 Go** / déploiement (bornes haute si peu de dédup) |
| Médiane / P90 / max NFT | ~10 Mo / ~30 Mo / **62 Mo** |
| Prisma dans NFT | **182 / 190** → ~**888 Mo** dupliqués (WASM query compiler ~4,4 Mo × N) |
| Sharp / `@img` dans NFT | **36 / 190** → ~**684 Mo** dupliqués (libvips ~18 Mo) |
| OCR (`tesseract` / `@napi-rs/canvas` / `unpdf`) | **2 routes** : `suivi/charges/[id]` + `…/nouveau` |
| Max OCR route | **~62 Mo** (dont canvas Skia ~29 Mo) |
| `*.traineddata` racine | `fra` 1,2 Mo + `eng` 5,0 Mo — **gitignored**, **0 fichier tracké** |
| `outputFileTracingIncludes/Excludes` | **Absent** |
| `serverExternalPackages` | `tesseract.js`, `@napi-rs/canvas`, `unpdf` |

### Dépendances lourdes (`package.json`)

| Package | Rôle | Impact Functions Storage |
|---------|------|--------------------------|
| `@prisma/client` + engines WASM | Quasi toutes les pages serveur | **Élevé** (fan-out × 182) |
| `sharp` + `@img/*` | Logos, signatures, studio | **Élevé** (fan-out × 36) |
| `@napi-rs/canvas` | Rendu PDF scanné OCR | **Moyen** (2 routes, binaire gros) |
| `tesseract.js` (+ `tesseract.js-core` ~45 Mo package) | OCR charges | **Moyen** (isolé mais natif/WASM) |
| `unpdf` | Texte / render PDF | **Moyen** (avec OCR) |
| `xlsx` | Import CRM | Faible–moyen |
| `playwright` | **devDependency** | Ne doit pas aller en prod |

### OCR Suivi

- Code : `src/lib/suivi/expense-ocr.ts` → `createWorker("fra+eng")` sans `langPath` local.
- Importé via Server Action `src/actions/suivi/expenses.ts` → pages charges.
- `next.config.ts` : `bodySizeLimit: "13mb"` (uploads OCR) — n’augmente **pas** Functions Storage.
- Les `*.traineddata` locaux ne sont **pas** dans Git : risque « bundlé depuis la racine » **faible** pour les deploys Git ; landmine si quelqu’un force-add ou `vercel deploy` depuis un working tree sale.

---

## 5. Causes classées

### Impact élevé

| Cause | Preuve | Pourquoi ça monte |
|-------|--------|-------------------|
| **Fan-out Prisma WASM** | 182 NFT, ~888 Mo dupliqués | Chaque route App Router devient une Function ; le tracing recopié gonfle le stockage **par déploiement**. |
| **Fan-out Sharp/libvips** | 36 NFT (contrats, devis, signatures, charte, gabarits…) | Binaire natif ~15–20 Mo recopié dans chaque lambda concernée. |
| **N déploiements × bundle lourd** | 5 deploys erp + previews `site-web-msk` | Functions Storage = **somme** des artefacts encore retenus. Formule indicative : `5 × ~1,5–2,6 Go` ≈ ordre de grandeur du signal 8,5 Go (selon dédup Vercel). |

### Impact moyen

| Cause | Preuve | Pourquoi |
|-------|--------|----------|
| **Stack OCR native** | canvas + unpdf + tesseract sur 2 pages | Grossit les lambdas charges ; `serverExternalPackages` force l’inclusion runtime du package (WASM tesseract potentiellement au-delà des seuls `.js` listés NFT). |
| **Pas de `outputFileTracingExcludes`** | `next.config.ts` minimal | Docs/tests/fixtures/variantes WASM inutiles peuvent rester dans le graphe. |
| **Quota team multi-projets** | 7 projets | `site-web-msk` multiplie les previews ; le plafond 10 Go est **partagé**. |

### Impact faible / landmines

| Cause | Preuve | Note |
|-------|--------|------|
| `fra.traineddata` / `eng.traineddata` à la racine | Présents localement, gitignored | OK tant que non commités / non uploadés CLI. |
| `xlsx`, `recharts` | deps prod | JS, pas de binaires géants. |
| Crons `vercel.json` | 2 crons | Invocations, pas storage. |

---

## 6. Mécanisme Vercel (pourquoi ça « monte »)

1. Build Next → une (ou plusieurs) Serverless Function(s) par segment / Server Action tracé.
2. NFT (`*.nft.json`) liste les fichiers à embarquer (node_modules natifs inclus).
3. Vercel **stocke** ces artefacts pour le déploiement.
4. Chaque nouveau deploy (prod **ou** preview) **ajoute** au compteur Functions Storage jusqu’à expiration / suppression (rétention + période de recovery).
5. Le dashboard affiche la somme team — pas « l’usage CPU ».

Donc : même avec peu de traffic, un ERP Next « gras » + pushes fréquents **remplit le disque de fonctions**.

---

## 7. Plan d’actions priorisé (audit only — à faire ensuite)

### Quick wins (ops, heures)

1. **Dashboard → erp-msk → Deployments** : supprimer les preview / anciens prod non nécessaires (garder 1–2 rollback).
2. **Rétention** : resserrer Preview (ex. quelques jours) via *Deployment Retention* ; documenter la policy team.
3. **site-web-msk** : purger la file de previews `dev` (souvent le 2ᵉ contributeur).
4. Vérifier Usage team après cleanup (cible &lt; 50–60 % pour marge).

### Moyen terme (code / archi)

1. **Isoler OCR** : une seule Route Handler / action isolée ; éviter que le graphe charges tire canvas+tesseract dans d’autres pages ; envisager service externe / queue si OCR devient critique.
2. **`outputFileTracingExcludes`** : exclure `docs/**`, `**/*.test.ts`, fixtures, WASM tesseract non utilisés si possible.
3. **Réduire Sharp fan-out** : ne pas importer `signatures/resolve` / brand optimize depuis des pages qui n’en ont pas besoin (boundary Server Actions plus strictes).
4. **Prisma** : surveiller la taille du query compiler WASM ; éviter d’importer le client dans des layouts partagés inutiles.
5. Option : OCR hors Vercel (Worker / VM) si le binaire canvas reste trop cher.

### Ne pas confondre

- Augmenter le plan Pro « pour plus d’invocations » **ne résout pas** forcément Functions Storage.
- Supprimer des Blobs Supabase **ne change rien** à cette jauge.
- `bodySizeLimit: 13mb` ≠ stockage fonctions.

---

## 8. Risques si on ne fait rien

| Risque | Effet |
|--------|-------|
| Quota 10 Go atteint | Nouveaux deploys **bloqués** ou échecs d’upload d’artefacts |
| Preview `dev` / alignement `main` | Impossible de livrer / tester |
| Rollback | Ironie : garder trop de candidats rollback **occupe** le quota |
| OCR / Sharp inchangés | Chaque nouveau push **reproduit** ~Go d’artefacts |

---

## 9. Hypothèses & limites de cet audit

- Signal 8,5/10 Go **rapporté** (dashboard) — l’API MCP n’expose pas une jauge « Functions Storage » numérique dédiée.
- Somme NFT locale = **borne haute** (Vercel peut dédupliquer intra-deploy ; binaries linux ≠ darwin).
- Build `.next` local peut être légèrement en retard vs prod SHA `3c2933d…` — structure OCR/Prisma inchangée en principe.
- Pas de force-push, pas de reset MDP, pas de refactor dans ce lot.

---

## 10. Références

- [Vercel Function size limitations](https://vercel.com/docs/functions/limitations)
- [Deployment retention](https://vercel.com/docs/deployment-retention)
- [Delete deployment API](https://vercel.com/docs/rest-api/deployments/delete-a-deployment)
- Repo : `next.config.ts`, `package.json`, `src/lib/suivi/expense-ocr.ts`, `vercel.json`

---

## 11. Actions effectuées (quick wins ops) — 2026-11-23

**Exécutant** : agent deployment-expert (MCP `user-vercel` + CLI `vercel api`).  
**Périmètre** : purge deploys + rétention — **aucun** changement code app (`next.config`, OCR, Prisma).

### 11.1 Inventaire avant purge (READY)

| Projet | READY avant | Détail |
|--------|-------------|--------|
| `erp-msk` | **7** | 4 production + 3 preview (`dev` ×2, branche analytics) |
| `site-web-msk` | **10** | 10 preview (`dev` + 1 archive) — **0** production READY |

Prod aliasée **conservée** : `erp-msk.vercel.app` → `dpl_9cAt41FEGHv4f32y8BQHFT5tJurR` (vérifié après purge).

### 11.2 Purge (DELETE `/v13/deployments/{id}`)

| Projet | Supprimés | Conservés |
|--------|-----------|-----------|
| `erp-msk` | **5** | **2** prod : actuelle `dpl_9cAt41…` + rollback `dpl_BDCT3g…` |
| `site-web-msk` | **9** | **1** preview récente `dpl_GBtaCnFa…` (`dev`) |
| **Total** | **14** | — |

**erp-msk supprimés** : `dpl_FLw9kAE…` (preview `dev`), `dpl_Exr6TSJJ…` (preview `dev`), `dpl_Bd6Eaom…` / `dpl_HtULAcs…` (anciens prod), `dpl_5DFuHtMW…` (preview analytics).

**site-web-msk** : 9 anciens preview READY ; dernière preview `dev` gardée.

Tous les DELETE ont répondu `{"state":"DELETED"}` (CLI `--dangerously-skip-permissions`). MCP `user-vercel` **n’expose pas** d’outil de suppression de déploiement.

### 11.3 Rétention (Deployment Retention)

| Niveau | Avant | Après (API) | Statut |
|--------|-------|-------------|--------|
| **Team** `mskcreations-projects` `defaultExpirationSettings` | preview/prod/canceled/errored = 30 j, keep 10 | preview / canceled / errored = **7 j** (`1w`) ; prod = **30 j** (`1m`) ; keep **10** inchangé | **Fait** via `PATCH /v2/teams/{teamId}` |
| **Projet** `erp-msk` `deploymentExpiration` | 30 / 30 / 30 / 30, keep 10 | **inchangé** | **À faire manuellement** — `PATCH /v9/projects` refuse `deploymentExpiration` |
| **Projet** `site-web-msk` | idem 30 j / keep 10 | **inchangé** | **À faire manuellement** |

Les defaults team s’appliquent aux **nouveaux** projets (et éventuellement « tous les projets » seulement si choisi au dashboard). Les projets existants gardent leur policy projet tant qu’elle n’est pas resserrée.

#### Action humaine dashboard (recommandée)

1. [Team → Settings → Build and Deployment → Deployment Retention](https://vercel.com/mskcreations-projects/~/settings/build-and-deployment) — appliquer la policy **à tous les projets existants** si l’UI le propose (preview **1 week**).
2. [erp-msk → Settings → Build and Deployment → Deployment Retention](https://vercel.com/mskcreations-projects/erp-msk/settings/build-and-deployment) — Preview **1 week**, Production **1 month**, Canceled/Errored **1 week** ; réduire « deployments to keep » si exposé (cible 2–3).
3. [site-web-msk → Settings → Build and Deployment → Deployment Retention](https://vercel.com/mskcreations-projects/site-web-msk/settings/build-and-deployment) — même resserrage preview (cible **1 week**, keep minimal).

### 11.4 Espace / quota

- Jauge Functions Storage **non exposée** numériquement via MCP/API → pas de mesure post-cleanup fiable ici.
- **Estimation** : 14 deploys marqués `DELETED` ; pour `erp-msk` (bundles lourds), ordre de grandeur **plusieurs Go** potentiels si chaque deploy pesait ~1–2 Go d’artefacts (borne audit §4).
- **Important** : les deploys manuellement supprimés entrent en **période de recovery** (souvent ≥ 1 jour, jusqu’à ~30 j selon âge) avant GC définitif — la jauge dashboard peut **baisser avec délai**, pas instantanément. Vérifier Usage team dans 24–48 h puis après recovery.

### 11.5 État post-purge (READY)

| Projet | READY restants |
|--------|----------------|
| `erp-msk` | 2 production (`dpl_9cAt41…` + `dpl_BDCT3g…`) |
| `site-web-msk` | 1 preview (`dpl_GBtaCnFa…`) |

### 11.6 Prochaines étapes si quota encore serré

1. Attendre recovery + re-lire Usage Functions Storage (cible &lt; 50–60 %).
2. Appliquer rétention projet (dashboard, §11.3).
3. Purger autres projets team si besoin (`prosperity-travel`, etc.).
4. Moyen terme code (hors ce lot) : §7 audit — OCR isolé, `outputFileTracingExcludes`, réduire fan-out Prisma/Sharp.
