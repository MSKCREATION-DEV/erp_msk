# LOT-I — UX libellés (En discussion, Synthèse, secteurs)

**Statut :** **implémenté** (2026-10-14)  
**Priorité :** P2 Direction (Samba / clarté terrain)  
**Prérequis :** LOT-B  
**Migrations :** aucune  

## Livré

| Item | Détail |
|------|--------|
| **P2-9** | `QUALIFICATION` → libellé **« En discussion »** + `STAGE_HINTS` (picker + fiche) |
| **P2-7** | Objectifs : « Synthèse » → **Vue d’ensemble** / **Progression de l’équipe** / **Retour aux objectifs** |
| **P2-2** | « Notes internes » → **Résumé entreprise** (create / edit / fiche) |
| **P2-4** | Secteurs : liste MSK + **Autre** (précision obligatoire) — `src/lib/crm/sectors.ts` |

## Hors scope

- Multi-contacts (LOT-L)  
- Réseaux sociaux org (LOT-K)  
- Migration des valeurs `sector` libres déjà en base (restent affichables via Autre)

## Gate

- [x] Build  
- [ ] Smoke : statut « En discussion » visible liste/fiche/filtre ; create secteur Autre bloqué sans précision  
