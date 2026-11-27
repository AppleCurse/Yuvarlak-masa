# Faz 2 Durum Raporu — Soru derinliği

> Faz 2 · 2026-11-26 · Kod tamamlandı, 62/62 test yeşil.
> **Kapsam:** kullanıcının sorusuna *yalnızca o soruyla ilgili* görünen küçük, isteğe bağlı detay
> seçicileri + gerektiğinde **tek** bir netleştirme sorusu. Sabit, her soruya dayatılan bir form
> **yok** — bu bilinçli tasarım kararıdır (bkz. §"Açık işler").

## 1. İncelenen dosyalar

| Dosya | Neden incelendi |
|---|---|
| `static/index.html` (HTML + uygulama JS'i) | Soru formu, `startDebate`, prompt inşa eden tüm çağrılar (mühür, koltuk, moderatör, hakem, tekrar deneme) |
| `static/index.html` `sanitizeUserError` bölgesi | Yeni kod bloğunu yerleştirmek için (DOM erişimi güvenli bölge) |
| `static/tailwind.css` | Yeni sınıflar (chip durumları, marka vurgusu) derlenmiş |

## 2. Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `static/index.html` | **HTML:** `</form>` sonrası yeni `#questionContextBox` — satır satır görünen seçiciler + `#clarifyBox` (tek netleştirme sorusu). **JS:** `state.qctx` (time/risk/priority/clarifyDismissed), `CTX_RULES` (3 anahtar kümeli kural tablosu), `relevantCtxRules()` — soru metnindeki anahtar kelimelerle **ilgili satırlar** seçilir, hiçbiri tutmazsa kutu gizli; `renderContextUI()`, `buildQuestionContext()`; `startDebate` bağlamı üretir; **6 prompt noktasına** enjeksiyon: mühür, tekli tur (`retrySingleSeat`), her koltuk turu, moderatör açılış+derinleştirme, hakem sonuç; netleştirme: 8 kelimeden kısa soru + zaman seçilmemişse + reddedilmemişse bir kez gösterilir, cevap/chip seçimi zaman çipine işlenir ve soru kaybolur. |
| `static/tailwind.css` | Yeni sınıflar derlendi. |
| `tests/dom/test_home_experience.js` | **11 yeni test (F2-1…F2-11)** → toplam **62/62**. |
| `FAZ0_DURUM_RAPORU.md` | Faz 2 satırı Eksik → Tamamlandı. |
| `README.md` | Yol haritası Faz 2 → ✅. |

## 3. Test komutları ve sonuçları

| Komut | Sonuç |
|---|---|
| `cd tests && node dom/test_home_experience.js` | **✅ 62 YEŞİL / 0 KIRMIZI** |
| `tools/node_modules/.bin/tailwindcss -c tailwind.config.js -i static/tailwind.src.css -o static/tailwind.css --minify` | ✅ (647 ms) |
| `node --check` (uygulama scripti) | ✅ Sözdizimi geçerli |

Yeni testlerin kanıtladıkları: ilgili soruda seçici görünür/ilgisiz soruda gizli (F2-1…3),
seçim gerçekten `[KULLANICI BAĞLAMI]` bloğuna dönüşür ve kaldırılınca boşalır (F2-4/5),
kısa sorda **tek** netleştirme çıkar, cevapla kapanır ve zaman seçicisine işlenir (F2-6…9),
ve en önemlisi: seçimli bir tartışmada **model çağrısının mesajlarında** bağlam gerçekten
görünüyor (F2-11) — yani özellik prompta değil, sadece ekrana yazılan sahte bir şey değil.

## 4. Canlı doğrulama durumu

**Yapılmadı (sandbox'ta canlı LLM/Railway erişimi yok).** Kod paketi tam; canlı turda
`yuvarlakmasa.com.tr` üzerinde şunlar görülecek: (a) soru yazınca yalnızca ilgili seçiciler
belirir, (b) seçim + tartışma sonrası yanıt seçime göre şekillenir mi, (c) kısa sorda tek
netleştirme sorusu çıkar mı. Bu teyit bir sonraki tur raporuna yazılacak.

## 5. Tamamlanan / Kısmen / Açık

- **Tamamlandı:** seçici UI + anahtar kelime eşleşmesi; seçimin 6 prompt noktasına enjeksiyonu;
  tek netleştirme akışı; temizleme/`Geç`; testler (62/62); tailwind; yol haritası günceli.
- **Kısmen:** canlı teyit (yukarıdaki §4).
- **Açık:** kural anahtar kümeleri ilk sürüm — canlı kullanım sonrası genişletilecek
  (ör. "taşınma" için ev/eşya ayrımları).

## 6. Sonraki faz koşulu (Faz 3 — Müdahale)

Faz 2'nin canlı turda bir kez doğrulanması (seçim → yanıt etkisi görünür mü). Ardından Faz 3
(moderatör müdahaleleri) başlayabilir; Faz 2 kodu Faz 3'ü engellemez.
