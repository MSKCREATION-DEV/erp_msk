# Plan d’implémentation — Client ↔ Contrat (Prospect → Client → Documents)

**Date :** 2026-11-06  
**Statut :** **PLAN UNIQUEMENT — NE PAS IMPLÉMENTER**  
**Sources :**
1. Diagnostic Prospect ↔ Client ↔ Contrat (code live, 2026-11-06) — bug convert→devis, créations divergentes, contrat sans PDF
2. [`docs/commercial/ANALYSE-MODELES-CONTRATS.md`](./ANALYSE-MODELES-CONTRATS.md) — familles A (prestation / abonnement) et B (engagement / CDC)

> **Interdit jusqu’à go explicite :** toute modification applicative, migration, template PDF, ou overwrite de `tasks/plan.md` / `tasks/todo.md`.  
> **Q1 · Q2 · Q3 sont DÉCIDÉES** (§1 P7–P8 / §4 / §9.1). Les questions §9.2 restantes ne bloquent **pas** le démarrage de P0 (elles impactent surtout P1/P2.2/P4).  
> Ce fichier est le plan canonique du lot Client/Contrat. Aucun `tasks/plan.md` n’existait au moment de la rédaction ; **ne pas** y reporter ce plan sans décision explicite (autres lots peuvent y vivre).  
> **Ne pas démarrer l’implémentation** (y compris P0) sans go explicite — le plan est prêt, le code attend le go.

---

## 0. Verdict & objectif produit

**Aujourd’hui :** deux entrées client divergent ; la convert CRM est un effet de bord du CTA devis ; le « contrat » est un enregistrement `ComContract` créé depuis un devis `ACCEPTE` **sans PDF, sans GED, sans vraie signature** (`signedAt` = maintenant à la création). Un **bug d’ordonnancement** convert → devis casse souvent le happy path.

**Cible :** un commercial qui crée un **client** (CTA explicite depuis prospect **ou** `/commercial/clients/nouveau`) aboutit toujours au **même parcours multi-étapes** → **dossier client + composition + contrat documenté** (famille A ou B). Historique CRM préservé **si** entrée depuis prospect ; création directe = même état final sans trail prospecting préalable.

---

## 1. Principes produit (non négociables)

| # | Principe | Conséquence |
|---|---|---|
| P1 | **Client implique contrat** | Un `ComClient` « vivant » n’est pas un carnet d’adresses : le parcours canonique mène à un `ComContract` (brouillon au minimum) + document(s) générés / GED. |
| P2 | **Deux entrées, un parcours, un état final** | `/crm/prospects/…` (convert explicite) et `/commercial/clients/nouveau` partagent le **même stepper canonique** (§4) et le même état final : `ComClient` + composition + `ComContract` (+ docs). Différence seule : trail CRM prospecting **présent** si entrée depuis prospect ; **absent / minimal** en création directe (pas d’org/opportunité CRM préalable obligatoire). |
| P3 | **Historique prospect préservé** | Convert ≠ destruction CRM. Org / contact / opportunity / `CrmActivity` restent. Timeline client expose le trail (fusion visuelle ou deep-link clair) — pas seulement `ComClientEvent`. |
| P4 | **Contrat = document juridique MSK** | Pas un snapshot devis déguisé. Templates familles A/B (voir analyse), paramètres structurés, PDF charte, classement GED, signature **explicite** (pas `signedAt` auto). |
| P5 | **Devis et contrat liés mais distincts** | Primauté métier (analyse §6.4) : famille A → devis > Article offre ; famille B → CGV > CDC. Le devis peut alimenter le contrat ; le contrat n’est pas un alias du devis. |
| P6 | **Stepper multi-intention** | Aligné `forms-stepper.mdc` / référence Commercial : une intention par étape, récap final, pending visible, `redirect()` serveur après succès. **Un seul composant / flux stepper** pour les deux portes (convert + create). |
| P7 | **Composition unique → contrat** | **DÉCIDÉ (§9 Q3).** Une seule shape « Composition commerciale » (offres / lignes / abonnement / montants dus). Si devis `ACCEPTE` → préremplie (visible **et** éditable). Sinon (pas de devis accepté, création directe) → composition **complète** in-flow. Le contrat **consomme toujours** cette shape. |
| P8 | **Client = acte délibéré** | **DÉCIDÉ (§9 Q1).** Prospect → Client uniquement via **CTA / confirmation explicite**. **Interdit** : convert auto à l’acceptation devis ; convert silencieuse avant / à l’ouverture du parcours devis. |

