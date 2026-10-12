# Plan Direction — 2 phases bout en bout (Commercial · RH)

> Issu de la réunion Direction (2026-10-11) + corrections.  
> Principe : **clarifier → découper en 2 phases complètes → approfondir, en commençant par le Commercial**.  
> Stocks / anomalies / etc. : plus tard, hors de ces 2 phases.

---

## 0. Méthode

| Étape | Contenu |
|---|---|
| A. Clarifier | Mode de travail MSK + écarts ERP actuel (ce doc) |
| B. Découper | **Phase COM** (chaîne commerciale complète) puis **Phase RH** (RH complète) |
| C. Approfondir | Spec détaillée **par phase**, gate humaine avant code |
| D. Implémenter | Bout en bout, aligné méthode MSK — pas de demi-module |

**Règle fichier CRM :** s’appuyer sur Excel/SharePoint (champs, statuts, habitudes) + **données migrées** — **améliorer** l’UX / les flux (pas reproduite bêtement).

---

## 1. Vision des 2 phases

```
PHASE COMMERCIAL — COMPLÈTE BOUT EN BOUT (priorité 1)
  Suivi prospects (Excel MSK)  →  Client  →  Catalogue / prix  →  Devis  →  Facture  →  Paiement / finance
  (+ docs GED, responsables, import, tableau de bord, équipe, rapport semaine)
  NB : « CRM » dans les specs = tranche *suivi* de CETTE phase — pas un module isolé.
  Phase COM OK seulement quand TOUTE la chaîne l’est.

PHASE RH (priorité 2 — après COM OK)
  Collaborateur / espace  →  Contrats  →  Congés & absences  →  Paie paramétrable  →  Docs & signatures
  (+ INPS / déclarations, départ)
```

Les deux phases doivent **couvrir tout** le périmètre métier retenu en réunion, pas un MVP tronqué.

---

## 2. Phase COMMERCIAL — couverture complète (cadrage)

### 2.1 Objectif métier

Un commercial MSK travaille **comme avec le fichier CRM**, en mieux : une seule chaîne du premier contact jusqu’à l’encaissement, sans Excel / SharePoint pour le quotidien.

### 2.2 Périmètre à couvrir (checklist)

#### A. CRM (cœur)
- [x] Menu `/commercial` (cartes) + sidebar unique + tabs filtrées (Menu · Tableau de bord · …)
- [x] Fiche / liste prospects + Par étapes dans Prospects ; filtres modal
- [x] Statuts LISTES FR (Négociation masquée) ; Suivi par / droits team|own
- [x] Relances groupées + règles GUIDE (CRM-2)
- [x] Vue Équipe (lead) + KPI radiaux sur Prospects (collab own) ; Rapport auto (CRM-6/7)
- [x] Import CSV robuste (CRM-3) — max 400, dédup, en-têtes auto
- [x] Tableau de bord KPI + charts (CRM-5) + scripts (CRM-4)
- [x] Pont devis 24h / fiche (CRM-8 v1) ; multi-offres opportunité
- [x] Plancher catalogue `floorPriceXof` (COM-5 amorcé)
- [x] Fixtures `[TEST]` + badge UI

#### B. Lien CRM ↔ documentaire
- [x] Nav chaîne Commercial (hub)
- [~] Conversion prospect → client (base)
- [~] Devis liés sur fiche — urgence devis 24h à durcir

#### C. Catalogue & prix
- [x] Catalogue offres (base)
- [ ] Plancher prix

#### D. Devis · Factures · Paiements · Finance
- [x] Devis / factures / paiements + PDF Voir/Télécharger (Phase 3)
- [~] Bridge compta (existant partiel)
- [~] Signatures par document

#### E. Hors phase COM (reporté)
- Stocks, anomalies, WhatsApp API, cron digests avancés, multi-échéances complexes

### 2.3 Critère « Phase COM OK »

> Un commercial MSK gère **toute** la chaîne **sans Excel** : suivi prospects (fiche, relances, scripts, équipe, rapport) → client → devis → facture → paiement — et Direction voit indicateurs + docs. Données historiques présentes. Plancher prix respecté. **Suivi seul ≠ phase OK.**

---

## 3. Phase RH — couverture complète (cadrage, après COM)

### 3.1 Objectif métier

Collaborateur et RH travaillent avec un **espace clair**, des **docs bien rangés**, des **congés/absences corrects**, une **paie paramétrable** (congés, avantages, cotisations, primes, mutuelle, nourriture…).

### 3.2 Périmètre à couvrir (checklist)

- [ ] Fiche collaborateur + **Mon espace** (rangement, docs, absences/congés)
- [ ] Contrats typés par métier + zones variables + PDF / signature gérable
- [ ] Congés & absences **repris** (types métier, validation, soldes, lien absences)
- [ ] Paie : éléments **ajoutables / retirables** ; primes gérables ; prorata arrivée
- [ ] INPS / déclarés vs non déclarés
- [ ] Docs entrée–sortie (règlement, bulletins, solde de tout compte…)
- [ ] Départ : coupure d’accès + suite documentaire

### 3.3 Critère « Phase RH OK »

> RH ouvre une période, produit un bulletin cohérent avec avantages/cotisations ; collab voit ses docs et demande un congé validé avec solde juste.

---

## 4. Approfondissement — on commence par le COMMERCIAL (CRM d’abord)

