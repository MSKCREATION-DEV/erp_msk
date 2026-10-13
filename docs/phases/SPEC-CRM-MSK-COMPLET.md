# Spec CRM MSK — couverture complète (approfondissement)

> **Place dans le produit :** cette spec = **tranche « suivi commercial »** de la **Phase COMMERCIAL complète**  
> (prospect → client → catalogue → devis → facture → paiement). Voir [`PLAN-2-PHASES-COM-RH.md`](./PLAN-2-PHASES-COM-RH.md) §2.  
> On ne livre pas un « CRM isolé » : on livre **toute la partie commerciale** bout en bout ; ici on approfondit d’abord le suivi (Excel MSK).

> Référentiels : `docs/CRM_Prospection_MSK.xlsx` · PDF · captures.  
> Principe : aligner + améliorer (pas cloner bêtement).  
> **Évolution technique :** [`REGLES-EVOLUTION-CRM.md`](./REGLES-EVOLUTION-CRM.md) — keep / change / **break avec remontée décision** / wipe / tests.

---

## 1. Ce que contient le CRM Excel aujourd’hui

| Onglet | Rôle | Volume / contenu |
|---|---|---|
| **GUIDE** | Règles d’usage + signification des statuts | À encoder en produit (aide + contraintes) |
| **PROSPECTS** | Liste opérationnelle quotidienne | ~342 lignes actives ; colonnes riches |
| **TABLEAU BORD** | KPI globaux, taux, objectifs hebdo | Cards + taux + cibles |
| **SUIVI ÉQUIPE** | Performance par responsable | Auto depuis PROSPECTS + objectif |
| **SCRIPTS** | Messages IG / LinkedIn / WA + relances | Textes + conseils horaires |
| **LISTES** | Valeurs déroulantes | Statuts, sources, responsables |
| **Rapport hebdo Madina** | Rapport vendredi 17h | KPI semaine + blocages qualitatifs |

**Responsables observés dans les données :** Madina (~331), Mathieu (~11), Fatoumata (lignes récentes) — multi-commerciaux réel.

---

## 1bis. Vocabulaire MSK (obligatoire — zéro jargon)

Tout l’UI, les manuels et les mails internes utilisent **uniquement** ces termes.  
Interdit en interface : pipeline, owner, deal, stage, won, lead (seul), kanban, **Portefeuille**, **pôle**, TEAM/USER, focuser, jargon interne (ok en spec tech seulement).

| À éviter | Dire plutôt |
|---|---|
| Pipeline | **Suivi commercial** / parcours du prospect / vue **Par étapes** |
| Owner | **Suivi par** (qui porte le dossier) — jamais « owner » |
| **Portefeuille** | **Prospects** · ou **Vue Équipe** (si lien vers `/crm/equipe`) |
| Pôle / Paramétrer le pôle / Cibles du pôle | **Assignation globale** · **équipe** |
| Étape 1 — Pôle / Étape 2 | **Assignation globale** · **Par collaborateur** |
| Créateur | **Créé par** (audit ; peut ≠ Suivi par) |
| Deal / Opportunity | **Prospect** / dossier |
| Stage | **Statut** |
| Gagné / Won | **Client** |
| Lost | **Perdu** |
| Follow-up | **Relance** |
| Board / Kanban | **Vue par étapes** |
| Dashboard | **Tableau de bord** (**live** / instantané) |
| Source | **Origine** |
| Assign (dossier) | **Changer le suivi** / **Suivi par** |
| Assign (objectifs) | **Assignation globale** / **Par collaborateur** |

Navigation (module Commercial unifié) :

- **Menu** `/commercial` = hub cartes (pas de tabs).  
- Sous-pages tabs : `Menu` · `Tableau de bord` · `Prospects` · `Relances` · `Scripts` · `Vue Équipe`* · `Rapport` · `Clients` · `Devis` · `Factures` · `Offres`  
- \* **Vue Équipe** masquée si visibilité CRM `own` ; collabs : KPI **Prospects** / Intéressés / Retards en tête de Prospects.  
- **Par étapes** (board) : **retiré** — liste Prospects uniquement (pagination + recherche).

