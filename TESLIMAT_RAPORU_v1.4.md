# TESLİMAT RAPORU — Yuvarlak Masa v1.4
**BYOK kolay kurulum + hız sınırı**

| | |
|---|---|
| Depo | `https://github.com/AppleCurse/Yuvarlak-masa` |
| Çalışma dalı | `arena/dda95d7c-yuvarlak-masa` |
| Başlangıç commit (main) | `76332877dd00219f5316e2e13ee9ef8cfce28bfd` (v1.3 birleşimi) |
| Test durumu | `bash tests/run_all.sh` → **TÜM PAKET YEŞİL** |

Karar notu: Konsul token (uygulama giriş koruması) **istenmedi**. Bunun yerine herkes kendi
sağlayıcı anahtarıyla gelir (BYOK); anahtar alımı arayüzden direkt bağlantılarla kolaylaştırıldı.
Kimlik doğrulama yokluğu riski aynen durur — bkz. `GUVENLIK_NOTU.md` §3/§4.

---

## 1. Yapılanlar

### BYOK — kendi anahtarıyla gel (ön yüz ağırlıklı)
- **Sağlayıcı presetleri genişletildi:** OpenRouter ve Google Gemini eklendi (9 preset).
  Her preset'te anahtar sayfası bağlantısı + kısa not:
  - Groq → `console.groq.com/keys` (ücretsiz katman)
  - OpenRouter → `openrouter.ai/keys` (`:free` modeller)
  - Gemini → `aistudio.google.com/apikey` (ücretsiz)
  - OpenAI / DeepSeek bağlantıları, yerel+Poliinations "gerekmez" notu
- **Sandalye modalında anahtar rehberi:** preset seçilince `🔑 ANAHTAR AL ↗` (yeni sekme) +
  3 adımlı yönerge (aç → oluştur/kopyala → yapıştır/test/kaydet). Anahtarsız uçta dürüst "gerekmez".
- **"Tüm sandalyelere uygula":** uç + anahtar + model tek tıkla aktif sandalyeler + hakeme yazılır
  (kâsaya koltuk başına kayıt, rozetler güncellenir).
- **Rehber 2. adımda hızlı kurulum:** 4 sağlayıcı çipi → anahtar satırı → **KAYDET VE TEST ET**:
  anahtar tüm koltuklara yazılır, anahtarla ping testi yapılır, sonuç ("N sandalyeye kaydedildi")
  gösterilir; kutu temizlenir (iz kalmaz).
- **Anahtarlı bağlantı testi:** `/api/ping` isteğe bağlı `key` alır (saklanmaz, yalnız test
  isteğinde taşınır); `401` yanıtı Türkçe açıklanır ("anahtar geçersiz ya da bu uç anahtar istiyor").
- Sözlük 13 → **15 madde** (`API anahtarı`, `hız sınırı`).

### Hız sınırı (arka uç)
- Model çağrısı yapan uçlarda (`/api/chat`, `/api/chat/stream`, `/api/ping`,
  `/api/character/architect`, `/api/delta/compute`, `/api/research/verify`) IP başına
  **dakikada 60 çağrı** kayan pencere (`KONSUL_RATE_LIMIT_PER_MIN`, `0` = kapalı).
- Aşımda `429` + Türkçe mesaj + `retry_after` + `Retry-After` başlığı.
- `/api/health` → `rate_limit_per_min` alanı.
- Arayüz 429'u olduğu gibi gösterir ("Hız sınırı aşıldı — N sn sonra …").
- Sınır: işlem-içi sayaç; çok çalışanlı dağıtımda çalışan başına ayrı sayar (not edildi).

## 2. Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `app.py` | Hız sınırı altyapısı + 6 uca uygulama, `ping` anahtar parametresi, health alanı |
| `static/index.html` | Presetler, anahtar rehberi, tümüne uygula, rehber hızlı kurulum, 429 mesajı, sözlük +2, v1.4 CSS |
| `tests/dom/test_byok.js` (yeni) | 20 kontrol |
| `tests/test_ratelimit.py` (yeni) | Gerçek sunucu, 5 kontrol |
| `tests/dom/test_onboarding.js` | Sözlük sayısı 13 → 15 |
| `tests/run_all.sh` | 2 yeni test eklendi |
| `README.md` | Sağlayıcı tablosu (anahtar sütunu) + "API anahtarı nasıl alınır?" + hız sınırı |
| `GUVENLIK_NOTU.md` | Rate limit "yapıldı", BYOK/auth kararı işlendi |

## 3. Testler — gerçek çıktı

```
$ bash tests/run_all.sh
  → jsdom: Faz 6: YEŞİL                                    (35/35)
  → jsdom: Faz 7: YEŞİL                                    (8/8)
  → jsdom: öznel geri bildirim kimliği: YEŞİL              (OK)
  → jsdom: ilk kullanım + demo/gerçek ayrımı: YEŞİL        (33/33)
  → jsdom: BYOK + hız sınırı mesajı: YEŞİL                 (20/20)
  → nörodinamik: YEŞİL                                     (11/11)
  → e2e: kâsa: YEŞİL                                       (21/21)
  → hız sınırı (gerçek uvicorn, düşük limit): YEŞİL        (5/5)
✅ TÜM PAKET YEŞİL
```

## 4. Bilinen sınırlar / sonraki adımlar

- Önerilen ücretsiz model adları (`:free`, `llama-3.3-…`, `gemini-2.0-flash`) sağlayıcılarca
  değiştirilebilir; test düğmesi güncel listeyi gösterir, kullanıcı oradan seçer.
- Gerçek tarayıcı + canlı uç doğrulaması bu ortamda yapılamadı (v1.3 §8 aynen geçerli).
- Kalan kapsam-dışı: kimlik doğrulama (istenmedi), anahtar şifreleme, çok kullanıcı.
