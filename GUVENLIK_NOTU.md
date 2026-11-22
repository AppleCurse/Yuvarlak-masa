# GÜVENLİK NOTU — Yuvarlak Masa / KONSÜL AI (v1.3)

Bu dosya, 2026-11-21 tarihli uygulama çalışmasında **kaynak koddan doğrulanan** güvenlik
bulgularını ve uygulanan **sınırlı** düzeltmeleri kaydeder. Doğrulanmamış iddia yoktur;
her satırın dayanağı dosya/fonksiyon olarak verilmiştir.

## 1. Doğrulanan bulgular

| # | Bulgu | Kanıt | Durum |
|---|-------|-------|-------|
| G1 | **API'de kimlik doğrulama yok.** `/api/chat`, `/api/chat/stream`, `/api/credentials` vb. uçlar kimlik doğrulaması istemez. | `app.py` rotalarında auth bağımlılığı yok (tüm `@app.*` tanımları) | **Açık — kapsam dışı bırakıldı** (aşağıya bakın) |
| G2 | **API anahtarları düz metin saklanıyor.** `api_credentials.api_key` sütunu şifrelenmemiş. | `engine.py` → `init_database()` / `save_api_credential()` | Kısmen azaltıldı (G2-fix) |
| G3 | **Sunucu loopback dışına bağlanırsa kâsa uzaktan kullanılabilir.** Varsayılan `KONSUL_HOST=127.0.0.1`; Docker/fly/PaaS yapılandırmaları 0.0.0.0'a bağlar. Bu durumda erişebilen herkes kasadaki anahtarla model çağırabilir. | `app.py` `HOST` tanımı, `Dockerfile`, `fly.toml` | Uyarı eklendi (G3-fix) |
| G4 | **SSRF kilidi var** (yalnız http/https; yerel hedefler `KONSUL_LOCAL_PORTS` ile sınırlı). Doğrulandı, açık bulunmadı. | `app.py` → `_validate_base_url()`; `tests/e2e_vault.py` "metadata IP reddedildi" | Sağlam |
| G5 | **Ham anahtar arayüze dönmez.** `GET /api/credentials` yalnız `key_hint` döndürür; tarayıcı `localStorage`'ına anahtar yazılmaz. | `engine.list_api_credentials()`, `static/index.html` `saveSeats()`, `tests/dom/test6.js` | Sağlam |
| G6 | **CORS varsayılan olarak kapalı** (same-origin). | `app.py` `KONSUL_CORS_ORIGINS` | Sağlam |

## 2. Uygulanan sınırlı düzeltmeler

**G2-fix — veritabanı dosya izinleri**
`engine.init_database()` artık SQLite dosyasını `0o600` (yalnız sahibi okur/yazar) yapar.
Amaç: aynı makinedeki başka kullanıcıların düz metin anahtar dosyasını okumasını engellemek.
Şifreleme değildir; disk erişimi olan (root, yedekleme) bir saldırganı durdurmaz.

**G3-fix — görünür uyarı + dürüst teşhis**
- `app.py` açılışta, `HOST` loopback değilse konsola açık bir güvenlik uyarısı yazar.
- `GET /api/health` artık `"auth": "none"` ve `"key_storage": "plaintext-sqlite"` alanlarını döndürür.
  Arayüz bu bilgiyi gösterir; "güvenli" olduğu izlenimi verilmez.

## 3. Bilinçli olarak YAPILMAYANLAR (kapsam dışı, öneri)

Aşağıdakiler mimari değişiklik gerektirir ve bu çalışmanın kapsamı dışında bırakılmıştır
(izinsiz uygulanmadı):

1. **Kimlik doğrulama katmanı** (token/oturum) ve buna bağlı arayüz giriş akışı.
   v1.4 kararı: Konsul token İSTENMEDİ — herkes kendi sağlayıcı anahtarıyla gelir (BYOK).
   Bu, dışa açık çalışmada kâsa riskini azaltmaz; bkz. Bölüm 4.
2. **Anahtar şifreleme** (KMS/OS keyring ya da parola türevi anahtar). Düz metin → şifreli
   geçiş, mevcut kâsanın göçünü ve anahtar kaybı riskini gerektirir.
3. **Çok kullanıcılı yetkilendirme** (koltuk sahipliği, oturum izolasyonu).
4. ~~**Rate limit / kötüye kullanım koruması**~~ — **v1.4'te YAPILDI:** model çağrısı yapan
   uçlarda IP başına dakikada 60 çağrı (`KONSUL_RATE_LIMIT_PER_MIN`), `429` + `Retry-After`.
   İşlem-içi sayaçtır; çok çalışanlı dağıtımda çalışan başına ayrı sayar.

## 4. Operatör için pratik öneriler

- Uygulamayı **güvenilmeyen ağlara açmayın** (varsayılan `127.0.0.1` en güvenli seçenektir).
- Dışarı açmanız gerekiyorsa önüne **kimlik doğrulamalı bir ters vekil** (Caddy/nginx + basic auth
  veya SSO) koyun; `Caddyfile` bu amaçla kullanılabilir.
- Veritabanını (`KONSUL_DB_PATH`) şifreli bir diskte tutun ve yedeklerini şifreleyin.
- API anahtarlarınızı sağlayıcı panelinden düzenli olarak döndürün (rotate edin).
