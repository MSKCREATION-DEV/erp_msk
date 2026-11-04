# Phase COM-FACTU — Commercial · Facturation · Créances

> Plan de programme.  
> Prérequis : Phase 3 OK + Phase 6 base + ADR [`COMMERCIAL-FACTURATION-CIBLE.md`](../architecture/COMMERCIAL-FACTURATION-CIBLE.md).  
> Branche : **`dev`**.  
> Gel UI : `COM_DOCS_GATED` jusqu’à gate Phase 8.

## Statut

| Étape | État |
|---|---|
| Phase 1 — Audit / ADR | OK — 2026-11-04 |
| Phase 2 — Fondations | OK — migration + billing + numérotation |
| Phase 3 — Devis / contrats | OK — contrat depuis devis accepté |
| Phase 4 — Facturation | OK — facture période contrat + arriérés |
| Phase 5 — AR / paiements | OK — créances + KPI fiche client + allocations |
| Phase 6 — Automatisation | Partiel — anti-doublon période ; relances UI à enrichir |
| Phase 7 — Import historique | OK dry-run parser Excel + anomalies Prosperity/ECOSOL |
| Phase 8 — Tests / dégel | OK — `COM_DOCS_GATED=false` · typecheck · test:billing · test:com-docs |

## Règle de gate (chaque sous-phase)

1. Implémentation de la sous-phase seulement  
2. Tests unitaires ciblés verts  
3. `npm run typecheck` (ou build) sans erreur bloquante sur le périmètre  
4. Review axes qualité (sécurité, lisibilité, charte si UI)  
5. Enchaînement autonome → sous-phase suivante  
6. Gate humaine globale = **fin Phase 8 uniquement**

## Objectif programme

```
Client unique → Devis → Contrat (snapshot) → Factures → Paiements/allocations
→ Soldes / arriérés / aging → Pilotage compta AR → Import historique
```

## Hors scope (ne pas digresser)

- Multi-entité / multi-tenant  
- PSP / prélèvement auto Wave  
- Télédéclaration DGI  
- Remplacer SYSCOHADA Phase 6 (on s’y branche)

## Décisions verrouillées

Voir ADR. Rappel : XOF entiers · TVA configurable · numéro à l’émission · pas de double-comptage arriérés · évoluer `Com*` existant.

## Critères d’acceptation programme (Phase 8)

- [ ] Cas ECOSOL reproductible (413 600 net oct.)  
- [ ] Cas Prosperity importé avec anomalie 63 000  
- [ ] Concurrence numérotation : 0 doublon  
- [ ] Fiche client 360° : facturé ≠ encaissé  
- [ ] PDF devis/facture charte MSK  
- [ ] `COM_DOCS_GATED = false` + tests gates mis à jour  
- [ ] Manuels + `SUIVI-GUIDES.md` à jour  
