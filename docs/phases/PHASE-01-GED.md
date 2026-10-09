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
| Implémentation | **Livrée sur `dev`** — 2026-10-09 (itinérance UI/GED/org/PDF) |
| Gate technique | **OK** (`npm run gate:phase1` + `build` + `test:nav`) |
| Gate Phase 1 OK (humaine) | **En attente** — checklist UI ci-dessous |

## Règle de gate

1. Plan validé (« Phase 1 GO »)  
2. Implémentation complète de **ce** plan seulement  
3. Tests / vérifications  
4. Validation « Phase 1 OK »  
5. Seulement ensuite → Phase 2 (Catalogue + CRM — URGENT)

## Objectif

Poser le **socle documentaire** de l’ERP MSK pour que les phases Commercial / Compta puissent classer et générer des pièces sans SharePoint :

- GED native (métadonnées Prisma + **Supabase Storage**)
- Arborescence année prioritaire COM/CPT
- Charte / brand en config (assets existants `public/brand`)
- Bibliothèque signatures (upload original)
- Organigramme seedé (lecture)
- Gabarits **devis** / **facture** + génération PDF charte MSK

## Hors scope (strict — Phase 1.x / 2+)

| Reporté | Phase cible |
|---|---|
| OCR / full-text avancé | 1.x+ |
| Pipeline nettoyage image signature / cachet | 1.x |
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
- [x] Modal de confirmation MSK (`ConfirmProvider` / `useConfirm`) — delete + logout

### Charte / brand
- [x] Page `/administration/charte` — tokens + logos `public/brand`

### Signatures
- [x] Self `/profil/signature` — upload PNG/JPEG/WebP
- [x] Admin `/administration/signatures` — liste / révocation

### Organigramme (`/organisation`)
- [x] Seed 11 nœuds (Assetou retiré) + photos `public/team/*`
- [x] E-mails `initiale.nom@mskcreation.net`
- [x] Board 5 niveaux + connecteurs SVG (co-direction → ops → staff)
- [x] `OrgNode.photoPath`

### Gabarits
- [x] Templates seed `devis_standard` / `facture_standard`
- [x] PDF démo alignés exemples devis / facture (logo lockup, parties, tableau, totaux, IBAN, pied fiscal)
- [x] Classement sous `04_MODELES/{Devis|Factures}/`

### Transverse
- [x] Règle absolue anti-reset MDP comptes `ACTIVE`
- [x] WinAnsi PDF (espaces fr-FR)
- [x] Shell : sidebar + topbar fixes ; scroll contenu seul
- [x] Navbar / perf : loading segments, RBAC, prefetch dossiers

## Reste avant « Phase 1 OK » (gate humaine)

À valider **manuellement** en Super Admin (pas bloquant gate technique) :

| # | Parcours | Critère |
|---|---|---|
| 1 | GED | Créer dossier → upload → aperçu modal → soft-delete fichier → renommer / supprimer dossier libre |
| 2 | Affichage GED | Basculer liste / compact / vignettes + tri + regroupement |
| 3 | Signature | Upload self + révocation admin visibles |
| 4 | Gabarits | Générer PDF devis **et** facture → ouvrir depuis GED `04_MODELES` |
| 5 | Org | Vérifier hiérarchie + photos + e-mails |
| 6 | Déconnexion | Modal confirmation (pas `window.confirm`) |

Optionnel Phase **1.x** (hors gate stricte) :

- UI corbeille (lister / restaurer documents soft-deleted)
- Partage nominatif ACL UI
- Pad signature / nettoyage image

## Tests automatiques

```bash
npm run build
npm run test:nav
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run gate:phase1
```

Résultats 2026-10-09 : **build OK** · **nav OK** · **gate technique OK** (arbo 2026, 2 gabarits, 11 org nodes, perms, bucket `ged`).

## Critères d’acceptation

Un Super Admin peut parcourir la GED année N, CRUD dossiers libres, uploader / prévisualiser / soft-delete un document, voir l’organigramme seedé, déposer sa signature, et générer un PDF devis/facture démo classé sous `04_MODELES` — sans module CRM/commercial transactionnel.

## Après validation

Répondre dans le chat : **« Phase 1 OK »**.  
Puis ouvrir **Phase 2** (plan dédié) : Catalogue + CRM — **URGENT**.

---

## Validation historique

- **« Phase 1 GO »** — 2026-10-09 (démarrage implémentation).
