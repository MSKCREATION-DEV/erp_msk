# LOT-B — Commentaire obligatoire au passage « Contacté »

**Statut :** **LOT-B OK** (2026-10-14) — build + tests unitaires OK ; smoke UI terrain recommandé  
**Priorité :** P0 Direction (cas Madina)  
**Prérequis :** LOT-A OK  
**Migrations :** aucune  
**Verdict :** Change (UI + validation serveur + journal)

### Dette UX (après LOT-B — ne pas faire dans ce lot)

| Item | Action | Pourquoi |
|------|--------|----------|
| Libellé `QUALIFICATION` | Passer à **« En discussion »** (+ courte aide / tooltip sur fiche et picker) | Statut peu compris en terrain ; Direction / Samba veulent plus de clarté pour toute l’équipe |

Reporter dans un lot UX ultérieur (ex. polish P2 / LOT-I) — **pas** dans LOT-B.

Réf. métier : [`rapport-reunion-direction-demo-erp-2026-10-13.md`](../rapport-reunion-direction-demo-erp-2026-10-13.md) §3.8  
Réf. analyse : [`ANALYSE-POST-DEMO-DIRECTION-2026-10-13.md`](./ANALYSE-POST-DEMO-DIRECTION-2026-10-13.md) §2.2

---

## 1. Problème métier

Aujourd’hui un commercial peut passer un prospect en **Contacté** sans laisser de trace de :

- **comment** on a contacté (appel, WhatsApp, Instagram…) ;
- **ce qui a été dit** / échangé ;
- ou **« pas de réponse »**.

Direction (Mathieu) : champ **obligatoire / bloquant** (rouge) — discipline terrain.

---

## 2. Comportement actuel (à modifier)

| Couche | Fichier | Comportement |
|--------|---------|--------------|
| UI | [`src/components/crm/stage-form.tsx`](../../src/components/crm/stage-form.tsx) | Picker statut ; bloc Perdu uniquement ; **pas** de zone commentaire Contacté |
| Action | [`src/actions/crm.ts`](../../src/actions/crm.ts) → `updateOpportunityStageAction` | GUIDE : date de relance si `followUpRequiredForStage` ; **pas** de texte obligatoire pour CONTACTE |
| Journal | `logActivityAction` | Existe à part — pas déclenché au change de statut |

---

## 3. Comportement cible (concret)

### 3.1 Quand le commercial choisit le statut « Contacté »

Dans la modale **Changer le statut** (`StageForm`) :

1. Afficher un bloc dédié (même esprit que le bloc Perdu) :
   - **Canal** (select obligatoire) : Appel · WhatsApp · Instagram · LinkedIn · E-mail · Autre  
     → mappe vers `CrmActivityType` (`APPEL`, `WHATSAPP`, `INSTAGRAM`, `LINKEDIN`, `EMAIL`, `AUTRE`)
   - **Commentaire** (textarea obligatoire, `FieldLabel required` coral)  
     Placeholder type : « Ex. Appelé ce matin, intéressée par le pack RS, rappeler vendredi · ou : pas de réponse »
2. Bouton **Enregistrer le statut** reste `disabled` + pending via `usePendingAction`.
3. Validation **client** : si canal ou commentaire vide → message erreur, pas d’appel serveur.
4. Validation **serveur** (Zod) : même règles — impossible de contourner via FormData manipulée.

### 3.2 Ce que fait le serveur (une seule mutation)

Dans `updateOpportunityStageAction`, **si** `stage === CONTACTE` **et** le stage précédent n’était pas déjà CONTACTE :

1. Lire `contactChannel` + `contactComment` (noms FormData à figer).
2. Refuser si manquants / trop courts (`min(10)` caractères sur le commentaire — à confirmer, défaut 10).
3. Transaction Prisma :
   - `crmOpportunity.update` (stage = CONTACTE, comme aujourd’hui) ;
   - `crmActivity.create` : type = canal, `summary` court (« Passage en Contacté »), `body` = commentaire, `actorId` = user, `opportunityId` / org liés ;
   - éventuellement `lastActivityAt = now`.
4. `writeAudit` : `crm.stage.contacte` + metadata `{ channel, opportunityId }`.
5. `revalidatePath` fiche + liste CRM.

Si le prospect **était déjà** CONTACTE et on « ré-enregistre » Contacté : **pas** de second commentaire forcé (seulement si transition *vers* Contacté).

### 3.3 Autres statuts

- **NOUVEAU, QUALIFICATION, INTERESSE, DEVIS_ENVOYE, GAGNE** : inchangés (pas de commentaire Contacté).
- **PERDU** : motif inchangé.
- GUIDE relance (`followUpAt`) : **conservé** — le commentaire Contacté ne remplace pas la date de relance. Si pas de `followUpAt`, le message GUIDE actuel reste.

### 3.4 Hors scope LOT-B

- Édition fiche prospect (LOT-C)
- Commentaire obligatoire sur QUALIFICATION / INTERESSE
- Import CSV rétroactif
- Changer le modèle de droits / affectation (LOT-E)

---

## 4. Fichiers touchés (prévision)

| Fichier | Change |
|---------|--------|
| [`src/components/crm/stage-form.tsx`](../../src/components/crm/stage-form.tsx) | Bloc canal + commentaire si `current === "CONTACTE"` |
| [`src/actions/crm.ts`](../../src/actions/crm.ts) | Zod + création `CrmActivity` + audit dans `updateOpportunityStageAction` |
| [`src/lib/crm/guide-rules.ts`](../../src/lib/crm/guide-rules.ts) | Helper optionnel `contactCommentRequiredForTransition(from, to)` |
| [`docs/manuels/05-crm.md`](../manuels/05-crm.md) | Paragraphe « Passage Contacté = commentaire obligatoire » |
| Test unitaire léger (option) | Schéma Zod / helper transition |

**Schéma Prisma :** Keep — pas de nouvelle table.

---

## 5. Décisions figées pour le plan (défauts analyse)

| ID | Décision | Valeur |
|----|----------|--------|
| D2 | Canal | Select obligatoire + texte libre |
| — | Longueur min commentaire | 10 caractères |
| — | Type activité | Canal choisi (pas NOTE générique) |
| — | Scope | Uniquement transition **vers** CONTACTE |
| — | Import existants | Pas de backfill |

Si Samba veut autre chose (ex. min 20 car., ou canal libre dans le texte seulement), le préciser au **GO LOT-B**.

---

## 6. Parcours de test gate

Données `[TEST]` uniquement.

1. Prospect `[TEST]` en **Nouveau** avec relance déjà renseignée (ou journaliser une activité avec date avant).
2. Changer statut → **Contacté** **sans** commentaire → erreur UI + serveur, stage inchangé.
3. Remplir canal + commentaire → succès ; fiche : statut Contacté + **ligne journal** visible avec le texte.
4. Passer Contacté → Qualification : **pas** de bloc commentaire Contacté.
5. Pending visible pendant submit ; pas d’UI figée.
6. `npm run build` OK.

---

## 7. Critère de sortie

> **LOT-B OK** si build vert + checklist §6 cochée + manuel 05 mis à jour.

Ensuite : plan **LOT-C** (édition prospect).

---

*Document de lot — attendre GO Samba avant code.*
