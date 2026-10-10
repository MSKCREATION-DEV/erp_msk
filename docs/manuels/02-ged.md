# Manuel — GED (dossiers & documents)

**Version** : 2026-10-10 · Phase 1 + scope Phase 3  
**Public** : Tous les collaborateurs avec accès GED

## À retenir

La GED est l’espace de fichiers de MSK. Deux modes d’accès :

| Permission | Effet |
|---|---|
| `ged.browse` | Arborescence **complète** (admin / direction / compta selon packs) |
| `ged.view_scoped` (sans browse) | Uniquement les **dossiers métier** du pack (`commercial`, `collaborateur`, …) |

Exemple commercial : racines visibles ≈ `Clients/`, `Commercial/`, `Collaborateurs/{soi}/` — **pas** Comptabilité ni Modèles.

## Navigation

- Hub : `/ged`  
- Dossier : `/ged?folder=<id>`  
- Permissions UI : voir / créer dossier / upload / download / soft-delete selon packs

## Cycle de vie document

1. **Upload** → fichier Storage + enregistrement Prisma (`ACTIVE`)  
2. **Téléchargement** → URL signée courte durée  
3. **Corbeille** (`soft delete`) → statut `TRASH` (récupérable plus tard)  
4. Documents Commercial (PDF devis/facture) → déposés automatiquement sous `Clients/{Client}/…`

## Ce qu’engendre une action

| Action | Conséquence |
|---|---|
| Créer un client commercial | Dossier `Clients/{Nom}/` (+ sous-dossiers Devis / Factures) |
| Envoyer un devis | PDF versionné dans GED client |
| Convertir prospect → client | Lien CRM + dossiers client |

## Droits fréquents

| Besoin | Pack / permission |
|---|---|
| Voir sa GED métier | pack `commercial` ou `collaborateur` (`ged.view_scoped`) |
| Gérer toute la GED | pack avec `ged.browse` + write/delete |
| Supprimer | `ged.delete` (rare — admin plateforme) |

## Changelog manuel

- 2026-10-10 — Scope `view_scoped` vs `browse` documenté ; soft-delete vérifie le chemin dossier.
