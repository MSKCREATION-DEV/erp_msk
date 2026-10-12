# Priorités métier MSK

## Branches Git

| Branche | Rôle |
|---|---|
| `dev` | **Branche de travail** — toutes les phases s’y développent |
| `main` | Branche stable / **prod Vercel** — merge depuis `dev` après gate |

Workflow : travailler sur `dev` → merge `main` après gate.

## Urgence métier

Pôles **URGENTS** pour MSK :

- **Commercial** (CRM, clients, devis, factures, paiements) — **livré E2E 2026-10-12**
- **Finance / Comptabilité** (journaux, banques, budget, TVA, états) — base livrée + bridge VE facture

### État des phases (2026-10-12)

| Zone | État |
|---|---|
| Phase 0–3 (IAM, GED, catalogue/CRM base, commercial docs) | **OK** |
| Phase 4 RH + Phase 5 Paie/INPS | **Livrées** (base) — reprise métier Direction = **Phase RH** suivante |
| Phase 6 Compta | **OK** + COM-6 bridge facture→VE |
| Phase 7A Stocks + 7B Ops | **Livrées** |
| **Phase COM E2E** (plan 2 phases) | **Livrée** — CRM + COM-4…7 · docs [`PLAN-2-PHASES-COM-RH.md`](./PLAN-2-PHASES-COM-RH.md) |
| Phase RH (Direction 11/10) | **Suivant** — SPEC puis GO |
| Phase 8 Automatisations | Doc — attendre « Phase 8 GO » |
| Deploy | `main` ≈ `dev` · [VERCEL.md](../deploy/VERCEL.md) |

### Documentation

| Doc | Usage |
|---|---|
| [`PLAN-2-PHASES-COM-RH.md`](./PLAN-2-PHASES-COM-RH.md) | Cadrage COM/RH Direction |
| [`FLOW-COMMERCIAL-E2E.md`](./FLOW-COMMERCIAL-E2E.md) | Parcours Commercial |
| [`SPEC-CRM-MSK-COMPLET.md`](./SPEC-CRM-MSK-COMPLET.md) | Spec suivi CRM |
| [`REGLES-EVOLUTION-CRM.md`](./REGLES-EVOLUTION-CRM.md) | Discipline technique COM |
| [docs/manuels/](../manuels/) | Manuels utilisateur |

### Qualité & design (absolu)

Voir `.cursor/rules/phase-quality.mdc` · `ui-never-freeze.mdc` · `list-create-separation.mdc` · `msk-charte.mdc`.

---

*Maj 2026-10-12 — Phase COM E2E livrée ; priorité suivante = RH Direction.*