---

## 2. État actuel (synthèse diagnostic)

### 2.1 Carte du flux live

```
CrmOrganization + CrmContact + CrmOpportunity
        │
        │  AUJOURD’HUI (bug) : convert silencieuse via « Créer un devis »
        │  CIBLE (Q1) : convert = CTA / confirmation EXPLICITE seulement
        ▼
   ComClient (+ dossier GED)
        │
        │  1 devis max / opportunity (@@unique) — devis ≠ convert
        ▼
   ComQuote (+ PDF GED)
        │  status ACCEPTE  →  préfill composition (éditable), PAS auto-client
        ▼
   ComContract (AUJOURD’HUI : ACTIF + signedAt=now ; CIBLE : brouillon + PDF/GED)
```

Parallèle aujourd’hui orphelin : `/commercial/clients/nouveau` → `ComClient` sans CRM, sans contrat.  
**Cible (Q2) :** même stepper que « transformer prospect → client » → composition + contrat.

### 2.2 Bugs / incohérences concrets (P0 candidates)

| ID | Problème | Impact |
|---|---|---|
| **B1** | **Bug critique convert→devis** : `ProspectQuoteCta` appelle `convertOpportunityToClientAction` (→ `GAGNE`) **avant** la modale devis ; `createQuoteAction` exige `stage === INTERESSE` si `opportunityId` fourni → 1ʳᵉ création devis échoue ; retry bloqué | Happy path commercial cassé |
| **B2** | CTA « Transformer en client » **documenté / LOT-D** mais mort en live (`COM_DOCS_GATED=false`) ; convert = silencieuse via devis | UX trompeuse ; guides désalignés |
| **B3** | Stage `GAGNE` manuel via `StageForm` **sans** créer `ComClient` | Badge « Client » sans fiche commerciale |
| **B4** | Création client directe : mono-écran, **aucun** anti-doublon (`normalizedName` inutilisé), zéro trail CRM | Orphelins (ex. Marinas déjà noté guides) |
| **B5** | Convert : `sector` / `website` / `contactRole` **non copiés** | Fiche client incomplète |
| **B6** | `signedAt` trompeur ; pas de PDF contrat ; `DocumentTemplate.CONTRAT_PRESTA` = démo RH, déconnecté | « Contrat » non livrable client |
| **B7** | 2ᵉ opportunité même org → rattachement silencieux au client existant sans maj claire `sourceOpportunityId` | Ambiguïté multi-deals |
| **B8** | Guide `crm-transformer-client` en `validated` alors que parcours live ≠ manuel | Dette doc (règle guides) |

### 2.3 Fichiers clés (référence)

| Zone | Paths |
|---|---|
| Schema | `prisma/schema.prisma` — `CrmOpportunity`, `ComClient`, `ComQuote`, `ComContract`, `DocumentTemplate` |
| Convert / client / devis | `src/actions/commercial.ts` |
| Contrats | `src/actions/contracts.ts`, `src/lib/commercial/contract-from-quote.ts` |
| UI convert/devis | `src/components/crm/prospect-quote-cta.tsx` |
| Create client | `src/components/commercial/client-form.tsx`, `…/clients/nouveau` |
| Create prospect | `src/components/crm/prospect-create-form.tsx` |
| Gate | `src/lib/commercial/gates.ts` |
| Docs phase / guides | `docs/phases/LOT-D-TRANSFORMER-CLIENT.md`, `docs/guides/SUIVI-GUIDES.md` |
| Modèles PDF | `docs/commercial/ANALYSE-MODELES-CONTRATS.md` |

---

## 3. Modèle de paramètres contrat (cite analyse)

