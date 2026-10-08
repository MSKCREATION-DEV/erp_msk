# Actions requises — Phase -1 (vous)

Le socle local est prêt dans `/Users/pro.asguiro/Desktop/PRO/MSK/labs/erp_msk`.  
Il reste **votre** côté pour débloquer Git, Supabase et Resend.

---

## 1. GitHub SSH (bloquant pour le push)

Erreur actuelle : `Permission denied (publickey)` sur `git@asg-msk:...`

Clé publique à ajouter sur le compte GitHub qui a accès à l’org **MSKCREATION-DEV** :

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICyr58OmFwoonOYqmMu6czT4Y+j5/zpKq+i2IL7/4dWC a.guiro@mskcreation.net
```

Fingerprint : `SHA256:Eodd6Kxt2oRpj7ieOIA1v8lvoSbihvtEs+SHWx2dKek`

### Étapes

1. GitHub → Settings → SSH and GPG keys → **New SSH key** (compte lié à MSK), coller la clé ci-dessus.  
   **OU** si la clé y est déjà : vérifier que ce compte est membre de `MSKCREATION-DEV` avec droit write sur `erp_msk`.
2. Tester dans un terminal :

```bash
ssh -T git@asg-msk
git ls-remote git@asg-msk:MSKCREATION-DEV/erp_msk.git
```

3. Me dire quand c’est OK → on pousse le commit Phase -1.

---

## 2. Nouveau projet Supabase

1. [https://supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Nom suggéré : `erp-msk-dev`
3. Région proche (ex. EU)
4. Copier dans `.env.local` (dans `erp_msk/`) :

| Variable | Où la trouver |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | API → `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | API → `service_role` (secret) |
| `DATABASE_URL` | Database → Connection string → **URI** (mode **Transaction** / pooler port **6543**) |

Puis :

```bash
cd /Users/pro.asguiro/Desktop/PRO/MSK/labs/erp_msk
cp .env.example .env.local   # si pas encore fait
# coller les valeurs
npm run health:env
```

---

## 3. Resend (dev)

1. [https://resend.com](https://resend.com) → créer / se connecter
2. API Keys → créer une clé → `RESEND_API_KEY` dans `.env.local`
3. **Pour un premier test immédiat** (sans DNS) :
   - `EMAIL_FROM=onboarding@resend.dev`
   - `EMAIL_TEST_TO=a.guiro@mskcreation.net` (ou l’e-mail vérifié Resend)
4. Ensuite (recommandé) : Domains → ajouter `mskcreation.net` → records DNS dans **Cloudflare** (SPF/DKIM) → puis `EMAIL_FROM=notifications@mskcreation.net`

Test :

```bash
npm run test:email
```

---

## 4. Quand tout est prêt

Répondre dans le chat : **« Git OK + clés collées »** (sans coller les secrets ici).  
On finalise push + checklist gate Phase -1.
