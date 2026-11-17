# Plan — Gabarits Studio complets + Playground HTML

## Diagnostic (avant code)

### Pourquoi « pas modifiable »

1. **Composites** (`[[COMPOSITE:…]]`) : dès qu’un composite est présent, `generateOfficialPdfFromTemplate` **ignore tout le DSL** et délègue au générateur TS (`commercial.ts` / `rh.ts`). Éditer le corps Playground n’impacte pas le PDF métier.
2. **Playground POST + composite** : payload forcé en `blocks_only` → `runComposite` échoue (« Payload commercial attendu ») ou retombe sur un PDF opaque — variables / DSL sans effet réel.
3. **Contenu coquille** : devis / facture / contrat commercial / presta / fiche paie = bandeau + marqueur composite, pas les sections éditables.
4. **PDF iframe par défaut** : feedback lent, pas de visionneuse « source de vérité » HTML.

### Architecture cible

```
DSL / blocs (+ variables)
        ├─→ renderBlocksToHtml  → preview live (colonne droite)
        └─→ renderBlocksToPdf   → PDF on-demand (même corps, sans composite opaque)
Official métier (modules)     → composite generators (fidélité tableaux)
```

## Tasks

Voir `tasks/todo.md`.
