# Plan — Pipeline Studio unifié (DSL + régions)

## Diagnostic (résolu)

1. **Composites** : dès qu’un `[[COMPOSITE]]` était présent, `generateOfficialPdfFromTemplate` **ignorait le DSL** → Playground ≠ PDF métier.
2. **`playgroundTextMode`** : stripait les composites pour « sync » HTML — mentait sur le PDF métier.

## Architecture cible (livrée — Option A)

```
DSL / blocs (+ variables)
        ├─→ renderBlocksToHtml  (+ régions peuplées)
        └─→ renderBlocksToPdf   (+ drawCompositeRegion)
Official métier = Playground = même generateOfficialPdfFromTemplate
```

ADR : `docs/architecture/ADR-studio-pipeline-unifie.md`.

## Tasks

Voir `tasks/todo.md`.
