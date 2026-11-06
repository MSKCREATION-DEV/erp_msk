# Recap & checklist de test — Client / Contrat (P0 → P4)

**Date :** 2026-11-06  
**Objectif :** valider manuellement après déploiement le lot Prospect → Devis → Client → Contrat (wizard unifié, données honnêtes, PDF GED).  
**Référence produit :** [`PLAN-CLIENT-CONTRAT.md`](./PLAN-CLIENT-CONTRAT.md) · [`ANALYSE-MODELES-CONTRATS.md`](./ANALYSE-MODELES-CONTRATS.md)

---

## 1. Décisions produit à garder en tête (Q1–Q3)

| # | Décision | Comportement attendu en test |
|---|----------|------------------------------|
| **Q1** | Conversion client = acte **délibéré** | Aucun passage en **Gagné** ni création « client complet » **uniquement** parce qu’on ouvre ou crée un **devis**. Le parcours « client complet » (stepper) se termine par un **submit** au récap — pas un simple clic isolé. **À la validation finale** du stepper depuis un prospect, le deal CRM passe en **Gagné** (acte explicite de fin de parcours), sauf s’il l’était déjà avec `wonAt`. |
| **Q2** | **Une seule route** de création riche | `/commercial/clients/nouveau` (avec ou sans `?opportunityId=`) = **même** stepper (Identité → … → Récap). |
| **Q3** | Composition unique | Si un devis est **accepté**, l’étape Composition peut être **préremplie** mais **éditable**. Le contrat consomme cette shape ; pas de second modèle parallèle. |

**Permissions utiles :** `com.clients.manage`, `com.contrats.manage`, `crm.prospect.*`, `com.devis.create` selon parcours.

---

## 2. Ce qui a livré par phase (vue utilisateur)

### P0 — Hotfixes flux prospect / devis

- **Créer un devis** sur un prospect **Intéressé** prépare une fiche client **brouillon / liée** (`ensureProspectClientDraftForQuoteAction`) **sans** imposer le statut pipeline **Gagné** pour permettre la création du devis.
- **Transformer en client** est un CTA **séparé** ; avec les documents dégelés (`COM_DOCS_GATED=false`), il envoie vers le **stepper** `/commercial/clients/nouveau?opportunityId=…` (pas une conversion serveur immédiate au clic).
- Tentative de passer manuellement le deal en **Gagné** **sans** client lié : doit être **refusée** (cohérence badge / données).

### P1 — Liaison CRM ↔ client

- Copie enrichie (secteur, site, rôle contact…) quand le contexte vient du CRM.
- Fiche client : timeline mélange **événements client** et **activités CRM** du prospect (quand il y a un trail).
- **Anti-doublon** à la création directe : alerte si nom proche d’un client existant.

### P2 — Stepper unique (`ClientWizardForm`)

Six étapes **FormSteps** : Identité → Contact → Origine → **Composition** → **Conditions contrat** → **Récap**.

- Entrée **depuis prospect** : champs préremplis, titre « Transformer en client », retour prospect.
- Entrée **directe** : Commercial → Clients → **Nouveau client** (ou URL directe).

### P3 — Contrat « honnête »

- Nouveau contrat créé par le wizard ou depuis **Créer contrat** (devis accepté) : statut **Brouillon**, **pas** de `signedAt` automatique.
- **Signer et activer le contrat** (Brouillon → Actif) : confirmation ; **seul** cet acte pose la **date de signature** (`signedAt`). Autres transitions (suspendre, résilier…) ne doivent pas « inventer » une signature.

### P4 — PDF & GED

- Gabarit PDF contrat **famille A** (prestation / abonnement) vs **B** (engagement / CDC) selon les champs `family` × `serviceKind`.
- **Générer PDF** sur la fiche contrat : génère le fichier, l’**upload** en GED (dossier client **Contrats**), pose `gedDocumentId` — **idempotent** (regénérer si bouton encore visible selon état).
- Numérotation **MSK-CONTRAT-YYYY-NNN** pour les nouveaux contrats.

---

## 3. Routes et actions à cliquer (repères)

| Intention | Où cliquer |
|-----------|------------|
| Liste prospects | Sidebar **Commercial** → carte **Prospects** ou `/crm/prospects` |
| Fiche prospect | `/crm/prospects/[id]` — zone CTAs : **Transformer en client**, **Créer un devis** |
| Wizard client (depuis prospect) | CTA **Transformer en client** → `/commercial/clients/nouveau?opportunityId=…` |
| Wizard client (direct) | `/commercial/clients` → **Nouveau** → `/commercial/clients/nouveau` |
| Fiche client | `/commercial/clients/[id]` — contrats, devis, GED |
| Devis | `/commercial/devis/[id]` — statuts, **Créer contrat** si accepté |
| Contrat | `/commercial/contrats/[id]` — **Générer PDF**, **Signer et activer le contrat**, aperçu GED |
| Guides | `/guides` → **Transformer un prospect en client** (`crm-transformer-client`) |