Référence complète : **[`ANALYSE-MODELES-CONTRATS.md`](./ANALYSE-MODELES-CONTRATS.md)** §§5–8.

### 3.1 Deux familles

| Famille | Nature | Exemples PDF |
|---|---|---|
| **A — `prestation_abonnement`** | Contrat articlé (Art. 1–13) + packs + abonnement mensuel | Prestation services · Modèle réseaux sociaux |
| **B — `engagement_cdc`** | Cahier des charges / engagement + planning + CGV prévalentes | App Web · Site vitrine & charte |

Discriminant racine (analyse §6.1) :

```text
ContractDocument
├── family: "prestation_abonnement" | "engagement_cdc"
├── serviceKind: "reseaux_sociaux" | "application_web" | "site_vitrine" | "charte_graphique" | "autre" | "bundle"
├── brand: MSK_CREATION
└── legalTone: "formal_fr_ml"
```

### 3.2 Blocs à supporter (catalogue)

- **A+B :** `cover`, `parties`, `signatures`, `annexes` (devis / n° `MSK-CONTRAT-YYYY-NNN`), `footer_brand`
- **A :** `meta_header`, `article_objet`, `offre_pack`, `prestations_complementaires`, `validation_acces`, `duree_resiliation`, `remuneration`, obligations, PI, confidentialité, APDP, responsabilité/FM, litiges
- **B :** `contexte`, `objectifs`, `perimetre_modules` **ou** `structure_pages`, `fonctionnalites_incluses`, `roles_acces` (app), `livrables`, `planning`, `ressources_client`, `recette`, `hors_perimetre`, `conditions_cgv`, `maintenance_mention`

Schéma de champs unifié proposé : analyse **§6.3** (YAML `document` / `provider` / `client` / `commercial` / `term` / `scope` / `schedule` / `clientObligations` / `legal` / `signatures`).

### 3.3 Règles de génération (analyse §6.4) — à encoder en ERP

1. `family` pilote le template — pas de mélange Articles / CDC sans mode `bundle` explicite.
2. Toujours lier `quoteRef` ; primauté devis (A) ou CGV (B).
3. Prestataire = config org ERP (pas re-saisi à chaque contrat).
4. Client = fiche `ComClient` / opportunité.
5. `serviceKind` sélectionne les blocs (packs RS vs modules/rôles vs pages/livrables).
6. Montants **FCFA** ; OM / Wave / virement / chèque.
7. Délais (validation, accès, recette) = paramètres numériques (variance 24/48/72 h déjà observée).
8. Numérotation `MSK-CONTRAT-YYYY-NNN` + phases multi-documents (ex. KOUNDJI site puis app).

---

## 4. UX unifiée multi-étapes (cible, sans code) — **stepper verrouillé**

Alignée `forms-stepper.mdc` + `list-create-separation.mdc`. **Un parcours canonique**, deux portes d’entrée.  
Ordre et séparation des intentions **figés** ci-dessous (arbitrage humain 2026-11-06 : flexible sur le découpage → recommandation plan **retenue**).

### 4.1 Ordre d’étapes (canonique)

| # | Étape | Intention | Contenu | Skip / prérempli |
|---|---|---|---|---|
| **0** | Contexte | Quelle entrée ? | Badge « depuis prospect » **ou** « Nouveau client » Commercial | Prospect / convert → **skip** (contexte injecté) |
| **1** | Identité | Qui (entreprise) | Raison sociale, ville, pays, secteur, site, anti-doublon `normalizedName` / org | Prospect → **prérempli** (éditable contrôlé) |
| **2** | Contact | Qui parle | Nom, rôle, multi-canaux, anti-doublon contact | Prospect → **prérempli** |
| **3** | Origine & suivi | Trail commercial | Source, owner, notes ; lien opportunity | Prospect → **résumé / lecture** du trail CRM existant ; création directe → saisie libre (source/owner/notes) **sans** obligation de créer une opportunité CRM complète (Q2 : pas de trail prospecting préalable) |
| **4** | **Composition commerciale** | Quoi (offre / lignes) | Voir **§4.2** — shape unique | Devis `ACCEPTE` → **prérempli visible + éditable** ; sinon → composition **vide mais complète** (même UI) |
| **5** | Conditions contrat | Cadre juridique | `family` × `serviceKind` ; dates ; billing / durée / résiliation ; blocs conditionnels A ou B ; `quoteRef` si devis lié | Devis accepté → `quoteRef` + hints montants/durée depuis composition ; **pas** de skip |
| **6** | Récap / documents | Engagement + preuve | Récap identité + composition + conditions ; génération PDF(s) + annexes (devis, CGV) + GED ; **signature = acte explicite** (pas auto) | — |

