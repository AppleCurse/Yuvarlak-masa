# TESLİMAT RAPORU — Yuvarlak Masa v1.3
**İlk kullanım, gerçek/demo dürüstlüğü ve anlaşılır sonuç sunumu**

| | |
|---|---|
| Depo | `https://github.com/AppleCurse/Yuvarlak-masa` |
| Çalışma dalı | `arena/93553bac-yuvarlak-masa` |
| Başlangıç commit (main) | `6eb1ecfcc58adceb516fb6cbd31026f3aa1cd8a1` |
| Teslim commitleri | `a7b596b` (arka uç + güvenlik notu) → `90acfb0` (ön yüz) → `2deb18e` (testler) → docs (bu rapor + README) |
| Test durumu | `bash tests/run_all.sh` → **TÜM PAKET YEŞİL** |
| Bu oturumda yapılamayan | Gerçek tarayıcı testi (chromium yok) ve canlı uç doğrulaması (dış ağ kısıtlı) — Bölüm 8 |

`main` dalına **hiçbir** değişiklik yazılmadı; tüm iş ayrı dalda.

---

## 1. Önce doğrulama (eski raporlara güvenmeden, koddan)

Her bulgu gerçek kod yolu üzerinden doğrulandı:

| Önceki bulgu | Kod kanıtı | Doğrulandı mı |
|---|---|---|
| 7 ayrı çalışma alanı | `static/index.html` → 7 `.roomnav` (data-room: council, jury, synth, characters, envelope, archive, arena) | ✅ |
| Sağlayıcı/uç/model/anahtar ayarı ilk kullanımda karmaşık | `#mTest` + kâsa modali; ilk açılışta hiçbir yönlendirme yok | ✅ |
| Backend yoksa demo/simülasyon devreye giriyor | Eski `applyStatus()` backend düşükken demo'yu **otomatik açıyordu**; `streamChat` sunucu yoksa sessizce `demoStream()`'e düşüyordu | ✅ (en kritik) |
| Demo çıktısı gerçek tutanak gibi arşivleniyor | `finalizeCouncilRecord`, `/api/session/start`, operatör kaydı, arena, zarf — hiçbirinde demo kapısı yoktu | ✅ (koddan; canlı koşu bu oturumda yapılmadı) |
| Sahte başarı | `#mTest` demo modunda "DEMO: uç erişilebilir kabul edildi"; demo sentezde uydurma "Hakem Raporu"; karar raporu kaydı koşulsuz + "Belge arşive damgalandı" | ✅ |
| Kör jüri/sentez/delta/karar raporu = model çıktısı | Hepsi LLM çağrısı; bağımsız doğrulama yok | ✅ |
| Mühürlü zarf hash'i yalnız metin bütünlüğü | `runSealCol`/`#btnEnvOpen` → SHA-256 + zaman damgası; kimlik/iddia kanıtı değil | ✅ |
| Anahtar saklama & kimlik doğrulama | `auth:"none"`, `key_storage:"plaintext-sqlite"`, SSRF kilidi var, ham anahtar arayüze dönmüyor | ✅ (`GUVENLIK_NOTU.md`) |

---

## 2. Değişen dosyalar ve **neden**