> **Spec CRM détaillée :** [`SPEC-CRM-MSK-COMPLET.md`](./SPEC-CRM-MSK-COMPLET.md)  
> Analysé depuis Excel (GUIDE, PROSPECTS, TABLEAU BORD, SUIVI ÉQUIPE, SCRIPTS, LISTES, Rapport hebdo) + PDF + captures.  
> Phase RH : même niveau de détail **après** gate CRM/COM.

### 4.1 Référentiels MSK (sources de vérité)

| Source | Usage |
|---|---|
| `docs/CRM_Prospection_MSK.xlsx` (+ PDF / captures) | **Tout** le CRM métier : listes, prospects, bord, équipe, scripts, rapport |
| Méthode Madina / Mathieu / Fatoumata | Multi-commerciaux réel (~342 prospects) |
| GUIDE Excel | Règles (relance obligatoire, 3 relances, devis 24h, revue vendredi…) |
| Réunion Direction 11/10 | Améliorer sans copier bêtement ; chaîne CRM↔commercial |

### 4.2 Couverture CRM à atteindre (résumé)

1. **Liste + fiche** = colonnes PROSPECTS (+ secteur, web, devis liés)  
2. **Statuts / sources** = LISTES Excel (libellés FR exacts)  
3. **Règles GUIDE** encodées (date relance, retards, 3 relances → PERDU…)  
4. **Scripts** parité onglet SCRIPTS  
5. **Tableau de bord** KPI + **charts pro** (funnel, area, bar, radial)  
6. **Vue Équipe** (lead) / KPI perso sur Prospects (collab)  
7. **Rapport** (vendredi) chiffres auto + qualitatif  
8. **Import** fichier Oct 2026  
9. **Pont CLIENT → devis/facture** (suite lots COM)  
10. **UI / flows** : sous-nav CRM, fiche 360°, kanban, parcours quotidiens sans friction — niveau Attio/Pipedrive, charte MSK, stack [shadcn Charts](https://ui.shadcn.com/docs/components/base/chart)

Détail : [`SPEC-CRM-MSK-COMPLET.md`](./SPEC-CRM-MSK-COMPLET.md) — §9 UI/parcours/charts, lots **CRM-0 → CRM-UX → CRM-8**.

### 4.3 Découpage d’implémentation COM

| Lot | Nom | Contenu |
|---|---|---|
| **CRM-0…CRM-8** | CRM complet | Voir [`SPEC-CRM-MSK-COMPLET.md`](./SPEC-CRM-MSK-COMPLET.md) §9 |
| **COM-4** | Chaîne documentaire | Naming / nav ; client → devis → facture → paiement |
| **COM-5** | Catalogue & plancher | Prix min ; offres |
| **COM-6** | Finance bridge | Remontée compta + GED |
| **COM-7** | Polish Direction | Smoke E2E + revue |

**Ordre :** terminer le **CRM** (CRM-0→8) avant d’élargir devis/facture — la Direction a priorisé un CRM fidèle et complet.

**Discipline technique :** [`REGLES-EVOLUTION-CRM.md`](./REGLES-EVOLUTION-CRM.md) — keep / change / **break** (remontée décision) / wipe ; UI avant migration quand possible ; oser refaire ce qui est mal conçu **après GO clair** ; gate tests sur tout le périmètre touché.

**Naming docs :** `SPEC-CRM-*` = détail tranche suivi ; le cadrage global reste **Phase COMMERCIAL complète** (ce fichier §2).  
**Flow UI / qui voit quoi :** [`FLOW-COMMERCIAL-E2E.md`](./FLOW-COMMERCIAL-E2E.md) — sidebar unique, indicateurs **live**, vocabulaire Suivi par / Créé par / Responsable (rôle).

### 4.4 Décisions CRM verrouillées (détail spec §12)

1. Vocabulaire clair (pas « pipeline / owner » en UI)  
2. **Négociation** masqué — déjà géré via Devis envoyé + journal + relances  
3. Cards bord = 7 statuts ; option « En échange » = Contacté + En cours  
4. Devise **paramétrable** ; objectifs collab **et** équipe **paramétrables**  
5. Équipe ouverte : voir / reprendre les dossiers des autres  
6. 0 `<select>` natif → Choice cards / Combobox  
7. Liste = colonnes essentielles ; détail en fiche  

Reste à trancher côté COM doc : naming menus Commercial ; **plancher prix**.

### 4.5 Hors scope strict Phase COM

WhatsApp Business API · Stocks · RH/paie · Anomalies · Cron digests avancés · Éditeur gabarit drag-and-drop.

---

## 5. Séquence globale

```
Maintenant
  ├─ Valider ce plan (clarification OK ?)
  ├─ Verrouiller décisions §4.4
  └─ GO COM-1 … COM-7 (phase Commercial complète)
Puis
  └─ Spec Phase RH (même niveau de détail) → GO lots RH
```

---

## 6. Prochaine action

1. **Valider** ce document (surtout §2 couverture COM + §4.3 lots + §4.4 décisions).  
2. Dire **« COM-1 GO »** pour démarrer l’approfondissement / implémentation fiche CRM.  
3. Fichier Excel CRM reste la référence métier — on **améliore** dans l’ERP, on ne le clone pas pixel à pixel.

---

*Document vivant — à mettre à jour à chaque gate de lot.*
