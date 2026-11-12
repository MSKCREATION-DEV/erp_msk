# Implementation Plan — react-toastify (ERP MSK)

## Overview

Intégrer `react-toastify` comme canal unique de feedback pour les mutations UI : toast success (y compris après `redirect` via cookie flash), toast error **en plus** des messages inline. Hors scope : centre de notifications in-app.

## Architecture Decisions

1. **ToastContainer client** dans `AppProviders` (root layout reste Server Component) — pattern Next App Router documenté.
2. **API unique** `notify` / `flashToast` — jamais `toast.*` brut hors `src/lib/toast/*`.
3. **Flash cookie** `msk_flash` (JSON court, `maxAge` ~15s, lisible client) + `FlashToastListener` au mount.
4. **Erreurs** : helpers `reportActionError` + `useActionStateToast` + wire `ConfirmProvider` — inline conservé.
5. **Succès sans redirect** : `notify.success` au retour `ok` côté client.
6. **Charte MSK** : thème light custom (bleu / coral / ink), position `top-right`, `limit: 3`, Slide.
7. **Règle Cursor** `.cursor/rules/react-toastify.mdc` — absolue pour agents futurs.

## Task List

### Phase 1 — Fondation
- [ ] Task 1: Install + modules `src/lib/toast/*` + ToastProvider MSK + Flash listener
- [ ] Task 2: Brancher dans `AppProviders` + CSS
- [ ] Task 3: Règle Cursor stricte

### Checkpoint Fondation
- [ ] Build / typecheck OK ; un toast manuel visible

### Phase 2 — Hooks & patterns centraux
- [ ] Task 4: `reportActionError` / `reportActionSuccess` + `useActionStateToast`
- [ ] Task 5: Flash helpers serveur `setFlashToast` + `redirectWithFlash`
- [ ] Task 6: Confirm dialog → toast error (+ success optionnel)

### Phase 3 — Migration
- [ ] Task 7: Tous les `redirect()` métier → flash success
- [ ] Task 8: Formulaires `useActionState` → `useActionStateToast`
- [ ] Task 9: Formulaires / actions `usePendingAction` → report error/success

### Checkpoint Complete
- [ ] Parcours create/edit/erreur toastent ; inline erreur conservé ; build OK

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Double toast sur setError + report | Med | Une seule API `reportActionError` qui set + toast |
| Flash cookie non cleared | Low | Listener clear immédiat après lecture |
| Auth redirect toast parasites | Med | Messages ciblés ; pas de flash sur redirects techniques (mustChangePassword) |

## Sources

- https://fkhadra.github.io/react-toastify/
- Context7 `/fkhadra/react-toastify/v11.1.0`
- Next.js App Router client boundary (ToastContainer dans client wrapper)