**Pourquoi ce découpage :**  
- **Composition (4)** = données commerciales réutilisables (catalogue, lignes, abonnement, montants dus) — indépendantes du template juridique.  
- **Conditions (5)** = paramètres document / famille A|B — consomme la composition, ne la reconstruit pas.  
- **Récap (6)** = engagement final + docs (conforme `forms-stepper.mdc`).

### 4.2 Composition commerciale — design de données (DÉCIDÉ)

**Shape unique** `CommercialComposition` (nom logique ; stockage exact en P3) — **identique** que la source soit un devis accepté ou une construction in-flow :

| Bloc | Contenu typique | Notes |
|---|---|---|
| `source` | `quote` \| `inline` | Traçabilité ; `quoteId` si `quote` |
| `lines[]` | Offre / pack / ligne libre : libellé, qty, unitPrice, total, `offerId?`, `catalogSku?` | Snapshot figé à la validation étape (modifiable jusqu’au récap) |
| `subscription` | Périodicité, montant récurrent, date démarrage, évent. engagement | Famille A / abonnements |
| `amountsDue` | Total HT/TTC (ou FCFA équivalent), acomptes, échéances dues | Alimente Art. rémunération / devis annexe |
| `notes` | Précisions commerciales last-minute | Conservées sur le contrat |

**Règles d’arbitrage (Q3 — DÉCIDÉ) :**

1. **Si devis `ACCEPTE` lié** : étape 4 **préremplie** depuis lignes devis + offres (abonnement + montants dus). Tous les champs restent **visibles et éditables** (ajustements last-minute avant contrat). Le `ComContract` **réutilise** cette composition (pas un second modèle parallèle).
2. **Si pas de devis accepté** (création directe client, convert sans devis, avenant / composition libre) : étape 4 propose la **même UI complète** (sélection offres catalogue + lignes commerciales + abonnement + montants) pour produire la **même shape**.
3. Étape 5 (Conditions) **ne re-saisit pas** les lignes : elle lit `CommercialComposition` + ajoute `family` / `serviceKind` / termes légaux.
4. Primauté documentaire inchangée (analyse §6.4) : famille A → devis lié > article offre ; famille B → CGV > CDC. Un contrat sans devis reste possible ; `quoteRef` optionnel mais recommandé quand un devis existe.

```text
                    ┌─ devis ACCEPTE ─► préfill Composition (éditable)
Entrée client ──────┤
                    └─ sinon ─────────► Composition in-flow (même shape)
                                         │
                                         ▼
                              Conditions contrat (A/B)
                                         │
                                         ▼
                              Récap + PDF / GED
```

### 4.3 Règles de convergence

- **Un seul flux stepper** (composant / lib partagée) : porte « transformer prospect » **et** porte `/commercial/clients/nouveau` — mêmes étapes 1→6, même état final (`ComClient` + `CommercialComposition` + `ComContract` brouillon min. + docs si étape 6).
- **Entrée prospect** : contexte injecté (skip étape 0) ; identité / contact préremplis ; trail CRM visible en lecture ; liens `crmOrganizationId` / `sourceOpportunityId` renseignés.
- **Entrée create direct** : même stepper ; pas de trail prospecting CRM préalable (étape 3 = saisie source/owner/notes sans forcer création org/opportunité CRM complète). Liens CRM optionnels / absents OK.
- **Convert = acte délibéré (Q1)** : CTA « Transformer en client » + confirmation. **Interdit** : auto-convert à devis `ACCEPTE` ; convert silencieuse à l’ouverture / avant submit du parcours devis (corrige B1/B2 en P0).
- Historique : timeline client = `ComClientEvent` **+** accès au journal CRM **quand** un trail prospect existe (pas de perte).

