# Rapport — Point Direction / démo ERP MSK

**Date :** 13 octobre 2026 (soir)  
**Durée :** ~48 minutes  
**Source :** transcription VTT `Réunion dans « Direction » (1).vtt`  
**Nature :** revue produit live (démo) du module commercial / CRM de la plateforme  
**Participants :**

| Rôle | Personne |
|------|----------|
| Présentation / développement | Amadou Samba GUIRO |
| Direction | Mathieu DIARRA |
| Direction / organisation | Andile BOUSSARI |
| Direction / challenge UX & process | Isdalinia Nougues BOISSEAUX |

**Méthode d’analyse :** la transcription orale est fragmentée (chevauchements, homophones, coupures). Les propos ont été reconstruits **par thème métier**, pas chronologiquement mot à mot. Les décisions et demandes ci-dessous correspondent à ce qui a été explicitement dit ou acté à l’oral.

**Document lié :** `docs/synthese-reunion-direction-2026-10-11.md` (point métier / RH / organisation du 11 oct. — périmètre différent).

---

## 1. Verdict global

La direction juge la plateforme **nettement meilleure qu’avant**. Mathieu le dit explicitement : il y a « vraiment du travail qui a été fait ».

La revue ne porte **pas** sur tout l’ERP. Elle se concentre sur le **parcours commercial** :

1. Devis / facture (décision de mise de côté)
2. Tableau de bord
3. Objectifs & vue équipe / rapports
4. Liste clients
5. Fiche prospect
6. Création de prospect
7. Contrôle (rapports individuels, logs)

**Message stratégique :**
- Verrouiller ce qui n’est pas prêt (devis / facture)
- Durcir la **discipline terrain** (commentaires, affectation, doublons, logs)
- Fermer le parcours jusqu’au **client signé**

---

## 2. Déroulé logique de la réunion

| Ordre | Sujet | Issue principale |
|------:|------|------------------|
| 1 | Devis & facture | Griser ; garder le process actuel ; numérotation + lien comptable |
| 2 | Tableau de bord | Visibilité direction vs commercial ; compteur de relances manquant |
| 3 | Objectifs | Signatures clients ; périodes semaine/mois/année ; UX « Synthèse » confuse |
| 4 | Clients | Date = création (pas signature) ; besoin bouton « Transformer en client » |
| 5 | Fiche prospect | Réseaux sociaux, journal, droits / affectation, doublons |
| 6 | Création prospect | Multi-contacts, secteurs, offres liées, édition, commentaire de statut |
| 7 | Clôture | Rapports clairs ; logs admin sur chaque action |

---

## 3. Décisions actées

### 3.1 Devis et facture — griser pour l’instant

**Décision :** Samba grise les parties devis et facture dans l’ERP.

**Pourquoi (Mathieu + Andile) :**
- L’équipe continue pour l’instant sur **le process devis actuel** (hors plateforme)
- Il faut d’abord **mettre à jour les numérotations** des devis et des factures
- Le « débit » / flux doit être **lié au côté comptable** — « c’est la comptabilité »

**Implication produit :** ne pas ouvrir devis / facture dans l’ERP tant que le référentiel de numérotation et la règle comptable ne sont pas figés avec la compta.

---

### 3.2 Tableau de bord — deux niveaux de visibilité

**Exposé par Samba (validé) :**
- Vue globale (« voir tout ») : **admins + direction**
- Commercial (ex. Yaye) : **visibilité uniquement sur ce qu’elle fait**

**Contenu présenté du dashboard :**
- Intéressés à qui on n’a **pas encore envoyé** de devis
- Dossiers encore actifs qui ne sont **pas encore clients**
- Prospects « intéressés » = prêts à recevoir une proposition
- Relances à faire / non faites / en retard (date déjà passée)
- Conversion prospects → clients
- CA calculé automatiquement lorsque les budgets sont renseignés
- Samba prévoit d’**enlever** une répartition « à contacter / contacté / qualification » jugée redondante avec « devis envoyé »