---

## 4. Invariants données / métier (à vérifier systématiquement)

1. **Pas de Gagné silencieux** : après **Créer un devis** seul, le prospect n’est **pas** automatiquement en **Gagné** (sauf action manuelle ultérieure explicite qui respecte les gardes).
2. **Brouillon client pour devis** : le chemin devis peut créer/réutiliser un `ComClient` **minimal** lié à l’org / opportunité — ce n’est **pas** le parcours « client + contrat » complet du stepper.
3. **`signedAt` uniquement sur activation** : contrat nouveau = **Brouillon** et `signedAt` vide ; après **Signer et activer** = **Actif** + `signedAt` renseigné.
4. **PDF GED** : après **Générer PDF**, présence d’un document dans le dossier client (Contrats) et `gedDocumentId` non vide sur le contrat (visible indirectement via miniature / lien si UI l’expose).
5. **Devis accepté → composition** : si le stepper est ouvert avec un devis **ACCEPTE** lié à l’opportunité, l’étape Composition est alimentée ; modification possible avant validation.
6. **Numéro contrat** : format **MSK-CONTRAT-**… cohérent avec la séquence annuelle.

---

## 5. Scénarios de test détaillés

### A. Prospect **Intéressé** → devis (sans transformation client complète)

1. Créer ou ouvrir un prospect au stade **Intéressé**.
2. Cliquer **Créer un devis** → la modale s’ouvre après **Préparation…** (pending visible).
3. Valider la création du devis.
4. **Contrôles :** le deal **n’est pas** passé **Gagné** seul à cause du devis ; le devis est lié ; une fiche client **brouillon** peut exister pour la compta du devis — c’est attendu (P0).

### B. **Transformer en client** via stepper (depuis prospect)

1. Prospect **Intéressé** (ou **Devis envoyé** / **Négociation** mappée UI selon les règles du CTA).
2. **Transformer en client** → arriver sur le stepper avec titre **Transformer en client**.
3. Parcourir les 6 étapes ; vérifier préremplissage identité/contact ; soumettre au **Récap**.
4. **Contrôles :** redirection vers fiche client ou contrat selon implémentation ; au moins un **contrat en Brouillon** ; journal CRM conservé ; **l’opportunité passe en Gagné** avec `wonAt` si ce n’était pas déjà le cas (effet attendu du **submit** final du stepper).

### C. Création directe **/commercial/clients/nouveau**

1. **Clients** → **Nouveau client** (pas de `opportunityId`).
2. Saisir identité + contact + composition (lignes obligatoires) + conditions (famille A ou B, nature de prestation).
3. **Contrôles :** même structure de fin qu’en B ; anti-doublon si nom proche d’un existant.

### D. Devis **accepté** → **Créer contrat**

1. Ouvrir un devis **Accepté** (`/commercial/devis/[id]`).
2. **Créer contrat**.
3. **Contrôles :** contrat **Brouillon**, lignes alignées sur le devis ; **pas** de `signedAt` ; lien devis visible sur la fiche contrat.

### E. **Activer** le contrat (signature explicite)

1. Sur `/commercial/contrats/[id]` en **Brouillon**.
2. **Signer et activer le contrat** → confirmer.
3. **Contrôles :** statut **Actif** ; `signedAt` présent ; message / audit cohérents.

### F. **Générer PDF** — familles **A** et **B**

1. Créer ou choisir un contrat avec **famille** = *Prestation / abonnement* (A) et **nature** (ex. réseaux sociaux) — puis **Générer PDF**.
2. Reproduire avec **famille** = *Engagement / CDC* (B) et périmètre (champs liste du wizard pour le CDC).
3. **Contrôles :** fichier lisible, charte MSK (en-tête / pied), contenu différencié A vs B ; document présent côté GED client ; second clic idempotent ou absence de doublon selon UI.

---

## 6. Dette connue / ne pas attendre encore

- **Annexes automatiques** (devis / CGV) dans le PDF contrat : pas garanties dans cette livraison.
- **E-signature** tierce : non — **MVP** = tampon / date sur PDF + activation métier dans l’ERP.
- **Picker catalogue** avancé dans l’étape Composition : UX encore rudimentaire (lignes + offres possibles, pas un module catalogue complet).
- **Parcours navigateur complet** « Générer PDF » jusqu’au storage réel : à valider sur **environnement déployé** avec GED configurée (changelog §8 signale prudence si non rejoué sur une base réelle).
- Guide centre **`crm-transformer-client`** : statut **`to_validate`** — le texte peut être à jour mais **pas** marqué validé terrain.

---

## 7. Post-déploiement technique (rappel)

- Le build applique les migrations (`npm run build` inclut `prisma migrate deploy`). Vérifier que la migration `20261106140000_com_contract_family_composition` est bien passée en prod.
- Tests automatisés associés : `npm run test:pdf-contract`, `npm run test:com-docs`, `npm run test:commercial` (en CI ou localement avant gate).
