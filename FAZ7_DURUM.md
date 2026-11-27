# Faz 7 Durum Raporu — Güven ve olgunluk

> Faz 7 · 2026-11-27 · Kod tamamlandı, 4/4 Python + 89/89 jsdom, tam paket yeşil.
> **Kapsam:** (1) kaynak/yorum/varsayım ayrımı, (2) düzenli kalite ölçümü,
> (3) veri kontrol paneli (özet + silme).

## 1. İncelenen dosyalar

| Dosya | Neden incelendi |
|---|---|
| `static/index.html` → `summaryPrompt`, `outcomeSections` | Hakem kuralları ve karar kartı render'ı (etiket şeridi) |
| `static/index.html` → `view-history` | Veri kontrol panelinin yerleşeceği yer |
| `engine.py` → `list_sessions`, `hash_owner_token` | Sahiplik filtresi deseni (özet/silme için yeniden kullanım) |
| `app.py` → `_owner_token`, `decision_reports`/`messages`/`envelopes` şemaları | Sayım ve silme alanları |

## 2. Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `static/index.html` | **Hakem kuralı:** `OLASI KARAR YOLLARI`/`RİSKLER` maddelerine `[KAYNAK]`/`[YORUM]`/`[VARSAYIM]` etiketi. **Şeridi:** `#claimLegend` — karar ayrışınca görünür ("iddiaları böyle ayırt edebilirsin"), yeni turda gizlenir. **Veri paneli:** Geçmiş sekmesinde "Veri kontrol paneli" kartı — `Neler var?` → `GET /api/data/overview` özet satırı; `Verilerimi sil` → onay → `DELETE /api/data/my`. |
| `engine.py` | `owner_session_ids(conn, token)` — token varsa kendi kilitli kayıtları, yoksa yalnızca kilitsiz kayıtlar. |
| `app.py` | `GET /api/quality/report` (tamamlanma oranı, ortalama bölüm, ≥7 bölüm, ilk adım/başarı göstergesi kapsama, kısa kararlar, rapor/mesaj/beğeni/backtest sayıları — **yalnızca sayılar, içerik yok**); `GET /api/data/overview` (sahibin oturum/mesaj/rapor/mühür/beğeni/backtest/paylaşım sayıları); `DELETE /api/data/my` (sahibin messages/envelopes/reports/fact_checks/ratings/backtest/sessions satırları — **diğer sahipler dokunulmaz; karakter tahminleri + API anahtarları korunur**). |
| `tests/test_faz7_trust.py` | **Yeni 4 test:** rapor sayım + içerik sızıntısı yok; özet sahip kapsamı; silme başkasına dokunmaz; token'sız silme kilitliye dokunmaz. |
| `tests/dom/test_home_experience.js` | F7-1…F7-5 → **89/89**. |
| `tests/run_all.sh`, `FAZ0_DURUM_RAPORU.md`, `README.md` | Kayıt + satırlar → ✅. |
| `static/tailwind.css` | Yeni sınıflar derlendi. |

## 3. Test komutları ve sonuçları

| Komut | Sonuç |
|---|---|
| `cd tests && ../.venv/bin/python test_faz7_trust.py` | **✅ 4/4 OK** |
| `cd tests && node dom/test_home_experience.js` | **✅ 89/89** |
| `bash tests/run_all.sh` | **✅ TÜM PAKET YEŞİL** (9 suite) |

## 4. Canlı doğrulama durumu

Yapılmadı (sandbox erişimi yok). Canlıda görülecek: kararda etiketli maddeler +
açıklama şeridi; `/api/quality/report` sayıları; Geçmiş → "Neler var?" özeti ve
(onayla) silme denemesi. Bir sonraki tur raporuna yazılacak.

## 5. Tamamlanan / Kısmen / Açık

- **Tamamlandı:** etiket sistemi, kalite ölçüm ucu, veri paneli (özet + silme),
  sahiplik kapsam testleri, paket.
- **Kısmen:** canlı teyit (§4).
- **Açık:** düzenli (zamanlanmış) kalite raporu e-postası — şu an istekle alınıyor;
  veri dışa aktarma (export JSON) — silme var, export yok.

## 6. Plan durumu

Faz 0–7'nin kod tarafı tamamlandı (bu raporla birlikte 8/8). Canlı teyit turu:
FAZ1/FAZ2 zaten canlı doğrulandı; Faz 3–7 için canlı tur maddeleri ilgili
raporların §4'ünde toplu olarak bekliyor.
