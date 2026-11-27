# Faz 5 Durum Raporu — Karar çıktısı ve süreklilik

> Faz 5 · 2026-11-27 · Kod tamamlandı, 82/82 jsdom + 4/4 paylaşım testi, tam paket yeşil.
> **Kapsam:** kararın uygulanabilir ilk adımı, paylaşılabilir bağlantı + sosyal kart,
> 48 saat sonra hatırlatma ve sonucun **kanıt** olarak kaydı.

## 1. İncelenen dosyalar

| Dosya | Neden incelendi |
|---|---|
| `static/index.html` → `summaryPrompt` / `renderStructuredOutcome` | Hakem'in 7 bölüm listesi ve ayrıştırıcı (dinamik `##` ayrışımı) |
| `static/index.html` → `copyVerdictBtn` bölgesi | Karar kartı eylem satırı (paylaş butonu buraya) |
| `app.py` → `_require_session_owner`, `/api/session/report` | Sahiplik deseni ve rapor uçları |
| `engine.py` → `sessions` şeması, `session_owner_state`, `close_session` | Paylaşım sütunu ve salt-okunur okuma |
| `tests/run_all.sh` | Suite kaydı |

## 2. Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `static/index.html` | **Hakem:** başlık listesine `## ÖNERİLEN İLK ADIM` + `## BAŞARI GÖSTERGESİ` ve doldurma kuralı (48 saat/ölçülebilir). **Ayrıştırıcı:** bu iki başlık `outcome-sec-key` vurgu sınıfıyla altın şerit olarak render edilir (CSS). **Paylaş:** `#shareVerdictBtn` → `POST /api/session/share` (sahiplik başlığı) → bağlantıyı panoya kopyalar; arşiv kapalıysa dürüst uyarı verir. **48 saat:** karar başarıyla üretilince `localStorage.ym_decision_{sessionId}` yazılır; açılışta/jüri sonunda `checkDecisionReminders()` banner çıkarır; bildirim `/api/neuro/outcome` ile **kanıt** olarak gider (beğeni değil), "Şimdi değil" 48 saat erteler. |
| `engine.py` | `sessions.shared_at` sütunu (ALTER, eski DB uyumlu); `share_session()` (idempotent); `get_public_session()` — **yalnızca** paylaşıma açılmış oturumda topic + verdict + tarih; mesaj asla dönmez. |
| `app.py` | `POST /api/session/share` (sahiplik zorunlu); `GET /paylas/{sid}` — herkese açık salt-okunur HTML: og:title/description/type, twitter:card, karar metni, dürüst not ("tutanak/paylaşılmaz, model çıktısı, tavsiye değildir"); paylaşıma kapalıysa **404** sayfası. |
| `tests/test_faz5_share.py` | **Yeni 4 test:** sahiplik 403, paylaşımsız 404, akış (topic+verdict+og var, **mesaj sızıntı yok**), idempotent. |
| `tests/dom/test_home_experience.js` | **9 yeni test (F5-1…F5-9)** → **82/82**. |
| `tests/run_all.sh` | `faz5` suite kaydı. |
| `static/tailwind.css` | Yeni sınıflar derlendi. |
| `FAZ0_DURUM_RAPORU.md`, `README.md` | Faz 5 satırları → ✅. |

## 3. Test komutları ve sonuçları

| Komut | Sonuç |
|---|---|
| `cd tests && ../.venv/bin/python test_faz5_share.py` | **✅ 4/4 OK** |
| `cd tests && node dom/test_home_experience.js` | **✅ 82 YEŞİL / 0 KIRMIZI** |
| `bash tests/run_all.sh` | **✅ TÜM PAKET YEŞİL** |
| `node --check` (uygulama scripti) | ✅ |

Kanıtlar: hakem promptu iki yeni bölüm istiyor (F5-2), 9 bölüm ayrışıyor + altın şerit
(F5-3/4), paylaşım sahiplik anahtarıyla gidiyor (F5-5), 49 saatlik karar banner'ı
doğru soruyu gösteriyor (F5-6/7), sonuç bildirimi outcome ucuna gidiyor ve banner
kapanıyor (F5-8/9); sunucu tarafında mesaj metni paylaşılan sayfaya sızmıyor (FAZ5-4).

## 4. Canlı doğrulama durumu

**Yapılmadı (sandbox'ta canlı erişim yok).** Canlı turda görülecek: karar kartında
**Paylaş** → bağlantıyı tarayıcıda açınca sosyal önizlemeli sayfa; paylaşımsız oturumda
404; karardan 48 saat sonra banner + sonuç bildirimi. Bu teyit bir sonraki tur raporuna yazılacak.

## 5. Tamamlanan / Kısmen / Açık

- **Tamamlandı:** 9 bölümlü hakem çıktısı + vurgulu ilk adım şeridi; paylaşım ucu +
  herkese açık salt-okunur sayfa + sosyal kart; 48 saat hatırlatma + outcome kanalı;
  testler (4/4 + 82/82), dokümanlar.
- **Kısmen:** canlı teyit (§4).
- **Açık:** paylaşım sayfasına karar raporunun (`report_md`) tam metnini opsiyonel ekleme;
  hatırlatma için e-posta/push (gerçek sunucu bildirimi — yalnızca tarayıcı içi çalışıyor,
  "bildirim gönderilmiyor" dürüstlüğü korunuyor).

## 6. Sonraki faz koşulu (Faz 6 — Keşif sayfaları)

Faz 5'in canlıda bir kez doğrulanması. Faz 6 (`/ev-mi-kira-mi` gibi konu sayfaları)
bu girdiyi beklemez; SEO/keşif sayfaları sunucu tarafında statik içerik olarak çıkar.
