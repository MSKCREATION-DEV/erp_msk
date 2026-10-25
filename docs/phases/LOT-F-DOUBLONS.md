# LOT-F — Doublons + moyens de contact + réseaux sociaux

**Statut :** **implémenté** (2026-10-14)  
**Priorité :** P1 Direction (anti-doublon) + P2-1 / tranche P2-3  
**Migrations :** `20261014160000_lotf_duplicates_channels_social`  

## Livré

| Zone | Détail |
|------|--------|
| Doublons org | Exact **ou** fuzzy ≥ 50 % Dice → Continuer bloqué (dès 3 car. live) — prospect **et** client |
| Doublons contact | Match tél / e-mail / canaux → cards + Continuer quand même (ack serveur identité) |
| Live search | Org dès 3 caractères ; tél ≥ 6 chiffres / e-mail ≥ 3 — debounce + anti-course |
| Requêtes | Pool indexé `normalizedName` (plus de scan 400) ; exact org = `findFirst` |
| Canaux | `CrmContactChannel` N moyens, 1 principal, miroir `phone`/`email` |
| Réseaux | Colonnes URL org + multi-select wizard / edit / badges fiche |

## Gate

- [x] Migration + build  
- [x] Live search + blocage exact + ack contact identité (2026-10-25)  
- [ ] Smoke wizard `[TEST]` : exact block · fuzzy continue · multi-canaux · RS  
