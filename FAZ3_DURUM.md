# Faz 3 Durum Raporu — Kullanıcı müdahalesi

> Faz 3 · 2026-11-27 · Kod tamamlandı, 73/73 test yeşil.
> **Kapsam:** kullanıcının tartışma sırasında üç güçlü aracı olması — (1) **ek bilgi/belge**
> kanalı, (2) **resmî itiraz**, (3) müdahalenin etkisinin **görünür** olması.

## 1. İncelenen dosyalar

| Dosya | Neden incelendi |
|---|---|
| `static/index.html` → `followUpBox` HTML | Mevcut müdahale çubuğu (1 tur daha, hızlı yönlendirmeler, karar özetini güncelle) |
| `static/index.html` → `handleFollowUp` | Yönlendirme akışı, hedef seçimi, hakem çağrısı |
| `static/index.html` → `runExpertRound` / `retrySingleSeat` | `extraCondition`'ın prompta nasıl girdiği (`condLine`) |
| `static/index.html` → `runJudgeVerdict` | `summaryPrompt` yapısı (7 bölüm) |
| `static/index.html` → `startDebate` | Tur başında bağlam/müdahale sıfırlama noktası |

## 2. Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `static/index.html` | **HTML:** `followUpBox`'a yeni buton satırı — **İtiraz Et**, **Ek Bilgi / Belge Ekle**, **Müdahale Günlüğü (N)**; `#evidencePanel` (textarea + Kaydet), `#evidenceList` (kaldırılabilir çipler), `#interventionLog`. **JS:** `state.evidenceLog` / `state.interventions`; `buildEvidenceBlock()` → `[KULLANICI EK BİLGİSİ]` bloğu; `refreshUserContext()` = bağlam + ek bilgi (6 prompt noktası); `recordIntervention()` / `renderInterventionLog()` (tür + "→ sonrası: N söz" sayacı); `handleFollowUp(text, hedef, tür)` — `objection` için `RESMİ İTİRAZ` çerçevesi, `[İTİRAZ →]` kart etiketi, hakemde "(Resmi itiraz: …)"; **hakem promptu**: müdahale varsa `[MÜDAHALE KAYDI]` listesi + zorunlu ``## MÜDAHALE SONRASI DEĞİŞİM`` bölümü talimatı; yeni turda müdahale günlüğü sıfırlanır (ek bilgi kalır). |
| `static/tailwind.css` | Yeni sınıflar derlendi. |
| `tests/dom/test_home_experience.js` | **11 yeni test (F3-1…F3-10, F3-4b)** → toplam **73/73**. |
| `FAZ0_DURUM_RAPORU.md` | Faz 3 satırı Kısmen → Tamamlandı. |
| `README.md` | Yol haritası Faz 3 → ✅. |

## 3. Test komutları ve sonuçları

| Komut | Sonuç |
|---|---|
| `cd tests && node dom/test_home_experience.js` | **✅ 73 YEŞİL / 0 KIRMIZI** |
| `tools/node_modules/.bin/tailwindcss -c tailwind.config.js -i static/tailwind.src.css -o static/tailwind.css --minify` | ✅ |
| `node --check` (uygulama scripti) | ✅ |

Kanıtlar: panel açılışı ve kayıt (F3-2/3/4), ek bilginin promptta oluşu ve **kaldırılınca
bloğun boşalması** (F3-3/F3-10), itirazın çerçeveli prompta girişi (F3-6), itiraz turunda
ek bilginin de taşınması (F3-7), hakemde müdahale-değişim bölümü talimatı (F3-8),
günlükte tür + etki sayacı (F3-9).

## 4. Canlı doğrulama durumu

**Yapılmadı (sandbox'ta canlı LLM/Railway erişimi yok).** Kod paketi tam; canlı turda
`yuvarlakmasa.com.tr` üzerinde görülecek: ek bilgi girilip kaldırılabiliyor mu, itiraz sonrası
yanıt itiraza yanıt veriyor mu, kararda "MÜDAHALE SONRASI DEĞİŞİM" bölümü çıkıyor mu,
günlük sayacı doğru mu. Bu teyit bir sonraki tur raporuna yazılacak.

## 5. Tamamlanan / Kısmen / Açık

- **Tamamlandı:** ek bilgi kanalı (ekle/sil/prompta giriş), resmî itiraz aracı, müdahale
  günlüğü + etki sayacı, hakemde değişim bölümü, testler (73/73), tailwind, dokümanlar.
- **Kısmen:** canlı teyit (§4).
- **Açık:** belge *dosyası* yükleme (şu an metin/paste kanalı var); müdahalenin etkisinin
  sayısal/istatistiksel raporlaması (görsel karşılaştırma kartı).

## 6. Sonraki faz koşulu (Faz 4 — Özgün zekâ)

Faz 3'ün canlı turda bir kez doğrulanması. Faz 4'ün kod tarafı (karşılaştırma raporu,
beğeniye bağlı öğrenme olmadığını kanıtlayan mekanizma, tahmin geriye değerlendirme) bu
girdiyi beklemez; deneysel/ölçüm kısmı canlı LLM turlarıyla yapılacak ve simülasyon olarak
etiketlenecek.
