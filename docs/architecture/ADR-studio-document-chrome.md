# ADR — Chrome document Studio (en-tête / pied / Charte)

**Statut** : accepté · **Date** : 2026-11-26 · **Branche** : `dev`

## Contexte

Le pipeline unifié (DSL + régions) permettait d’éditer le **corps**, mais l’en-tête / pied / alignements restaient **hardcodés** (`drawHeader` / `drawFooter` / HTML chrome). Le Playground n’exposait qu’un titre + position logo. Les logos n’étaient pas choisis depuis la Charte comme source de vérité UI.

## Décision

1. **`DocumentChrome`** (Zod) = modèle unique HTML + PDF.
2. Persistance dans **`DocumentTemplate.structureJson.chrome`** (pas de migration Prisma).
3. **Logos** : uniquement `BrandLogo` status `ACTIVE` ; `logoId` invalide → défaut Charte documents (jamais d’asset fantôme dans le picker).
4. Playground onglet **Chrome** : toggles, aligns, footer lines, picker logos, **Enregistrer le chrome**.

## Conséquences

| Avant | Après |
|---|---|
| Header/footer figés company.ts | Éditables + persistables par gabarit |
| Logo = défaut silencieux | Choix Charte explicite (ou défaut) |
| Mise en page = 2 champs | Chrome complet + snippets blocs |

## Dette

- Typo PDF custom Charte non branchée sur chrome
- WYSIWYG cellules composites toujours hors scope
- Legacy `LEGACY_CODE` : chrome Studio non appliqué (générateurs TS historiques)
