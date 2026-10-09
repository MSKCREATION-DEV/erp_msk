# Phase 1 — GED + Charte + Gabarits + Signatures + Organigramme (MVP COM/CPT)

> Plan de phase dédié. **Aucun démarrage d’implémentation** avant validation explicite **« Phase 1 GO »**.  
> Prérequis : **Phase 0 OK** (2026-10-09).  
> Branche de travail : **`dev`**.  
> Contexte priorités : COM / Finance / Compta = **URGENT** ([PRIORITES.md](./PRIORITES.md)) — cette phase livre d’abord dossiers & gabarits utiles au commercial/finance.

## Statut

| Étape | État |
|---|---|
| Plan rédigé | Oui — 2026-10-09 |
| Validation « Phase 1 GO » | **EN ATTENTE** |
| Implémentation | Bloquée jusqu’au GO |
| Gate Phase 1 OK | — |

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
- Gabarits **devis** / **facture** + génération PDF minimale charte MSK

## Hors scope (strict — Phase 1.x / 2+)

| Reporté | Phase cible |
|---|---|
| OCR / full-text avancé | 1.x+ |
| Pipeline nettoyage image signature / cachet | 1.x |
| Pad dessin + signature « typed » | 1.x |
| Éditeur gabarit drag-and-drop / tous types RH-paie | 2–5 |
| Partage nominatif UI avancée (expire, manage_share) | 1.x |
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
| PDF gabarits | **`pdf-lib`** (génération serveur, Node-friendly, mature) |
| UI | PageShell + Card + SideDrawer Vaul (déjà en place) |
| ACL | Niveaux de visibilité + ACL nominative **modèle** ; UI partage simple (view/upload) |
| Soft-delete | Documents soft-delete ; pas de purge silencieuse |
| Priorité arbo | `03_CLIENTS`, `04_MODELES`, `01/02_COMPTA` stubs, `05_COLLABORATEURS` |

## Modèle de données (minimum)

```
DocumentFolder
  - id, parentId?, name, code, path, year?, visibility, createdBy
Document
  - id, folderId, storagePath, originalName, mime, size, checksum
  - version, status (ACTIVE|ARCHIVED|TRASH), visibility, createdBy
  - softDeletedAt?
DocumentLink
  - documentId, entityType, entityId  # client | user | template | …
DocumentAcl
  - folderId? | documentId?, userId, right (VIEW|UPLOAD|EDIT_META|MANAGE_SHARE)
  - expiresAt?
BrandAsset (CFG)
  - kind (logo_short|…), storageOrPublicPath, active
SignatureAsset
  - ownerUserId?, orgOwned, kind (UPLOAD), storageOriginal, status, label
OrgNode
  - userId?, title, parentId?, sortOrder  # organigramme lecture
DocumentTemplate
  - type (DEVIS|FACTURE), code, name, version, structureJson, active
```

Permissions à **compléter** dans le seed (en plus des stubs Phase 0 `ged.upload`, `ged.view_scoped`, `cfg.*`) :

- `ged.browse`, `ged.manage_folders`, `ged.delete`, `ged.share`
- `self.signature.manage`
- `orgchart.view`, `orgchart.manage` (manage hors MVP UI — seed + lecture)

## Arborescence bootstrap (année N)

Créée au seed / script d’ouverture d’exercice (lazy OK pour sous-dossiers clients) :

```
/{year}/
  01_COMPTABILITE_ANNUELLE/     # stub dossiers racines
  02_COMPTABILITE_MENSUELLE/    # stub + 01_FACTURES_ET_RECUS
  03_CLIENTS/                   # {client_slug}/Devis|Factures|Contrats|Autres (lazy)
  04_MODELES/                   # Devis/ Factures/ (+ stubs Contrats/RH)
  05_COLLABORATEURS/            # créé à l’invitation / activation user
```

Automatisations Phase 1 :

| Événement | Action |
|---|---|
| Seed / ouverture année | Créer racines année N |
| User ACTIVE (post-invite) | Créer `05_COLLABORATEURS/{NOM_PRENOM}/` + sous-dossiers de base |
| PDF devis/facture généré (démo gabarit) | Déposer sous `04_MODELES` ou dossier client test si fourni |

## Parcours à livrer

### GED
- Route `/ged` (sidebar, permission `ged.view_scoped` / `ged.browse`)
- Navigation arborescence + fil d’Ariane
- Upload fichier dans dossier courant (SideDrawer)
- Téléchargement via signed URL
- Soft-delete + liste corbeille minimale (autorisés)

### Charte / brand
- Page CFG `/administration/charte` (`cfg.brand`) : aperçu tokens + logos `public/brand`
- Pas d’éditeur PDF avancé ; enregistrement références assets org

### Signatures
- Self : upload signature PNG/JPEG/WebP (`self.signature.manage`)
- Admin : lister / révoquer (`cfg.signatures`)
- Stockage original uniquement (pas de pipeline clean)

### Organigramme
- Seed nœuds équipe MSK (CDC §14bis) liés users si e-mail connu
- Page lecture `/organisation` (`orgchart.view`)

### Gabarits devis / facture
- CRUD léger métadonnées template (`cfg.templates`)
- Action « Générer PDF démo » → `pdf-lib` (en-tête MSK, parties, lignes factices, total, slot signature placeholder)
- Fichier classé GED sous `04_MODELES/{Devis|Factures}/`

## Zones code (prévision)

- `prisma/schema.prisma` + migration `phase1_ged`
- `src/lib/ged/*` (paths, ACL resolve, storage client)
- `src/lib/pdf/templates/*` (devis, facture)
- `src/actions/ged.ts`, `signatures.ts`, `templates.ts`
- `src/app/(app)/ged/`, `organisation/`, `administration/charte/`, `administration/gabarits/`
- Seed : arbo année, orgchart, permissions GED manquantes
- Nav : activer GED / Organisation (retirer `soon` où livré)

## Standards transverses

Voir `.cursor/rules/phase-quality.mdc` + charte MSK :

- UI moderne, drawers Vaul, cards, états loading/empty/error
- Zod sur toutes les entrées ; secrets jamais client
- `npm run build` + lint sans erreur avant gate

## Tests & vérifications (gate Phase 1)

- [ ] Migration Prisma GED appliquée sur Supabase
- [ ] Bucket Storage `ged` créé + policies serveur (service role / signed URLs)
- [ ] Bootstrap arborescence année courante
- [ ] Upload + download + soft-delete E2E (Super Admin)
- [ ] Dossier collab créé à l’activation / invite
- [ ] Page organigramme seedée lisible
- [ ] Upload signature self + révocation admin
- [ ] PDF devis + facture démo générés et classés GED
- [ ] Permissions : collab sans `ged.manage_folders` ne crée pas de racines
- [ ] `npm run build` + lint + parcours UI vérifiés
- [ ] Validation explicite « Phase 1 OK »

## Critères d’acceptation

Un Super Admin peut parcourir la GED année N, uploader un document, voir l’organigramme seedé, déposer sa signature, et générer un PDF devis/facture démo classé sous `04_MODELES` — sans module CRM/commercial transactionnel.

## Après validation

Ouvrir **Phase 2** (plan dédié) : Catalogue + CRM — **URGENT**.

---

## Validation

Répondre dans le chat : **« Phase 1 GO »** pour démarrer l’implémentation.  
Toute autre formulation ambiguë = pas de GO.
