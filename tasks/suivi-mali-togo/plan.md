# Plan — Suivi Mali / Togo Phase A

Intent : `docs/intent/suivi-mali-togo.md`  
Rollback : `f38d09ff7154bf260d30d4cfe77c20a42580c68f`

## Phase A (cette livraison)

1. Enum `SvCountry` + colonnes / uniques comptes & stocks ; backfill MALI
2. Permissions `sv.country.*` + packs Direction / admin ; GRANT Espoir Togo
3. Helpers parse / `requireSvCountry` / `canSvCountry`
4. Seed Togo (comptes 0, stocks familles 0) idempotent
5. Listes Phase A filtrées Mali implicite (régression jusqu’à Phase B)

## Hors scope A → Phase B

- Hub choix pays + `?pays=` obligatoire sur 3 piliers
- Empty states FR pays
- Interdit inter-pays UI
