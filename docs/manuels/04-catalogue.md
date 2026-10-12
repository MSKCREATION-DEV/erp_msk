# Manuel — Offres (catalogue & planchers)

**Version** : 2026-10-12 · Phase COM E2E  
**Public** : Commercial (lecture), Admin CRM / Direction (édition)

## À retenir

Les **Offres** alimentent les lignes de devis et les fiches prospects.  
Accessible via tab / carte **Offres** du module Commercial (`/catalogue`).

| Permission | Effet |
|---|---|
| `com.catalogue.view` | Consulter offres / planchers |
| `com.catalogue.manage` | Créer / éditer / activer-désactiver |

## Navigation

| Intention | Route |
|---|---|
| Liste Offres | `/catalogue` |
| Création | `/catalogue/nouveau` |
| Édition | `/catalogue/[id]/edit` |

Breadcrumbs : Commercial → Offres. Règle **liste ≠ création**.

## Plancher prix

Chaque offre peut avoir un **plancher FCFA** (`floorPriceXof`) ≤ prix catalogue.

- Affiché sur les cartes Offres  
- Au devis (régime ML / XOF) : le P.U. ne peut pas descendre sous le plancher (UI + serveur)  
- Régime FR / EUR : plancher XOF non appliqué (comparaison non pertinente)

## Lien Commercial / CRM

| Amont | Aval |
|---|---|
| Offre catalogue | Ligne devis (snapshot) · offre liée prospect |
| Modifier une offre | N’altère pas un devis déjà créé |

## Changelog

| Date | Note |
|---|---|
| 2026-10-12 | Titre Offres ; plancher visible + enforcement devis XOF |
| 2026-10-10 | Catalogue Phase 2 |