**Écart relevé (Mathieu + Isdalinia) :**
- Besoin de voir **combien de fois** un prospect a déjà été relancé (1×, 2×…)
- Samba : « pas pris en compte » → **à ajouter**
- Isdalinia : « faudrait le prendre en compte, ça c’est important »

**Logique actuelle des relances (Samba) :**
- À l’enregistrement du prospect → date de **prochaine relance**
- Si la date est passée → affichage du retard (jours)
- Listing des relances à venir / non faites
- L’historique du **volume** de relances déjà effectuées n’est pas encore exposé

Pour le détail « ce qu’a fait telle personne dans le mois » → ce n’est pas dans le dashboard global, mais dans **Vue équipe / rapports**.

---

### 3.3 Objectifs commerciaux

**Ce qui existe :**
- Assignation **globale** ou **par collaborateur**
- Indicateurs : nouveaux prospects, premiers contacts, rendez-vous, relances

**Manques demandés par Mathieu :**
1. **Nombre de clients signés / conversions** (ex. objectif « au moins 3 clients d’ici fin d’année »)
2. Périodes pas limitées à la **semaine** → pouvoir fixer des objectifs par **semaine, mois et année**

Samba reconnaît que la propriété « client signé / prospect transformé en client » n’avait **pas été prise en compte**.

**Rapports / Vue équipe :**
- Filtrage pour présenter la semaine du commercial
- Semaines prédéfinies pour l’instant → à remplacer par **calendrier** (date début / date fin)
- Mathieu souhaite aussi pouvoir **comparer** deux mois pour fixer / discuter les objectifs

**UX « Synthèse » (critique direction) :**
- Deux libellés « Synthèse » mal compris (bascule focus perso ↔ vue tous)
- Mathieu + Isdalinia : **retirer** ces libellés ; le bouton retour gère déjà la sortie de page
- Clarifier clairement le switch vue personnelle ↔ vue équipe, sans double entrée confuse

---

### 3.4 Clients

**Dates :**
- La date affichée dans la liste = date de **création** (inscription sur la plateforme), **pas** la date de signature de contrat
- Samba : la signature de contrat n’est **pas encore implémentée** ; pour l’instant c’est la création client
- Intention : afficher clairement « créé le » ; la colonne « mise à jour » n’a pas été pleinement testée

**Ville :** saisie **manuelle** (pas de sélection auto)

**Conversion prospect → client (point bloquant métier) :**
- Aujourd’hui : créer un client puis sélectionner / lier
- Andile : « Ah non, ça c’est pas bon »
- Mathieu + Andile : il faut un **bouton « Transformer en client »** avec automatisation depuis le prospect

**Lien devis :**
- Discussion sur le fait qu’un devis pourrait exiger un statut « intéressé » / client
- Moins critique immédiatement car devis sera grisé, mais le bouton de transformation reste nécessaire pour la fin du parcours commercial

---

### 3.5 Fiche prospect

**Contenu apprécié :**
- Statut, contacts, prochaine action, guide / commentaire
- Offres proposées
- Notes
- **Journal d’activité** : chaque action enregistrée par le commercial
  - Mathieu : démarrer le journal **dès la création**
  - Plusieurs personnes peuvent intervenir sur le même dossier → le journal doit le montrer

**Réseaux sociaux :**
- Afficher TikTok, LinkedIn, Instagram, etc. en **badges cliquables** (lien derrière si présent)
- Remplir le « vide » à côté de « pas de site web »
- À la création : lignes explicites « a / n’a pas » pour **pousser les commerciales à chercher** l’info

**Note entreprise :**
- Remplacer la répétition du bloc « Contact » en bas de fiche par une **note / petit résumé** de l’entreprise (type d’activité, contexte)

