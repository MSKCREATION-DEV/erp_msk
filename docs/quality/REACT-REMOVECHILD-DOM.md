# React `removeChild` — piège DOM (ERP MSK)

## Symptôme

`NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.`

Souvent capturé par `app/error` (`[MSK app/error]`). Vu sur Suivi retards / absences / stocks / charges — surtout **création d’absence avec justificatif**.

## Cause

Désync entre le DOM réel et l’arbre React. Unmount conditionnel **pendant** qu’une extension (autofill, gestionnaire MDP, traducteur) a déplacé un nœud.

Pièges confirmés dans ce repo :

| Piège | Exemple |
|---|---|
| `<input type="file">` monté/démonté | Step / phase / « fichier choisi » |
| Dropzone en ternaire autour du file | `{cond ? dropzone : preview}` |
| Stepper qui **démonté** les panels | `step === n ? … : null` + date/time focusés |
| Barres d’actions phase | `phase === "ready" ? actions : null` **près du file** |
| Footer stepper swap | `step > 0 ? Retour : Annuler` |
| Chip sélection démonté | OptionPicker `selected ? chip : null` |
| `<input disabled\|readOnly>` valeur générée | Code article auto → `GeneratedValueField` |
| Toggle `disabled` sur file input | Extensions remanient le nœud |

## Correctifs canon

| Pattern | Remède |
|---|---|
| Code / réf. auto | `GeneratedValueField` (`<output>`) |
| Justificatif fichier | Input file **toujours** monté `sr-only`, **jamais** `disabled` ; gate dans `onChange` |
| Dropzone / preview / actions phase | Toujours montés ; `hidden` / `cn(… && "hidden")` |
| Stepper | Étapes toujours montées, clés stables |
| Footer Continuer / Submit | Les deux boutons toujours montés + `hidden` |
| Chip picker | Toujours monté + `hidden` |

Règle agent : `.cursor/rules/react-removechild-dom.mdc` (alwaysApply).

Garde-fou : `src/lib/ui/removechild-dom-guard.test.ts` (`npx tsx …`).

Commits de référence : `56ae162` (stocks) · `4995270` (file stable) · `3c2933d` (steppers) · correctif phase/footer (picker actions + footer toujours montés).
