#!/usr/bin/env bash
# KONSÜL AI — tam regresyon paketi (tek komut)
#   bash tests/run_all.sh
# Gereksinim: node (jsdom için), .venv veya fastapi kurulu sistem python'u.
#
# BAYAT PAKET NOTU (v2.6): tests/dom/{test6,test7,test_onboarding,test_byok,test_neuro_feedback}.js
# dosyaları v1.3/v1.4 arayüzüne yazılmıştır (wizardModal, room-council, demoToggle vb.
# kimlikler mevcut static/index.html'de YOKTUR). Bu beş dosya bu depo üzerinde
# DEĞİŞİKLİK ÖNCESİ de kırmızıydı; v2.6 ana sayfa deneyimi bunların yerine
# test_home_experience.js ile kapsanır. Eski dosyalar tarihçe için korunur.
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

run "jsdom: v2.7 ana sayfa deneyimi (gizlilik/özel koltuk/uyarılar)" node dom/test_home_experience.js

PY="$REPO/.venv/bin/python"
[ -x "$PY" ] || PY="$(command -v python3)"
run "nörodinamik: karakter ve oturum izolasyonu" "$PY" test_neuro_integration.py
run "gizlilik kilidi: sahiplik anahtarı + arşiv persist" "$PY" test_archive_lock.py
run "e2e: kâsa (gerçek uvicorn + mock upstream)" "$PY" e2e_vault.py
run "hız sınırı (gerçek uvicorn, düşük limit)"  "$PY" test_ratelimit.py

echo
if [ "$FAILED" -eq 0 ]; then
  echo "✅ TÜM PAKET YEŞİL"
else
  echo "❌ PAKETTE KIRMIZI VAR"
fi
exit $FAILED
