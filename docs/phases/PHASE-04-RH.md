# Phase 4 — RH cœur — collaborateurs, contrats, congés, absences, heures

> Plan de phase dédié.  
> Prérequis : Phase 0–3 + 6 (IAM, GED, COM, CPT) OK.  
> Branche : **`dev`**.  
> CDC : §7.1–7.7 + 7.10 (hors paie/INPS = Phase 5).

## Statut

| Étape | État |
|---|---|
| Plan rédigé | Oui — 2026-10-10 |
| Validation « Phase 4 GO » | Oui — GO enchaîné après push Phase 6 |
| Implémentation | Livrée (dev) |
| Gate technique | `gate:phase4` + smoke UI |
| Gate Phase 4 OK (humaine) | — attendre validation |

## Objectif

Le RH (et Admin RH) gère les **collaborateurs**, **contrats**, **congés**, **absences**, **heures** ; le collaborateur demande congés / déclare absences / saisit heures depuis **Mon espace**. Docs entrée/sortie tracés (GED). **Pas de paie ni INPS** (Phase 5).

## Hors scope (strict)

| Reporté | Phase |
|---|---|
| Bulletins de paie / validation paie | 5 |
| INPS cotisations | 5 |
| Écritures PA auto | 5 / 6.x |
| Patrimoine / inventaire sortie matériel | 7 |

## Décisions MVP

| Sujet | Valeur |
|---|---|
| Fiche RH | `RhEmployee` 1–1 optionnel avec `User` |
| Contrats | Types CDI/CDD/STAGE/PRESTA/AVENANT ; PDF gabarit **simplifié** ou métadonnées + dépôt GED manuel MVP |
| Congés | Demande → PENDING → APPROVED/REJECTED (`rh.leave.validate`) ; solde paramétrable annuel |
| Absences | Déclaration + justificatif GED optionnel ; statut JUSTIFIED / UNJUSTIFIED |
| Heures | Semaine ISO ; soumission + validation RH |
| Règlement | Statut sur fiche (PENDING/SIGNED) — soft |
| UI | list/create séparés · loading · pending · charte MSK |
| Permissions | Enrichir `admin_rh` + `self.*` déjà seedés |

## Livrables

### Données
- [x] `RhEmployee`, `RhContract`, `RhLeaveRequest`, `RhAbsence`, `RhTimesheet` (+ lines)
- [x] Seed : lier Super Admin + équipe connue en fiches RH minimales
- [x] GED : compléter sous-dossiers `04_CONGES_ABSENCES`, `05_DIPLOMES`, `09_SORTIE`

### UI
- [x] Hub `/rh`
- [x] Collaborateurs liste / nouveau / fiche
- [x] Contrats liste / nouveau / fiche
- [x] Congés (RH validation) + Mon espace demande
- [x] Absences RH + Mon espace
- [x] Heures RH + Mon espace
- [x] Nav RH + Mon espace congés/absences/heures

### Qualité
- [x] `gate:phase4` + smoke UI/RBAC
- [x] Manuel `docs/manuels/09-rh.md`

## Gate humaine

| # | Parcours | Critère |
|---|---|---|
| 1 | Collab | Créer / consulter fiche RH |
| 2 | Contrat | Créer contrat lié à un collab |
| 3 | Congé | Demande collab → validation RH |
| 4 | Absence | Déclaration + marquage justifié |
| 5 | Heures | Saisie semaine → validation |
| 6 | Droits | Collaborateur ≠ Admin RH sur validations |

## Après gate

**« Phase 4 OK »** → Phase 5 Paie/INPS (ou 7 stocks selon PRIORITES).
