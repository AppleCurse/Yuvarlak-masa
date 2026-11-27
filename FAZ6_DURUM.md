# Faz 6 Durum Raporu — Keşif sayfaları

> Faz 6 · 2026-11-27 · Kod tamamlandı, 4/4 Python + 84/84 jsdom, tam paket yeşil.

## 1. İncelenen dosyalar

| Dosya | Neden incelendi |
|---|---|
| `app.py` (`/`, `/classic`, `app.mount("/static")`) | Rota sırası — yakalama rotası olmaması gerektiği (classic/static çakışmaması) |
| `app.py` `_share_page_html` | Dürüst, koyu/sıcak sayfa şablonu (yeniden kullanım) |
| `static/index.html` (`questionInput`, `loadInitialData`) | Soru ön-doldurma noktası |

## 2. Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `app.py` | **`TOPICS`** (4 konu: ev-mi-kira-mi, is-degisikligi, borc-kapatma, tasinma-sehir — başlık, lede, hazır soru); `_topic_page_html()` (og/twitter kartı, masanın işleyişi, **`/?soru=…` CTA**, diğer kararlara bağlantı, "tavsiye değildir" notu); dört açık rota (yakalama rotası YOK → `/classic` ve `/static` çakışmaz); `GET /sitemap.xml` (bugün + ana sayfa + 4 konu). |
| `static/index.html` | `prefillQuestion(q)` + `prefillFromUrl()` — `/?soru=…` ile gelen soru kutusuna yazılır, olay tetiklenir (bağlam seçicileri de çalışır). |
| `tests/test_faz6_topics.py` | **Yeni 4 test:** sayfa 200 + CTA + geri dönüş + dürüst not; **garanti/kesin kazanç dili yok**; sitemap kapsamlı; bilinmeyen yol 404. |
| `tests/dom/test_home_experience.js` | F6-1/2: ön-doldurma → **84/84**. |
| `tests/run_all.sh`, `FAZ0_DURUM_RAPORU.md`, `README.md` | Kayıt + satırlar → ✅. |

## 3. Test komutları ve sonuçları

| Komut | Sonuç |
|---|---|
| `cd tests && ../.venv/bin/python test_faz6_topics.py` | **✅ 4/4 OK** |
| `cd tests && node dom/test_home_experience.js` | **✅ 84/84** |
| `bash tests/run_all.sh` | **✅ TÜM PAKET YEŞİL** (8 suite) |

## 4. Canlı doğrulama durumu

Yapılmadı (sandbox erişimi yok). Canlıda: `/ev-mi-kira-mi` → sayfa + CTA → ana sayfada
soru hazır; `robots`/sitemap keşfi. Bir sonraki tur raporuna yazılacak.

## 5. Tamamlanan / Kısmen / Açık

- **Tamamlandı:** 4 konu sayfası, sitemap, soru ön-doldurma, dürüstlük testi, paket.
- **Kısmen:** canlı teyit (§4).
- **Açık:** daha fazla konu (içerik üretimi), `robots.txt`, çok dilli varyant (İngilizce).

## 6. Sonraki faz koşulu (Faz 7 — Güven ve olgunluk)

Faz 6'nın canlıda görünür olması. Faz 7 (kaynak/yorum/varsayım ayrımı, kalite ölçümü,
veri kontrol paneli) bu girdiyi beklemez.
