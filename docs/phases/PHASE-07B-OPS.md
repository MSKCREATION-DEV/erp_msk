# Phase 7B — Ops large (Achats, patrimoine, projets, anomalies)

> Plan de phase dédié.  
> Prérequis : **Phase 7A OK** ([PHASE-07A-STOCKS.md](./PHASE-07A-STOCKS.md)).  
> Branche de travail : **`dev`**.  
> Priorité : bouclage ops quotidiens — [PRIORITES.md](./PRIORITES.md).  
> CDC : §8.1–8.4 + §8.6 · permissions `stk.*` / `pat.*` / `prj.*` / `ops.*`.

## Statut

| Étape | État |
|---|---|
| Plan rédigé | Oui — 2026-10-10 |
| Validation « Phase 7B GO » | — attendre Phase 7A OK puis GO |
| Implémentation | — |
| Gate technique | `gate:phase7b` (à créer à l’implémentation) |
| Gate Phase 7B OK (humaine) | — |

## Règle de gate

1. **Phase 7A OK** (humaine) obligatoire  
2. Plan 7B validé (« Phase 7B GO »)  
3. Implémentation complète de **ce** plan seulement  
4. Tests (`build`, lint, `gate:phase7b`, parcours UI des 4 blocs)  
5. Validation « Phase 7B OK »  
6. Ensuite → Phase 8 (automatisations / durcissement) ou merge `main` / Vercel collab selon PRIORITES

## Objectif

Boucler les ops quotidiennes MSK hors Excel :

```
Achats → réception → ENTREE stock + proposition écriture AC + GED
Patrimoine → fiches biens / assignation / sortie d’actif
Projets → dépenses + justificatifs → validation → budget projet
Anomalies → tickets priorité / assigné / statut
```

## Hors scope (strict — Phase 8 / 7.x)

| Reporté | Cible |
|---|---|
| Digests Direction, règles CFG fines | Phase 8 |
| Export DGI enrichi | Phase 8 |
| E-sign avancée / pad signature | 1.x / 8 |
| Amortissement SYSCOHADA complet multi-années | 7.x |
| PSP / prélèvement bancaire auto | hors produit |
| Multi-entrepôt / inventaire tournant avancé | 7.x |
| SORTIE stock auto à chaque ligne facture COM (si trop lourd) | 7.x — MVP B = hook optionnel ou manuel |

## Décisions verrouillées (MVP Phase 7B)

### Achats

| Sujet | Valeur |
|---|---|
| Entité | `StkPurchase` + lignes article/qté/PU |
| Workflow | `DRAFT` → `ORDERED` → `RECEIVED` (ou annulé) |
| Réception | Si lignes liées articles stockables → mouvements `ENTREE` ; proposition écriture journal **AC** ; pièce GED `07_STOCKS_ACHATS` |
| Fournisseur | Libellé + contacts simples (pas ERP fournisseur complet) |

### Patrimoine

| Sujet | Valeur |
|---|---|
| Entité | `PatAsset` : désignation, catégorie, date acquisition, valeur XOF, localisation, assigné (`userId` / RH), état |
| Lien | Optionnel vers achat / facture GED |
| Sortie | Cession / réforme → statut `DISPOSED` + note ; écriture CPT simplifiée si comptes prêts |
| Amortissement | Règle **simplifiée** (linéaire paramétrable) — pas de plan d’amortissement fiscal complet |

### Projets & dépenses

| Sujet | Valeur |
|---|---|
| Projet | code, nom, responsable, budget XOF, statut, dates, membres |
| Dépense | date, nature, montants prévu/dépensé, mode paiement, statut `DRAFT`→`SUBMITTED`→`APPROVED`/`REJECTED`→`REIMBURSED` |
| Justificatif | Upload GED obligatoire au-delà d’un seuil CFG (défaut ex. 25 000 XOF) |
| Validation | Responsable projet ou Direction (`prj.manage`) |
| Budget | Écart budget projet (prévu vs dépenses validées) — pas de refonte BUD global Phase 6 |

