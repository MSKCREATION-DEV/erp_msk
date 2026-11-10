# Intent confirmé — Module tampon « Suivi »

**Statut :** confirmé (ne pas dévier)  
**Date :** 2026-11-10  
**Lot :** spec + plan uniquement (pas d’implémentation UI/DB dans ce lot)

---

## Outcome

Module **tampon isolé** pour retracer :

1. **Clients** (fiche riche)
2. **Factures** (payé / reste / à venir) — génération futures par **remix** depuis historique
3. **Mouvements** (entrées / sorties + historique) — **pas** un module « caisse » métier
4. **Stocks**

Remplace Excel / Word manuels le temps que les modules réels Commercial / Compta / Stocks soient prêts.

## Utilisateurs

| Inclus | Exclu |
|--------|--------|
| Super admin / Guiro | Commercial terrain |
| Admins | |
| Direction (y compris à distance) | |

## Pourquoi maintenant

Besoin immédiat de réponses opérationnelles sans attendre la fin des modules métier « vrais ». Données **uniquement** issues des documents fournis dans `docs/` (aucune invention).

## Succès (mesurable)

Les **3 questions** direction :

1. **Impayés** — qui doit quoi, combien, depuis quand
2. **Mouvements** — entrées / sorties, historique, solde opérationnel (trésorerie tampon)
3. **Stocks** — quoi en stock, où, combien

Plus :

- Fiche client riche : solde, restant, à venir, contrats / factures liés GED
- Liste clients type Commercial mais **plus poussée** (ligne entière cliquable)
- Hub 1ʳᵉ page comme Commercial
- Nouvelle facture = remix (ajouter / retirer / ajuster) depuis factures passées
- Contrats = fichiers fournis déposés en dossier GED client, liés à la fiche ; factures aussi liées ; générations futures dans le module

## Contraintes

- **Pas de lien métier fort** avec Commercial / Compta existants (pas de sync CRM, pas d’écritures compta réelles)
- Data **UNIQUEMENT** des docs fournis — **NE PAS INVENTER** clients / montants / factures
- Patterns MSK (charte, list-create-separation, forms-stepper, redirects, UI never freeze, RLS/Prisma)
- Tables **isolées** (préfixe dédié) ; permissions **restrictives**
- Module **temporaire / tampon** — jetable ou migrable plus tard, pas une 2ᵉ source de vérité long terme

## Hors scope (V1)

- GED juridique complet
- Prélèvement auto
- Multi-entrepôts avancés
- Rapprochement bancaire
- Intégration CRM / compta réelle
- Clone pixel-perfect Excel
- **Devis** (feuille Devis Excel / ~14 clients devis-only) — **ignorés V1**
- **Module caisse métier** (approvisionnement / multi-caisses) — uniquement registre de **mouvements**

## Nom du module (figé)

Libellé menu **« Suivi »**, route `/suivi`, permissions `sv.*`, tables Prisma `sv_*` / modèles `Sv*`.

Sous-titre hub : « Tampon clients · mouvements · stocks ».

Sous-nav pilier trésorerie : **Mouvements** (pas « Caisse »).

## UX métier confirmée

1. Menu hub 1ʳᵉ page (pattern Commercial)
2. Clients bien séparés et très clairs
3. Listing → fiche client (solde, restant, à venir, totale)
4. Nouvelle facture : remix depuis historique
5. Contrats sur fiche = fichiers donnés → GED dossier client + lien fiche ; factures liées ; générations futures dans le module
6. **3 piliers complets dès V1 :** Clients/Factures · **Mouvements** · Stocks

## Sources data (inventaire)

Voir [`docs/specs/suivi-tampon/INVENTAIRE-DOCUMENTS.md`](../specs/suivi-tampon/INVENTAIRE-DOCUMENTS.md)  
Décisions seed / conflits : [`docs/specs/suivi-tampon/DECISIONS-SEED.md`](../specs/suivi-tampon/DECISIONS-SEED.md)

## Spec & plan

- Spec : [`docs/specs/suivi-tampon/SPEC.md`](../specs/suivi-tampon/SPEC.md)
- Capability map : [`docs/specs/suivi-tampon/CAPABILITY-MAP.md`](../specs/suivi-tampon/CAPABILITY-MAP.md)
- Plan / tâches : [`tasks/suivi-tampon/`](../../tasks/suivi-tampon/)

## Décisions data figées (2026-11-10)

1. Montants stockés en **entiers FCFA** ; ISDALINIA : arrondi somme-conservant depuis PDF (voir DECISIONS-SEED).
2. Seed V1 = **6 clients facturés** + factures/contrats/mouvements/stocks retenus — **devis-only exclus**.
3. Conflits Excel↔fichier : **priorité fichier facture** ; documenter l’écart.
4. Prosperity : **FAC-122 seul** (143 = brouillon).
5. GED : réutiliser `Document` / `DocumentFolder` / `DocumentLink` (`sv_client`, `sv_invoice`, …).
6. Accès : Direction / Admin / SuperAdmin seulement — pas commercial terrain.
