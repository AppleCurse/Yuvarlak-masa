#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  KONSÜL AI — VPS'e tek komut kurulum (Ubuntu/Debian, Docker)
#
#  1) Domain'inin A kaydı bu sunucunun IP'sini göstersin
#  2) Caddyfile içindeki DOMAIN'i kendi domaininle değiştir
#  3) sudo bash deploy.sh
#
#  Bitince: https://<domain> → KONSÜL AI (otomatik HTTPS)
# ─────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "→ Docker kurulu değil, kurulum yapılıyor (get.docker.com)…"
  curl -fsSL https://get.docker.com | sh
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "⚠ 'docker compose' eklentisi bulunamadı — Docker Engine 24+ gerektirir."
  exit 1
fi

if grep -q "^DOMAIN:" Caddyfile; then
  echo
  echo "⚠  Caddyfile hâlâ varsayılan 'DOMAIN' içeriyor."
  echo "   Kendi domaininle değiştirip tekrar çalıştır:  nano Caddyfile"
  exit 1
fi

echo "→ Image inşa ediliyor ve servisler başlatılıyor…"
docker compose up -d --build

echo
echo "✅ Kurulum tamam. Sonraki adımlar:"
echo "   1) Tarayıcıda https://<domain> adresini aç"
echo "   2) Sandalye modalından model ucu + API anahtarı gir"
echo "      (anahtar tarayıcıda KALMAZ — sunucu kâsasına yazılır)"
echo "   3) Hazır! Güncelleme:  git pull && docker compose up -d --build"
echo "      Yedek:           docker compose cp app:/data/konsul.db ./konsul_yedek_$(date +%F).db"
