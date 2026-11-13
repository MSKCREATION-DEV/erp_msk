# Comptes & données de test (ERP MSK)

## Règle absolue

Les comptes / orgs / clients de test **ne doivent jamais** rester en prod après usage.

| Marquage | Exemple |
|---|---|
| Email | `*@test.msk.local` |
| Nom | `Nom [TEST]` (ex. `Bah [TEST]`) |
| Org / client | préfixe `[TEST]` dans le nom |

## Cycle de vie

1. **Créer** uniquement avec des data clairement marquées `[TEST]` / `@test.msk.local`.
2. **Noter** dans le lot / le script ce qui a été créé (ids, emails).
3. **Purger** dès la fin du test : user **+** Auth Supabase **+** toutes les data liées (CRM, COM, GED, notifs, packs…).
4. **Ne jamais** archiver « pour plus tard » sans plan de purge — l’archive laisse des UUID / Auth orphelins.

## Garde-fous

- Ne jamais toucher les comptes réels (`@mskcreation.net` actifs), surtout ne pas reset leur MDP Auth.
- Avant delete user : inventaire des FK Restrict (stocks, projets, tickets, factures…) ; si data métier réelle → **stop**, réaffecter ou confirmer humain.
- **GED collaborateurs** : les dossiers sous `05_COLLABORATEURS` sont liés par **slug nom** (`BAH_YAYE`), pas forcément par `createdById` / `userId`. Un user test peut laisser un dossier orphelin même si `foldersCreated = 0`. Toujours chercher `path` / `code` / nom `[TEST]` / trailing space (`BAH_YAYE_`).
- Scripts one-shot sous `scripts/tmp-*` : exécuter, vérifier, supprimer le script.

## Scripts utiles

- Seed fixtures CRM : `scripts/seed-crm-test-fixtures.mjs` (`PURGE=1` pour nettoyer).
- Merge / purge orgs `[TEST]` historique : `scripts/crm-import-yaye-merge.ts`.
- Purge RH smoke (picker Suivi) : `scripts/ops-cleanup-rh-test-employees.ts` (dry-run par défaut ; `CONFIRM_DELETE=YES` pour apply).
- Création collabs Marketing (one-shot) : `scripts/ops-create-marketing-collabs.ts` — voir aussi `docs/ops/CREATE-MARKETING-COLLABS.md`.

## Historique

- **2026-11-13** — inventaire picker Suivi absences :
  - **Delete safe** (smoke) : `Review Collab*` + `Awa Traore` + suffixe numérique → script `ops-cleanup-rh-test-employees.ts` + GED `COLLAB05697_REVIEW`.
  - **Conservé** : `Test Guiro` (`test.guiro@test.com`).
  - **Ambiguïté** : doublon `Yaye Bah` orphelin (`pro.asguiro@gmail.com`, sans `userId`, mais contrats/paie/INPS) — **non supprimé**, à trancher.
  - Yaye réelle `y.bah@mskcreation.net` **non touchée**.
- **2026-11-06** — suppression définitive (Prisma + Auth) :
  - `test.yaye@test.msk.local` `267ac4bb-c3e2-4a94-a324-ed0a1c680c6b`
  - `test.mathieu.crm@test.msk.local` `c039f3c3-bf46-4aaa-82a6-de8aecb487cf`
  - `test.mathieu@test.msk.local` `906b89c5-5e48-480e-8d6a-f808ed1a0d1d`
  - `test.admin.crm@test.msk.local` `e58db727-ae22-48dd-8030-21d272b62282`
  - Compte réel Yaye Bah (`y.bah@mskcreation.net`) **non touché**.
- **2026-11-06** — GED : purge doublon vide `/2026/05_COLLABORATEURS/BAH_YAYE_` (« Bah Yaye » + espace trailing, créé via slug non trimé). Conservé `BAH_YAYE` (8 docs). Fix `collabFolderSlug` + trim display name.
- **2026-11-06** — GED : purge `GUIRO_TEST` (arbre vide).
- GED `COLLAB05697_REVIEW` : purgé via `ops-cleanup-rh-test-employees.ts` (2026-11-13) si `CONFIRM_DELETE=YES`.
