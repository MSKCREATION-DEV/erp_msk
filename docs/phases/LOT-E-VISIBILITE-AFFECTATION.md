# LOT-E — Visibilité partagée + affectation

**Statut :** **implémenté** (2026-10-14)  
**Priorité :** P1 Direction (13/10)  
**Prérequis :** LOT-A…D  
**Migrations :** aucune  

## Modèle

| Couche | Règle |
|--------|--------|
| Liste / fiche prospects | Lecture **partagée** (`crm.access` → scope `{}`) |
| KPIs perso / dashboard / relances | Inchangé — scope `dealOwnerScopeWhere` (own / team / global) |
| Mutations (stage, activité, edit, convert, devis lié) | **Owned-write** : owner **ou** `crm.reassign` / `crm.reports.global` / super-admin |
| `crm.view_team` seul | **Ne mute plus** |
| Affectation | UI « Changer le suivi » (`crm.reassign`) — sync `organization.ownerId` + `opportunity.ownerId` + tâches OPEN |

## Livré

| Élément | Détail |
|---------|--------|
| Scope | `crmProspectListScopeWhere`, `canMutateCrmDeal`, `canReassignCrmDeal` |
| Liste | Tous les dossiers visibles ; colonne **Suivi par** ; filtre owners pour tous |
| Fiche | Bandeau lecture seule si non-affecté ; CTAs mutables masqués |
| Action | `reassignProspectAction` + journal + audit `crm.reassign` |
| Tests | `src/lib/crm/scope.test.ts` |

## Hors scope

- Demande d’affectation par le commercial (lot ultérieur)  
- Journal admin filtrable (LOT-N)  
- Relances : restent perso / team selon `crmVisibility`

## Gate

- [x] Build  
- [ ] Smoke : commercial A voit dossier B en lecture seule ; lead réassigne → A peut muter  
