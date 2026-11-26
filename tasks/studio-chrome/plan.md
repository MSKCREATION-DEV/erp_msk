# Plan — Chrome document + Charte liée (Studio / Playground)

## Problème (HMW)

Comment permettre à un admin gabarits de **contrôler en-tête, pied, alignements et logo** d’un document, en n’utilisant **que des assets Charte**, sans casser le pipeline DSL + régions unifié ?

## Direction retenue

**Chrome document first-class** (`DocumentChrome`) stocké dans `DocumentTemplate.structureJson.chrome` (pas de migration Prisma). Rendu HTML + PDF consomment le même objet. Logos = uniquement `BrandLogo` ACTIVE (Charte) ; `logoId` invalide / absent → défaut documents Charte, jamais un chemin fantôme UI.

### Variants écartés

| Variant | Pourquoi non (ce lot) |
|---|---|
| WYSIWYG drag-drop chrome | Trop large ; dette UX + régression charte PDF |
| Chrome 100 % dans le DSL (`# @header`) | Fragile, peu typé, pollue le contenu métier |
| Colonne Prisma dédiée | Surkill ; `structureJson` déjà là pour meta gabarit |

## Architecture

```
Charte BrandLogo ACTIVE ──► picker Playground (ids réels)
                              │
structureJson.chrome ─────────┼──► DocumentChrome (Zod)
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            renderBlocksToHtml   renderBlocksToPdf
                    │                   │
                    └──── drawHeader / drawFooter (opts chrome)
```

## Scope MVP (ce lot)

1. Modèle `DocumentChrome` + parse / merge defaults
2. PDF + HTML respectent showHeader/Footer/Logo/Tagline, aligns, footerLines, logoId
3. `embedBrandLogo({ logoId })` — refuse id hors Charte ACTIVE
4. Playground onglet **Chrome** riche + logos Charte + snippets blocs (modularité)
5. Persist chrome (`updateTemplateChromeAction`) + POST exemplaire
6. Tests studio + ADR + SUIVI-GUIDES

## Hors scope (reporté)

- WYSIWYG cellules tableaux composites
- Édition typo PDF custom fonts Charte dans chrome
- Multi-pages header sticky avancé
- Import Word / templates externes

## Risques

| Risque | Mitigation |
|---|---|
| Régression footer hardcodé RH legacy | `drawFooter` garde defaults company si chrome absent |
| Logo SVG non embedable pdf-lib | Fallback lockup déjà existant |
| XSS footerLines | escapeHtml HTML ; WinAnsi PDF |
