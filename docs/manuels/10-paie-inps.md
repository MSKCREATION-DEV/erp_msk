# 10 — Paie & INPS

Public : **Admin RH** · **Direction** (approbation) · **Collaborateur** (ses bulletins).

## Parcours RH

1. **RH → Paie → Ouvrir une période** (année / mois)
2. **Calculer les bulletins** — contrats ACTIVE des types **éligibles** (matrice Administration → Éligibilité contrats) avec salaire
3. Ajuster primes si besoin (action dédiée API)
4. **Approuver** — PDF classés GED `03_PAIE` + écritures journal **PA**
5. **RH → INPS** — récap cotisations ; marquer déclaré

Taux affichés = **provisoires** (banner) jusqu’à validation Direction/Compta.

## Éligibilité par type de contrat

Administration → **Éligibilité contrats** (perm. `rh.payroll.run`) :

| Flag | Effet |
|---|---|
| Inclus paie | Présent dans le calcul du run |
| Cotisations INPS | Taux appliqués (sinon brut = net hors retenues) |
| Congés payés | Droit / accrual (STAGE/PRESTA = off par défaut) |

Défauts MVP : CDI/CDD/STAGE en paie ; PRESTA exclu ; STAGE sans accrual congés.

## Mon espace

**Mes bulletins** : bulletins APPROVED/PAID + téléchargement PDF (sans GED).

## Changelog

| Date | Note |
|---|---|
| 2026-10-10 | Phase 5 MVP — périodes, calc, approve, INPS récap |
| 2026-10-10 | Matrice éligibilité types de contrat (paie / INPS / congés) |