**Offres proposées :**
- Mathieu : les montants « standard » ne sont pas toujours les mêmes (ex. 50 000 vs 100 000) → le **budget / débit** affiché aide à comprendre ; jugé OK pour l’instant

---

### 3.6 Droits, visibilité et affectation

**Problème métier (Andile) :**
- Yaye et Madina doivent pouvoir **voir** les prospects sur lesquels l’autre travaille, sinon risque de prospecter la même personne (« rapidement un bon bordel »)

**Consensus acté :**
1. **Tous les commerciaux voient tous les prospects** (visibilité partagée)
2. Pour **interagir / modifier**, il faut une **affectation**
3. L’affectation n’est **pas** libre auto-service : c’est **admin / direction** qui affecte
4. Variante acceptée : le commercial peut **demander** à être affecté

Samba évoque aussi des profils type admin CRM / admin commercial pour la configuration des droits.

---

### 3.7 Détection des doublons (décision forte)

**Débat :**
- Andile : voir la liste / les KPI suffit souvent pour éviter de retomber sur le même prospect
- Isdalinia **contredit** : avec **200 prospects**, personne ne lit tout → **la plateforme doit signaler**
- Mathieu : à l’enregistrement, notifier si l’entreprise existe déjà

**Engagement Samba :**
Lors de la création (wizard par étapes), à l’étape **informations entreprise**, avant de passer à la suite :
- Comparer les noms (similarité, pas seulement égalité stricte)
- Remonter à l’écran les **doublons possibles**

**Critères d’unicité demandés :**
- Nom d’entreprise (flou)
- **Numéro de téléphone** (même si le nom diffère)
- Email (quand renseigné)
- Plateformes / réseaux sociaux (quand renseignés)

**Si l’utilisateur ignore l’alerte :**
- L’événement doit apparaître dans le **journal d’activité** : « doublon possible détecté »
- Objectif : pouvoir auditer même si quelqu’un clique « ignorer » et continue

---

### 3.8 Création de prospect

**Apprécié :**
- Formulaire jugé **assez complet**
- Origine : badges alignés sur ceux de la fiche
- Note interne : libellé à rendre **plus explicite** (trop opaque aujourd’hui)

**Secteurs :**
- Passer d’une saisie libre à une **liste prédéfinie**
- Option **« Autre »** avec précision obligatoire (toujours des cas hors liste)

**Contacts & téléphones :**
- Aujourd’hui : un seul champ numéro côté création
- Cible : **plusieurs contacts** (sections ADD)
- Cas « même personne, 2 numéros » : ne pas dupliquer le nom → lignes téléphone avec **+**, préremplissage du nom du premier contact

**Offres liées (config catalogue) :**
- Ex. gestion des réseaux sociaux → préciser **quels** réseaux
- Site internet → vitrine / sur mesure / refonte ; blog ou actualité ; boutique e-commerce
- Production vidéo / motion → pas forcément d’offre liée
- Tout cela viendra de la **configuration des offres** (pas encore configurée live dans la démo)

**Édition :**
- Aujourd’hui : **pas de modification** d’un prospect
- Mathieu + Samba : **obligatoire** (fautes de saisie commerciales, récupération d’un lead « perdu »)
- Les **statuts** sont déjà changeables → utile mais insuffisant sans édition des champs

**Changement de statut « Contacté » — règle dure (Mathieu) :**
- Commentaire **obligatoire** (champ rouge / bloquant)
- Contenu attendu : **comment** on a contacté (appel, etc.) + **ce qui a été dit** / échangé
- Si pas de réponse : le noter aussi
- Motif : cas Madina — « elle a contacté » sans qu’on sache ni comment ni quoi

---

### 3.9 Rapports, contrôle et logs

**Rapports :**
- Samba montre que le rapport d’activité rend très visible ce qu’a fait chaque personne sur la plateforme
- Objectifs Yaye = **personnels** uniquement

