# LOT-D — Transformer en client (polish)

**Statut :** **implémenté** (2026-10-14)  
**Priorité :** P1 Direction  
**Prérequis :** LOT-A (CTA devis gelé)  
**Migrations :** aucune  

## Livré

| Élément | Détail |
|---------|--------|
| Conversion | `convertOpportunityToClientAction` passe le deal en **GAGNE** + `wonAt` (même transaction) |
| Journal | Ligne auto « Transformé en client commercial » |
| Idempotent | Client déjà lié → sync statut Client si besoin |
| UI gated | Confirmation avant conversion ; badge + bandeau « Client commercial » |
| CTA | « Voir le client » si déjà lié |

## Hors scope

- Réouverture devis/facture  
- Objectifs clients signés (LOT-H)  
- Visibilité partagée (LOT-E)  

## Gate

- [x] Build  
- [ ] Smoke : prospect Intéressé `[TEST]` → confirmer → client créé + statut Client + journal  
