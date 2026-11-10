# Spec: Module Suivi (tampon)

**Intent :** [`docs/intent/module-suivi-tampon.md`](../../intent/module-suivi-tampon.md)  
**Inventaire data :** [`INVENTAIRE-DOCUMENTS.md`](./INVENTAIRE-DOCUMENTS.md)  
**Décisions seed :** [`DECISIONS-SEED.md`](./DECISIONS-SEED.md)  
**Capability map :** [`CAPABILITY-MAP.md`](./CAPABILITY-MAP.md)  
**Statut :** prêt implémentation — clarifications closes 2026-11-10 (zéro bloqueur seed/spec)  
**Date :** 2026-11-10

---

## Objective

Livrer un module ERP **temporaire et isolé** nommé **« Suivi »** (`/suivi`) permettant à la direction / admins / super-admin de répondre aux 3 questions :

1. **Impayés** — soldes clients, restes à encaisser, à venir
2. **Mouvements** — entrées / sorties + historique (trésorerie tampon — **pas** module caisse métier)
3. **Stocks** — quantités par article / emplacement

Avec une **fiche client riche** (solde, restant, à venir, totale, contrats & factures GED) et une **génération de factures futures par remix** depuis l’historique.

**Utilisateurs :** Super admin, admins, direction (y compris distant). **Pas** commercial terrain.

**Success criteria (produit) :** voir section Success Criteria ci-dessous.

---

## Tech Stack

| Couche | Choix |
|--------|--------|
| App | Next.js App Router 15 · React 19 · Server Components / Server Actions |
| Data | Prisma ORM 7 · PostgreSQL (Supabase) · tables `sv_*` isolées |
| Auth / droits | Supabase Auth + RBAC `sv.*` |
| Validation | Zod sur toute FormData |
| UI | Tokens MSK · composants `src/components/ui/*` · pattern hub Commercial |
| GED | Réutiliser `Document` / `DocumentFolder` / `DocumentLink` (pas de nouveau moteur) |
| Montants | Entiers FCFA (XOF), comme Commercial |

## Commands

```bash
npm run build
npm run lint
npm run dev
# tests ciblés existants / à ajouter selon conventions repo
npx prisma migrate dev --name sv_suivi_tampon
npx prisma generate
```

## Project Structure (cible)

```
src/app/(app)/suivi/                 # hub + sous-routes
  page.tsx                           # hub (comme commercial)
  clients/ page | nouveau | [id]
  factures/ page | nouveau | [id]
  mouvements/ page | nouveau | [id]? # registre + historique (ex-« caisse »)
  stocks/ page | mouvements/nouveau | [id]?
src/components/suivi/                # UI module
src/actions/suivi/                   # Server Actions Zod
src/lib/suivi/                       # scope, nav, calculs soldes, seed helpers
prisma/schema.prisma                 # models Sv* @@map("sv_*")
prisma/seed-suivi.ts ou section seed # seed depuis inventaire + DECISIONS-SEED
docs/specs/suivi-tampon/             # cette spec + inventaire + décisions
docs/guides/SUIVI-GUIDES.md          # MAJ obligatoire si guides
```

## Code Style

- Suivre patterns Commercial : `PageShell` / `PageHeader` / `Surface` / `ClickableRowLink` / `FormShell` / `FormSteps` / `usePendingAction`
- list-create-separation : liste ≠ create
- `redirect()` dans Server Actions après succès mutation
- Pas de `window.location` post-action (sauf logout)
- Classes Tailwind canoniques (`msk-ink/6`, pas `msk-ink/[0.06]`)
- Prisma métier uniquement — jamais `supabase.from()` tables ERP

Exemple d’intention (illustratif, pas à coller tel quel en V0) :

```ts
// lib/suivi/balances.ts — calculs dérivés, pas de double écriture inventée
export function clientBalance(invoices: { totalTtc: number; amountPaid: number }[]) {
  const totale = invoices.reduce((s, i) => s + i.totalTtc, 0);
  const paye = invoices.reduce((s, i) => s + i.amountPaid, 0);
  return { totale, paye, restant: totale - paye };
}
```

## Testing Strategy

| Niveau | Quoi |
|--------|------|
| Unitaire | Calculs soldes / remix lignes / validation Zod |
| Build gate | `npm run build` + lint sans erreur |
| Manuel / browser | Hub → clients → fiche → remix facture ; mouvements ; stocks |
| Auth | User sans `sv.access` → redirect ; commercial terrain sans pack → refus |
| Seed | Relecture inventaire : 0 client inventé |

