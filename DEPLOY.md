# 🚀 KONSÜL AI — Deploy Rehberi

KONSÜL AI **tek process + tek URL** servistir: frontend ve API aynı adresten gelir.
Deploy = **kalıcı diski olan bir makine + HTTPS**. Bu rehber **Senaryo A**'yı (güvenli grup / paylaşılan tek konsey) hedefler — çok kullanıcılı ürün planı için denetim raporundaki P2 notlarına bak.

## Gerekenler
- Bir domain (A kaydı sunucu IP'ni gösterecek) — veya PaaS'ın verdiği URL
- Model ucu + API anahtarı (OpenAI / DeepSeek / Groq / 9Router / Ollama…)
- ~512 MB RAM yeterli (varsayılan makine tipi her yerde yeter)

---

## Seçenek 1 — VPS (Hetzner / DigitalOcean / Lightsail) ⭐ önerilen

```bash
# 1) Sunucuya gir, depoyu çek
git clone https://github.com/AppleCurse/Yuvarlak-masa.git && cd Yuvarlak-masa

# 2) Caddyfile'daki DOMAIN → kendi domainin
nano Caddyfile

# 3) Tek komut kurulum (Docker da yoksa kurar)
sudo bash deploy.sh
```

Tamam. `https://<domain>` → KONSÜL AI. Caddy otomatik Let's Encrypt sertifika alır.
Güncelleme: `git pull && docker compose up -d --build` · Yedek: `docker compose cp app:/data/konsul.db ./yedek.db`

**Mimari:** `internet → Caddy (443, TLS) → app (yalnız 127.0.0.1:8888)`. Uygulama portu doğrudan internete açık DEĞİL.

## Seçenek 2 — Fly.io

```bash
fly launch          # fly.toml'ü okur; app adı/region ister (region: ist)
fly volumes create data -s 1 -r ist
fly deploy
```

`fly.toml` hazır: DB `/data` volume'una yazılır (`KONSUL_DB_PATH=/data/konsul.db`), HTTPS otomatik.
URL: `https://<app>.fly.dev`.

## Seçenek 3 — Railway / Render

1. GitHub repo'sunu projeye bağla (root'taki **Dockerfile** otomatik bulunur).
2. Projeye **disk/volume** ekle (`/data` mount'ı).
3. Environment: `KONSUL_DB_PATH=/data/konsul.db` (`PORT` otomatik okunur).
4. Deploy → platformun verdiği `https://...` URL'i paylaş.

---

## İlk açılışta (platformdan bağımsız)
1. Tarayıcıda adresi aç → sağ panelde **sandalye** kartına tıkla.
2. **Base URL** + **Model** + **API Key** gir → Kaydet. Anahtar **sunucu kâsasına** yazılır, tarayıcıda kalmaz (koltuk çipinde 🔐 rozeti çıkar).
3. Hazır — koleksiyondan (Masa 04) karakter oturt, konseyi başlat.

Her koltuk farklı bir modele gidebilir (8 koltuk = 8 farklı model karışımı).

## Ortam değişkenleri (özet)
| Değişken | Varsayılan | Ne işe yarar |
|---|---|---|
| `KONSUL_HOST` | `127.0.0.1` | Bind adresi (deploy'da `0.0.0.0`) |
| `KONSUL_PORT` / `PORT` | `8888` | Port (PaaS `PORT`'unu otomatik kullanır) |
| `KONSUL_DB_PATH` | `<repo>/konsul.db` | DB dosyası — **kalıcı diske** göster |
| `KONSUL_CORS_ORIGINS` | *(kapalı)* | Farklı origin'den API kullanımı gerekirse |
| `KONSUL_LOCAL_PORTS` | `1234,11434,20128` | Aynı makinedeki lokal LLM portları (SSRF kilidi) |

## Bakım
- **Yedek:** `konsul.db` tek dosyadır — oturumlar, arşiv, karakterler, kâsa hepsi içinde. Haftalık kopyası yeterli.
- **Güncelleme:** `git pull` + yeniden `up -d --build` (Fly/Railway: otomatik).
- **Güvenlik:** Uygulama portunu doğrudan internete açma (VPS'te compose bunu yapar: `127.0.0.1` bind). CORS kapalı kalsın. API anahtarını kasaya (UI'dan) yaz — `.env`'e veya tarayıcıya yazma.

## ⚠️ Senaryo A gerçeği (okuyun)
Bu deploy **paylaşılan tek konseydir**: herkes aynı URL'i, aynı sandalyeleri, aynı kâsada senin model anahtarını kullanır; oturum/karakter arşivi ortak. Ekibin/arkadaşların için ideal; **her kullanıcının kendi hesabı ve anahtarı gereken** bir ürün istersen önce "çok kullanıcılı" dalgası (auth + kullanıcı-bazlı kasa) gerekir.
