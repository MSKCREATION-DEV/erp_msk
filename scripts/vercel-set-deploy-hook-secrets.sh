#!/usr/bin/env bash
# Configure les secrets GitHub Actions pour l’auto-deploy Vercel (une fois).
# Prérequis : gh auth login (compte MSKCREATION-DEV)
set -euo pipefail

REPO="${REPO:-MSKCREATION-DEV/erp_msk}"
TEAM_ID="${VERCEL_TEAM_ID:-team_0KESonaIeR7zcKt5Pjgu6tri}"
PROJECT_ID="${VERCEL_PROJECT_ID:-prj_lzqdVwctIrePMmYCY5M5nGfUIRpw}"

if ! command -v gh >/dev/null 2>&1; then
  echo "Installer gh : brew install gh && gh auth login"
  exit 1
fi

echo "Lecture des Deploy Hooks Vercel…"
HOOKS_JSON="$(vercel api "/v9/projects/${PROJECT_ID}?teamId=${TEAM_ID}")"
MAIN_HOOK="$(python3 -c '
import json,sys
d=json.load(sys.stdin)
for h in (d.get("link") or {}).get("deployHooks") or []:
  if h.get("name")=="auto-main-production":
    print(h["url"]); break
' <<<"$HOOKS_JSON")"
DEV_HOOK="$(python3 -c '
import json,sys
d=json.load(sys.stdin)
for h in (d.get("link") or {}).get("deployHooks") or []:
  if h.get("name")=="auto-dev-preview":
    print(h["url"]); break
' <<<"$HOOKS_JSON")"

if [[ -z "$MAIN_HOOK" || -z "$DEV_HOOK" ]]; then
  echo "Hooks introuvables — créer auto-main-production / auto-dev-preview dans Vercel → Git → Deploy Hooks"
  exit 1
fi

gh secret set VERCEL_DEPLOY_HOOK_MAIN --repo "$REPO" --body "$MAIN_HOOK"
gh secret set VERCEL_DEPLOY_HOOK_DEV --repo "$REPO" --body "$DEV_HOOK"
echo "OK — secrets posés sur $REPO"
echo "Prochain push main/dev → workflow vercel-deploy → déploiement auto"
