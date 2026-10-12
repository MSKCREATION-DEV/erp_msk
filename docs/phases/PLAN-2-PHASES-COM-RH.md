# Plan Direction — 2 phases bout en bout (Commercial · RH)

> Issu de la réunion Direction (2026-10-11) + corrections.  
> Principe : **clarifier → découper en 2 phases complètes → approfondir**.  
> **État 2026-10-12 :** Phase COMMERCIAL (CRM + COM-4…7) **livrée** sur `dev` / `main`.  
> Stocks / anomalies / etc. : hors de ces 2 phases (déjà partiellement en phases 7A/7B).

---

## 0. Méthode

| Étape | Contenu | Statut |
|---|---|---|
| A. Clarifier | Mode de travail MSK + écarts ERP | **Fait** |
| B. Découper | Phase COM puis Phase RH | **Fait** |
| C. Approfondir | Spec détaillée par phase | COM **fait** · RH **à faire** |
| D. Implémenter | Bout en bout + gate | COM **fait** · RH **suivant** |

**Règle fichier CRM :** s’appuyer sur Excel/SharePoint + données migrables — **améliorer** l’UX / les flux (pas reproduite bêtement).

---

## 1. Vision des 2 phases

```
PHASE COMMERCIAL — COMPLÈTE BOUT EN BOUT     ✅ LIVRÉE (2026-10-12)
  Suivi prospects  →  Client  →  Offres / plancher  →  Devis  →  Facture  →  Paiement
  → Bridge compta VE (facture) + GED PDF
  Reporté optionnel : paiement → journal BQ

PHASE RH (priorité 2 — APRÈS COM)            ⏳ SUIVANT
  Collaborateur / espace  →  Contrats  →  Congés & absences  →  Paie paramétrable  →  Docs & signatures
  (+ INPS / déclarations, départ)
```

---

## 2. Phase COMMERCIAL — couverture (état)

### 2.1 Objectif métier

Un commercial MSK travaille **comme avec le fichier CRM**, en mieux : une seule chaîne du premier contact jusqu’à l’encaissement, sans Excel / SharePoint pour le quotidien.

### 2.2 Checklist

#### A. CRM (cœur) — ✅
- [x] Menu `/commercial` (cartes) + tabs filtrées (Menu · Tableau de bord · …)
- [x] Fiche / liste prospects + Par étapes (`?vue=etapes`) ; filtres modal
- [x] Statuts LISTES FR (Négociation masquée) ; Suivi par / droits team|own|global
- [x] Relances groupées + règles GUIDE
- [x] Vue Équipe (lead) + KPI radiaux sur Prospects (collab own) ; Rapport auto
- [x] Import CSV robuste (max 400, dédup)
- [x] Tableau de bord KPI + charts + scripts
- [x] SLA devis 24h (`interestedAt`) ; multi-offres opportunité
- [x] Fixtures `[TEST]` + badge UI

#### B. Lien CRM ↔ documentaire — ✅
- [x] Conversion client dès **Intéressé** (+ CTA Client + devis)
- [x] Devis prérempli depuis offres CRM ; sync statut **Devis envoyé**
- [x] Filtre `/crm/prospects?devisRetard=1`

#### C. Catalogue & prix — ✅
- [x] Offres `/catalogue` (titre Offres, breadcrumbs Commercial)
- [x] Plancher `floorPriceXof` — UI + garde serveur XOF

#### D. Devis · Factures · Finance — ✅ (slice)
- [x] Devis / factures / paiements + PDF Voir/Télécharger
- [x] Bridge compta facture → VE (file, liens, revalidation, KPI)
- [x] Signature PDF = **owner** commercial ; PDF après émission
- [ ] Bridge paiement → BQ — **reporté** (optionnel, non bloquant Phase COM)

#### E. Hors phase COM
- Stocks, anomalies, WhatsApp API, cron digests avancés, multi-échéances complexes

### 2.3 Critère « Phase COM OK »

> Un commercial MSK gère **toute** la chaîne **sans Excel** : suivi → client → devis → facture → paiement — Direction voit indicateurs + docs. Plancher respecté. Bridge VE opérationnel.

**Verdict :** critère atteint pour le quotidien MSK. Paiement→BQ = amélioration compta optionnelle.

