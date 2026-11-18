#!/usr/bin/env bash
# KONSÜL AI — tam regresyon paketi (tek komut)
#   bash tests/run_all.sh
# Gereksinim: node (jsdom için), python venv (.venv) veya fastapi kurulu sistem python'u.
set -uo pipefail
cd "$(dirname "$0")"
REPO="$(cd .. && pwd)"
FAILED=0

run(){
  local label="$1"; shift
  echo
  echo "════ $label ════"
  if "$@"; then echo "  → $label: YEŞİL"; else echo "  → $label: KIRMIZI"; FAILED=1; fi
}

# jsdom yoksa kur
if [ ! -d node_modules/jsdom ]; then
  echo "→ jsdom kuruluyor (npm install --prefix tests)…"
  (cd "$REPO" && npm install jsdom --no-audit --no-fund --prefix tests) || FAILED=1
fi

run "jsdom: Faz 6 (pencere/sentez/süre/kasa)" node dom/test6.js
run "jsdom: Faz 7 (kâsa rozeti)"             node dom/test7.js

PY="$REPO/.venv/bin/python"
[ -x "$PY" ] || PY="$(command -v python3)"
run "e2e: kâsa (gerçek uvicorn + mock upstream)" "$PY" e2e_vault.py

echo
if [ "$FAILED" -eq 0 ]; then
  echo "✅ TÜM PAKET YEŞİL"
else
  echo "❌ PAKETTE KIRMIZI VAR"
fi
exit $FAILED