---

## 5. Phases / slices (avec critères d’acceptation)

**Ordre strict :** P0 avant tout. Ne pas démarrer P3/P4 tant que B1 n’est pas mort.

---

### Phase P0 — Hotfixes (bloquants) — implications Q1 figées

**Objectif :** rétablir le happy path Intéressé → devis **sans** convert ; restaurer le CTA convert **explicite** ; tuer le bug `GAGNE`-avant-devis.

**Règles P0 (Q1 — non négociables) :**
1. **Ne jamais** auto-convertir à l’ouverture / avant submit du parcours devis.
2. **Ne jamais** auto-convertir sur devis `ACCEPTE` (l’acceptation prépare la composition ; le Client reste un acte séparé).
3. **Restaurer** le CTA « Transformer en client » avec confirmation explicite (indépendant du devis).
4. **Corriger B1** : plus de passage `GAGNE` / convert avant que le devis puisse être créé.

| Slice | Description | AC |
|---|---|---|
| **P0.1** | Fix bug B1 — devis sans convert préalable | [ ] Sur prospect `INTERESSE` sans client : « Créer un devis » **n’appelle plus** `convertOpportunityToClientAction` / ne force **pas** `GAGNE` avant la modale / submit devis [ ] Devis créé + lié à l’opportunity au 1ᵉʳ clic [ ] Pas d’impasse au 2ᵉ clic |
| **P0.2** | CTA convert explicite (indépendant du devis) | [ ] Bouton « Transformer en client » (ou libellé figé) avec **confirmation** [ ] Convert crée/lie `ComClient`, `GAGNE` + `wonAt`, events/audit [ ] Devis reste un CTA **séparé** [ ] Aucune convert silencieuse via devis |
| **P0.3** | Garde `GAGNE` sans client | [ ] Impossible d’afficher un badge « Client » pipeline sans `ComClient` **OU** stage `GAGNE` via picker déclenche convert forcée (détail §9 Q4 encore ouvert — P0 doit au minimum empêcher l’incohérence B3) |
| **P0.4** | Smoke + doc gate | [ ] Parcours manuel Intéressé → devis OK **sans** devenir Client [ ] Convert confirmée OK (acte séparé) [ ] Entrée changelog `SUIVI-GUIDES` + guide `crm-transformer-client` → `outdated` ou mis à jour (pas laisser `validated` faux) |

**Checkpoint P0**
- [ ] `npm run build` OK
- [ ] Smoke : devis sans convert + convert explicite sans régression facture
- [ ] **Revue humaine** avant P1

**Fichiers probables :** `prospect-quote-cta.tsx`, `commercial.ts` (`convert*`, `createQuote*`), `gates.ts`, éventuellement `StageForm` / labels.

**Scope estimé :** M–L (mais slices S/M séparées).

---

### Phase P1 — Liaison & anti-orphelins

**Objectif :** enrichir le lien CRM ↔ client ; réduire les orphelins faciles.

| Slice | Description | AC |
|---|---|---|
| **P1.1** | Copie complète convert | [ ] `sector`, `website`, `contactRole` (← `jobTitle`) copiés |
| **P1.2** | Trail CRM sur fiche client | [ ] Lien / résumé activités prospect + bandeau source opportunity [ ] Timeline ne se limite plus aux seuls `ComClientEvent` (fusion ou deep-link documenté) |
| **P1.3** | Anti-doublon create client | [ ] `normalizedName` (et/ou org CRM) utilisé à la création directe [ ] Message si client déjà lié à une autre opportunity |
| **P1.4** | Multi-deals même org | [ ] Comportement explicite (rattachement + message) selon §9 Q7 |

**Checkpoint P1**
- [ ] Pas de perte de champs à la convert
- [ ] Create client ne crée plus d’orphelins « silencieux » sans warning
- [ ] Guides concernés `outdated` ou mis à jour

---

### Phase P2 — Convergence des créations (Q2 — parcours unique)

