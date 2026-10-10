# Manuel — IAM & droits (groupes · packs · overrides)

**Version** : 2026-10-10 · Phase 0 + durcissement Phase 3  
**Public** : Admin plateforme, Direction (lecture)

## À retenir

Les droits ne sont **pas** un simple rôle unique. Trois couches s’additionnent :

1. **Groupes** → chaque groupe a un **pack défaut**  
2. **Packs directs** → assignés en plus sur la fiche user  
3. **Overrides** → GRANT ou DENY une permission précise (prioritaire)

```
Groupes (pack défaut)  ∪  Packs directs  →  puis Overrides (GRANT ajoute, DENY retire)
```

Super Admin : bypass total (hors résolution packs).

## Qui fait quoi dans l’UI

| Action | Route | Permission |
|---|---|---|
| Voir la liste users | `/administration/utilisateurs` | `users.view` |
| Inviter | `/administration/utilisateurs/inviter` | `users.create` |
| Éditer profil (nom, e-mail, tél.) | Fiche user → Modifier le profil | `users.edit_profile_any` |
| Groupes & packs | Fiche → Groupes & packs | `users.manage_access` |
| Overrides | Fiche → Overrides | `overrides.manage` |
| Suspendre / archiver | Fiche → Sécurité | `users.suspend` |
| Reset MDP | Fiche → Sécurité | `users.reset_password` |

## Composition recommandée (terrain)

| Profil | Groupes | Packs directs | À éviter |
|---|---|---|---|
| Commercial terrain | `collaborateur` + `commerciaux` | **aucun** | `admin_crm` (ouvre GED complète + édition catalogue) |
| Admin CRM | `commerciaux` | `admin_crm` | — |
| Comptable | `comptabilite` | éventuellement rien | packs COM inutiles |
| Direction | `direction` | — | Super Admin sauf Guiro |

## Ce qu’engendre un mauvais pack

| Pack en trop | Effet visible |
|---|---|
| `admin_crm` sur un commercial | GED = Comptabilité + Modèles ; Catalogue = Éditer / Nouvelle offre |
| `ged.browse` (via pack admin) | Parcours GED non scoped |
| Override DENY `com.access` | Module Commercial disparaît de la nav |

## Invitation

1. Remplir identité + groupes/packs  
2. Compte Auth créé + e-mail invitation (Resend)  
3. Statut `INVITE_PENDING` → premier login → changer MDP  
4. Dossier GED collaborateur créé automatiquement

**Sécurité** : ne jamais réécrire le MDP Auth d’un compte `ACTIVE` hors parcours « Reset MDP » UI.

## Changelog manuel

- 2026-10-10 — Composition UI + cas Admin CRM / commercial documenté.