---

## 2. Statuts & origines (vérité métier)

### 2.1 Statuts (7 — comme Excel LISTES)

| Statut affiché | Signification (GUIDE) | Code BDD | Note |
|---|---|---|---|
| **À contacter** | Identifié, pas encore contacté | `NOUVEAU` | |
| **Contacté** | 1er message envoyé — attente réponse | `CONTACTE` | |
| **En cours** | Échange — intérêt partiel | `QUALIFICATION` | |
| **Intéressé** | Intérêt concret — devis sous 24h | `INTERESSE` | |
| **Devis envoyé** | Devis transmis — relance 48h | `DEVIS_ENVOYE` | Couvre aussi la phase d’échange sur le devis |
| **Client** | Accord — projet lancé | `GAGNE` | Plus jamais « Gagné » en UI |
| **Perdu** | Refus / sans réponse ×3 | `PERDU` | |

### 2.1bis Décision — « Négociation » : **masquer / ne plus proposer**

- L’Excel MSK **n’a pas** ce statut.  
- Dans l’ERP actuel, `NEGOCIATION` était une étape **entre** « Devis envoyé » et « Client ».  
- **Déjà couvert autrement :** tant qu’on discute le devis, le prospect reste en **Devis envoyé** + journal d’activités + date de relance (règle GUIDE 48h). Passer à **Client** ou **Perdu** ensuite.  
- Ajouter « Négociation » crée du jargon inutile et casse l’alignement terrain.  
→ **UI : retiré.** BDD : conserver l’enum pour l’historique ; à l’affichage / filtres, traiter comme **Devis envoyé** (migration soft éventuelle).

### 2.2 Origines (comment on a trouvé le prospect)

Instagram · LinkedIn · WhatsApp · TikTok · Google Maps · Google · Snapchat · Terrain · Recommandation · Email · Téléphone · **ChatGPT** · Autre.

→ Ajouter **ChatGPT** en BDD ; UI 100 % FR.

### 2.3 Règles GUIDE à respecter (produit)

| Règle | Implication ERP |
|---|---|
| Mise à jour **après chaque action** | Journal d’activités obligatoire / facilité (1 clic) |
| Min. **5 nouveaux prospects / jour** | Objectif paramétrable (suivi équipe) |
| Min. **3 relances** avant PERDU | Garde-fou UI + compteur |
| **Date de relance jamais vide** | Champ obligatoire dès CONTACTÉ (ou dès création) |
| Client chaud → devis **sous 2h** / INTÉRESSÉ → devis **sous 24h** | Alertes / badge urgence |
| Client signé → demander **2 recommandations** | Tâche auto à la conversion CLIENT |
| Revue **chaque vendredi** | Rapport hebdo + tableau de bord |

---

## 3. Liste Prospects vs fiche détaillée

### 3.1 Liste — colonnes **indispensables** seulement (scan rapide)

Objectif : une ligne = *qui / où on en est / quoi faire ensuite / qui s’en occupe*.  
Pas de table Excel à 20 colonnes (illisible sur laptop).

| Colonne liste | Pourquoi |
|---|---|
| **Entreprise** | Identité |
| **Contact** (prénom + tél court) | Action immédiate |
| **Statut** (badge) | Position dans le parcours |
| **Prochaine action** | Ce qu’il reste à faire |
| **Relance** (date, rouge si retard) | Priorité du jour |
| **Responsable** | Qui porte le dossier |
| **Budget** (si renseigné) | Enjeu €/FCFA |

Filtres (hors colonnes) : statut, responsable, origine, relance en retard, recherche texte.

### 3.2 Fiche prospect — **tout le détail** (profondeur)

Tout le reste Excel + améliorations vit **ici**, pas dans la liste :

| Bloc fiche | Contenu |
|---|---|
| Identité | Entreprise, secteur, site web, ville/pays |
| Contacts | Nom, poste, tél, e-mail (multi) |
| Origine | Comment trouvé ≠ offre / canaux à livrer |
| Parcours | Statut, 1er contact, dates, probabilité |
| Offre & budget | Offre proposée, budget (devise paramétrable), devis liés |
| Suivi | Dernière action (auto), prochaine action, date relance |
| Journal | Timeline activités / notes |
| Documents | Propositions / devis / factures |
| Méta | Créé le, créé par, responsable |