**Objectif :** **garder** `/commercial/clients/nouveau` **et** le CTA convert prospect ; les deux montent le **même** stepper canonique (§4) → même état final composition + contrat. Un seul composant / flux partagé (pas deux formulaires divergents).

| Slice | Description | AC |
|---|---|---|
| **P2.1** | Stepper unique (étapes 1–3 + shell) | [ ] **Un** parcours FormSteps partagé (convert + create) [ ] `/commercial/clients/nouveau` conserve la route mais utilise ce flux [ ] Convert prospect injecte le contexte (prérempli / skip) [ ] Pas de formulaire create sur la liste |
| **P2.2** | Différence d’entrée (trail) | [ ] Depuis prospect : liens CRM + résumé trail [ ] Create direct : **pas** d’obligation de créer org/opportunité CRM complète ; source/owner/notes saisis in-flow [ ] État final commun : `ComClient` + composition (+ contrat en P3) |
| **P2.3** | Composition commerciale (étape 4) | [ ] UI complète alignée §4.2 (offres + lignes + abo + montants) [ ] Même shape avec ou sans devis [ ] Si devis `ACCEPTE` : préfill visible + éditable [ ] Branchée dans le **même** stepper pour les deux portes |

**Checkpoint P2**
- [ ] Convert CRM et Create Commercial → **même** stepper / même shape identité + composition
- [ ] Anti-doublon live (org + contact) sur les deux entrées
- [ ] Build + smoke des deux portes

---

### Phase P3 — Contrat métier (données + UX)

**Objectif :** composition contrat réelle ; fin du mensonge `signedAt`.

| Slice | Description | AC |
|---|---|---|
| **P3.1** | Modèle données params | [ ] Stockage structuré aligné analyse §6.3 (JSON validé Zod **ou** tables) [ ] Champs `family`, `serviceKind`, termes, dates, billing saisis (plus de defaults fantômes) |
| **P3.2** | UX étapes 4–5 (Composition + Conditions) | [ ] Étape 4 = §4.2 [ ] Étape 5 = `family` × `serviceKind` + termes conditionnels A/B [ ] Conditions **consomment** la composition (pas de double saisie lignes) |
| **P3.3** | Statuts & signature honnêtes | [ ] Création → `BROUILLON` (pas `ACTIF` + `signedAt` auto) [ ] Passage `ACTIF` / signature = action explicite [ ] UI actions `SUSPENDU` / `RESILIE` / `TERMINE` (minimal viable) |
| **P3.4** | Lien devis (Q3 DÉCIDÉ) | [ ] Depuis devis `ACCEPTE` : `quoteId` + composition préremplie éditable [ ] Sans devis : composition in-flow → même shape [ ] Contrat toujours branché sur cette composition |

**Checkpoint P3**
- [ ] Contrat éditable / consultable avec paramètres métier
- [ ] Aucun `signedAt` sans acte utilisateur
- [ ] Revue humaine sur mapping A/B avant PDF

---

### Phase P4 — Documents / templates / GED

**Objectif :** PDF contrat charte MSK + archivage + annexes (devis, CGV).

| Slice | Description | AC |
|---|---|---|
| **P4.1** | Templates commerciaux | [ ] Entité / registre template **commercial** (pas réutiliser `CONTRAT_PRESTA` RH) [ ] Templates family A + B (au moins 1 serviceKind chacun : RS + un CDC) |
| **P4.2** | Génération PDF | [ ] `generateCommercialPdf` (ou équivalent) étendu au type CONTRAT [ ] Charte MSK (en-tête / pied analyse §7) [ ] `gedDocumentId` sur `ComContract` |
| **P4.3** | Annexes & CGV | [ ] Annexe devis liée ; CGV versionnées attachables (famille B : CGV prévalent) [ ] Numéro `MSK-CONTRAT-YYYY-NNN` |
| **P4.4** | Signature MVP | [ ] Selon §9 : tampon MSK + dates saisies **ou** stub e-sign [ ] Preuve visible sur PDF / fiche |
| **P4.5** | Guides & manuels | [ ] Parcours documenté bout-en-bout [ ] `SUIVI-GUIDES` changelog + inventaire à jour [ ] Guides concernés `to_validate` puis `validated` après smoke |