---

## Boundaries

### Always

- Tables préfixe `sv_` / modèles `Sv*`
- Permissions `sv.*` restrictives
- Seed uniquement depuis [`INVENTAIRE-DOCUMENTS.md`](./INVENTAIRE-DOCUMENTS.md) + [`DECISIONS-SEED.md`](./DECISIONS-SEED.md) ; conflits documentés → `NEEDS_REVIEW` / note, **priorité fichier facture** (pas de « fix » silencieux Excel)
- `loading.tsx` sur segments ; pending boutons
- Mettre à jour `docs/guides/SUIVI-GUIDES.md` si guides / parcours documentés
- RLS : nouvelles tables `ENABLE ROW LEVEL SECURITY` sans policy ouverte anon

### Ask first

- Exposer le module dans la sidebar à d’autres packs
- Migration future vers `Com*` / Compta réelle
- Import lignes achats 09/09 comme mouvements stock (hors snapshot)
- Arbitrage humain des flags `NEEDS_REVIEW` (KOUNDJI overlap / chèque 117) — **non bloquant** seed (voir DECISIONS-SEED)

### Never

- Inventer clients / factures / montants / stocks
- Seed des **~14 clients devis-only** (décision B)
- Seed **FAC-143** Prosperity (doublon 122)
- Module « caisse » métier / multi-caisses (décision C — registre **Mouvements** seulement)
- FK ou sync métier vers Commercial / Compta / CRM
- Implémenter GED juridique complet, prélèvement auto, multi-entrepôts, rapprochement bancaire
- Réécrire MDP Auth (règle `auth-password-safety`)
- Commit secrets ; `supabase.from` tables métier

---

## Nom & navigation

| Élément | Valeur |
|---------|--------|
| Libellé menu | **Suivi** |
| Route | `/suivi` |
| Permission porte | `sv.access` |
| Domaine RBAC | `sv` |
| Sous-nav (hub + tabs) | Menu · Clients · Factures · **Mouvements** · Stocks |

Sidebar : entrée live (pas « bientôt ») réservée aux utilisateurs ayant `sv.access`.

---

## Permissions (V1)

| Code | Description |
|------|-------------|
| `sv.access` | Voir le hub Suivi |
| `sv.clients.view` | Liste + fiches clients |
| `sv.clients.manage` | Créer / éditer clients |
| `sv.invoices.view` | Liste + fiches factures |
| `sv.invoices.manage` | Créer (remix) / éditer / enregistrer paiements |
| `sv.movements.view` | Registre mouvements (alias code historique `sv.cash.*` OK si déjà esquissé) |
| `sv.movements.manage` | Saisir mouvements IN/OUT |
| `sv.stock.view` | Liste stocks |
| `sv.stock.manage` | Ajuster / mouvements stock |

**Attribution V1 :** SuperAdmin (all) + pack Admin / Direction uniquement. **Aucun** pack commercial terrain.

---

## Modèle de données (proposé — isolé)

Montants : `Int` FCFA. Dates : `DateTime`. Pas de lien Prisma vers `com_*`.

### Clients / factures

```
SvClient
  id, name, contactName?, email?, phone?, city?, country?, notes?
  sourceRef?          // ex. "inventaire:ECOSOL"
  createdAt, updatedAt
  @@map("sv_clients")

SvInvoice
  id, number?, legacyNumber?, status (BROUILLON|EMISE|PARTIELLE|PAYEE|ANNULEE)
  clientId, issuedAt?, dueAt?
  totalHt, totalVat, totalTtc, amountPaid
  currency ("XOF"), vatRate (18)
  object?, notes?, sourceDocument?  // chemin docs/...
  remixedFromId?      // facture source du remix
  createdById, createdAt, updatedAt
  @@map("sv_invoices")

SvInvoiceLine
  id, invoiceId, sortOrder, label, description?, qty, unitPrice, vatRate?
  @@map("sv_invoice_lines")

SvPayment
  id, invoiceId, amount, paidAt, method?, reference?, note?
  @@map("sv_payments")

SvContractMeta (léger — pas GED juridique)
  id, clientId, title, partyName?, effectiveFrom?, durationNote?
  sourceDocument?     // docs/CONTRAT...
  gedDocumentId?      // Document.id après dépôt
  notes?
  @@map("sv_contracts")
```

**Soldes (dérivés, pas colonnes inventées) :**

- `totale` = Σ `totalTtc` factures non annulées
- `paye` = Σ `amountPaid` (ou Σ paiements)
- `restant` = totale − paye
- `à venir` = factures planifiées / brouillons avec date future **ou** montants explicitement marqués (pas d’invention) — V1 : brouillons + échéances futures documentées

