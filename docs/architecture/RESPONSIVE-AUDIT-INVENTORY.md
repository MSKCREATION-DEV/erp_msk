# Inventaire responsive — ERP MSK

Fiché pour l’audit multi-viewports. Mis à jour avec le rapport généré par `scripts/responsive-audit.mjs`.

## Layouts partagés

| Layout | Rôle |
|---|---|
| `src/app/(app)/layout.tsx` | Shell : Sidebar desktop, Topbar (+ MobileNav), `main @container` |
| `src/app/(app)/crm/layout.tsx` | CommercialShell + sous-nav CRM |
| `src/app/(app)/commercial/layout.tsx` | CommercialShell + sous-nav Commercial |
| `src/app/(app)/catalogue/layout.tsx` | Shell catalogue |
| `src/app/(app)/commercial/devis/layout.tsx` | Segment devis |
| `src/app/(app)/commercial/factures/layout.tsx` | Segment factures |

## Composants critiques

Sidebar, Topbar, MobileNav, PageShell, PageHeader, Surface, FormShell, FormSteps, Modal, Drawer, ActionMenu, SortableTh, ListTableScroll, CommercialSubnav, layout-grids.

## Priorités de couverture

### P0 (tous viewports)

| Route | Notes |
|---|---|
| `/accueil` | Hub |
| `/commercial` | Hub |
| `/crm` | TB CRM |
| `/crm/prospects` | Liste |
| `/crm/prospects/nouveau` | Formulaire |
| `/crm/prospects/[id]` | Fiche (ID dynamique) |
| `/crm/relances` | Liste |
| `/crm/rdv` | Liste |
| `/crm/affectations` | Demandes |
| `/commercial/clients` | Liste |
| `/commercial/clients/[id]` | Fiche (ID dynamique) |
| `/ged` | GED |
| `/notifications` | Cloche |
| `/administration/utilisateurs` | Admin |

### P1 (xs, md, ref, fhd)

`/crm/scripts`, `/crm/objectifs`, `/crm/equipe`, `/crm/rapport-semaine`, `/catalogue`, `/commercial/devis`, `/commercial/devis/[id]`, `/commercial/factures`, `/commercial/factures/[id]`, `/guides`, `/organisation`

### P2 (ref + xs)

`/comptabilite` (+ listes clés), `/rh`, `/rh/collaborateurs`, `/stocks`, `/patrimoine`, `/projets`, `/ops/anomalies`, `/espace`, `/administration/charte`, `/administration/gabarits`, `/administration/signatures`

## Viewports

xs 320×740 · sm 375×812 · md 768×1024 · lg 1024×768 · xl 1280×720 · ref 1366×768 · 2k 1440×900 · fhd 1920×1080