**Checkpoint P4 / Complete**
- [ ] Client → contrat → PDF GED smoke OK (A et B)
- [ ] Build + lint OK
- [ ] Guides alignés code
- [ ] **Prêt pour gate phase Commercial**

---

## 6. Impact Documents / Templates / GED

| Couche | Aujourd’hui | Cible (P3–P4) |
|---|---|---|
| PDF | Devis / facture seulement | + Contrat (A/B) |
| `DocumentTemplate` | `CONTRAT_PRESTA` démo RH | Templates **Commercial** family × serviceKind |
| GED client | Dossier à la convert / create | + document contrat classé ; annexes devis/CGV |
| `ComContract` | Pas de `gedDocumentId` | FK document + métadonnées génération |
| Signature | `SignatureAsset` émetteur devis/facture | Étendre ou parcours dédié contrat (pas confondre avec RH) |
| Config org | E-mails `.net` / `.com` hétérogènes (analyse §7) | Harmoniser NIF/SIRET + contacts prestataire dans config |

Implications analyse §8 (à traiter en P3/P4, pas en P0) :

1. `ContractTemplate` (family + serviceKind + schema Zod §6.3)
2. `GeneratedContract` lié Opportunity / Quote / Account (`ComClient`)
3. Blocs conditionnels + annexes
4. Packs STANDARD/PRO/PREMIUM = catalogue offres RS
5. Bibliothèque modules / pages réutilisable pour CDC
6. Harmonisation identifiants marque

---

## 7. Architecture décisionnelle

| Décision | Statut | Contenu |
|---|---|---|
| **Moment « Client »** | **DÉCIDÉ — §9 Q1** | Acte **délibéré** : CTA / confirmation explicite. **Pas** auto sur devis `ACCEPTE`. **Pas** convert silencieuse avant / à l’ouverture devis. P0 : restore CTA + fix B1. |
| **Create direct `/clients/nouveau`** | **DÉCIDÉ — §9 Q2** | **Garder** la route. Même stepper canonique que « transformer prospect → client » (composition + contrat). Différence : pas de trail CRM prospecting préalable (ou minimal in-flow). |
| **Contrat ± devis / composition** | **DÉCIDÉ — §9 Q3 / §4.2** | Devis `ACCEPTE` → composition préremplie **visible + éditable** ; sinon → composition **complète** in-flow ; **même shape** consommée par le contrat ; stepper §4.1 verrouillé |
| PDF avant e-sign | **OUVERT — §9 Q5** | Proposition : PDF + tampon/date MVP |

Risques :

| Risque | Impact | Mitigation |
|---|---|---|
| Implémenter PDF avant fix B1 | High | P0 strict first |
| Mélanger famille A et B dans un seul template | Med | Discriminant `family` ; mode `bundle` seulement si besoin KOUNDJI |
| Overwrite d’un autre `tasks/plan.md` | High | Plan ici uniquement ; ne pas toucher `tasks/` sans OK humain |
| Guides `validated` faux | Med | Marquer `outdated` dès P0.4 |

---

## 8. Hors scope (ce plan)

- Compta SYSCOHADA / facturation avancée au-delà du lien devis→facture existant
- E-signature légale tierce (DocuSign etc.) — sauf stub MVP décidé en §9
- Stock / production / RH
- Refonte complète pipeline CRM hors convert / stages liés
- OCR / édition des PDF sources dans `docs/` (déjà analysés)

---

## 9. Questions & arbitrages

> **Q1 · Q2 · Q3 = DÉCIDÉES** — suffisent pour démarrer **P0** (et cadrer P2/P3 composition) dès **go** humain.  
> §9.2 restants : **non bloquants pour P0** ; à trancher avant / pendant les phases indiquées.  
> P0 planifié mais **non démarré** sans go explicite.

### 9.1 DÉCIDÉ