**Améliorations Direction :** fiche = carte d’identité sans explication orale ; import historique ; pas de confusion origine vs offre.

---

## 4. TABLEAU DE BORD — à reproduire / améliorer

### 4.1 Indicateurs (cards)

**Décision « En discussion » :** on **n’utilise plus** ce libellé flou comme carte principale.

- **Cartes = les 7 statuts LISTES** (À contacter → … → Perdu) : clair, pro, couvre tout, aligné terrain.  
- **Rollup optionnel** (comparaison Excel / synthèse) : **« En échange »** = **Contacté + En cours** uniquement (on a tenté ou on discute, mais pas encore « Intéressé »). Tooltip explicite.  
- **Intéressé**, **Devis envoyé**, **Client** restent des cartes **séparées** (trop importants pour être fusionnés).

| Indicateur | Calcul |
|---|---|
| Total prospects | tous dossiers actifs |
| + 7 compteurs statut | un par statut |
| En échange *(option)* | Contacté + En cours |
| Clients | statut Client |
| Perdus | nb (jamais un montant « € » erroné) |
| CA signé | budgets / devis des Clients |
| Montant en cours (pipeline) | budgets (`budgetXof`) des statuts ouverts (hors Client / Perdu) — affiché dans Conversion, pas en KPI isolé |

### 4.2 Taux

- Taux de réponse  
- Taux de conversion (prospect → client)  
- Valeur moyenne client  

### 4.3 Objectifs hebdo (paramétrables)

| Indicateur | Cible exemple Excel |
|---|---|
| Nouveaux prospects / semaine | 25 (équipe) / 15 (collab Madina rapport) |
| Messages envoyés / semaine | 25 |
| Calls / semaine | 25 |
| Clients signés / mois | 2 |

→ **Amélioration :** calculer le « Réel » depuis activités (APPEL, WHATSAPP, …) au lieu de saisie manuelle tableau bord.

---

## 5. Suivi équipe — tout couvrir (global + par personne)

### 5.1 Visibilité — **décision verrouillée**

Les collaborateurs commerciaux **voient le travail des autres** (pas de silo).  
Cas métier : un collab malade → un autre **reprend ses dossiers** sans friction.

- Vue **Équipe entière** (tout combiné)  
- Vue **par collaborateur** (filtre / onglets / sélecteur de personnes — pas `<select>` natif)  
- Actions : ouvrir un dossier d’un collègue, journaliser, reporter une relance, **réattribuer le responsable**

Droits fins éventuels plus tard (lecture seule vs édition) ; **par défaut Phase CRM : lecture + reprise** pour le pôle commercial.

### 5.2 Ce qu’on voit pour chaque personne (et au global)

| Zone | Contenu |
|---|---|
| Synthèse | Total prospects · ajoutés S / S-1 / mois · objectif vs réel |
| Santé | Dernière activité · jours sans saisie · relances en retard · sans date de relance |
| Parcours | Répartition par **statut** |
| Tendance | Courbe nouveaux / activités (8 semaines) |
| Activité récente | Journal consolidé (appels, messages, notes) — **ce qu’ils font vraiment** |
| File du jour | Relances du collab (ou de toute l’équipe) |
| Prospects (filtre collab) | Liste / vue par étapes filtrée sur ce collaborateur |

Objectifs : **paramétrables par collab** et **paramétrables équipe** (voir §12).

---

## 6. SCRIPTS — à couvrir

Canaux (au minimum comme Excel) :

1. Instagram DM  
2. LinkedIn message  
3. WhatsApp Business  
4. Relance 1 (J+3)  
5. Relance 2 (J+7 — changer de canal)  
6. (+ autres déjà en seed ERP)

Fonctions : CRUD scripts · copier · variables `[PRÉNOM]`, `[SECTEUR]`, … · conseils horaires · feedback « ce qui marche » (lien rapport hebdo).

---