**Logs admin (engagement Samba) :**
- Chaque action sera **loguée** côté admins
- Possibilité de **retracer** tout

**Note Isdalinia :**
- L’humain contourne toujours les garde-fous → d’où la nécessité d’**itérer** (commentaires obligatoires, logs, doublons, etc.)

---

## 4. Ce qui n’était pas dans le scope de cette réunion

- Revue détaillée Finance / Compta au-delà du principe « devis / facture = compta »
- RH / paie / congés / stocks
- Signature électronique de contrat (explicitement « pas encore fait »)
- Configuration live du catalogue d’offres (évoquée comme prérequis futur)
- Import bulk de prospects / clients

Pour les sujets RH / organisation / paie, se référer à la synthèse du **11 octobre 2026**.

---

## 5. Backlog priorisé (issu de cette réunion)

### P0 — Immédiat / bloquant discipline

| Item | Pourquoi |
|------|----------|
| Griser devis & facture | Éviter un usage prématuré et des incohérences numérotation / compta |
| Commentaire obligatoire au passage statut « Contacté » | Traçabilité terrain (cas Madina) |
| Édition d’un prospect | Corriger les erreurs ; récupérer des leads |

### P1 — Parcours commercial direction

| Item | Pourquoi |
|------|----------|
| Bouton « Transformer en client » | Fin de parcours claire, sans double saisie |
| Objectifs : clients signés + périodes semaine / mois / année | Pilotage direction (ex. 3 clients / an) |
| Compteur d’historique de relances (1×, 2×…) | Savoir qui a déjà été poussé |
| Visibilité partagée + affectation admin/direction | Collaboration sans chaos |
| Détection doublons (nom / tél / mail / réseaux) + journal si ignoré | Anti-bordel à l’échelle |

### P2 — Enrichissement & UX

| Item | Pourquoi |
|------|----------|
| Réseaux sociaux sur fiche + à la création | Enrichir le dossier commercial |
| Note / résumé entreprise (à la place du doublon Contact) | Lisibilité de la fiche |
| Multi-contacts / multi-téléphones | Qualité data |
| Secteurs en liste + « Autre » | Saisie homogène |
| Offres liées via config catalogue | Cohérence offres (prépare devis plus tard) |
| Calendrier sur filtres rapports + comparaison mois | Animation commerciale hebdo / mensuelle |
| Clarifier UX Synthèse / retour | Moins de confusion direction |
| Logs admin de toutes les actions | Audit & anti-contournement |

---

## 6. Synthèse exécutive

| Axe | Position direction |
|-----|--------------------|
| Qualité globale | Positive — nette progression |
| Priorité produit | CRM commercial discipliné jusqu’au client signé |
| À ne pas ouvrir | Devis / facture (tant que numérotation + compta non calés) |
| À durcir | Commentaires de statut, affectation, doublons, logs |
| À fermer | Conversion prospect → client + objectifs de signatures |

**En une phrase :**  
La direction valide le cœur commercial ; elle demande de **ne pas ouvrir devis/facture trop tôt**, et de **verrouiller le terrain** (qui a fait quoi, sur qui, combien de fois, sans doublon).

---

## 7. Annexes

### 7.1 Glossaire rapide des écrans cités

| Écran | Rôle |
|-------|------|
| Tableau de bord | KPIs globaux (direction) / perso (commercial) |
| Objectifs | Cibles assignées (global ou par collab) |
| Vue équipe / Rapports | Filtrage activité (semaine → calendrier) |
| Prospects | Liste + fiche + création |
| Clients | Liste ; conversion depuis prospect à industrialiser |

### 7.2 Source

- Fichier : `Réunion dans « Direction » (1).vtt`
- Plage temporelle approximative : `00:00:05` → `00:48:07`
- Locuteurs : Amadou Samba GUIRO, Mathieu DIARRA, Andile BOUSSARI, Isdalinia Nougues BOISSEAUX