| # | Sujet | Décision (2026-11-06) |
|---|---|---|
| **Q1** | Moment « Client » | Prospect → Client **uniquement** quand on **décide** : CTA « Transformer en client » + **confirmation** explicite. **Pas** automatiquement à devis `ACCEPTE`. **Pas** silencieusement avant / à l’ouverture du devis. Convert = acte délibéré. **Implications P0 :** ne pas auto-convert à l’ouverture devis ; restaurer le CTA transform ; corriger le bug `GAGNE`-avant-devis (B1). |
| **Q2** | Création directe | **Garder** `/commercial/clients/nouveau`. Ce doit être le **même parcours multi-étapes canonique** que « transformer prospect → client » (mêmes étapes, même état final : composition + contrat). **Différence :** pas de trail CRM prospecting préalable (historique CRM seulement si on vient d’un prospect). Un seul stepper / flux partagé. |
| **Q3** | Contrat ± devis / composition | **(a)** Devis `ACCEPTE` → étape Composition **préremplie** depuis lignes/offres (abonnement + montants dus) ; champs **visibles et éditables** ; contrat réutilise cette composition. **(b)** Sans devis accepté / création directe → stepper avec **composition complète** in-flow (même shape). **(c)** Stepper verrouillé §4.1 : Identité → Contact → Origine → **Composition commerciale** → **Conditions contrat** → Récap/docs. |

### 9.2 OUVERT (non bloquant P0)

1. ~~Moment « Client »~~ → **voir §9.1 Q1**.
2. ~~Création directe~~ → **voir §9.1 Q2**.
3. ~~Contrat ± devis~~ → **voir §9.1 Q3**.
4. **`GAGNE` manuel** via stage picker : retirer, ou déclencher convert forcée ? *(impact P0.3 / P1 — P0 doit au minimum éviter badge Client sans `ComClient`)*
5. **Signature MVP** : tampon MSK + date saisie, ou vrai circuit e-sign client plus tard ? *(P4.4)*
6. **Historique fiche client** : fusion visuelle CRM + commercial, ou simple deep-link vers prospect ? *(P1.2)*
7. **2ᵉ opportunité / même org** : 1 client multi-deals OK, ou 1 client = 1 deal source strict ? *(P1.4)*
8. **Priorité templates** : livrer d’abord famille A (RS) ou B (CDC), ou les deux en parallèle dès P4 ? *(P4)*
9. **Numérotation** : reprendre `MSK-CONTRAT-YYYY-NNN` tel quel ; qui alloue le compteur (ERP vs manuel) ? *(P4.3)*

---

## 10. Ordre d’exécution recommandé (après go — Q1/Q2/Q3 déjà figés)

```text
P0 hotfixes (B1 + CTA convert explicite + garde GAGNE + guides)
  ← Q1 appliqué : PAS d’auto-convert devis ; fix GAGNE-avant-devis
  ← planifié, PAS démarré sans go
  → checkpoint humain
P1 liaison / anti-orphelins (Q4 / Q6 / Q7 si tranchés)
  → checkpoint
P2 convergence : UN stepper partagé (convert + /clients/nouveau) étapes 1–4
  ← Q2 : même parcours, trail CRM seulement si prospect
  → checkpoint
P3 Conditions contrat + modèle params + signature honnête
  ← Q3 composition
  → checkpoint mapping A/B
P4 PDF + GED + templates + guides validated (Q5 / Q8 / Q9)
  → gate Commercial Client/Contrat
```

---

## 11. Définition de « done » du lot

- [ ] Happy path Intéressé → devis **sans** bug B1 **et sans** convert auto
- [ ] Convert = CTA + confirmation explicite ; historique prospect intact (Q1)
- [ ] `/commercial/clients/nouveau` et convert prospect = **même** stepper → même état composition + contrat (Q2)
- [ ] Composition unique (§4.2 / Q3) → contrat `family`/`serviceKind` → PDF MSK, GED, signature non mensongère
- [ ] Guides / `SUIVI-GUIDES` alignés
- [ ] Build + smoke + critères phase-quality OK

---

*Document de planification uniquement. **Q1 · Q2 · Q3 figées** — le plan est prêt à implémenter. **Ne pas coder** tant qu’un **go** explicite n’est pas donné. Les ouverts §9.2 (Q4–Q9) ne bloquent pas P0.*
