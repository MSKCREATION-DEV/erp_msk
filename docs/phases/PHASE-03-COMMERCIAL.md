# Phase 3 — Commercial documentaire (Clients · Devis · Factures · Paiements) — **URGENT**

> Plan de phase dédié.  
> Prérequis : **Phase 2 OK** (2026-10-09).  
> Branche de travail : **`dev`**.  
> Priorité : COM / cash — [PRIORITES.md](./PRIORITES.md).  
> CDC : §6 Commercial + permissions `com.*`.

## Statut

| Étape | État |
|---|---|
| Plan rédigé | Oui — 2026-10-09 |
| Validation « Phase 3 GO » | **En attente** |
| Implémentation | Non démarrée |
| Gate technique | — |
| Gate Phase 3 OK (humaine) | — |

## Règle de gate

1. Plan validé (« Phase 3 GO ») ← **attendre validation humaine**  
2. Implémentation complète de **ce** plan seulement  
3. Tests / vérifications (`build`, lint, gate, smoke UI)  
4. Validation « Phase 3 OK »  
5. Seulement ensuite → Phase 4 (RH) **ou** accélération Phase 6 Compta selon priorité cash (PRIORITES)

## Objectif

Passer du CRM (pipeline) au **cycle cash documentaire** :

```
Opportunité Gagné → Client COM → Devis (PDF + GED) → Facture → Paiement
```

Un commercial peut convertir un deal gagné, produire un devis charte MSK (lignes catalogue), l’émettre, le convertir en facture, enregistrer un paiement — sans Excel / Word hors ERP.

## Hors scope (strict — Phase 3.x / 6+)

| Reporté | Phase cible |
|---|---|
| Écritures comptables SYSCOHADA complètes (journaux VE, clôture) | Phase 6 |
| Relances factures cron e-mail J+7/15/30 | 3.x / 8 |
| Couplage stock / SORTIE articles | Phase 7 |
| Éditeur gabarit drag-and-drop | 3.x+ |
| Avoirs complexes / facturation partielle multi-échéances avancées | 3.x |
| e-sign qualifiée eIDAS | Phase 8 |
| UI corbeille GED / ACL nominatif | 1.x |

## Décisions verrouillées (MVP Phase 3)

| Sujet | Valeur |
|---|---|
| Devise défaut | **FCFA (XOF)** — option **EUR** si régime FR sur le document |
| TVA | **ML 18 %** (défaut) · **FR 20 %** si régime FR · exonération possible (toggle) |
| Numérotation | `DEV-YYYY-####` · `FAC-YYYY-####` (séquences CFG / année) |
| Devis → PDF | Réutiliser moteur `pdf-lib` Phase 1 + signature ACTIVE |
| Classement | PDF devis/facture → GED sous dossier client année N |
| Conversion CRM | Étape **Gagné** → action « Créer / lier Client » + « Créer devis » prérempli |
| Déplacement | Toggle devis « Inclure frais de déplacement » (lignes optionnelles) |
| Paiements | Espèces · Virement · Mobile Money · Autre — pas de PSP encore |
| UI | list/create séparés · `backHref` · `loading.tsx` · pending anti-freeze |
| Permissions | Étendre packs `commercial` / `admin_crm` / `direction` (`com.clients.*`, `com.factures.*`, `com.paiements.*`) |

## Livrables (checklist — à cocher à l’implémentation)

### Données
- [ ] Modèles Prisma : `ComClient`, `ComQuote` (+ lines), `ComInvoice` (+ lines), `ComPayment`
- [ ] Lien `opportunityId` / `organizationId` CRM → client
- [ ] Régime documentaire `ML` \| `FR` + devise + taux TVA
- [ ] Séquences numérotation année

### Clients
- [ ] Liste `/commercial/clients` + `/nouveau` + fiche `[id]`
- [ ] Création directe + conversion depuis opportunité Gagné
- [ ] Contacts / notes / préférence déplacement défaut

### Devis
- [ ] Liste `/commercial/devis` + `/nouveau` + `[id]` + edit
- [ ] Lignes catalogue (SKU) + saisie libre
- [ ] Toggle TVA / promo / déplacement
- [ ] Statuts : Brouillon → Envoyé → Accepté / Refusé / Expiré / Annulé
- [ ] Génération PDF + dépôt GED client
- [ ] Création depuis opportunité (préremplissage)

### Factures & paiements
- [ ] Liste `/commercial/factures` + création depuis devis (1 clic)
- [ ] Statuts : Brouillon → Émise → Partiellement payée → Payée → Annulée
- [ ] Enregistrement paiement(s) sur facture
- [ ] PDF facture + GED

### Nav / RBAC / UX
- [ ] Nav Commercial (plus « bientôt »)
- [ ] Permissions `com.clients.*`, `com.devis.*`, `com.factures.*`, `com.paiements.record`
- [ ] `loading.tsx` / pending / list-create / backHref
- [ ] `gate:phase3` + smoke UI parcours clients → devis → facture → paiement

## Gate humaine (après implémentation)

| # | Parcours | Critère |
|---|---|---|
| 1 | Conversion | Deal Gagné → Client créé / lié |
| 2 | Devis | Créer devis avec lignes catalogue ; PDF GED |
| 3 | Statuts | Envoyer / accepter un devis |
| 4 | Facture | Convertir devis → facture émise + PDF |
| 5 | Paiement | Enregistrer un paiement partiel puis solde |
| 6 | Régime | Au moins un devis ML (XOF, TVA 18 %) OK |
| 7 | Droits | Commercial `own` ; Admin/Direction vue élargie |

## Critères d’acceptation

Un commercial convertit un prospect gagné en client, émet un devis PDF charte MSK classé en GED, le transforme en facture, enregistre un paiement. Aucune compta SYSCOHADA complète (Phase 6). Pas de stock (Phase 7).

## Après validation du plan

Répondre : **« Phase 3 GO »** → démarrage implémentation sur `dev`.

---

## Validation historique

- Plan ouvert — 2026-10-09 (après Phase 2 OK).
