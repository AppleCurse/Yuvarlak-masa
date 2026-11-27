# YUVARLAK MASA

### İnsanın getirdiği mesele üzerinde farklı zekâlar birlikte düşünsün; insan yön versin; sonunda gerekçeli bir karar çerçevesi çıksın.

Yuvarlak Masa bir "cevap makinesi" değildir. Bir soruyla gelirsin; masada farklı uzmanlıklar ve farklı yapay zekâlar birbirinin sözünü kesmeden, doğrudan birbirine yanıt vererek tartışır; sen müdahale edersin; sonunda **iddiaları, anlaşmazlıkları ve bilinmeyenleri açıkça gösteren** bir karar çıktısı alırsın.

Masada dört unsur var:

| unsur | Rolü |
|---|---|
| **Sen (İnsan)** | Masanın sahibi: soruyu getirirsin, katılımcı seçersin, müdahale edersin, yön verirsin. |
| **Diğer yapay zekâlar** | Farklı bakış açıları: birbirini tekrar etmez, doğrudan yanıt verir, gerekçe savunur, gerektiğinde fikrini değiştirir. |
| **Nörodinamik Ajan** | Ürünün özgün zekâsı: kendi bilişsel durumu (enerji, yorgunluk, belirsizlik) ve belleğiyle konuşur; her model çağrısına bilişsel direktifi gerçekten eklenir. |
| **Hakem** | Tartışmayı özetleyen dekor değil; görüşleri değil **gerekçeleri** değerlendiren, belirsizliği saklamayan karar sentezi. |

> **Yol haritası ve doğrulanmış durum tablosu:** [`FAZ0_DURUM_RAPORU.md`](FAZ0_DURUM_RAPORU.md) — 8 fazlık plan, hangi fazın ne durumda olduğu ve kanıtları. Denetim geçmişi: [`DENETIM_RAPORU.md`](DENETIM_RAPORU.md), güvenlik: [`GUVENLIK_NOTU.md`](GUVENLIK_NOTU.md).

---

## 👁️ Ziyaretçi ne görüyor? (ana sayfa — `/`)

1. **Demo sahnesi** — Sayfa açılır açılmaz örnek bir tartışma kendiliğinden oynar (8 söz, DEMO rozeti, YZ KARAKTER / İNSAN etiketleri). Bu **örnek metindir, canlı model değildir, hiçbir yere yazılmaz**; ürünün çalışma biçimini gösterir.
2. **3 adım** — Konunu belirle → Masanı kur → Tartıştır & müdahale et.
3. **Kendi konunu yaz** — Soru kartına yazarsın veya hazır senaryolardan seçersin.
4. **Masayı kur** — Önerilen katılımcıları açıp kapatabilir, **"+ Kendi katılımcını ekle"** ile ad/rol/tanım yazıp G veya H koltuğuna oturtabilirsin (istersen YZ mimarıyla doldurursun — tanım varsayılan olarak **yalnızca senin tarayıcında** kalır).
5. **Tartışmayı izle ve müdahale et** — Her söz önceki söze bağlanır; "Masaya Müdahale Et" çubuğundan yazabilir, bir koltuğa sorabilir, tur sürdürabilir, karar özetini yenileyebilirsin.
6. **Gerekçeli çıktı** — 7 bölümlük değerlendirme: öne çıkan argümanlar, uzlaşılan noktalar, görüş ayrılıkları, **doğrulanamamış iddialar**, riskler, eksik bilgiler, olası karar yolları — ve gerektiğinde açık açık **"bu bilgiyle kesin karar verilemez"** der.
7. **Geçmiş** — Görüşmelerin varsayılan olarak **yalnızca bu tarayıcında** saklanır.

