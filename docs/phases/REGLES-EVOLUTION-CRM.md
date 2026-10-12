# Règles strictes — évolution Partie COMMERCIALE (existant → cible)

> **Périmètre :** toute la **chaîne commerciale bout en bout** (pas seulement le suivi prospects) :  
> Prospects / suivi → Client → Catalogue & prix → Devis → Facture → Paiement / finance (+ docs).  
> Le fichier `SPEC-CRM-*` = **tranche 1** (suivi commercial / Excel MSK). Les lots COM-4…7 = **suite de la même phase**.  
> Plan global : [`PLAN-2-PHASES-COM-RH.md`](./PLAN-2-PHASES-COM-RH.md) · Spec suivi : [`SPEC-CRM-MSK-COMPLET.md`](./SPEC-CRM-MSK-COMPLET.md)

> Contexte : DB déjà en place (`phase2_catalogue_crm` + `phase3_commercial` + suite), branche **`dev`**.  
> Objectif : évoluer **proprement** — éviter la pollution **et** oser **casser / refaire** ce qui est mal conçu, **après décision claire**.

---

## 0. Règle d’or (absolu)

1. **Analyser → Keep / Change / Break / Wipe → décision → planifier → coder → tester.**  
2. **Ne pas casser par paresse** (rename cosmétique, second schéma parallèle).  
3. **Oser casser pour mieux faire** quand le diagnostic le justifie — **remontée obligatoire** (§0bis).  
4. **UI d’abord** si ça suffit (libellés, nav, charts, choice cards) = 0 migration.  
5. Migration / rupture schéma = seulement besoin métier ou dette technique **validée**.  
6. **Pas de second module commercial** fantôme (`crm2_*`, double devis…). On assainit l’existant.  
7. En **dev**, data prospects démo = jetable ; users / Auth / paie / pièces COM réelles = protégés sauf accord.  
8. Aucun lot « OK » sans **gate tests** (§6) sur **tout le périmètre touché** (suivi + devis/facture si impact).

### 0ter. Données de test (absolu)

Tester **comme le réel**, sans jamais confondre avec la prod :

| Règle | Détail |
|---|---|
| Ressemblance | Entreprises / postes / montants / canaux **plausibles Mali–MSK** |
| Marquage | Nom entreprise préfixé **`[TEST]`** ; e-mails `*@test.msk.local` ; tél. `+223 00…` |
| Interdit | Vrais prospects Excel / vrais clients dans seed, smoke, captures |
| Volume | Petit jeu (≈8–15) couvrant les 7 statuts + multi-offres |
| Purge | `PURGE=1 node scripts/seed-crm-test-fixtures.mjs` |
| UI | Badge **TEST** / « Données de test » dès que le nom commence par `[TEST]` |

### 0bis. Remontées « Break for better » (obligatoire)

Si quelque chose est **mal fait** (modèle confus, droits faux, pont Client/Devis bancal, jargon, enum pourri, UI inutilisable) :

| Étape | Contenu |
|---|---|
| 1. Fiche décision | Quoi · pourquoi c’est mauvais · impact utilisateur · option A douce / option B rupture |
| 2. Coût | Migration ? data wipe ? régression COM/RH ? effort |
| 3. Proposition | Recommandation claire (ex. « masquer Négociation » vs « drop enum + data migrate ») |
| 4. GO humain | Samba / Direction valide **Break** ou **Keep temporaire** |
| 5. Exécution | Sur `dev` · tests §6 · puis seulement merge |

**Formulation type à remonter (exemple) :**

> **BREAK proposé — `CrmPipelineStage.NEGOCIATION`**  
> Problème : statut absent du métier MSK, jargon, parcours flou.  
> Soft : masquer UI + mapper vers Devis envoyé *(recommandé court terme)*.  
> Hard : data migrate + retirer de l’UI forever ; drop enum plus tard si zéro rows.  
> Impact : écrans statut, import, stats.  
> Demande : **GO soft** / **GO hard**.

Interdit : casser en silence « parce que c’était plus simple » ; interdit aussi de **garder une mauvaise chose** sans la documenter comme dette avec échéance.

---

## 1. Inventaire — ce qui existe déjà (ne pas réinventer)

### 1.1 Schéma (solide — **garder**)

| Table / enum | Rôle | Verdict |
|---|---|---|
| `crm_organizations` | Entreprise + secteur, ville, site, notes, owner | **Keep** — déjà proche fiche Excel |
| `crm_contacts` | Contact principal / multi | **Keep** |
| `crm_opportunities` | Dossier : statut, budget, offre, relance, proba, perte | **Keep** — cœur métier |
| `crm_activities` | Journal | **Keep** |
| `crm_tasks` | Relances / tâches | **Keep** |
| `crm_scripts` | Scripts | **Keep** |
| `CrmSource` | Origines | **Keep** + **ajouter** `CHATGPT` (additif) |
| `CrmPipelineStage` | Statuts | **Keep enum** ; **masquer** `NEGOCIATION` en UI (ne pas drop enum Postgres à la légère) |
| Liens `ComClient` / `ComQuote` → org / opportunity | Pont commercial | **Keep — critique** : ne jamais casser |