### `static/index.html` — ana iş
| Değişiklik | Neden |
|---|---|
| v1.3 CSS katmanı: bant, rozet, jargon, ray grubu, işlem şeridi, sihirbaz, sözlük, güven notları, taşma düzeltmeleri, mobil kurallar | Yeni akışın görsel dili; mevcut temayı bozmadan |
| Üst şerit: sade slogan + **durum göstergesi** + `BAŞLANGIÇ`, `SÖZLÜK`, `DEMO`, `YENİ GÖRÜŞME` + kalıcı demo bandı | Gerçek/demo farkının ekranın en görünür yerinde olması |
| Ray iki katmana ayrıldı: **3 adım** (Tartışma Masası › Bağımsız Yanıtlar › Karar Özeti) + katlanır **İleri araçlar** (4) | Kullanıcıyı 7 odayla boğmamak; **hiçbir oda kaldırılmadı** |
| 3 adımlı rehber (hedef kartları → bağlantı durumu/testi/gelişmiş → konu+sandalye), `localStorage.konsul_onboarded`, `?welcome=1` | "Ne yapmak istiyorsun?" sorusuyla başlayan tek başlangıç akışı |
| 13 maddelik sözlük + 7 odada `ⓘ` jargon düğmeleri | "Sentez", "ikna deltası", "mühürlü zarf" açıklamasız kalmıyor |
| İşlem günlüğü (job strip): ne başladı / hangi model / bitti-hata / **sonuç nerede** | Eylem ve durum bildirimi |
| `streamChat`: sessiz demo yedeği kaldırıldı; sunucu yoksa dürüst hata | Sahte başarıyı kökten kaldıran düzeltme |
| Mesaj başlığında `DEMO` rozeti + `model @ uç` etiketi (`.modeltag`) | Hangi katılımcı, hangi gerçek model |
| `finalizeCouncilRecord`, oturum başlatma, operatör kaydı, kapanış, zarf, delta, arena → `archivingOn()` kapısı | Demo hiçbir şeyi arşive yazmıyor |
| Sentez başlığı demo modunda "DEMO ÖRNEK RAPOR", gövdeye uyarı | Demo çıktısı gerçek rapor gibi görünmüyor |
| `#mTest` demo modunda "erişilebilir kabul edildi" **demiyor** | Sahte başarı kaldırıldı |
| İddia doğrulama: kaynak yoksa hüküm `KAYNAK YOK — DOĞRULANMADI` | Doğrulanamayan iddia kesin bilgi gibi sunulmuyor |
| Karar raporu: arşiv sonucu (başarılı/başarısız + neden) belge altında ve toast'ta | Başarısız yazım "damgalandı" demiyor |
| Sade dil geçişi: `Gündem→Konu`, `Ham Malzeme→Kaynak metin`, `Başhakem→Değerlendiren model (hakem)`, `Sentez Raporu Üret→Özeti Oluştur`, `NİHAİ RAPOR→KARAR ÖZETİ`, `MASA KOLTUKLARI→KAÇ SANDALYE`, `Director's Cut→İÇ SESİ GÖSTER`, `Gerilim Metresi→Masa Isısı (hakem tahmini)` | Teknik terim yerine sonuç odaklı dil; işlevler korunarak |
| `.modeltag` adı `.meter .mtag` ile çakışmayacak şekilde seçildi, `.autorow` taşma kırpması düzeltildi | Dar ekran regresyonları |

### `app.py`
- `GET /api/health` artık **dürüst teşhis** döndürür: `version 1.3.0`, `ai:"upstream"`,
  `simulation_in_backend:false`, `auth:"none"`, `key_storage:"plaintext-sqlite"`, `exposed`.
  *Neden:* arayüz "gerçek model mi, demo mu" sorusunu tahminle değil sunucudan öğreniyor.
- `HOST` loopback değilse açılışta güvenlik uyarısı. *Neden:* kâsa düz metin anahtar tutuyor.

### `engine.py`
- `init_database()` SQLite dosyasını `0o600` yapar (`-rw-------` doğrulandı).
  *Neden:* aynı makinedeki başka kullanıcılar anahtar dosyasını okumasın (şifreleme değil, sınırlı önlem).