### 2.4 Docs de référence COM

| Doc | Rôle |
|---|---|
| [`FLOW-COMMERCIAL-E2E.md`](./FLOW-COMMERCIAL-E2E.md) | Nav, personas, parcours |
| [`SPEC-CRM-MSK-COMPLET.md`](./SPEC-CRM-MSK-COMPLET.md) | Spec suivi / Excel |
| [`REGLES-EVOLUTION-CRM.md`](./REGLES-EVOLUTION-CRM.md) | Discipline keep/change/break + gate |

### 2.5 Lots livrés

| Lot | Contenu | Gate |
|---|---|---|
| CRM-0…8 + UX2/UX3 | Suivi complet + Menu / Tableau de bord | **Fait** |
| COM-4 | Intéressé → client → devis | **Fait** |
| COM-5 | Plancher prix | **Fait** |
| COM-6 | Bridge facture → VE + GED | **Fait** |
| COM-7 | Polish Direction (colonne Compta, KPI file, signature) | **Fait** |

Commits repères : `d9cb98f` (CRM E2E) · `554f109` (COM-4/5) · `69da6c9` (COM-6/7).

---

## 3. Phase RH — couverture complète (cadrage, **suivant**)

### 3.1 Objectif métier

Collaborateur et RH travaillent avec un **espace clair**, des **docs bien rangés**, des **congés/absences corrects**, une **paie paramétrable** (congés, avantages, cotisations, primes, mutuelle, nourriture…).

> Note : Phases 4/5 ont déjà livré une base RH/paie — la Phase RH Direction = **reprise / alignement métier** (réunion 11/10), pas un greenfield.

### 3.2 Périmètre à couvrir (checklist)

- [ ] Fiche collaborateur + **Mon espace** (rangement, docs, absences/congés) — *reprise UX*
- [ ] Contrats typés par métier + zones variables + PDF / signature **gérable par doc**
- [ ] Congés & absences **repris** (types métier, validation, soldes)
- [ ] Paie : éléments **ajoutables / retirables** ; primes ; prorata arrivée
- [ ] INPS / déclarés vs non déclarés
- [ ] Docs entrée–sortie (règlement, bulletins, solde de tout compte…)
- [ ] Départ : coupure d’accès + suite documentaire

### 3.3 Critère « Phase RH OK »

> RH ouvre une période, produit un bulletin cohérent ; collab voit ses docs et demande un congé validé avec solde juste.

### 3.4 Prochaine action RH

1. Rédiger **SPEC-RH-MSK** (même niveau que SPEC-CRM) à partir de la synthèse Direction + manuels 09/10.  
2. Matrice Keep / Change / Break sur l’existant Phase 4/5.  
3. GO lots RH après validation Direction.

---

## 4. Décisions COM verrouillées (rappel)

1. Vocabulaire clair (pas « pipeline / owner » en UI) — **Suivi par** / **Créé par**  
2. **Négociation** masqué  
3. Cards = 7 statuts  
4. Devise paramétrable ; objectifs collab **et** équipe  
5. Vue Équipe pour lead ; KPI perso pour collab own  
6. Choice cards / pickers (éviter selects natifs sur CRM)  
7. Liste courte / fiche profonde  
8. Plancher prix XOF obligatoire sur lignes catalogue  
9. Client commercial dès **Intéressé** (pas seulement Client/Gagné)

---

## 5. Séquence globale (à jour)

```
✅ Clarifier + verrouiller décisions COM
✅ GO CRM-0…8 + UX + COM-4…7
✅ Push dev + main (deploy Vercel)
⏳ Retours terrain Commercial (polish)
→ Spec Phase RH + GO lots RH
→ (Optionnel) Bridge paiement → BQ
→ Phase 8 Automatisations (si GO)
```

---

## 6. Prochaine action

1. **Terrain Commercial** : parcours hub carte par carte avec Madina / Mathieu / Fatoumata.  
2. Dire **« RH GO »** / **« SPEC-RH GO »** pour démarrer l’approfondissement RH.  
3. Ne pas rouvrir le schéma COM sans fiche Break ([`REGLES-EVOLUTION-CRM.md`](./REGLES-EVOLUTION-CRM.md) §0bis).

---

*Document vivant — maj 2026-10-12 (Phase COM livrée).*