Champs déjà présents utiles à la spec : `sector`, `website`, `followUpAt`, `nextAction`, `offerLabel`, `budgetXof`, `probability`, `lastActivityAt`, `lossReason`…

### 1.2 Application (existe — **à faire évoluer**, pas jeter)

| Zone | État | Verdict |
|---|---|---|
| Routes `/commercial` Menu + `/crm/*` | Livré (shell + tabs filtrées) | **Polish** terrain carte par carte |
| `src/lib/commercial/nav.ts` · `modules.ts` | Menu / Tableau de bord / Vue Équipe / Rapport | **Keep** — source de vérité nav |
| `src/actions/crm.ts` | create, stage, activity, import, tasks, rapport, goals | **Keep** ; durcir GUIDE au fil des retours |
| `labels.ts` / `scope.ts` / `team.ts` | FR, team|own|global | **Keep** |
| RBAC `crm.*` | Packs Commercial / Admin CRM | **Keep** ; Vue Équipe = `crmVisibility ≠ own` |
| Charts / pickers / Par étapes / Rapport / Vue Équipe | **Livrés** | Polish terrain |
| Fixtures `[TEST]` | Script + badge | **Keep** (§0ter) |
| Pont client / devis / SLA / plancher | COM-4/5 | **Keep** |
| Bridge facture → VE | COM-6 (`propose-from-invoice`, À comptabiliser) | **Keep** ; paiement→BQ optionnel |

### 1.3 Ce qu’il **ne faut pas** faire

| Anti-pattern | Pourquoi |
|---|---|
| Renommer tables `crm_*` → noms « plus jolis » | Migrations douloureuses, zéro gain métier |
| Supprimer l’enum `NEGOCIATION` tout de suite | Postgres enum drop = fragile ; masquer suffit |
| Créer `CrmDeal` à côté de `CrmOpportunity` | Double vérité, pollution |
| Dupliquer budget en € **et** XOF en colonnes sans param org | Pollution ; préférer affichage paramétrable sur `budgetXof` (+ taux/settings) |
| Migrer en prod sans gate sur `dev` | Risque COM/compta |
| Reset MDP / toucher users activés via seed CRM | Règle auth-password-safety |

---

## 2. Matrice Keep / Change / **Break** / Wipe (dev)

| Élément | Keep | Change | Break *(si GO §0bis)* | Wipe (dev only) |
|---|---|---|---|---|
| Tables suivi `crm_*` | ✓ si saines | Colonnes additives | Fusion / rename **seulement** si modèle faux | Truncate data démo OK |
| Tables COM devis/facture | ✓ | Polish | Refonte numérotation / liens si dette prouvée | Non sans plan |
| Enum stages | ✓ | UI sans Négociation | Data migrate hors Négociation | — |
| Enum sources | ✓ | + `CHATGPT` | — | — |
| Pont Client ↔ prospect | ✓ | UX | Refonte si conversion cassée | Non sans backup |
| Data prospects démo | | | | **Oui** avant import Excel |
| UI commerciale | | Refonte | Remplacer écrans entiers | Composants librement |
| Users / Auth / RH | ✓ | Permissions | — | **Non** |

**Break ≠ pollution :** une rupture **propre** (une vérité métier, migration claire, tests) vaut mieux qu’empiler des rustines.

### 2.1 Procédure wipe CRM data (dev uniquement)

Autorisé **seulement** si :
- branche `dev` / environnement non-prod confirmé ;
- aucun besoin de conserver les prospects actuels ;
- COM : vérifier qu’aucun devis/facture **réel** ne dépend uniquement de ces opportunities (sinon script de détachement).

Ordre type :
1. Export CSV backup optionnel.  
2. `DELETE` / truncate ordonné : activities → tasks → opportunities → contacts → organizations (garder scripts ou re-seed).  
3. Re-seed scripts si besoin.  
4. Import fichier `CRM_Prospection_MSK` (lot CRM-3).  
5. Smoke §6.

**Interdit** : `migrate reset` global en prod ; reset qui recrée users et touche MDP Auth.

---

## 3. Règles migrations (anti-pollution)

### 3.1 Autorisé

| Type | Exemple |
|---|---|
| Enum **additif** | `ALTER TYPE ... ADD VALUE 'CHATGPT'` |
| Colonne **nullable** additive | `firstContactAt`, `currencyDisplay` settings |
| Table **nouvelle** liée | `crm_weekly_reports`, `crm_goals` (si pas stockable ailleurs) |
| Index | Sur `followUpAt`, `(ownerId, stage)` déjà là |
| Data migration soft | `UPDATE ... SET stage = 'DEVIS_ENVOYE' WHERE stage = 'NEGOCIATION'` |

### 3.2 Interdit (sauf décision écrite Direction + plan rollback)

- Drop / rename table CRM existante  
- Drop valeur enum (tant que des rows peuvent l’avoir)  
- NOT NULL immédiat sur colonne déjà peuplée sans backfill  
- Deux colonnes qui signifient la même chose  
- JSON fourre-tout « meta » pour contourner le schéma sans doc  

