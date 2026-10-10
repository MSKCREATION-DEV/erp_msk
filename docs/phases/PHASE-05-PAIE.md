# Phase 5 — Paie + INPS

> Plan de phase dédié.  
> Prérequis : Phase 4 RH + Vague UX Mon espace.  
> Branche : **`dev`**.  
> CDC : §7.8–7.9 + 15.8–15.9.

## Statut

| Étape | État |
|---|---|
| Plan rédigé | Oui — 2026-10-10 |
| Vague A UX | Livrée (docs Voir/Télécharger, Mon espace) |
| Implémentation Paie/INPS | En cours / livrée |
| Gate technique | `gate:phase5` |
| Gate humaine | — attendre validation |

## Objectif

Flow mensuel : ouvrir période → calculer bulletins (contrats ACTIVE CDI/CDD/STAGE) → approuver → PDF GED `03_PAIE` + écritures journal **PA** → suivi cotisations INPS.

## Décisions MVP

- Taux INPS **paramétrables** (seed provisoire fiche Guiro)
- Assiette = salaire contrat + primes bulletin
- Validation 1 niveau `rh.payroll.approve`
- Compta : Dr 661 (brut+charges emp.) / Cr 421 net / Cr 4313 cotisations

## Livrables

- [x] Modèles `RhPayrollPeriod`, `RhPayslip`, `RhInpsSettings`, `RhInpsLine`
- [x] UI `/rh/paie`, `/rh/inps`, `/espace/bulletins`
- [x] Moteur calc + post CPT
- [x] Permissions `rh.payroll.*`, `rh.inps.manage`, `self.payslip.view`

## Gate humaine

| # | Parcours | Critère |
|---|---|---|
| 1 | Ouvrir période | Mois courant créé |
| 2 | Calculer | Bulletins pour contrats ACTIVE avec salaire |
| 3 | Approuver | PDF GED + écritures PA |
| 4 | Mon espace | Collab voit ses bulletins |
| 5 | INPS | Récap + marquer déclaré |
