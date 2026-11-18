# 🚀 KONSÜL AI — Deploy Rehberi

KONSÜL AI **tek process + tek URL** servistir: frontend ve API aynı adresten gelir.
Deploy = **kalıcı diski olan bir makine + HTTPS**. Bu rehber **Senaryo A**'yı (güvenli grup / paylaşılan tek konsey) hedefler — çok kullanıcılı ürün planı için denetim raporundaki P2 notlarına bak.

**Öneri:** İlk canlıya alma için **Fly.io** (Seçenek 1) — ~5 dakikada, sunucu yönetimi olmadan, otomatik HTTPS + kalıcı volume + İstanbul bölgesi (`ist`, düşük gecikme). Kendi domain'in varsa ve ayda minimum maliyet istiyorsan VPS (Seçenek 2).

## Gerekenler
- Model ucu + API anahtarı (OpenAI / DeepSeek / Groq / 9Router / Ollama…)
- ~512 MB RAM yeterli (Fly varsayılan 256 MB makine de yeter; gerekirse büyüt)
- Domain: Fly'da **gerekmez** (ücretsiz `*.fly.dev`); istersen sonradan eklersin

---

## Seçenek 1 — Fly.io ⭐ önerilen (en hızlı yol)

**Neden bu uygulama için en iyi:** KONSÜL'ün tüm durumu (oturumlar, arşiv, karakterler, **API anahtarı kasası**) tek bir SQLite dosyasında (`konsul.db`). Fly **kalıcı volume** ile bunu hazır çözer; makine silinse bile veri durur. `ist` (İstanbul) bölgesi düşük gecikme verir. HTTPS, sertifika, firewall, sunucu güncellemesi — hepsi platformda, sende SSH yok. Küçük makine ayda birkaç $'a mal olur ve 7/24 açık kalır.

**İlk kez Fly.io mu? (hesap + CLI, ~3 dakika)**
1. [fly.io](https://fly.io) → **Sign up** → **GitHub ile giriş** (e-posta onayı ister; kart bilgisi ekletebilir — küçük makine ayda birkaç $).
2. CLI kur (bir kez): https://fly.io/download · macOS: `brew install flyctl` · Linux: `curl -L https://fly.io/install.sh | sh`
3. `fly login` → tarayıcı açılır, giriş yapılır.

```bash
# 0) Repo kökünde çalıştır (root'taki Dockerfile otomatik bulunur):
fly launch --no-deploy           # app adı/region sorar → fly.toml'deki yuvarlak-masa + ist kabul et
fly volumes create data -s 1 -r ist
fly deploy
```

- **URL:** `https://yuvarlak-masa.fly.dev` — anında, otomatik HTTPS. Paylaş.
- **Not:** App adları global benzersizdir; `yuvarlak-masa` alınmışsa Fly bir varyasyon önerir — seçtiğini `fly.toml`'daki `app =` satırına yazıp devam et.
- **Kendi domain'in varsa:** `fly domains add senin-domain.com` → DNS panelinde CNAME yaz: `senin-domain.com → yuvarlak-masa.fly.dev` (Fly sertifika otomatik alır).
- **Kullanlılar:** `fly logs` (log) · `fly scale memory 512` (RAM büyütme) · `fly ssh console` (makineye shell).
- **Yedek:** `fly ssh console -C "cat /data/konsul.db" > yedek.db`
- `fly.toml` hazır: DB `/data` volume'una yazılır (`KONSUL_DB_PATH=/data/konsul.db`), `/api/health` health-check'i tanımlı (bozulursa otomatik yeniden başlatır), makine 7/24 açık.

## Seçenek 2 — VPS (Hetzner / DigitalOcean / Lightsail)

Uzun vadede en ucuzu; karşılığında domain + sunucu bakımı sende.

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

## Seçenek 3 — Railway / Render

1. GitHub repo'sunu projeye bağla (root'taki **Dockerfile** otomatik bulunur).
2. Projeye **disk/volume** ekle (`/data` mount'ı).
3. Environment: `KONSUL_DB_PATH=/data/konsul.db` (`PORT` otomatik okunur).
4. Deploy → platformun verdiği `https://...` URL'i paylaş.

Not: Render'ın ücretsiz katmanı uykuya yatar (paylaşılan araç için istikrarsız) — ücretli "always on" gerektirir. Her ikisi de ABD/Avrupa bölgesinde; Fly'ın `ist` bölgesine kıyasla gecikme biraz daha yüksek.

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
- **Yedek:** `konsul.db` tek dosyadır — oturumlar, arşiv, karakterler, kâsa hepsi içinde. Haftalık kopyası yeterli (Fly: `fly ssh console -C "cat /data/konsul.db" > yedek.db` · VPS: `docker compose cp app:/data/konsul.db ./yedek.db`).
- **Güncelleme:** `git pull` + yeniden `up -d --build` (Fly: `fly deploy` — main'e merge olunca tek komut).
- **Güvenlik:** Uygulama portunu doğrudan internete açma (VPS'te compose bunu yapar: `127.0.0.1` bind). CORS kapalı kalsın. API anahtarını kasaya (UI'dan) yaz — `.env`'e veya tarayıcıya yazma.

## ⚠️ Senaryo A gerçeği (okuyun)
Bu deploy **paylaşılan tek konseydir**: herkes aynı URL'i, aynı sandalyeleri, aynı kâsada senin model anahtarını kullanır; oturum/karakter arşivi ortak. Ekibin/arkadaşların için ideal; **her kullanıcının kendi hesabı ve anahtarı gereken** bir ürün istersen önce "çok kullanıcılı" dalgası (auth + kullanıcı-bazlı kasa) gerekir.
