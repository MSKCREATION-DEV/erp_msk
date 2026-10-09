# Phase 1 — GED + Charte + Gabarits + Signatures + Organigramme (MVP COM/CPT)

> Plan de phase dédié.  
> Prérequis : **Phase 0 OK** (2026-10-09).  
> Branche de travail : **`dev`**.  
> Contexte priorités : COM / Finance / Compta = **URGENT** ([PRIORITES.md](./PRIORITES.md)).

## Statut

| Étape | État |
|---|---|
| Plan rédigé | Oui — 2026-10-09 |
| Validation « Phase 1 GO » | **GO** — 2026-10-09 |
| Implémentation | **Livrée sur `dev`** — 2026-10-09 |
| Gate technique | **OK** (`npm run gate:phase1` + `build` + `test:nav`) |
| Gate Phase 1 OK (humaine) | **OK** — 2026-10-09 |

## Règle de gate

1. Plan validé (« Phase 1 GO »)  
2. Implémentation complète de **ce** plan seulement  
3. Tests / vérifications  
4. Validation « Phase 1 OK » ← **fait**  
5. Seulement ensuite → Phase 2 (Catalogue + CRM — URGENT)

## Objectif

Poser le **socle documentaire** de l’ERP MSK pour que les phases Commercial / Compta puissent classer et générer des pièces sans SharePoint :

- GED native (métadonnées Prisma + **Supabase Storage**)
- Arborescence année prioritaire COM/CPT
- Charte / brand en config (assets existants `public/brand`)
- Bibliothèque signatures (upload + nettoyage fond)
- Organigramme seedé (lecture)
- Gabarits **devis** / **facture** + génération PDF charte MSK

## Hors scope (strict — Phase 1.x / 2+)

| Reporté | Phase cible |
|---|---|
| OCR / full-text avancé | 1.x+ |
| UI avant/après nettoyage signature + réglages manuels | 1.x |
| Pad dessin + signature « typed » | 1.x |
| Éditeur gabarit drag-and-drop / tous types RH-paie | 2–5 |
| Partage nominatif UI avancée (expire, manage_share) | 1.x |
| **UI corbeille GED** (liste / restore) | 1.x |
| Arborescence SharePoint exhaustive (tous sous-dossiers) | incrémental |
| Clients / devis / factures **transactionnels** | Phase 2–3 |
| CRM, paie, stocks | Phase 2+ |
| e-sign qualifiée eIDAS | Phase 8 |

## Décisions verrouillées

| Sujet | Valeur |
|---|---|
| Storage | Supabase Storage (bucket privé `ged`) + signed URLs serveur |
| Métadonnées | Prisma (`DocumentFolder`, `Document`, `DocumentLink`, `DocumentAcl`) |
| Validation uploads | Zod (mime, taille max, nom) |
| PDF gabarits | **`pdf-lib`** — layout aligné exemples `docs/exemple *.png` + tokens MSK |
| UI | PageShell + Card + SideDrawer Vaul + **ConfirmDialog** MSK |
| ACL | Modèle présent ; UI partage avancée → 1.x |
| Soft-delete | Documents soft-delete ; dossiers système protégés |
| Signatures | Original + `storageCleaned` (PNG transparent, sharp v2) |
| Erreurs UI | `ErrorFallback` + messages sanitizés (pas de dump Prisma) |
| Priorité arbo | `03_CLIENTS`, `04_MODELES`, `01/02_COMPTA` stubs, `05_COLLABORATEURS` |

## Livré (implémentation)

### GED (`/ged`)
- [x] Navigation + fil d’Ariane, ouverture année courante
- [x] Upload fichier (drawer) + download signed URL + soft-delete document
- [x] **CRUD dossiers** (create / rename / delete) — `ged.manage_folders`
- [x] Dossiers système protégés (année, racines, modèles, collab sub)
- [x] Affichage : liste / compact / vignettes + tri + regroupement (prefs localStorage)
- [x] Aperçu document en **modal** (PDF / image / texte)
- [x] Compteurs enfants directs (dossiers / fichiers) à la place des codes techniques
- [x] Modal de confirmation MSK (`ConfirmProvider` / `useConfirm`) — delete + logout + loading in-modal

### Charte / brand
- [x] Page `/administration/charte` — tokens + logos `public/brand`

### Signatures
- [x] Self `/profil/signature` — upload PNG/JPEG/WebP
- [x] Admin `/administration/signatures` — liste / révocation
- [x] Pipeline nettoyage fond → PNG transparent (`storageCleaned` v2, sharp)
- [x] Signature ACTIVE apposée sur PDF devis/facture démo

### Organigramme (`/organisation`)
- [x] Seed 11 nœuds (Assetou retiré) + photos `public/team/*`
- [x] E-mails `initiale.nom@mskcreation.net`
- [x] Board 5 niveaux + connecteurs SVG (co-direction → ops → staff)
- [x] `OrgNode.photoPath`

### Gabarits
- [x] Templates seed `devis_standard` / `facture_standard`
- [x] PDF démo alignés exemples devis / facture (logo lockup, parties, tableau, totaux, IBAN, pied fiscal, signature)
- [x] Classement sous `04_MODELES/{Devis|Factures}/`

### Transverse
- [x] Règle absolue anti-reset MDP comptes `ACTIVE`
- [x] WinAnsi PDF (espaces fr-FR)
- [x] Shell : sidebar + topbar fixes ; scroll contenu seul ; nav regroupée (Principal / Admin / Compte / À venir)
- [x] Erreurs : `error.tsx` / `global-error.tsx` + Accueil résilient (pool DB)
- [x] Navbar / perf : loading segments, RBAC, prefetch dossiers

## Gate humaine — validée 2026-10-09

| # | Parcours | Résultat |
|---|---|---|
| 1 | GED — créer / renommer / supprimer dossier + upload + aperçu + soft-delete | **OK** |
| 2 | Vues — liste / compact / vignettes + tri / regroupement | **OK** |
| 3 | Signature — upload self + révocation admin | **OK** |
| 4 | Gabarits — PDF devis et facture → visibles dans `04_MODELES` | **OK** |
| 5 | Org — hiérarchie + photos | **OK** |
| 6 | Déconnexion — modal MSK | **OK** |

### Optionnel 1.x (pas bloquant — à implémenter plus tard)

- UI corbeille GED (liste / restaurer soft-delete)
- Partage ACL nominatif (UI)
- Pad signature (+ raffinements nettoyage avant/après)

## Tests automatiques

```bash
npm run build
npm run test:nav
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run gate:phase1
```

Résultats 2026-10-09 : **build OK** · **nav OK** · **gate technique OK** (arbo 2026, 2 gabarits, 11 org nodes, perms, bucket `ged`).

## Critères d’acceptation

Un Super Admin peut parcourir la GED année N, CRUD dossiers libres, uploader / prévisualiser / soft-delete un document, voir l’organigramme seedé, déposer sa signature (fond nettoyé), et générer un PDF devis/facture démo classé sous `04_MODELES` — sans module CRM/commercial transactionnel.

## Suite

**Phase 1 OK** — ouvrir le plan dédié **Phase 2** (Catalogue + CRM — **URGENT**).  
Aucun démarrage Phase 2 avant GO explicite sur ce plan.

---

## Validation historique

- **« Phase 1 GO »** — 2026-10-09 (démarrage implémentation).
- **« Phase 1 OK »** — 2026-10-09 (gate humaine validée + push `dev`).
