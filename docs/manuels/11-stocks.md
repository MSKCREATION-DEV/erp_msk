# 11 — Stocks

Public : **Pack Stock** · **Direction** (lecture / alertes) · Super Admin.

## Parcours

1. **Stocks** (hub) — KPI articles, alertes qty ≤ min, derniers mouvements
2. **Articles** — liste catalogue ; **Nouveau** → fiche (code, famille, min, emplacement)
3. **Mouvements** — Entrée / Sortie / Ajustement (qty cible)
4. Fiche article — stock actuel + historique ; édition des métadonnées (pas la qty directe)

## Règles

| Action | Effet |
|---|---|
| Entrée | qty ↑ |
| Sortie | qty ↓ — refusée si stock insuffisant |
| Ajustement | qty devient la cible ; delta tracé |
| Alerte | visible sur le hub si qty ≤ stock min |

Pièces GED : dossier année `07_STOCKS_ACHATS` (upload manuel Phase 7A).

Achats / écritures AC / lien facture Commercial → **Phase 7B**.

## Changelog

| Date | Note |
|---|---|
| 2026-10-10 | Phase 7A MVP — articles, mouvements, alertes |
