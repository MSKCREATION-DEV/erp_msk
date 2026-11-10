# Todo — Module Suivi (tampon)

Réf. plan : [`plan.md`](./plan.md) · Spec : [`docs/specs/suivi-tampon/SPEC.md`](../../docs/specs/suivi-tampon/SPEC.md)

**Note conflit :** `tasks/plan.md` / `tasks/todo.md` absents à la création — travail isolé ici. Ne pas écraser d’autres plans futurs.

---

## Task 1: Schema Prisma `sv_*` + migration RLS

**Acceptance criteria:**
- [x] Modèles compilent (`prisma generate`)
- [x] Tables créées avec préfixe `sv_`
- [x] RLS activé sur chaque table publique nouvelle

**Verification:**
- [x] migrate deploy OK (`20261110110000_sv_suivi_tampon`)
- [x] Build OK
- [x] RLS on vérifié en DB

---

## Task 2: Permissions `sv.*` + packs

- [x] Codes SPEC dans catalog + packs Direction / Admin plateforme
- [x] Pack commercial sans `sv.*`
- [ ] Manual smoke : user commercial → pas `sv.access`

---

## Task 3: Nav + hub `/suivi` skeleton

- [x] Hub + sous-nav + loading + garde `sv.access`
- [ ] Manual : nav + skeleton

---

## Checkpoint: Fondation

- [x] Build + lint OK (warnings préexistants hors Suivi)
- [x] Clarifications closes (DECISIONS-SEED Étape 0)

---

## Task 4: Seed inventaire clients + factures

- [x] 6 clients seedés
- [x] Factures fichier + décisions (FAC-122, pas 143 ; Ecosol 116/155/22910263 ; KOUNDJI 114/2710261/167)
- [x] FAC-22710262 Excel (solde récap) seedé avec `NEEDS_REVIEW` — FAC-121 sans fichier **non** seedé
- [x] Devis-only absents
- [x] Counts DB : 6 clients · 11 factures · 34 OUT · 33 stocks (Excel = 33 lignes ; inventaire texte disait 32)

---

## Task 5–9: Clients / factures / remix / paiement

- [x] Liste clients cliquable + KPI
- [x] Fiche client 4 KPI + factures + contrats meta + paiements
- [x] CRUD client `/nouveau` + `/[id]/edit`
- [x] Liste/fiche factures + paiement (miroir IN décision E)
- [x] Remix FormSteps
- [ ] Manual E2E remix FAC-155 + paiement ISDALINIA

---

## Checkpoint: Clients/Factures

- [x] Build OK
- [ ] Manual smoke impayés / remix

---

## Task 10–11: Mouvements

- [x] 34 OUT seed · registre UI · saisie IN/OUT
- [x] Somme sorties 473 000 FCFA
- [ ] Manual saisie

---

## Task 12–13: Stocks

- [x] Snapshot Excel seed + liste + fiche + mouvement (blocage qty &lt; 0)
- [ ] Manual PAP-001

---

## Task 14: GED contrats + liens factures

- [x] Dépôt fichiers GED + `DocumentLink` (`08_SUIVI_TAMPON/clients/…/Contrats|Factures`, entityTypes `sv_*`)
- [x] UI Voir / Télécharger sur fiche client + fiche facture (`SvGedDocActions`)
- [x] Seed `seedSuiviGed` branché dans `seed-suivi` (idempotent)

---

## Task 15–17: Hub polish / guides / gate

- [x] Hub métriques (impayés / solde / stock 0) + `error.tsx`
- [ ] Métriques hub cliquables vers listes filtrées (partiel)
- [x] Changelog `SUIVI-GUIDES.md` + inventaire guide `draft`
- [x] Build + typecheck + lint (gate code)
- [ ] Review humain / smoke navigateur
- [ ] Push `origin/dev` + align `main` (SSH bloqué — commandes à l’humain)

---

## Task 18: Comptes physique / banque

- [x] Nom produit **Comptes** (décision F) — nav + hub
- [x] `sv_accounts` + `accountId` / `transferId` sur mouvements
- [x] UI liste + fiche + crédit/débit/transfert
- [x] Seed ouverture 0 ; OUT seed → compte physique
- [x] Permissions `sv.accounts.*`
- [ ] Manual : retrait banque → physique, solde cohérent

---

## Task 19: Clients renforcés + anti-natif + GED preview

- [x] Liste actions (menu) + colonnes à venir / contact
- [x] Fiche identité + paiements inline + mouvements liés
- [x] Forms mouvements/stock sans `<select>` natif
- [x] Modal GED DOCX : aperçu indisponible + CTA download
- [ ] Manual smoke UI

---

## Checkpoint: Complete

- [x] GED seed (Task 14) — code + seed local ; smoke ouverture GED à rejouer
- [x] Comptes + anti-natif + clients (code) — smoke navigateur restant
- [ ] Smoke manuel parcours (commercial sans accès, remix FAC-155, paiement ISDALINIA, PAP-001, ouvrir GED DOCX, Comptes)
- [ ] Push / align remotes
