# Phase 0 — Fondations IAM + Accueil

> Plan de phase dédié. **Aucun démarrage d’implémentation** avant validation explicite de ce document.  
> Prérequis : Phase -1 OK (socle, Supabase, Resend, repo).

## Règle de gate

1. Plan validé  
2. Implémentation complète de **ce** plan seulement  
3. Tests / vérifications  
4. Validation « Phase 0 OK »  
5. Seulement ensuite → Phase 1 (GED / signatures / organigramme)

## Objectif

Mettre en place l’identité et l’accès pour l’ERP interne MSK :

- Prisma (remplacement définitif de tout accès DB ad hoc)
- Single-tenant MSK
- Super Admin bootstrap : **Amadou Samba Guiro** / `a.guiro@mskcreation.net`
- Groupes + packs + overrides (RBAC composé)
- Aucun self-register
- Invitation e-mail (Resend) + force changement MDP 1ʳᵉ connexion
- Page d’accueil guide collaborateur (post-login)
- Audit minimal des actions sensibles IAM

## Hors scope (strict — Phase 1+)

- GED / Storage dossiers / signatures / cachets / organigramme
- CRM, Commercial, RH métier, Compta, Stocks
- Catalogue services complet
- Gabarits PDF
- Stripe / multi-tenant / register public (déjà exclus)

## Décisions verrouillées

| Sujet | Valeur |
|---|---|
| ORM | Prisma |
| Super Admin | Amadou Samba Guiro · `a.guiro@mskcreation.net` |
| E-mail | Resend (`EMAIL_FROM` / adapter) |
| Comptes | Jamais hard-delete → suspend / archive |
| Direction | Groupe (pas rôle exclusif) |
| Admin | Packs de permissions |

## Modèle de données (minimum Phase 0)

```
OrganizationSettings (1 ligne MSK)
User (lié auth.users Supabase)
  - isSuperAdmin (unique true pour Guiro)
  - status: invite_pending | active | must_change_password | suspended | archived
  - employeeId? (nullable Phase 0, fiche légère)
Group / GroupMember
PermissionPack / UserPack
UserPermissionOverride
AuditLog
```

Permissions atomiques seedées (extrait) : `users.*`, `groups.*`, `packs.*`, `home.view`, `self.*`, `audit.view`, `cfg.org` (lecture settings).

Groupes seed : Direction, Commerciaux, RH, Comptabilité, Stock, Projets, Collaborateur.  
Packs seed : Collaborateur, Commercial, Admin CRM, Admin RH, Comptable, Admin plateforme, Direction (pack validations).

## Parcours à livrer

### Auth
- `/login` uniquement (pas de `/register` public)
- Session Supabase Auth + profil Prisma
- Middleware / layout gate : non authentifié → login
- Statuts `suspended` / `archived` → accès refusé

### Bootstrap Super Admin
- Script / migration seed : crée Auth user + row User `isSuperAdmin`
- Mot de passe initial : via invitation Resend **ou** env `BOOTSTRAP_TEMP_PASSWORD` (dev only, documenté)
- Flag unique DB (contrainte partielle / check applicatif)

### Invitation collaborateur
- UI Admin (pack `users.create` ou Super Admin) : créer compte
- Resend : e-mail avec lien + type compte / capacités résumé
- Statut `invite_pending` → 1ʳᵉ connexion → **changement MDP obligatoire** → `active`

### Reset MDP
- Pas de self-service public
- Formulaire « j’ai oublié » → notifie détenteurs `users.reset_password` + tâche / notif
- Reset effectué par autorisé (lien / set password Admin API)

### Accueil `/accueil` (ou `/` post-login)
- Guide métier MSK (pas landing marketing)
- Raccourcis selon permissions
- File d’attente vide Phase 0 (placeholder)
- Aide connexion / demande reset

### Administration minimale
- Liste utilisateurs
- Fiche : groupes, packs, overrides, statut
- Pas encore modules métier

## Fichiers / zones touchés (prévision)

- `prisma/schema.prisma` + migrations
- `src/lib/prisma.ts`, `src/lib/auth.ts`, `src/lib/rbac/*`
- `src/lib/email/*` (adapter Resend)
- `src/app/(auth)/login/`
- `src/app/(app)/accueil/`, layout app, sidebar filtrée
- `src/app/(app)/administration/utilisateurs/`
- `src/actions/auth.ts`, `users.ts`, `groups.ts`
- Seed `prisma/seed.ts`
- Suppression / non-exposition de toute route register

## Tests & vérifications (gate Phase 0)

- [ ] `prisma migrate` appliquée sur Supabase neuf
- [ ] Seed Super Admin Guiro unique ; impossible d’en créer un second
- [ ] Login Guiro OK ; accès admin
- [ ] Pas de page register accessible
- [ ] Invitation d’un user test → e-mail Resend reçu → force MDP → accès limité Collaborateur
- [ ] User suspendu ne peut plus se connecter
- [ ] Override / retrait pack change les menus visibles
- [ ] Direction (groupe) ≠ Admin plateforme tant que pack non assigné
- [ ] AuditLog enregistre create user / change packs / suspend
- [ ] `npm run build` OK
- [ ] Validation explicite « Phase 0 OK »

## Critères d’acceptation

Un Super Admin peut se connecter, inviter un collaborateur par e-mail, gérer groupes/packs, et chaque utilisateur arrive sur une page d’accueil guide filtrée par ses droits — sans aucun module métier encore.

## Après validation

Ouvrir **Phase 1** (plan dédié) : GED + charte + gabarits + signatures/cachets + organigramme.
