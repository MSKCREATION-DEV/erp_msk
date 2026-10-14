# LOT-F — Doublons + moyens de contact + réseaux sociaux

**Statut :** **implémenté** (2026-10-14)  
**Priorité :** P1 Direction (anti-doublon) + P2-1 / tranche P2-3  
**Migrations :** `20261014160000_lotf_duplicates_channels_social`  

## Livré

| Zone | Détail |
|------|--------|
| Doublons org | Exact (Continuer bloqué) / fuzzy ≥ 50 % Dice (Continuer OK + audit) — prospect **et** client |
| Doublons contact | Match tél / e-mail / canaux → cards + Continuer quand même |
| Canaux | `CrmContactChannel` N moyens, 1 principal, miroir `phone`/`email` |
| Réseaux | Colonnes URL org + multi-select wizard / edit / badges fiche |

## Gate

- [x] Migration + build  
- [ ] Smoke wizard `[TEST]` : exact block · fuzzy continue · multi-canaux · RS  
