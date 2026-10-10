# Manuel — Catalogue (offres & produits)

**Version** : 2026-10-10 · Phase 2  
**Public** : Commercial (lecture), Admin CRM / Direction (édition)

## À retenir

Le catalogue alimente les **lignes de devis** : références, prix HT, TVA, libellés.

| Permission | Effet |
|---|---|
| `catalog.view` | Consulter offres / détails |
| `catalog.manage` | Créer / éditer / archiver (admin CRM, direction…) |

Un commercial **sans** `catalog.manage` voit le catalogue en lecture seule — pas « Nouvelle offre » ni Éditer.

## Navigation

| Intention | Route |
|---|---|
| Liste | `/catalogue` |
| Création | `/catalogue/nouveau` (si manage) |
| Fiche | `/catalogue/[id]` |

Respecte la règle **liste ≠ création** (page dédiée).

## Ce qu’engendre une action

| Action | Conséquence |
|---|---|
| Créer une offre | Disponible au choix dans le formulaire devis |
| Archiver une offre | Plus proposée aux nouveaux devis (historique devis inchangé) |
| Pack `admin_crm` en trop | Boutons édition visibles pour un commercial terrain |

## Lien Commercial

Les devis référencent le catalogue (snapshot des libellés/prix au moment de la ligne). Modifier le catalogue **après** n’altère pas un devis déjà émis.

## Changelog manuel

- 2026-10-10 — Première version + lien packs CRM.