## 7. RAPPORT HEBDOMADAIRE — à couvrir

**Cadence :** chaque vendredi avant 17h (par commercial).

### Indicateurs (exemple Madina)

| Indicateur | Objectif/sem. |
|---|---|
| Nouveaux prospects identifiés | 15 min |
| Premiers contacts effectués | 10 min |
| Réponses obtenues | 3–5 |
| Prospects en discussion | 2+ |
| Leads qualifiés | 1–2 |
| RDV planifiés (Andile / Mathieu) | 1+ |
| Prospects relancés | Tous J+5 |
| Prospects non qualifiés | Normal |

### Qualitatif

- Principale difficulté de la semaine  
- Besoins pour mieux prospecter  
- Feedback scripts (marche / ne marche pas)  

**Amélioration :** pré-remplir les chiffres depuis l’activité CRM ; le collab ne saisit que le qualitatif + corrections.

---

## 8. Écart ERP actuel → cible (synthèse)

| Zone | État actuel (approx.) | Gap |
|---|---|---|
| Modèle Org/Contact/Deal/Activity/Task/Script | Existe | Champs / UX incomplets vs Excel |
| Statuts | 8 stages (dont Négociation) | Aligner libellés LISTES ; décider Négociation |
| Sources | Large | + ChatGPT ; nettoyage import |
| Liste prospects type Excel | Partiel | Vue tableau colonnes Excel + filtres owner/statut/relance |
| Fiche riche | Partiel | Secteur, web, devis liés, identité complète |
| Date relance obligatoire | Faible | Contrainte + file retards |
| Dashboard KPI Excel | Hub léger | Cards + taux + objectifs |
| Suivi équipe | Peu / absent | Onglet / page dédiée |
| Rapport hebdo | Absent | Module vendredi |
| Scripts | Présents | Parité textes GUIDE + feedback |
| Import Excel | Existe | Rejouer sur fichier Oct 2026, mapping robuste |
| Règles GUIDE | Non encodées | Validations + alertes |
| Langue | Mixte | 100 % FR |

---

## 9. UI / UX / parcours — ambition « meilleur CRM métier »

