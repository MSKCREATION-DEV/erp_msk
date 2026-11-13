# Studio documentaire — Conception (Phase 2)

Suite de [`AUDIT.md`](./AUDIT.md). Décisions de modèle de données et
d’architecture pour la v1 livrée dans cette session.

---

## 1. Principe directeur

> Un document = un gabarit central. Les modules métier fournissent des
> données → appellent le moteur → reçoivent un PDF. Jamais l’inverse.

La v1 ne migre **pas** tous les générateurs existants (RH, contrats) d’un
coup — ce serait risqué en une session (règle « ne jamais supprimer un
générateur parallèle avant que son remplaçant soit validé »). Elle construit
le **moteur central + la bibliothèque Studio + un vrai raccordement bout en
bout** sur un flux réel (Commercial), laissant les autres générateurs
inchangés et fonctionnels, avec la dette explicitement tracée.

## 2. Décision : étendre `DocumentTemplate`, pas le remplacer

`DocumentTemplate` existait déjà et était déjà référencé par `code` dans tout
le code legacy (`requireUser`, seeds, actions RH/Commercial). Le remplacer
aurait cassé l’existant pour un gain nul. Décision : **étendre** le modèle
plutôt que créer un registre parallèle.

Champs ajoutés sur `DocumentTemplate` :

| Champ | Rôle |
|---|---|
| `description` | Affichée dans l’UI Studio |
| `generatorKind` (`LEGACY_CODE` \| `ENGINE_BLOCKS`) | Discrimine : contenu en dur dans `src/lib/pdf/*.ts` (legacy) vs contenu stocké en base et rendu par le moteur (`src/lib/studio/render-blocks.ts`) |
| `signatureEnabled` (défaut `false`) | Bascule explicite par gabarit — règle absolue |
| `publishedVersionId` | Pointeur vers la version actuellement servie aux générations |
| `createdById` | Traçabilité |

Deux tables nouvelles (pas 12 — volontairement minimal) :

| Table | Pourquoi une table séparée (pas un JSON sur `DocumentTemplate`) |
|---|---|
| `DocumentTemplateVersion` | L’historisation (brouillon → publié → archivé) a besoin de lignes indépendantes, pas d’un tableau JSON muté en place — sinon impossible de garder l’ancienne version active pendant qu’on prépare la suivante |
| `TemplateVariableDef` | Catalogue **transverse** (pas spécifique à un gabarit) — une variable comme `client.nom` est réutilisée par N gabarits ; une table séparée évite la duplication et permet l’UI « catalogue » demandée |

Pas de table séparée pour les « blocs » : stockés en `Json` (`bodyJson` sur
`DocumentTemplateVersion`) et validés par un schéma Zod côté application
(`src/lib/studio/types.ts`). Une table par bloc aurait ajouté de la
complexité relationnelle sans bénéfice (pas de requête transverse sur les
blocs individuels dans le périmètre actuel).

## 3. DSL textuel plutôt que Playground 3 zones

La mission évoque un « Playground 3 zones » (édition / variables / aperçu
live). Décision de scope pour cette session : livrer un **DSL textuel**
simple (`# Titre`, `> encadré`, `---`, `[[SIGNATURE: … \| …]]`, variables
`{{slug}}`) plutôt qu’un éditeur WYSIWYG drag-and-drop complet.

Raisons :
- Un DSL textuel est **round-trip testable** immédiatement (`dsl.test.ts`) —
  garantie de fiabilité avant toute UI riche.
- Il reste 100 % compatible avec un futur éditeur visuel (le DSL devient le
  format d’échange interne, un Playground pourrait le générer/consommer).
- Livrer un vrai moteur + bibliothèque + intégration réelle a été jugé plus
  prioritaire que la richesse de l’éditeur, conformément à la consigne
  « priorité architecture + moteur + bibliothèque réelle, pas volume
  cosmétique de Playground ».

**Dette assumée et déclarée** : pas de WYSIWYG, pas de glisser-déposer de
blocs, pas de réordonnancement visuel (il faut réécrire le texte). À faire
dans une session dédiée si le besoin est confirmé par les utilisateurs du
Studio.

