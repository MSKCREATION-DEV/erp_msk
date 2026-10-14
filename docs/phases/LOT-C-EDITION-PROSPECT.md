# LOT-C — Édition d’un prospect

**Statut :** **implémenté** (2026-10-14)  
**Priorité :** P0 Direction  
**Prérequis :** LOT-A / LOT-B OK  
**Migrations :** aucune  

## Livré

| Élément | Détail |
|---------|--------|
| Route | `/crm/prospects/[id]/edit` + `loading.tsx` |
| CTA | « Modifier » sur la fiche (si droit) |
| Action | `updateProspectAction` — Zod, droits owner/team/reassign/direction, audit |
| Champs | Entreprise, secteur, ville, pays, site, notes, origine, contact primaire, budget, prochaine action, date relance |
| Hors scope | Multi-contacts, offres N:N, réseaux sociaux, sync ComClient |

## Gate

- [x] Build OK  
- [ ] Smoke UI : éditer un `[TEST]` → fiche à jour ; pending visible ; redirect fiche  