### Mouvements (trésorerie tampon)

```
SvCashMovement   // nom modèle technique OK ; UI = « Mouvements »
  id, movedAt, direction (IN|OUT), amount
  category, description, clientProject?, beneficiary?
  paymentMethod?, paidBy?, reference?   // MSK-yy10dd-0001
  linkedClientId?, linkedInvoiceId?     // optionnels, isolés Sv*
  createdById, createdAt
  @@map("sv_cash_movements")            // table technique ; pas de sémantique « caisse métier »
```

Solde opérations = Σ IN − Σ OUT (historique consultable). **Pas** de multi-caisses / approvisionnement / rapprochement bancaire.

### Stocks

```
SvStockItem
  id, code, family, subFamily?, label, unit
  quantity, location?, observations?
  @@map("sv_stock_items")

SvStockMovement
  id, itemId, movedAt, kind (IN|OUT|ADJUST), quantity, note?, sourceRef?
  createdById
  @@map("sv_stock_movements")
```

Un seul « entrepôt logique » (emplacements texte : Armoire 1 / 2).

### GED (réutilisation)

- Dossier client sous arborescence existante (ex. path `suivi/clients/{slug}`)
- Upload des 2 contrats + PDFs/DOCX factures fournis
- `DocumentLink` : `entityType` ∈ `sv_client` | `sv_invoice` | `sv_contract`

---

## Écrans & UX

Référence UX : `src/app/(app)/commercial/` (hub cards, clients list + `ClickableRowLink`, create séparée, loading).

### Hub `/suivi`

- Grille modules (Clients, Factures, Mouvements, Stocks) + métriques : impayés total, solde mouvements, articles stock bas (qty=0 ou seuil)
- Pattern `CommercialHubGrid` / `MetricNavCard`

### Clients

| Route | Intention |
|-------|-----------|
| `/suivi/clients` | Liste poussée : nom, contact, totale, payé, restant, nb factures ; **ligne entière cliquable** |
| `/suivi/clients/nouveau` | Création (stepper si multi-intention : identité → contact → notes) |
| `/suivi/clients/[id]` | Fiche : KPI solde/restant/à venir/totale · factures · paiements · contrats GED · CTA « Nouvelle facture (remix) » |

### Factures

| Route | Intention |
|-------|-----------|
| `/suivi/factures` | Liste filtrable (statut, client, reste > 0) |
| `/suivi/factures/nouveau` | **Remix** : choisir client → choisir facture(s) source → éditer lignes (add/remove/adjust) → récap → émettre |
| `/suivi/factures/[id]` | Détail + enregistrer paiement (modal courte) |

Remix : préremplir lignes depuis dernière facture client (ou sélection) ; validation étape par étape (`FormSteps`).

### Mouvements

| Route | Intention |
|-------|-----------|
| `/suivi/mouvements` | Registre + historique + solde · filtres date/catégorie |
| `/suivi/mouvements/nouveau` | Saisie mouvement (direction, montant, catégorie…) — mono ou mini-stepper |

Alias redirect `/suivi/caisse` → `/suivi/mouvements` optionnel si liens internes précoces.

### Stocks

| Route | Intention |
|-------|-----------|
| `/suivi/stocks` | Liste articles (code, désignation, qty, emplacement) |
| `/suivi/stocks/mouvements/nouveau` | Entrée / sortie / ajustement |
| `/suivi/stocks/[id]` (optionnel V1) | Historique mouvements article |

### Contrats sur fiche client

- Afficher métadonnées + lien ouverture GED
- V1 : dépôt seed des fichiers fournis liés au client ECOSOL / KOUNDJI ; pas d’éditeur juridique

---

## Seed (règles strictes)

Sources : [`INVENTAIRE-DOCUMENTS.md`](./INVENTAIRE-DOCUMENTS.md) + arbitrages [`DECISIONS-SEED.md`](./DECISIONS-SEED.md).

### Inclure par défaut (Fait)

- 6 clients facturés
- Factures selon décisions (priorité PDF/DOCX) + `notes` / `NEEDS_REVIEW` pour écarts Excel
- Prosperity : **FAC-122 uniquement** (pas 143)
- Ecosol 29-10 : n° **22910263**, net 413 600
- 34 mouvements OUT (dépenses quotidiennes)
- 32 articles stock (quantités fichier)
- 2 contrats (meta + fichiers GED) pour ECOSOL et KOUNDJI