> Le problème n’est pas seulement les champs Excel : **cohérence, flows, densité pro, feedback, visualisations**.  
> Références produit : [Attio Reports](https://attio.com/help/reference/managing-your-data/dashboard-and-reports/reports) · [Pipedrive charts](https://www.pipedrive.com/en/crm/features/crm-charts) · patterns HubSpot fiche 360° / Pipedrive kanban.  
> Stack charts : [shadcn Chart](https://ui.shadcn.com/docs/components/base/chart) (Recharts) — [Area](https://ui.shadcn.com/charts/area) · [Bar](https://ui.shadcn.com/charts/bar) · [Line](https://ui.shadcn.com/charts/line) · [Pie](https://ui.shadcn.com/charts/pie) · [Radial](https://ui.shadcn.com/charts/radial) · [Tooltip](https://ui.shadcn.com/charts/tooltip).  
> Charte MSK stricte (`msk-blue`, `msk-ink`, `msk-coral`, `msk-chalk`, Jost) — **pas** de thème violet shadcn par défaut.

### 9.1 Diagnostic UI actuelle (CRM ERP)

| Symptôme | Impact |
|---|---|
| Hub `/crm` = KPI cards + liste plate, **pas de graphiques** | Direction ne « lit » pas le pipeline en 5 s |
| Liste prospects colonnes pauvres vs Excel | Commercial revient à Sheets |
| Fiche = badges + cards empilées, pas de layout 360° | Identité peu scannable |
| Pas de vue **pipeline kanban** | Manque le geste mental « où en est mon deal » |
| Boutons d’actions redondants / header chargé | Cohérence faible entre écrans |
| Relances / scripts / import = îlots | IA navigation floue |
| Empty / loading / pending partiels | Risque UI figée |
| FR / EN mixte | Sensation non finie |

### 9.2 Principes de design (non négociables)

1. **Une page = une intention** (règle list/create déjà en vigueur).  
2. **Shell stable** : sous-nav CRM fixe — libellés §1bis (`Tableau de bord` · `Par étapes` · `Prospects` · …).  
3. **Vocabulaire clair** pour tous (§1bis) — zéro jargon pipeline/owner.  
4. **Densité Attio / Linear** : peu de chrome, typo nette, surfaces blanches sur `msk-chalk`.  
5. **Actionnable** : chaque indicateur / barre → clic vers liste filtrée.  
6. **Équipe ouverte** : un collab voit / peut reprendre le travail des autres (§5.1).  
7. **Feedback instantané** : `loading.tsx`, pending, NavigationProgress.  
8. **Liste courte** + **fiche profonde** (§3) — pas 20 colonnes.  
9. **Retards = signal fort** (coral).  
10. **Aucun `<select>` natif navigateur** (§9.2bis).

### 9.2bis Sélection pro — **interdiction listes natives**

**Interdit dans tout l’ERP (dès CRM, puis dette ailleurs) :** `<select>` HTML / listes déroulantes natives du navigateur.

| Cas | Composant |
|---|---|
| 2–8 options courtes (statut, type d’activité, motif perte…) | **Grille de cartes / choix** (tap = sélection, état selected net) — style segmented / choice cards |
| Origines (~13) | **Choice cards** en grille responsive ou combobox searchable |
| Longues listes (collègue, offre catalogue, client…) | **Combobox** shadcn (`Popover` + `Command`) — recherche, clavier, empty state |
| Oui / Non / petit enum | **Toggle group** / radios custom brandés |

Réf. : patterns shadcn Combobox / Command ; densité Linear ; jamais de look « formulaire HTML 1998 ».

À ajouter au design system : `ChoiceCards`, `Combobox` (si absents) — remplacer tous les `<select>` CRM en premier (`prospect-create-form`, `stage-form`, `activity-form`, `script-form`).

### 9.3 Architecture d’information & parcours

```
/commercial                   → Menu (hub cartes)
/crm                          → Tableau de bord (titre exact, pas « Suivi »)
/crm/prospects                → Liste (+ KPI collab si own) ; ?vue=etapes = Par étapes
/crm/prospects/nouveau        → Création plein largeur (wizard 4 étapes, validation GUIDE)
/crm/prospects/[id]           → Fiche détaillée
/crm/prospects/import         → Import
/crm/relances                 → Relances du jour / en retard
/crm/scripts                  → Scripts
/crm/equipe                   → Vue Équipe (redirect /crm/prospects si own)
/crm/rapport-semaine          → Rapport (chiffres auto)
/crm/objectifs                → Objectifs paramétrables
/crm/par-etapes               → redirect → /crm/prospects?vue=etapes
```

**Parcours critiques (à tester bout en bout) :**

| # | Acteur | Flow | Succès |
|---|---|---|---|
| P1 | Commercial | Matin → Relances → log activité → date relance | 0 Excel |
| P2 | Commercial | Nouveau prospect → 1er contact → script copy | < 2 min |
| P3 | Commercial | INTÉRESSÉ → créer / lier devis → DEVIS ENVOYÉ | Chaîne visible |
| P4 | Commercial | CLIENT → conversion COM → devis | Sans rupture |
| P5 | Lead / Mathieu | Bord → funnel drop-off → liste filtrée | Coaching data |
| P6 | Madina | Vendredi → rapport prérempli → envoi | < 10 min |
| P7 | Admin | Import CSV → owners OK → bord à jour | One-shot |
| P8 | Direction | CA pipeline / signé / objectifs | Décision en 30 s |

### 9.4 Écrans — intention visuelle

| Écran | Composition | Inspiration |
|---|---|---|
| **Tableau de bord** | Indicateurs (7 statuts) → graphique conversion → tendances 8 sem. → objectifs vs réel → urgences | Attio + HubSpot |
| **Par étapes** | Colonnes = 7 statuts ; carte = entreprise, budget, relance, **responsable** ; totaux colonne | Pipedrive (sans le nom « kanban » en UI) |
| **Liste** | **7 colonnes max** (§3.1) ; badges ; chips filtres ; relance rouge | Excel allégé + Attio |
| **Fiche** | Identité + contacts + origine/offre ; journal ; statut / relance / devis | HubSpot 360° allégé |
| **Relances** | Aujourd’hui / Cette semaine / En retard ; 1 clic « fait » | Close |
| **Vue Équipe** | Cartes par collab + radiaux Prospects / Intéressés / Retards | §5 |
| **Rapport** | Dashboard auto (charts + filtres) + qualitatif | Excel Madina+ |
| **Scripts** | Cartes canal + Copier | Linear density |
| **Choix statut / origine** | Choice cards / combobox — **jamais** select natif | §9.2bis |

### 9.5 Graphiques & KPI — mapping métier → chart type

Stack : `npx shadcn@latest add chart` → `ChartContainer` + Recharts ; tokens `--chart-*` **recolorés MSK** (`#1D73BC`, dégradé bleu, coral pour alertes).  
Réf. implémentation : [doc Chart](https://ui.shadcn.com/docs/components/base/chart).

| Question métier | Type chart shadcn | Où |
|---|---|---|
| Combien / combien € par statut ? | **Bar** (horizontal ou vertical) | Bord + Pipeline header |
| Conversion étape → étape (où on perd) | **Funnel** (bar empilé / custom) + taux | Bord Direction |
| Nouveaux prospects / activités dans le temps | **Area** ou **Line** (8 semaines) | Bord + Suivi équipe |
| Répartition sources | **Pie** ou donut | Bord (secondaire) |
| Objectif vs réel (semaine / mois) | **Bar** + ligne cible ; **Radial** pour % atteinte | Bord + Rapport hebdo |
| Win rate / taux réponse | **Radial** ou KPI + sparkline | Cards KPI |
| Perf par commercial | **Bar** groupé | Suivi équipe |
| CA pipeline vs CA signé | **Area** stacked ou dual line | Bord Direction |

**Règles charts :**
- Toujours titre + 1 phrase « pourquoi ça compte ».  
- Tooltip shadcn (`ChartTooltipContent`) FR.  
- Clic segment → `href` liste filtrée.  
- Empty state soigné (pas de graphe vide moche).  
- Accessibilité : `accessibilityLayer` Recharts.  
- Pas de mur de 12 charts : **max 4 blocs viz** au-dessus du fold sur le bord.

### 9.6 Composants UI à industrialiser

| Composant | Rôle |
|---|---|
| `CrmSubnav` | Nav secondaire cohérente sur tous les écrans CRM |
| `StageBadge` | Couleurs statut alignées Excel (gris→bleu→orange→violet→vert/rouge) |
| `PipelineBoard` | Kanban |
| `ProspectsDataTable` | Table dense + filtres URL |
| `ProspectIdentity` | Bloc fiche gauche |
| `ActivityTimeline` | Journal |
| `FollowUpQueue` | Relances |
| `KpiStat` (évolué) | Valeur + cible + delta + sparkline optionnelle |
| `charts/*` | Wrappers MSK sur shadcn Chart (Bar, Area, Line, Pie, Radial) |
| `GoalProgress` | Radial / barre objectif hebdo |

### 9.7 Cohérence cross-module (CRM ↔ Commercial)

- Même vocabulaire : **Client** (pas « Won »), **Devis envoyé**, **À contacter**.  
- Depuis fiche CRM : bloc « Documents » (devis / factures) même look que module COM.  
- Conversion CLIENT : CTA unique, pending clair, redirect fiche client.  
- PDF : Voir / Télécharger (déjà corrigé) partout.

---

## 10. Découpage CRM (métiers + UI)

| Lot | Nom | Livrable | Gate |
|---|---|---|---|
| **CRM-0** | Alignement référentiel | Statuts/sources LISTES ; décisions ; tokens stage | **Fait** |
| **CRM-UX** | Fondations UI | Sous-nav FR claire ; `ChoiceCards` ; badges ; charts MSK | **Fait** (hub cartes) |
| **CRM-UX2** | Redesign collab | Shell underline ; bord 4 KPI + donut/radial ; wizard ; picker modal ; multi-offres ; fixtures `[TEST]` | **Fait** (GO UX) |
| **CRM-1** | Liste courte + fiche profonde | Colonnes §3.1 ; fiche §3.2 ; vocabulaire §1bis | **Fait** (édition complète partielle) |
| **CRM-2** | Activités & relances | Journal ; file relances groupée ; règles GUIDE | **Fait** (GO 2026-10-12) |
| **CRM-2b** | Vue par étapes | Colonnes 5 statuts actifs | **Fait** |
| **CRM-3** | Import & data | CSV robuste max 400 + dédup | **Fait** (GO suite) |
| **CRM-4** | Scripts | Filtres canal + copy variables | **Fait** |
| **CRM-5** | Tableau de bord | KPI + graph + objectifs param. | **Fait** |
| **CRM-6** | Vue Équipe | `/crm/equipe` + masquage own + KPI sur Prospects | **Fait** |
| **CRM-7** | Rapport | Auto dashboard + filtres (`/crm/rapport-semaine`) | **Fait** |
| **CRM-8** | Pont commercial | Alerte devis 24h ; Client → devis | **Fait** (v1) |
| **CRM-UX3** | Nav Menu / droits | Hub→Menu ; tab Tableau de bord ; libellés Rapport / Vue Équipe | **Fait** |

Ordre livré : CRM-0 → UX → 1→8 + UX2/UX3.

### 10bis. Lots COM (chaîne documentaire — hors CRM pur)

| Lot | Contenu | Gate |
|---|---|---|
| **COM-4** | Client dès Intéressé ; prefill devis ; sync Devis envoyé ; SLA `interestedAt` | **Fait** |
| **COM-5** | Plancher prix UI + serveur XOF | **Fait** |
| **COM-6** | Bridge facture → VE + GED PDF owner | **Fait** |
| **COM-7** | Colonne Compta ; KPI file ; polish Direction | **Fait** |

Suite globale : retours terrain · Phase RH ([`PLAN-2-PHASES-COM-RH.md`](./PLAN-2-PHASES-COM-RH.md)).

---

## 11. Critère « CRM MSK complet » (+ barre design)

1. Travail quotidien **100 % ERP** (plus d’Excel pour prospecter).  
2. 7 statuts LISTES + origines + règles GUIDE ; **pas** de « Négociation » en UI.  
3. Relances obligatoires + file retard.  
4. Bord + équipe + rapport remplacent les onglets Excel.  
5. Import historique OK.  
6. Pont Client → devis/facture.  
7. UI pro : vocabulaire clair, liste courte / fiche profonde, vue par étapes, charts MSK, **0 select natif**, équipe ouverte.  
8. Test mental : *un inconnu comprend en 10 s où cliquer et où en est le business.*

---

## 12. Décisions **verrouillées**

| # | Sujet | Décision |
|---|---|---|
| 1 | **Négociation** | **Masqué** — déjà couvert par **Devis envoyé** + journal + relances. Absent d’Excel. |
| 2 | « En discussion » | **Pas** en carte principale. Cards = **7 statuts**. Option **« En échange »** = Contacté + En cours. |
| 3 | Devise budget | **Paramétrable** (XOF / € / dual). |
| 4 | Objectifs hebdo | **Les deux** paramétrables : collab **et** équipe. |
| 5 | Visibilité équipe | **Oui** — voir les autres + **reprendre** (maladie / absence). |
| 6 | Vocabulaire | Glossaire §1bis obligatoire. |
| 7 | Listes natives | **Interdit** — Choice cards / Combobox. |
| 8 | Colonnes liste | Essentiels (§3.1) ; détail en fiche. |
| 9 | Vue par étapes | Oui, sans jargon pipeline/kanban en UI. |
| 10 | Charts | shadcn/Recharts, tokens MSK. |
| 11 | Nav | Menu · Tableau de bord · … · Vue Équipe* · Rapport · Offres |
| 12 | Client commercial | Dès **Intéressé** (pour devis), pas seulement Client |
| 13 | Plancher | Obligatoire XOF sur lignes catalogue |

---

*Spec vivante — CRM + COM livrés 2026-10-12. Prochain signal phase : « SPEC-RH GO » / « RH GO ».*