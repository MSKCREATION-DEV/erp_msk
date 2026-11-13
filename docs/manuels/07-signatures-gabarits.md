# Manuel — Signatures & gabarits PDF

**Version** : 2026-11-13 · Studio documentaire v1  
**Public** : Collaborateur (signature perso) · Admin (gabarits / charte / Studio)

## À retenir

Les PDF Commercial (devis, factures) **et RH** utilisent :

1. **Gabarits / moteur pdf-lib** (mise en page charte MSK) — y compris les
   gabarits créés dans le **Studio documentaire** (`/administration/gabarits`,
   type « Gabarit Studio », blocs + variables `{{slug}}`, versionnés)
2. **Signature ACTIVE** du signataire (image déposée dans Mon espace /
   Signatures) — **désactivée par défaut** pour tout nouveau gabarit Studio ;
   un admin doit l’activer explicitement sur la fiche du gabarit pour qu’elle
   soit injectée dans les documents générés
3. **Mentions légales** en pied de page (pas de badge décoratif « MSK CREATION »)  
4. **Sanitisation WinAnsi** : retours chariot / espaces Unicode → ASCII (évite `WinAnsi cannot encode 0x000d`)
5. **Gabarit manquant / inactif / non publié** = erreur explicite affichée à
   l’utilisateur — jamais de document généré en silence avec un contenu
   improvisé

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

- 2026-11-13 — **Signatures OFF (règle produit)** : seed + migration data forcent `signatureEnabled=false` sur **tous** les gabarits (10 legacy inclus). Plus d’exception « préserver la prod ». Activation uniquement via bascule admin sur `/administration/gabarits/[id]`.
- 2026-11-13 — **Studio documentaire v1** : nouveau moteur central (`src/lib/studio/engine.ts`) pour les gabarits créés dans le Studio (blocs DSL `# Titre` / `> encadré` / `---` / `[[SIGNATURE: …]]` + variables `{{slug}}`, versions brouillon/publiée). Signature **désactivée par défaut** — bascule explicite par gabarit (`signatureEnabled`) via la fiche `/administration/gabarits/[id]`. Hook réel sur **Devis** et **Facture** Commercial : résolution via `requireActiveTemplate` + `resolveTemplateSignature` (si OFF → pas d’image / pas de bloc vide). Catalogue central de variables : `/administration/gabarits/variables`.
- 2026-10-10 — Gabarits RH (contrats, attestation, règlement, solde, fiche paie) + fix WinAnsi CR.
- 2026-10-10 — Première version ; alignement PDF Commercial Phase 3.
