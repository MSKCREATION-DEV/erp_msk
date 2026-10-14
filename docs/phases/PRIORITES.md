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

### État des phases (2026-10-14)

| Zone | État |
|---|---|
| Phase 0–3 (IAM, GED, catalogue/CRM base, commercial docs) | **OK** |
| Phase 4 RH + Phase 5 Paie/INPS | **Livrées** (base) — reprise métier Direction = **Phase RH** après POST-DEMO |
| Phase 6 Compta | **OK** + COM-6 bridge facture→VE |
| Phase 7A Stocks + 7B Ops | **Livrées** |
| **Phase COM E2E** (plan 2 phases) | **Livrée** — CRM + COM-4…7 · docs [`PLAN-2-PHASES-COM-RH.md`](./PLAN-2-PHASES-COM-RH.md) |
| **POST-DEMO CRM** (Direction 13/10) | Analyse OK · **LOT-A OK** · **LOT-B OK** (commentaire Contacté) · **prochain = LOT-C** édition prospect · dette UX : Qualification → « En discussion » (LOT-I) · [`LOT-B-COMMENTAIRE-CONTACTE.md`](./LOT-B-COMMENTAIRE-CONTACTE.md) |
| Phase RH (Direction 11/10) | Après vague POST-DEMO CRM — SPEC puis GO |
| Phase 8 Automatisations | Doc — attendre « Phase 8 GO » |
| Deploy | `main` ≈ `dev` · [VERCEL.md](../deploy/VERCEL.md) |

### Documentation

| Doc | Usage |
|---|---|
| [`ANALYSE-POST-DEMO-DIRECTION-2026-10-13.md`](./ANALYSE-POST-DEMO-DIRECTION-2026-10-13.md) | Gap Direction 13/10 · Keep/Change/Break · lots |
| [`LOT-B-COMMENTAIRE-CONTACTE.md`](./LOT-B-COMMENTAIRE-CONTACTE.md) | Plan concret LOT-B (prochain GO) |
| [`rapport-reunion-direction-demo-erp-2026-10-13.md`](../rapport-reunion-direction-demo-erp-2026-10-13.md) | Rapport démo Direction |
| [`PLAN-2-PHASES-COM-RH.md`](./PLAN-2-PHASES-COM-RH.md) | Cadrage COM/RH Direction |
| [`FLOW-COMMERCIAL-E2E.md`](./FLOW-COMMERCIAL-E2E.md) | Parcours Commercial |
| [`SPEC-CRM-MSK-COMPLET.md`](./SPEC-CRM-MSK-COMPLET.md) | Spec suivi CRM |
| [`REGLES-EVOLUTION-CRM.md`](./REGLES-EVOLUTION-CRM.md) | Discipline technique COM |
| [docs/manuels/](../manuels/) | Manuels utilisateur |

### Qualité & design (absolu)

Voir `.cursor/rules/phase-quality.mdc` · `ui-never-freeze.mdc` · `list-create-separation.mdc` · `msk-charte.mdc`.

---

*Maj 2026-10-14 — LOT-A + LOT-B OK ; prochain = LOT-C (édition prospect) ; dette libellé « En discussion » en LOT-I ; RH ensuite.*
