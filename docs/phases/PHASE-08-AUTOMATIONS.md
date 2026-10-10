# Phase 8 — Automatisations & durcissement

> Plan de phase dédié.  
> Prérequis : Phase 7A + 7B livrées ([PHASE-07A-STOCKS.md](./PHASE-07A-STOCKS.md), [PHASE-07B-OPS.md](./PHASE-07B-OPS.md)).  
> Branche : **`dev`**.  
> CDC : §10 Notifications / automatisations / audit + §14 Phase 8.  
> Priorité collab : déploiement Vercel ([VERCEL.md](../deploy/VERCEL.md)) peut se faire **en parallèle** après merge `main`.

## Statut

| Étape | État |
|---|---|
| Plan rédigé | Oui — 2026-10-10 |
| Validation « Phase 8 GO » | — attendre |
| Implémentation | — |
| Gate technique | `gate:phase8` (à créer) |
| Gate Phase 8 OK (humaine) | — |

## Règle de gate

1. Plan validé (« Phase 8 GO »)  
2. Implémentation de **ce** plan seulement  
3. `build` + `gate:phase8` + smoke parcours notifs  
4. « Phase 8 OK »  
5. Ensuite → merge `main` / prod Vercel si pas déjà fait · Phase 8.x (DGI, e-sign)

## Objectif

Passer des actions manuelles à un **socle notifications + automatisations** :

```
Événements métier (stock min, anomalie critique, devis/facture, congés…)
        ↓
Notification in-app (cloche) + e-mail ciblé (Resend)
        ↓
Règles CFG activables (délais / destinataires packs)
        ↓
Digest Direction (hebdo) — option MVP si temps
```

Durcissement : audit sensible déjà en place → compléter ; pas de secrets côté client ; checklist prod.

## Hors scope (strict — 8.x / hors V1)

| Reporté | Cible |
|---|---|
| WhatsApp Business API | hors V1 |
| Export DGI enrichi / télédéclaration | 8.x |
| E-sign avancée / pad signature | 1.x / 8.x |
| CFG visuelle complète de toutes les règles CDC | 8.x (MVP = sous-ensemble) |
| Sentry / APM complet | optionnel |
| Passage Supabase Pro facturé | décision ops (hors code) |

## Décisions MVP Phase 8

| Sujet | Valeur |
|---|---|
| Modèle | `AppNotification` : userId, title, body, href, kind, readAt, createdAt |
| UI | Cloche sidebar + page `/notifications` (list, marquer lu) |
| Permission | `self.notifications.view` (existe) |
| Événements V1 | (1) stock ≤ min à la création mouvement (2) anomalie CRITICAL créée / ouverte > 48 h (badge déjà 7B → notif Direction) (3) demande congé PENDING → notif validateurs (4) facture / devis en retard si champ date existe — sinon skip |
| E-mail | Réutiliser shell MSK ; envoi Resend aux destinataires concernés (échec = log, pas bloquant) |
| Cron | Route `GET/POST /api/cron/automations` protégée par `CRON_SECRET` (Vercel Cron quotidien) — digests + escalades 48 h |
| CFG | Table `AutomationRule` minimale : code, enabled, params JSON — seed 4–6 règles |
| Audit | Écrire audit sur toggle règles + envoi digest |
| RLS | Notifications scoped `userId = auth` |

## Livrables (checklist)

### Données

- [ ] `AppNotification` + `AutomationRule`
- [ ] Migration + seed règles défaut
- [ ] Index `(userId, readAt, createdAt)`

### UI / API

- [ ] Cloche + `/notifications` + `loading.tsx`
- [ ] Actions mark read / mark all
- [ ] Hooks métier (stock, ops, congés) → createNotification
- [ ] `/api/cron/automations` + doc env `CRON_SECRET`
- [ ] Digest e-mail Direction (hebdo ou quotidien résumé) si règle enabled

### Qualité

- [ ] `gate:phase8` + manuel `13-notifications.md`
- [ ] `npm run build` OK
- [ ] Maj [VERCEL.md](../deploy/VERCEL.md) : cron + `CRON_SECRET`

## Gate humaine

| # | Parcours | Critère |
|---|---|---|
| 1 | Stock | SORTIE → qty ≤ min → notif pack Stock / Direction |
| 2 | Anomalie | CRITICAL → notif Direction |
| 3 | Congé | Demande → notif `rh.leave.validate` |
| 4 | Cloche | Lire / marquer lu |
| 5 | Cron | Appel avec secret → escalades / digest sans erreur |

## Critères d’acceptation

Les collaborateurs voient les alertes critiques dans l’ERP (et e-mail si Resend OK) sans Excel. Règles désactivables. Pas d’export DGI ni e-sign avancée.

## Après gate

« Phase 8 OK » → merge `main` + prod Vercel (si pas fait) · 8.x DGI / e-sign.

---

## Validation historique

- Plan ouvert — 2026-10-10 (après Phase 7B sur `dev`).
