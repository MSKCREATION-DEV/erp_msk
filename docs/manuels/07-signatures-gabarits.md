# Manuel — Signatures & gabarits PDF

**Version** : 2026-10-10 · Phase 1  
**Public** : Collaborateur (signature perso) · Admin (gabarits / charte)

## À retenir

Les PDF Commercial (devis, factures) **et RH** utilisent :

1. **Gabarits / moteur pdf-lib** (mise en page charte MSK)  
2. **Signature ACTIVE** du signataire (image déposée dans Mon espace / Signatures)  
3. **Mentions légales** en pied de page (pas de badge décoratif « MSK CREATION »)  
4. **Sanitisation WinAnsi** : retours chariot / espaces Unicode → ASCII (évite `WinAnsi cannot encode 0x000d`)

## Navigation

| Intention | Route typique |
|---|---|
| Mes signatures | `/signatures` (ou menu Mon espace) |
| Gabarits | `/administration/gabarits` |
| Charte / brand | `/charte` (référence visuelle) |
| PDF contrat | `/rh/contrats/[id]` → Générer PDF |
| PDF collab | `/rh/collaborateurs/[id]` → Documents RH |

## Ce qu’engendre une action

| Action | Conséquence |
|---|---|
| Déposer / activer une signature | Utilisée sur les PDF émis ensuite |
| Changer de signature ACTIVE | Nouveaux PDF uniquement (anciens PDF GED inchangés) |
| Émettre devis / facture | PDF généré + classé GED client |
| PDF contrat / attestation / règlement / solde / paie | PDF charte MSK + classé GED Collaborateurs |

## Changelog manuel

- 2026-10-10 — Gabarits RH (contrats, attestation, règlement, solde, fiche paie) + fix WinAnsi CR.
- 2026-10-10 — Première version ; alignement PDF Commercial Phase 3.