### 3.3 Ordre d’évolution recommandé

```
1. CRM-0   Alignement libellés / droits / décisions     → 0 migration
2. CRM-UX  ChoiceCards, Combobox, charts, sous-nav      → 0 migration (+ deps npm)
3. CRM-1/2 UI liste/fiche/relances + validations GUIDE  → 0 ou colonnes additives minimes
4. Enum CHATGPT / goals / weekly report                 → migration additive ciblée
5. CRM-3   Wipe data démo + import Excel                → data only
6. Gate tests                                           → obligatoire
```

---

## 4. Couplages à protéger (régression)

Toute modif CRM doit vérifier que ça **ne casse pas** :

| Dépendance | Check |
|---|---|
| Conversion Client (`CrmConvertButtons`, `ComClient`) | Prospect **Client** → client COM |
| Devis liés `opportunityId` | Toujours visibles / créables |
| RBAC packs Commercial / Admin CRM | Accès après changement team ouverte |
| Import CSV | Toujours après changement mapping |
| Seed Super Admin | Pas de reset MDP |

---

## 5. Discipline git / branches

- Travail CRM sur **`dev`**.  
- 1 lot (CRM-0, CRM-UX…) = PR / commit logique testable.  
- Pas de gros bang « on réécrit tout le schema + toute l’UI » dans un seul commit.  
- Migration SQL **dans le même lot** que le code qui l’exige (jamais migration orpheline).

---

## 6. Gate tests (obligatoire après chaque lot touché)

### 6.1 Automatique

| Check | Commande / critère |
|---|---|
| Build | `npm run build` OK |
| Types / lint | Pas d’erreur bloquante sur fichiers touchés |
| Prisma | `prisma validate` ; migrate apply OK sur dev |

### 6.2 Fonctionnel CRM (smoke manuel ou checklist)

| # | Parcours | OK si |
|---|---|---|
| T1 | Connexion collab commercial | Accès CRM |
| T2 | Liste prospects | Colonnes essentielles, filtres, **pas** select natif sur création |
| T3 | Créer prospect | Choice cards origine/statut ; relance ; visible liste |
| T4 | Fiche | Identité lisible ; journal activité ; changer statut (sans Négociation) |
| T5 | Relances | File retard ; marquer fait |
| T6 | Scripts | Voir + copier |
| T7 | Prospects → Par étapes | Colonnes = statuts actifs |
| T8 | Tableau de bord (`/crm`) | Titre « Tableau de bord » + indicateurs + graphs |
| T9 | Vue Équipe (lead) / KPI Prospects (collab own) | Pas de tab Équipe si own ; radiaux OK |
| T10 | Client → COM | Conversion + devis (régression pont) |
| T11 | Import | N lignes ; responsables OK |
| T12 | Tabs Menu | Menu → Tableau de bord juste après ; Rapport / Vue Équipe |
| T13 | Intéressé → Client + devis | Prefill + sync Devis envoyé |
| T14 | Facture → VE | Proposer écriture ; lien retour ; file à jour |
| T15 | Plancher | Refus UI + serveur si P.U. &lt; plancher XOF |

### 6.3 Régression hors CRM (si migration ou RBAC touché)

- Accueil / login  
- Un parcours devis existant  
- Pas de freeze UI (loading + pending)

### 6.4 Critère de sortie lot

> « Lot CRM-N OK » seulement si build vert **et** checklist des parcours **concernés par le lot** cochée.  
> Bug bloquant sur un parcours touché → **pas de gate**, corriger d’abord.

---

## 7. Checklist avant **toute** modif schéma CRM

- [ ] Le besoin est-il soluble en **UI / labels / settings** sans migration ?  
- [ ] Si migration : additive ? nullable ? pas de doublon sémantique ?  
- [ ] Impact `ComClient` / `ComQuote` documenté ?  
- [ ] Plan data : backfill / truncate dev / import ?  
- [ ] Plan test §6 rempli pour ce lot ?  
- [ ] Vocabulaire §1bis spec respecté dans l’UI ?

Si une case non → **ne pas merger**.

---

## 8. Synthèse pour l’équipe

| On a déjà | On évolue | On casse si mal fait | On peut jeter (dev) | Protégé |
|---|---|---|---|---|
| Suivi + devis/facture + pont | Toute la Phase COM E2E | Via fiche **Break** §0bis + GO | Prospects démo | Users, Auth MDP, RH/paie, pièces réelles |

**Périmètre mental :** « Commercial complet » = suivi **et** documentaire **et** prix **et** encaissement — un seul produit, une seule phase.

**État (2026-10-12) :** Phase COMMERCIAL livrée (CRM-0…8 + UX + COM-4…7) sur `dev`/`main`.  
**Prochaine étape :** retours terrain Commercial · **Phase RH** (SPEC puis GO) · optionnel paiement→BQ.

---

*Document normatif — à citer dans chaque lot Commercial avant code.*
