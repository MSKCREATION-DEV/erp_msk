# React `removeChild` — piège DOM (ERP MSK)

## Symptôme

`NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.`

Souvent capturé par `app/error` (`[MSK app/error]`). Vu sur Suivi retards / absences / stocks / charges.

## Cause

Désync entre le DOM réel et l’arbre React : unmount conditionnel d’`<input type="file">`, dropzone, ou inputs focusés (date/time) ; ou `<input disabled|readOnly>` utilisé comme affichage d’une valeur générée (extensions autofill).

## Correctifs canon

| Pattern | Remède |
|---|---|
| Code / réf. auto | `GeneratedValueField` (`src/components/ui/generated-value-field.tsx`) |
| Justificatif fichier | Input file toujours monté `sr-only` + dropzone cachée |
| Stepper | Étapes toujours montées, `hidden` / `cn(… && "hidden")` |

Règle agent : `.cursor/rules/react-removechild-dom.mdc` (alwaysApply).

Commits de référence : `56ae162` (stocks), `4995270` (absences justificatif).