## 4. Signature OFF par défaut — règle produit absolue

Règle : **tout** gabarit a la signature désactivée par défaut — y compris
les 10 gabarits legacy. Pas d’exception « pour préserver la prod ».

Mise en œuvre :
1. **Colonne `signatureEnabled` par défaut `false`** dans le schéma (tout
   nouveau gabarit Studio démarre OFF).
2. **Seed** (`prisma/seed-studio.ts`) : `updateMany` idempotent force
   `signatureEnabled = false` sur les 10 codes legacy (+ démo Studio).
3. **Migration data** `20261113150000_signature_enabled_off_templates` :
   `UPDATE … SET signatureEnabled = false WHERE signatureEnabled = true`
   (corrige les bases déjà seedées à `true`).
4. **Résolution** via `resolveTemplateSignature` (`src/lib/studio/engine.ts`)
   → `{}` si OFF (pas d’image, pas de bloc signature vide sur Devis/Facture
   Commercial ni sur le rendu `ENGINE_BLOCKS`). Activation uniquement via
   bascule admin explicite sur la fiche gabarit.

## 5. Variables `{{slug}}` — modèle de résolution

- Syntaxe exclusive `{{slug}}`, extraction via regex (`extractVariableSlugs`).
- `resolveTemplateString(text, context, { strict })` :
  - `strict: true` (génération **officielle**) → lève `MissingVariableError`
    si une variable **requise** est absente du contexte. Jamais de blanc
    silencieux.
  - `strict: false` (aperçu/preview) → affiche un placeholder visible
    `⟪slug manquant⟫` plutôt qu’une chaîne vide, pour que l’absence soit
    toujours visible à l’œil.
- Catalogue central `TemplateVariableDef` : sert à (a) détecter les variables
  « hors catalogue » dans l’éditeur (badge coral + lien de création), (b)
  fournir une **vraie valeur d’exemple** pour les aperçus (`sampleValue`),
  via `buildSampleContextForSlugs` — pas un aperçu statique.

## 6. Intégration réelle choisie : Devis + Facture (Commercial)

Choix du point d’intégration minimal-risque demandé par la mission
(« au moins un flux PDF réel ») :

- `generateQuotePdfAction` / `generateInvoicePdfAction` dans
  `src/actions/commercial.ts`.
- Changement **strictement limité** à la résolution de signature : ajout
  d’un garde amont `requireActiveTemplate("devis_standard" | "facture_standard")`
  (erreur explicite si le gabarit est manquant/inactif/non publié) puis
  `resolveTemplateSignature`. Le reste de la fonction (construction du PDF,
  upload GED, création `Document`, logique anti-race-condition
  `updateMany(... gedDocumentId: null)`, audit) est **inchangé à l’octet**.
- Choisi plutôt que RH/contrats car Devis/Facture sont le flux **le plus
  fréquent et le plus visible métier** (Commercial = priorité « URGENT »
  déclarée), avec le risque de régression le plus faible possible (un seul
  appel remplacé, sortie PDF identique dans le cas normal).

## 7. Dette / prochaines étapes (non traité dans cette session)

| Point | Pourquoi reporté |
|---|---|
| Migrer RH (`actions/rh.ts` ×3) et contrat commercial (`actions/contracts.ts`) vers le moteur central | Risque plus élevé (3+1 call sites, documents RH sensibles) — à traiter dans une session dédiée avec tests avant/après |
| Playground WYSIWYG 3 zones | Scope délibérément réduit à un DSL textuel testé (voir §3) |
| OCR de documents de référence papier | Aucun PDF de référence contractuel trouvé dans `docs/` nécessitant OCR (voir `AUDIT.md` §4) — si de tels documents existent hors dépôt, à fournir pour traitement |
| Guide utilisateur `/guides` dédié au Studio | Pas encore créé — statut `draft` à ouvrir, cf. `SUIVI-GUIDES.md` |
| Découpage permission `cfg.templates` en view/edit | Non fait — réutilisation du périmètre existant, documenté comme décision de scope |
