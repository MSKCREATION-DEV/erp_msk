# LOT-G — Compteur historique de relances

**Statut :** **implémenté** (2026-10-14)  
**Priorité :** P1-3 Direction (démo 13/10)  
**Migrations :** aucune (compteur dérivé)

## Définition métier

**1 relance comptée** = une `CrmActivity` de type suivi :

`APPEL | WHATSAPP | INSTAGRAM | LINKEDIN | EMAIL | RDV | AUTRE`

**Exclure** `NOTE` (journaux système : réassignation, transform client, notes libres).

Source unique : [`src/lib/crm/follow-up-count.ts`](../../src/lib/crm/follow-up-count.ts).

Les objectifs hebdo `FOLLOW_UPS` restent basés sur les **tasks DONE** (autre notion : « faites cette semaine »).

GUIDE **Perdu** : `MIN_ACTIVITIES_BEFORE_LOST` = même compteur outreach (pas `_count.activities` brut).

## Surfaces

| Écran | Affichage |
|-------|-----------|
| `/crm` | Card **Relancés 3×+** → `/crm/prospects?relancesMin=3` · badge N× dans « À traiter » |
| `/crm/prospects` | Colonne badge `Relancé N×` · filtre `?relancesMin=3` |
| `/crm/prospects/[id]` | Badge près du statut · StageForm Perdu aligné |
| `/crm/relances` | Badge N× par ligne |
| `/crm/equipe` | KPI **Relancés 3×+** (dossiers ouverts) par collab |

UI : [`RelanceCountBadge`](../../src/components/crm/relance-count-badge.tsx) — `0×` muted · `1–2×` blue · `≥3×` coral.

## Gate

- [x] Lib + tests unitaires types outreach + seuil  
- [x] Build  
- [ ] Smoke : 3 appels → badge 3× fiche/liste/dashboard ; Perdu bloqué avant 3 outreach  