### Ne pas inventer / exclure V1

- **~14 clients devis-only** + toute entité « devis » module
- FAC-143 ; ligne Excel KOUNDJI « FAC-2710261 » datée 07/10 ; FAC-153 sans fichier (reco DECISIONS-SEED)
- Entrées mouvements non documentées
- Mapping automatique achats→codes stock ; totaux achats 21 300 / 28 050 (formules fausses)
- Totaux / paiements non présents dans sources retenues

### Stratégie conflits

1. Analyser cause (documentée dans DECISIONS-SEED)
2. **Priorité fichier facture** si même pièce
3. Champ `reviewFlag` / `notes` : `NEEDS_REVIEW:<code>` — UI filtrable « À valider »

---

## Critères d’acceptation (module)

- [ ] Hub `/suivi` accessible uniquement avec `sv.access`
- [ ] Commercial terrain sans `sv.*` : pas d’entrée nav, redirect si URL directe
- [ ] Liste clients : ligne cliquable → fiche avec totale / payé / restant / à venir
- [ ] Fiche client : factures listées + contrats GED visibles pour ECOSOL & KOUNDJI seedés
- [ ] Création facture remix : lignes éditables, validation Zod, `redirect` vers fiche
- [ ] Enregistrement paiement met à jour `amountPaid` / statut PARTIELLE|PAYEE ; **peut** créer un mouvement IN lié (décision E)
- [ ] Vue « impayés » : filtre reste > 0 cohérent avec seed (ISDALINIA, Prosperity, Ecosol selon inventaire / DECISIONS-SEED)
- [ ] Mouvements : 34 sorties seedées + solde + historique ; saisie nouvelle sortie OK ; libellés ≠ « caisse métier »
- [ ] Stocks : 32 articles seedés ; mouvement ajuste quantité
- [ ] Aucune table `sv_*` exposée via PostgREST (RLS on, no open policies)
- [ ] Aucun client/montant inventé ; devis-only absents ; FAC-143 absente
- [ ] `npm run build` OK ; loading/pending conformes
- [ ] `docs/guides/SUIVI-GUIDES.md` mis à jour si guide publié

---

## Non-objectifs (rappel)

GED juridique complet · prélèvement auto · multi-entrepôts · rapprochement bancaire · intégration CRM/compta · clone Excel · sync `ComInvoice` · **devis** · **caisse métier**.

---

## Clarifications closes (Étape 0 — 2026-11-10)

**Plus de questions bloquantes** pour seed / spec V1. Détail : [`DECISIONS-SEED.md`](./DECISIONS-SEED.md) § Clarifications closes.

| # | Question | Statut |
|---|----------|--------|
| 1 | Libellé **Suivi** | **Figé** (intent) |
| 2 | 14 clients devis-only | **IGNORER V1** (décision B) |
| 3 | Excel vs PDF | **Priorité fichier facture** (décision A) |
| 4 | Arrondi ISDALINIA | **Tranché seed** : 629 386 + 1 468 566 (somme-conservant) |
| 5 | Entrées mouvements V1 | **Clos** : seed OUT only ; UI IN libre ; **miroir paiement → IN** = décision **E** |
| 6 | FAC-143 vs 122 | **122 seul** (décision D) |
| 7 | Ecosol 29-10 n° | **22910263** |
| 8 | Achats totaux / seed stock mouvements | **Analysé** — import stock mouvements **pas en V1** |
| 9 | KOUNDJI overlap sept. + paiement 117 HT vs TTC | **Clos seed** : 114 + 2710261 (`amountPaid=100000` PARTIELLE) + 167 (`paid=0`) ; flags `NEEDS_REVIEW` ; pas FAC-153 |
| 10 | Montant mensuel contrat ECOSOL (OCR) | **Clos** : re-OCR → **200 000 FCFA** ; case offre encore ambiguë (flag non bloquant) |

---

## ASSUMPTIONS (explicites)

1. Prisma 7 + tables `sv_*` dans le même schema Prisma / DB (pas de schema Postgres séparé obligatoire).
2. GED existante suffisante via `DocumentLink`.
3. Un seul taux TVA par défaut 18 % (régime ML), overridable par ligne si besoin.
4. « À venir » V1 = brouillons + factures avec `dueAt` future non soldées (**pas** de pipeline devis).
5. Le module peut être retiré plus tard sans migration automatique vers Com/Cpt.
6. Codes permission `sv.movements.*` (ou alias `sv.cash.*` le temps du rename) — UI toujours « Mouvements ».

→ Corriger avant implémentation si faux.