Ayrıca: **Kör Jüri** sekmesi (modeller birbirini görmeden aynı soruya yanıt verir, hakem kimliksiz değerlendirir) ve eski tam konsol **`/classic`** (kapsamlı klasik arayüz — arşiv uçları eskisi gibi token'sız çalışır).

---

## 🔒 Gizlilik ve güvenlik (ne söz veriyoruz, neyi teknik olarak kanıtladık)

| Söz | Nasıl sağlanıyor |
|---|---|
| **Arşiv varsayılan KAPALI** | "Sunucuda arşivle" işaretlenmeden start/record/conclude/zarf/araştırma kayıtlarının **hiçbiri** sunucuya yazılmaz (jsdom testi 23 ile kanıtlı: 0 yazma). |
| **Arşiv açılsan bile yalnızca senin** | Her oturum için tarayıcıda gizli anahtar üretilir; sunucuya özeti (sha256) gider. Yanlış/eksik anahtarla okuma-yazma **403**. |
| **Kilitsiz (eski/classic) kayıtlar** | Token'sız erişim korunur — eski konsol bozulmaz. |
| **Oturum devralma yok** | Bilinen oturum numarasıyla tekrar açmak sahipliği değiştiremez, kilidi silemez (PR #16). |
| **Hayalet oturuma yazma yok** | Olmayan oturum kayıtları **404** (PR #16). |
| **Özel oturum ortak hafızaya sızmaz** | Kilitli oturumların konusu/kararı karakter hafızasına damıtılır (PR #16). |
| **API anahtarların** | Yeni arayüzde anahtarın **sunucuya hiç gitmez**, yalnızca kendi tarayıcında durur. (Eski sunucu-kasa özelliği düz metin saklar — yeni arayüz kullanmaz.) |

**Uyarılar:** Ürün bir tartışma aracıdır — **yatırım, hukuk veya psikoloji tavsiyesi değildir.** Tartışmaya yazdıkların seçtiğin yapay zekâ hizmetlerine gider (varsayılan: Pollinations); sonuçlar model değerlendirmesidir, bağımsız doğrulama değildir. Sayfada bunların hepsi yazılıdır.

---

## 🧪 Dürüstlük tablosu — ne gerçek, ne örnek, ne iddia

| Şey | Statü |
|---|---|
| Canlı tartışmadaki model yanıtları | **Gerçek model çağrısı** (sunucu havuzu veya senin anahtarın). Yine de model sözüdür, kanıt değildir. |
| Demo sahnesi | **Örnek metin** — canlı değil, arşive yazılmaz, her sözde DEMO rozeti taşır. |
| Testlerdeki "canlı akış" | **Yerel mock yukarı akış** — kalite ölçümü için kullanılamaz. |
| Nörodinamik bilişsel direktif | **Gerçek** — her model çağrısında sistem istemine eklenir, durum çipi gerçek veriyi gösterir. |
| Nörodinamik predictor **eğitimi** | Kodda mekanizma var ama **eğitim yaptığı iddia edilmez**; kullanıcı puanları eğitim verisi sayılmaz. |
| Hakem/çıktı | **Model değerlendirmesi** — ekranda da böyle yazar; "kesin karar" dayatmaz. |
| İddia doğrulama (Araştırma) | Gerçek web araştırmasıdır; kaynak bulunamazsa **"doğrulanmadı"** der. |

---

## 🚀 Kurulum ve çalıştırma

```bash
# gereksinim: Python 3.10+
pip install -r requirements.txt          # (PEP 668 hatası alırsan: python -m venv .venv && .venv/bin/pip install -r requirements.txt)

python run.py                            # → http://127.0.0.1:8888 (tarayıcı otomatik açılır)
```

Yararlı ortam değişkenleri:

| Değişken | Anlamı |
|---|---|
| `KONSUL_PORT` / `KONSUL_HOST` | Port (varsayılan 8888) / arayüz |
| `KONSUL_DB_PATH` | Veritabanı yolu (varsayılan `konsul.db`) |
| `KONSUL_RATE_LIMIT_PER_MIN` | IP başına dakika sınırı (varsayılan 60; `0` = kapalı) |
| `KONSUL_LOCAL_PORTS` | Proxy'nin erişebileceği yerel portlar (SSRF kilidi) |
| `KONSUL_COMMIT` | Canlıda çalışan commit'i bildirir → `/api/health` |

Modeller: sunucu havuzunda tanımlı sağlayıcılar (Groq vb.) yoksa **Pollinations** (anahtarsız) devreye girer. Kendi anahtarını ana sayfadaki **Ayarlar → "Koltuklara API Anahtarı Bağla"** ekranından bağlarsın — anahtar yalnızca senin tarayıcında saklanır.

| Sağlayıcı | Tür | Anahtar |
|---|---|---|
| Groq · OpenRouter · Gemini | Ücretsiz katmanlar | [groq.com/keys](https://console.groq.com/keys) · [openrouter.ai/keys](https://openrouter.ai/keys) · [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| OpenAI · DeepSeek | Ücretli | platform sayfaları |
| Pollinations | Ücretsiz, anahtarsız | gerekmez |
| Ollama · LM Studio · 9Router | Yerel | gerekmez (`KONSUL_LOCAL_PORTS` içinde) |

---

## ✅ Testler (güncel sonuç)

```bash
bash tests/run_all.sh
```

| Paket | İçerik | Sonuç |
|---|---|---|
| jsdom ana sayfa | demo, sıra, yanıt işaretleri, **arşiv 0 yazma**, owner token, G koltuğu, uyarılar, yazım | **49/49** |
| `test_archive_lock.py` | classic uyum, 403/404 kilitleri, liste filtresi, sha256, persist, **hafıza sızıntısı**, **devralma**, health işaretleri | **10/10** |
| Nörodinamik | karakter/oturum izolasyonu, bellek sürekliliği | **11/11** |
| E2E kâsa | gerçek uvicorn + mock upstream | **21/21** |
| Hız sınırı | 429 + Retry-After | **Yeşil** |

**Toplam: ✅ TÜM PAKET YEŞİL.** (Eski `tests/dom/test6,7,test_onboarding…` dosyaları v1.3 arayüzüne yazılmıştır; değişiklik öncesi de kırmızıydı, tarihçe için korunur — güncel kapsam `test_home_experience.js`.)

---

## 🌍 Canlı ortam ve sürüm doğrulama

- **Platform: Railway** (esas). `main` dalına birleştirme otomatik dağıtır. Vercel kullanılmıyor.
- Son dağıtımlar: **v2.6** (PR #14), **v2.7** (PR #15), **v2.7.1 güvenlik** (PR #16) → GitHub dağıtım kayıtlarında Railway production **başarılı**.
- **Canlıda hangi sürüm çalışıyor?** Tek komut:
  ```bash
  curl https://yuvarlakmasa.com.tr/api/health
  ```
  - `features` listesi (`owner_lock, archive_opt_out, custom_seats, commit_report`) → sürüm en az **v2.7**.
  - `commit` alanı → tam hash. Railway imajında `.git` olmadığı için bu alanın dolması için Railway → Variables'a `KONSUL_COMMIT=<sha>` eklenir; eklenmezse `unknown` der (özellik işaretleri yine yeterli kanıttır).

---

## 🗺️ Yol haritası (özet — ayrıntı `FAZ0_DURUM_RAPORU.md`)

| Faz | Konu | Durum |
|---|---|---|
| 0 | Mevcut durumu mühürle | ✅ Bu rapor |
| 1 | Gerçek muhakeme kalitesi (canlı konuşma üzerinde kanıtlı rapor) | 🟡 Kısmen — [`FAZ1_KALITE_RAPORU.md`](FAZ1_KALITE_RAPORU.md): 4 canlı oturum, 3/4 bulgu kapatıldı |
| 2 | Soru derinliği (aciliyet/risk/etkilenen seçicileri) | 🔜 |
| 3 | Kullanıcı müdahalesi (delil, itiraz, etki görünürlüğü) | 🔜 (temel var) |
| 4 | Nörodinamik Ajan'ın ölçülebilir farkı | 🔜 (mekanizma var) |
| 5 | İlk adım + paylaşım + hatırlatma | 🔜 (çıktı var) |
| 6 | Konu sayfaları (`/ev-mi-kira-mi`…) | — |
| 7 | Güven: kaynak/yorum ayrımı, sürekli ölçüm | 🔜 (temel var) |

**Sıra disiplini:** Önce Faz 0–1, sonra 2–3. Her fazda teslimat: incelenen/değişen dosyalar, test komutları ve sonuçları, canlı doğrulama durumu, tamamlanan/kısmen/açık işler.

---

## 📚 Sürüm geçmişi

| Sürüm | PR | Ne getirdi |
|---|---|---|
| v2.7.2 | #17 (açık) | `/api/health` → `commit` + `features` canlı sürüm doğrulaması; README + Faz 0 raporu |
| v2.7.1 | #16 | Oturum devralma, hayalet yazma, ortak hafıza sızıntısı kapatıldı |
| v2.7 | #15 | Arşiv gizlilik kilidi, kendi katılımcını kur, başlık/uyarı düzeltmeleri |
| v2.6 | #14 | İlk ekranda demo, 3 adım, karşılıklı akış, 7 bölümlü çıktı |

---

## 🔌 API (özet)

| Yöntem | Yol | Görev |
|---|---|---|
| GET | `/api/health` | Sağlık + `commit` + `features` |
| POST | `/api/chat` · `/api/chat/stream` | Model çağrısı (SSE akış); bilişsel direktif eklenir |
| POST | `/api/session/start` | Oturum aç (`owner_token` ile kilitli) — mevcut kayda dokunmaz |
| POST | `/api/session/record_message` · `/conclude` | Tutanak yazımı — `X-Owner-Token` zorunlu (kilitliyse) |
| GET | `/api/sessions` · `/api/reports` | Liste — token sahibi yalnızca kendi kayıtlarını görür |
| GET | `/api/session/{id}/messages` · `/report` | Okuma — kilitliyse 403 |
| POST | `/api/envelope/seal` · `/open` · GET `/api/envelope/{id}` | Mühürlü zarf — kilitli oturumlarda token zorunlu |
| POST | `/api/research/verify` | Canlı web iddia doğrulama (`persist=false` ile arşive yazılmaz) |
| POST | `/api/character/architect` | Karakter mimarı (`persist:false` = yalnızca bu tarayıcı) |
| GET | `/api/characters` · `/api/memory/{id}` | Karakter kütüphanesi / yaşayan hafıza |
| GET | `/api/providers` | Sağlayıcılar + koltuk durumları (A–H, K) |
| GET | `/` · `/classic` | Ana sayfa · eski tam konsol |

Ayrıntılı uç listesi ve CORS/SSRF notları: [`DEPLOY.md`](DEPLOY.md) · [`DENETIM_RAPORU.md`](DENETIM_RAPORU.md). Veri yerelde `konsul.db` (SQLite, WAL).

**Not — `legacy-react/`:** Eski React arayüzü izole durur; resmî arayüz `static/index.html` + `app.py`'dir. Referans amaçlıdır, derlenmez.

---

## 📄 Lisans

Bu proje kurumsal ve kişisel kullanım için açık standartlarda geliştirilmiştir.