### Testler
| Dosya | Değişiklik | Neden |
|---|---|---|
| `tests/dom/test_onboarding.js` **(yeni)** | 33 kontrol: rehber otomatik açılış → hedef kartları → atla; sözlük; ileri araçların kapalı olması; demo bandı/rozeti/**0 arşiv kaydı**; demo'da sahte test yok; gerçek modda oturum+mesaj yazımı + model etiketi + işlem günlüğü; karar raporu arşiv hatası/başarısı; sunucu yokken dürüst hata; `?welcome=1` | v1.3 davranışını regresyona karşı kilitler |
| `tests/dom/test6.js`, `test7.js` | `TextDecoder/TextEncoder` polyfill | jsdom sürümlerinde eksik olabilen API (test artefaktı önlemi) |
| `tests/e2e_vault.py` | `version 1.3.0` + `ai/auth/simulation_in_backend` teşhis kontrolleri | Sahte teşhis gerilemesini yakalar |
| `tests/browser/responsive.cjs` | `konsul_onboarded=1` init script | Geri dönen kullanıcı senaryosu (rehber modalı ölçümü bozmasın) |
| `tests/package.json`, `tests/run_all.sh` | jsdom `^26.1.0` (sabit) + yeni test `run_all.sh`'e eklendi | jsdom 30/31 Node 20'de `undici/zstd` ile çöküyor; sürüm sabitlendi |

### Dokümanlar
- `README.md`: en üste **"İlk 5 dakika"** + "Gerçek mi, demo mu?" + "Neyi ciddiye almalı?" tablosu;
  eski 7 oda kataloğu aşağıda korundu.
- `GUVENLIK_NOTU.md` (yeni): doğrulanan güvenlik bulguları, uygulanan sınırlı düzeltmeler,
  **bilinçli olarak yapılmayanlar** (auth katmanı, anahtar şifreleme, çok kullanıcı, rate limit).

---

## 3. Önce / sonra

| # | Davranış | ÖNCE (main `6eb1ecf`) | SONRA (bu dal) |
|---|---|---|---|
| 1 | İlk açılış | Boş sibernetik masa; ne yapılacağı yalnız küçük bir boş durum yazısında | 3 adımlı rehber kendiliğinden açılır: "Ne yapmak istiyorsunuz?" + 4 hedef kartı |
| 2 | Demo koşusu arşive yazıyor mu | **Yazıyordu** (kapı yok) | **Yazmıyor**: jsdom demo koşusu → 0 arşiv POST'u |
| 3 | Gerçek koşu | Çalışıyordu ama demo'dan ayırt etmek zordu | Oturum + mesaj yazımı; günlük "Tartışma Masası + Arşiv"; söz başlığında `model @ uç` |
| 4 | Durum göstergesi | Yalnız "DEMO SİMÜLASYONU" / "CANLI" | `DEMO · GERÇEK MODEL YOK` ↔ `GERÇEK MODEL · …` ↔ `SUNUCU YOK` |
| 5 | Sunucu kapalıyken | Sessizce demo'ya düşüp **sahte model yanıtı** üretiyordu | `SUNUCU YOK` durumu + dürüst hata mesajı, sahte yanıt yok |
| 6 | Bağlantı testi (demo) | "DEMO: uç erişilebilir kabul edildi" (sahte başarı) | Demo modunda test yapılmıyor, "gerçek çağrı yapılmaz" deniyor |
| 7 | Demo sentezi | Uydurma "Hakem Raporu" gerçek rapor gibi | Başlık `DEMO ÖRNEK RAPOR` + gövdede uyarı |
| 8 | Karar raporu kaydı | Koşulsuz + "Belge arşive damgalandı" | Gerçek sonuç: başarılıysa "arşive yazıldı", hata varsa "arşive YAZILAMADI: <neden>" |
| 9 | Kaynaksız iddia | Hüküm olduğu gibi yazılıyordu | `KAYNAK YOK — DOĞRULANMADI` hükmü + günlük kaydı |
| 10 | 7 oda + teknik ayar yükü | Hepsi ilk ekranda | 3 adım görünür, 4 ileri araç katlanır (tek tıkla açılır, hiçbiri silinmedi) |
| 11 | Terimler | Açıklamasız | 13 maddelik sözlük + 7 odada `ⓘ` |

---

## 4. Testler — komutlar ve **gerçek çıktı**

```
$ bash tests/run_all.sh
  → jsdom: Faz 6 (pencere/sentez/süre/kasa): YEŞİL        (35/35)
  → jsdom: Faz 7 (kâsa rozeti): YEŞİL                      (8/8)
  → jsdom: öznel geri bildirim kimliği: YEŞİL              (OK)
  → jsdom: ilk kullanım + demo/gerçek ayrımı: YEŞİL        (33/33)
  → nörodinamik: karakter ve oturum izolasyonu: YEŞİL      (11/11)
  → e2e: kâsa (gerçek uvicorn + mock upstream): YEŞİL      (21/21)
✅ TÜM PAKET YEŞİL
```

Ortam: Node v22.22.3, jsdom 26.1.0, Python venv (fastapi/uvicorn/httpx).

**Çalıştırılamayan test:** `tests/browser/responsive.cjs` — bu kum havuzunda chromium/Playwright
yok. `run_all.sh` içinde değil (önceden de değildi); dosya v1.3'e uyarlandı (`konsul_onboarded`
init script) ama koşulamadı.

---

## 5. Güvenlik (özet — ayrıntı `GUVENLIK_NOTU.md`)

- **Doğrulanan:** kimlik doğrulama yok (`auth:"none"`), anahtarlar düz metin SQLite'ta, loopback dışına
  bağlanırsa kâsa uzaktan kullanılabilir. Sağlam olanlar: SSRF kilidi (metadata IP reddediliyor),
  ham anahtar arayüze dönmüyor, CORS varsayılan kapalı, `.env`/`konsul.db` gitignore'da.
- **Uygulanan sınırlı düzeltme:** DB dosyası `0600`, loopback dışı açılış uyarısı, `/api/health`'te
  dürüst teşhis alanları.
- **Uygulanmayan (izinsiz yapılmadı):** auth katmanı, anahtar şifreleme, çok kullanıcı, rate limit.

## 6. Bozulmadığı doğrulananlar

API anahtarı kâsa akışı (21/21 e2e), arşiv (demo artık yazmıyor, gerçek yazıyor — jsdom POST
yakalama ile), 7 odanın tamamı erişilebilir (12. kontrol), karakter kütüphanesi, jüri/sentez/zarf/
delta/karar raporu istemleri, zaman makinesi, TTS düğmeleri, oturum kapatma — mevcut regresyon
testleri (35/35, 8/8, 11/11) yeşil.

## 7. Bilinen sınırlar

- Demo şablonları hâlâ sabit metin; ama artık **her yerde** "DEMO" etiketli ve arşiv dışı.
- Sözlük ve rehber metinleri Türkçe; i18n altyapısı yok (mevcut ürün de tek dilli).
- Otomatik tarayıcı testi (`responsive.cjs`) harici chromium yolu gerektiriyor; `run_all.sh` içinde değil.

## 8. UNKNOWN / kapanmayan maddeler

1. **UNKNOWN — Uçtan uca gerçek sağlayıcı matrisi.** Bu oturumda canlı uç denemesi yapılmadı
   (kum havuzu dış ağ kısıtlı; `text.pollinations.ai` erişilebilir değil). Davranış jsdom + mock
   upstream düzeyinde doğrulandı.
2. **UNKNOWN — Uzun oturumlarda maliyet/gecikme.** 8 sandalye × çok tur zincirinin gerçek
   sağlayıcıda süre/maliyet profili ölçülmedi.
3. **UNKNOWN — Gerçek tarayıcıda görsel/responsive/TTS doğrulaması.** Bu oturumda tarayıcı yok;
   390 px taşma düzeltmesi kod düzeyinde (`.autorow` esnek kuralı) uygulandı, gözle görülmedi.
4. **Kapsam dışı bırakıldı (izin gerekir):** kimlik doğrulama katmanı, anahtar şifreleme, çok kullanıcılı
   yetkilendirme, rate limit — mimari değişiklik; ayrı onay ister.