### Anomalies

| Sujet | Valeur |
|---|---|
| Ticket | équipement/zone, problème, priorité Bas→Critique, dates, action, statut À faire / En cours / Fait / Reporté, assigné |
| Notif | Assigné notifié à la création / réassignation |
| Escalade Critique > 48 h | Badge / liste Direction (cron optionnel 7.x si pas prêt) |

### UI / RBAC transverses

| Sujet | Valeur |
|---|---|
| UI | list/create séparés · `loading.tsx` · pending · charte MSK |
| Nav | Activer **Projets** (retirer `soon`) ; hubs Achats / Patrimoine / Anomalies (sous Stocks ou Ops selon UX) |
| Packs | `stock` (achats), `projets` (déjà `prj.*`/`ops.*`), Direction lecture élargie ; ajouter `pat.*` au catalogue |

## Permissions (à brancher)

| Domaine | Codes (MVP) |
|---|---|
| Achats | `stk.achats.manage`, `stk.fournisseurs.manage` (CDC) — en plus des `stk.*` 7A |
| Patrimoine | `pat.access`, `pat.manage` |
| Projets | `prj.access`, `prj.manage` (existants) |
| Ops / anomalies | `ops.access`, `ops.ticket.create` + `ops.ticket.manage` (à ajouter) |

## Routes UI (indicatif)

| Module | Routes |
|---|---|
| Achats | `/stocks/achats`, `/stocks/achats/nouveau`, `/stocks/achats/[id]` |
| Patrimoine | `/patrimoine`, `/patrimoine/nouveau`, `/patrimoine/[id]` |
| Projets | `/projets`, `/projets/nouveau`, `/projets/[id]`, dépenses sous fiche |
| Anomalies | `/ops/anomalies`, `/ops/anomalies/nouveau`, `/ops/anomalies/[id]` |

## Livrables (checklist — à cocher à l’implémentation)

### Achats

- [ ] Modèles purchase / lines / fournisseur léger
- [ ] Workflow réception → ENTREE stock + proposition AC + GED
- [ ] UI list / create / fiche

### Patrimoine

- [ ] Modèle `PatAsset` + assignation + sortie
- [ ] UI CRUD + lien GED

### Projets / dépenses

- [ ] Modèles `PrjProject`, `PrjExpense` (+ membres)
- [ ] Workflow validation + seuil justificatif
- [ ] UI hub projets + dépenses ; nav Projets active

### Anomalies

- [ ] Modèle ticket Ops
- [ ] UI list / create / fiche + filtres priorité / statut
- [ ] Notif assigné

### Qualité

- [ ] Permissions catalogue + packs
- [ ] `scripts/gate-phase7b.mjs` + `gate:phase7b`
- [ ] Manuels : `12-achats-patrimoine.md`, `13-projets.md`, `14-anomalies.md` (ou sections regroupées)
- [ ] `npm run build` OK

## Gate humaine (après implémentation)

| # | Parcours | Critère |
|---|---|---|
| 1 | Achat | Créer commande → réception → qty article ↑ + pièce GED |
| 2 | Compta | Proposition écriture AC visible / validable |
| 3 | Patrimoine | Créer bien + assigner collab |
| 4 | Projet | Créer projet + dépense soumise → validée |
| 5 | Anomalie | Créer ticket Critique assigné → visible Ops / Direction |
| 6 | Droits | Pack projets ≠ stock sur patrimoine ; commercial sans `prj.access` |

## Critères d’acceptation

Les ops MSK (stock étendu, achats, patrimoine, projets/dépenses, anomalies) vivent dans l’ERP avec GED et droits packs. Pas de digests Phase 8, pas d’export DGI enrichi.

## Après gate technique

Répondre : **« Phase 7B OK »** → Phase 8 ou déploiement collab ([VERCEL.md](../deploy/VERCEL.md)) selon PRIORITES.

---

## Validation historique

- Plan ouvert — 2026-10-10 (doc d’abord, dépend de 7A).
