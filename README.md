# ERP MSK CREATION

Logiciel métier **interne** MSK CREATION.

- Cahier des charges : [`docs/CAHIER-DES-CHARGES-ERP-MSK.md`](docs/CAHIER-DES-CHARGES-ERP-MSK.md)
- Phase en cours : **Phase -1 — Socle** → [`docs/phases/PHASE-01-SOCLES.md`](docs/phases/PHASE-01-SOCLES.md)
- Repo : `git@asg-msk:MSKCREATION-DEV/erp_msk.git`
- Super Admin (Phase 0) : `a.guiro@mskcreation.net`

## Prérequis

- Node 20+
- Accès SSH GitHub host `asg-msk`
- Projet Supabase **neuf** (ex. `erp-msk-dev`)
- Compte [Resend](https://resend.com) (dev)

## Démarrage

```bash
git clone git@asg-msk:MSKCREATION-DEV/erp_msk.git
cd erp_msk
npm install
cp .env.example .env.local
# Renseigner les clés Supabase + Resend
npm run health:env
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur local |
| `npm run build` | Build production |
| `npm run health:env` | Vérifie les variables (sans afficher les secrets) |
| `npm run test:email` | Envoie un e-mail test Resend vers `EMAIL_TEST_TO` |

## Règle des phases

1. Plan de phase dédié  
2. Implémentation complète  
3. Tests / vérifications  
4. Validation gate  
5. Seulement ensuite : phase suivante  

## Assets

Favicons et photos équipe : `docs/msk/` (copiés aussi dans `public/` pour l’app).
