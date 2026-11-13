# Création collabs Marketing / Communication (2026-11-13)

Script one-shot : `scripts/ops-create-marketing-collabs.ts`

```bash
npx tsx --env-file=.env.local scripts/ops-create-marketing-collabs.ts
# sans e-mail : SEND_INVITE=0 …
```

## Personnes

| Nom | E-mail | Poste | Lieu / service |
|---|---|---|---|
| Fatimatou DIALLO | f.diallo@mskcreation.net | Graphiste | ACI 2000 |
| Lidaou Espoir AWESSO | e.awesso@mskcreation.net | Vidéaste & Graphisme | TOGO · Marketing & Communication · +228 90 09 14 02 |
| Djoulde KEITA | d.keita@mskcreation.net | Community Manager | Communication & Marketing |
| Eric Wilfried GOLO | e.golo@mskcreation.net | Monteur Vidéo | Communication & Marketing |

## Droits

- Groupe `collaborateur` + pack `collaborateur` uniquement (self.* / espace collab).
- Pas de Direction, Suivi manage, RH manage, Commercial, etc.
- Visibles dans le picker Suivi absences/retards via `rh_employees` (status ACTIVE).

## Auth

- `createUser` seulement si Auth inexistant.
- Statut invite : `MUST_CHANGE_PASSWORD` + `mustChangePassword=true`.
- Compte déjà ACTIVE → MDP Auth **non** modifié.

## IDs créés (prod, 2026-11-13)

| E-mail | userId | employeeId |
|---|---|---|
| f.diallo@mskcreation.net | `09dee40f-8eb9-4d09-b6da-5e850973ea02` | `cmwewcebj0001rfi9p0iz14nk` |
| e.awesso@mskcreation.net | `e45d0208-1cd3-4c50-bbcc-1eb7b7690f85` | `cmwewcjv9000drfi9h8w0bbq6` |
| d.keita@mskcreation.net | `62c97ff3-f740-4016-8eec-3ff90023b8d0` | `cmwewcozb000prfi9hbztzkja` |
| e.golo@mskcreation.net | `c3cc705e-0227-4a66-bcba-86fc4887a401` | `cmwewcts10011rfi9e1ovj0ep` |

Invitations e-mail envoyées (Resend OK).
