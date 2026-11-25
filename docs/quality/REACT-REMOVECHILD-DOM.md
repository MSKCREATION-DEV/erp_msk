# React `removeChild` — piège DOM (ERP MSK)

## Symptôme

`NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.`

Souvent capturé par `app/error` / `suivi/error`. Vu sur Suivi **retards** / absences / stocks — surtout changement d’étape avec `date`/`time` focusés (Brave + autofill).

## Cause

Désync entre le DOM réel et l’arbre React. Unmount / `disabled` / fermeture Modal **pendant** qu’une extension (autofill, gestionnaire MDP, traducteur, Brave Shields) a déplacé un nœud.

| Piège | Exemple |
|---|---|
| Changer d’étape avec date/time focusé | Continuer après saisie horaire |
| `disabled={… \|\| !showStep}` sur date/time | Autofill + toggle disabled |
| `<input type="file">` monté/démonté / disabled | Justificatif absence |
| Barres d’actions phase en ternaire | `phase === "ready" ? … : null` |
| Footer stepper swap | Annuler↔Retour |
| Fermeture Modal Portal synchrone | Choix collaborateur → chip |
| Swap Check / n° dans FormSteps | Avancer d’étape |

## Correctifs canon (couches)

1. **Prévention**
   - Stepper : panels toujours montés (`hidden` + `inert`)
   - Date/time/texte : **jamais** `disabled` selon l’étape (seulement `pending`) ; `tabIndex={-1}` hors étape
   - File : toujours monté, **jamais** `disabled` ; gate `onChange`
   - Actions phase / footer / chips : toujours montés + `hidden`
   - Changement d’étape via `useSafeStep` (blur + double rAF) — `src/hooks/use-safe-step.ts`
   - Fermeture Modal différée (`requestAnimationFrame`) après sélection picker

2. **Filet UX**
   - `ErrorFallback` auto-`reset()` une fois sur `isRemoveChildDomError` (`src/lib/ui/dom-safe.ts`)
   - Message utilisateur sans jargon `removeChild` (`toUserFacingError`)

3. **Garde-fou**
   - `src/lib/ui/removechild-dom-guard.test.ts`
   - `src/lib/ui/dom-safe.test.ts`

Règle agent : `.cursor/rules/react-removechild-dom.mdc` (alwaysApply).
