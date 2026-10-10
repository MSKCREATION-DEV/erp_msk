# Manuel — CRM (prospects, relances, scripts)

**Version** : 2026-10-10 · Phase 2  
**Public** : Commerciaux, Admin CRM

## À retenir

Le CRM suit le **pipeline avant vente** : prospect → activités / relances → conversion client Commercial.

| Zone | Route | Permissions typiques |
|---|---|---|
| Hub | `/crm` | `crm.access` |
| Prospects | `/crm/prospects` · `/nouveau` · `/[id]` | `crm.prospects.*` |
| Relances | `/crm/relances` | `crm.followups.*` |
| Scripts | `/crm/scripts` | `crm.scripts.*` |

## Cycle prospect

1. **Créer** sur `/crm/prospects/nouveau`  
2. Enrichir fiche (contacts, notes, stage)  
3. Planifier **relances**  
4. Quand gagné → **Convertir en client** (bouton Commercial)  
   - Crée / lie un `Client`  
   - Ouvre le module Commercial  
   - Peut préremplir un devis

## Ce qu’engendre une action

| Action | Conséquence |
|---|---|
| Convertir → client | Client Commercial + dossiers GED `Clients/…` |
| Convertir → devis | Client + devis brouillon lié |
| Archiver prospect | Sorti du pipeline actif |

## Packs

| Profil | Packs |
|---|---|
| Commercial terrain | `commercial` (+ groupes `commerciaux`) |
| Admin CRM | + pack `admin_crm` (GED browse, catalogue manage, etc.) |

Ne pas mettre `admin_crm` sur un commercial terrain (ouvre trop de GED / catalogue).

## Changelog manuel

- 2026-10-10 — Conversion CRM → Commercial documentée.
