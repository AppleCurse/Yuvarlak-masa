# YUVARLAK MASA (KONSÜL AI)
### Çoklu Yapay Zeka, Gerçek İnsan Karakter Simülasyonu ve Açık Oturum Platformu

Yuvarlak Masa; birbirinden bağımsız yapay zeka modellerini veya kullanıcının sıfırdan tanımladığı kanlı canlı insan profillerini aynı müzakere masasında buluşturan, profesyonel karar alma, felsefi denetim ve açık oturum istasyonudur.

Sistemde sıradan asistan kalıpları, yapay nezaket cümleleri veya hazır chatbot şablonları bulunmaz. Masaya oturan her delege; yaşı, mesleki formasyonu, inancı, fikir katılığı (at gözlüğü) ve kırmızı çizgileriyle yaşayan gerçek bir insan kimliğini benimser. Persona Guard (v2) sızıntıları yalnızca **kendini-tanımlama** kalıplarında yakalar, metnin markdown yapısını korur ve konusal ifadeleri (masada AI'dan bahsetmek) sansürlemez.

> **Denetim & Yol Haritası:** Bu depoda `DENETIM_RAPORU.md` bulunur — kanlı kod bulguları, güvenlik kilidi ve Faz 2/3 vizyonu (Mühürlü Zarf + İkna Deltası, İç Ses Modu, Arşiv Odası, Sesli Masa…).

---

## 🏛️ Çalışma Odaları (7)

### 1. Ana Müzakere Masası (Konsey Arenası)
* 5 bağımsız sandalye + 1 İnsan Operatör koltuğu.
* Kullanıcı ister hazır modelleri, ister kendi oluşturduğu insan karakterlerini (Karakter Kütüphanesi'nden bir tıkla) karşı karşıya oturtur.
* Katılımcılar önceki konuşmaları analiz ederek sırayla tez üretir, karşı argüman geliştirir.
* **İtiraz Motoru:** Her sözdten sonra bir hakem modeli, masadakilerin kırmızı çizgilerinin tetiklenip tetiklenmediğini tartar; operatör "Sözü Ver" ile sıra hakkını devredebilir.
* **İç Ses Modu (Director's Cut):** Her sözün ardından aynı model, izole bir geçişte *masadaki kimsenin duymadığı* 1-2 cümlelik iç monolog üretir; kırmızı kesikli blok olarak mesajın altında durur, tek toggle ile kapatılır. Demo modda sahte iç ses üretilmez.
* **Gerilim Metresi:** İtiraz hakemi her taramada masanın ısısını da 0-100 ölçer; sağ konsolda canlı gauge olarak akar (mavi → amber → kırmızı).
* **Yakınsama Radarı:** Tam her tur bitince 5 sandalyenin pozisyon örtüşmesi hakem modeliyle 0-100 puanlanır (yanıt yoksa mekani̇k çift-benzerlik); tur tur sparkline ile izlenir.
* **İddia Defteri:** Her model mesajının altında "🔍 İDDİAYI DOĞRULA" — canlı web araştırma ajanı (Hakem kanalı) iddiayı tarar; tam kaynaklı rapor deftere, tutanağa darbe vuran hüküm düşer.
* **Zorunlu Oylama (Başkan Yetkisi):** Operatör tek tuşla beş delegeden *0-10 puan + tek kelime pozisyon + 1 cümle gerekçe* ister; şerit canlı dolar, 5/5 oyla ortalama ve çoğunluk kelimesi tutanağa geçer.
* **Oturumu Kapat & Hatırlat:** Hakem modeli resmî **karar metni** dökülür; karar oturuma damgalanır ve beş karakterin *Yaşayan Hafıza*'sına damıtılır (bir sonraki oturumda "geçen oturumda…" diye atıfta bulunurlar).
* **Karar Raporu & Muhalefet Şerhleri (Faz 3):** "⚖ KARAR RAPORU & ŞERHLER" — Başhakem, Türk kurum kültüründeki resmî karar raporları üslubunda 8 bölümlü belgeyi döküyor (GÖREV / SÜREÇ / **KANIT RAPORU — İddia Defteri'nden beslenir** / KARAR / **MUHALEFET ŞERHLERİ** / EYLEM PLANI / BAŞARI METRİKLERİ / RİSK KAYDI). Kararın gerekçesiyle çelişen her sandalye **kendi sesiyle** resmî şerh yazar (paralel, izole çağrılar). Belge `SHA-256` parmak izi + 5 sandalye mührü + başkan onayıyla imzalanır, arşive yazılır, `.md` indirilir.
* **Sesli Masa (Faz 3):** Ses tamamen tarayıcıda üretilir (Web Speech API — harici TTS servisi yok, sunucuya ses gitmez). Her mesajda `🔊` tek söz okuma; konsoldaki **CANLI SES** ile sözler bitince karakterin kendi sesiyle otomatik akar; her sandalyeye modalda kalıcı ses ataması + `🎭 SESLİ TANITIM` (5 koltuk kendini tanıtır); operatör barındaki `🎙` ile sesli komut (tr-TR dikte) müdahale kutusuna dökülür.
* **Zaman Makinesi (Faz 3b):** Konsolun altındaki sinematik şerit, tutanağın her sözünü bir kareye çizer (renk = sandalye; yükseklik = söz uzunluğu; tur ayracı her 5 sözde). Kareye tıklamak konsolu o ana *geri sarar*: "SÖZ i/n · konuşmacı · saat · tur" çubuğuyla kare kare (◀ ▶) gezinilir, `ŞİMDİYE DÖN` ile anında bugün. Geçmişte gezinirken yeni söz gelirse masa otomatik olarak şimdiki zamana sarılır.
* **Başkan Kontrolleri (Faz 3b):** Operatör artık masanın gerçek başkanına dönüyor — her konuşmacı satırında `🔇 SESSİZE AL` (sıradaki söz hakkı atlanır, tek tıkla geri açılır), sandalye modalında `⛔ OTURUMDAN İHRAÇ ET` (aktif oturumda; modal açık kalır ki karakter kütüphanesinden yenisini oturtsun, `↻ GERİ OTURT` ile affedilir) ve konsoldaki `⚡ SÖZÜ KES` (streaming söz yarıda kesilir, operatör müdahalesi tutanağa damgalanır).
* **Güvenirlilik Rozeti (Faz 3b):** Her sözün iç ses geçişinde model, söylenenle hissedilenin uyumunu 0-100 puanlar; sandalye satırındaki `GÜV` rozeti bu son puanı taşır (kırmızı < 40 ikiyüzlülük alarmı, amber < 70, yeşil dürüst).
* **Müdahale Taktikleri:** Operatör çubuğundan hazır operatör sözleri (delil iste, çelişkiyi vur, uzlaşma çağrısı, 5 modele meydan oku).
* Otomatik paslaşma: 1/2/3/5 tur; tek tek söz verme modu.
* Operatör müdahaleleri artık `record_message` ile tutanağa da yazılır — arşiv ve film şeridi tam sürüktür.

### 2. Kör Jüri İstasyonu (2.0)
* 5 model birbirini ne görür ne duyar; aynı soruya **izole kanallardan** paralel, anonim yanıt verir.
* **Kör Değerlendirme (2.0):** Başhakem, yanıtları adlandırılmış halde (*JÜRİ 1..5*, her çalıştırmada yeniden karılır; isim metinden soyulur) okur ve **yalnız argüman niteliğine** bakarak sıralama + en güçlü/zayıf argümanlar + sentez raporlar. Rapor bitince **Kimlik Açılışı** şeridi hakemin bilmediği eşlemeyi gösterir.
* Yanıtlar Sentez Odası'na tek tıkla aktarılır.

### 3. Başhakem ve Karar Sentez Odası
* Konsey tutanağını veya jüri yanıtlarını çeker; Hakem modeli üç eksende raporlar:
  * **KONSENSÜS** — ortaklaşılan konular
  * **ANLAŞMAZLIKLAR VE RİSKLER** — çelişkiler ve kanıt boşlukları
  * **EYLEM PLANI VE NİHAİ KARAR** — bağlayıcı hüküm
* Sentez, canlı web araştırma ajanıyla doğrulanmış iddialara bağlanabilir (Faz 2: İddia Defteri).

### 4. Karakter Kütüphanesi & Mimar Ajanı
* 10 derin karakter dosyası hazır: Sülün Osman, Frank Abagnale Jr., Nikola Tesla, Baba Vanga, Nelson Mandela, Güç Radikali (Arketip), Prof. Dr. İlber Ortaylı, Niccolò Machiavelli, Sigmund Freud, Sokrates.
* **Karakter Mimarı Ajanı:** "Kimi inşa etmek istiyorsunuz?" yazın — dünya görüşü, kırmızı çizgiler, tartışma üslubu ve tam sistem istemiyle zihinsel dosya üretir.
* Her karttan karakter tek tıkla A–E veya Hakem sandalyesine oturtulur.

### 5. Mühürlü Zarf & İkna Deltası (ürünün taç özelliği)
* **Mühürleme:** Konsey başlamadan önce her sandalye, diğerlerinden habersiz **izole kanaldan** nihai pozisyonunu + tek kelimesini yazar; zarf `SHA-256` ile mühürlenir (zaman damgalı, değiştirilemez).
* **Açılış töreni:** Konsey bitince "Zarfları Aç" — 5 zarf aynı saniyede açılır, mühürlü ve nihai pozisyonlar yan yana durur.
* **İkna Deltası:** Hakem modeli her sandalye için **0-100 delta skoru**, **ikna eden sandalye** ve **tetikleyen kanıt/cümle**yi raporlar; ayrıca "kim → kimi" **İkna Haritası** çizilir. Model yanıt veremezse özellik ölmez: mekani̇k metin benzerliği (difflib) ile delta hesaplanır.
* Akış: `✉ Mühürle` → Masa 01'de aynı konuyu tartış → `⚖ Aç` → `◆ İkna Deltası Hesapla`.

### 6. Arşiv & Tutanak Odası
* Tüm oturumlar yerel veritabanında birikir: konu, durum (AKTİF/KAPALI), kayıt sayısı, karar metni.
* Konu filtresiyle tarayın; bir oturuma tıklayınca **tam tutanak** açılır — her sözün yanı sıra damıtılmış **iç ses** katmanı ve itiraz bağları da görünür.
* `⬇ MARKDOWN İNDİR` tutanağı tek dosya olarak kaydeder; `↻ MASAYA TAŞI` konuyu Masa 01'e geri koyar (karakterler Yaşayan Hafızalarıyla döner).
* **Film Şeridi (Faz 3b):** `🎬 FİLM ŞERİDİ (.html)` — oturumu sinematik, tek dosyalık bir `.html` film olarak dışa aktarır: açılış kartı (konu + dosya numarası), her söz için tam ekran sayfa (sandalye rengi dev harfi, konuşmacı şeridi, markdown gövde, kırmızı kesikli **iç ses** bloğu), resmî karar raporu sayfası (SHA-256 bandıyla) ve jenerik. Dosya internetsiz açılır; `Ctrl+P` ile her sayfa ayrı sayfaya basar.

### 7. Sıfır Sığınak — Arena 1v1 (Faz 3b)
* İki sandalye seçilir (A ve B, farklı karakterler), bir **iddia** yazılır, salvo sayısı 1/2/3/5 belirlenir.
* Düello protokolü: **A "iddia GEÇERSİZ"i, B "iddia GEÇERLİDİR"i** savunur; her salvo, rakibin *önceki sözünü adıyla ve içeriğiyle* çürütmek zorundadır (anti-tekrar kuralları istemde sabittir), 60-120 kelime, birinci şahıs, tam persona.
* Salvolar gerçek zamanlı akar (A→B), `■ KES` düellosunu her iki kanaldan da anında durdurur.
* Bitişte **Başhakem** (H sandalyesi) düello tutanağını okuyup `⚖ BAŞHAKEM HÜKMÜ` döküyor: **KAZANAN** (A/B) · **EN GÜÇLÜ DARBE** · **EN ZAYIF AN** · **NİHAİ HÜKMÜ**. Kazanan sandalye altın çerçeveye, kaybeden soluklaşır.
* Düello `arena_…` dosya numarasıyla arşive yazılır — Masa 06'da film şeridine de dökülebilir.
* Masanın **Küskünlük Defteri (Faz 3b):** Oturum kapatılırken (Masa 01 "Oturumu Kapat") hakem modeli tutanağı tarayıp kimin kiminle sert çeliştiğini JSON olarak çıkarır; her tarafla ilgili girdi *o karakterin* Yaşayan Hafıza'sının **rivalries** defterine damıtılır. Bir sonraki oturumda karakter, kişisel istem bloğundaki "KİŞİSEL HESAPLARIN" bölümünden bu kişileri *hatırlar* (nezaket kurallarıyla birlikte) — masada süreklilik ve dram doğar.

### İçerik Politikası
Tarihsel olarak hassas figürler (totaliter liderler, insanlık suçluları) **birinci şahıs bedenlemeyle seed edilmeyiz.** Bu tür briefler için Karakter Mimarı "analitik mesafe" arketipi üretir: tezi savunan, ancak şiddet/ırkçılık/nefret söylemi üretmeyen, kişilere hakaret etmeyen soyut bir zihniyet dosyası. (Denetim raporu §3.6)

---

## 👤 Karakter Profili Parametreleri (Kodda Gerçek Olanlar)

1. **Kimlik:** İsim, yaş, şehir/köken, meslek/uzmanlık, medeni hal.
2. **Dünya görüşü ve ahlaki pusula** (serbest metin).
3. **Fikir Katılığı / At Gözlüğü (1–10):** 10'da karakter asla geri adım atmaz; pozisyon esnetme yalnızca "Gerekçe Köprüsü" kuralıyla (somut kanıt + kök değerlere sadakat).
4. **Kırmızı çizgiler (irritants):** İtiraz motorunun girdisi.
5. **Tartışma üslubu + kelime dağarcığı** (kütüphane karakterlerinde).
6. **Anti-Meta Güvenlik Duvarı (Persona Guard v2):** Kendini-tanımlama sızıntıları cümle bazında elenir, yapı korunur; konusal ifadeler yalnız raporlanır.

> **Faz 2'de geliyor:** MBTI + Big Five, bağlanma stili, iki katmanlı zihin (`content`/`inner`), oturumlar arası yaşayan hafıza.

---

## 🔌 Desteklenen API ve Model Altyapısı

Her sandalye bağımsız bir istemcidir; dilediğiniz sandalyeye dilediğiniz OpenAI-uyumlu uç atanabilir:

| Preset | Tür | Varsayılan Uç |
| :--- | :--- | :--- |
| **9Router** | Yerel | `http://127.0.0.1:20128/v1` |
| **Ollama** | Yerel | `http://127.0.0.1:11434/v1` |
| **LM Studio** | Yerel | `http://127.0.0.1:1234/v1` |
| **OpenAI** | Bulut | `https://api.openai.com/v1` |
| **DeepSeek** | Bulut | `https://api.deepseek.com/v1` |
| **Groq** | Bulut | `https://api.groq.com/openai/v1` |
| **Pollinations** | Canlı & Ücretsiz | `https://text.pollinations.ai/openai` (anahtarsız) |

* **Canlı API Doğrulama:** Sandalye modali "Bağlantıyı Test Et" ile uca `GET /models` atar, model listesini döndürür.
* **SSRF Kilidi (v1.1):** Proxy yalnızca http(s) uçları kabul eder; yerel (loopback/özel ağ) hedefler yalnızca `KONSUL_LOCAL_PORTS` (varsayılan `11434,1234,20128`) listesindeki portlarda izinlidir. Genişletme: `KONSUL_LOCAL_PORTS="11434,1234,20128,8080"` · Acil: `KONSUL_ALLOW_ALL_LOCAL=1`.

---

## 🎙️ Ses Altyapısı — Durum

* **Bugün:** Arayüz metin tabanlıdır.
* **Faz 3 planı (denetim raporu §4.4):** `edge-tts` (anahtarsız, Türkçe) ile koltuk başına farklı ses + Web Speech API ile operatör STT → "YAYIN MODU". Bu bölümü gerçek olduğunda güncelleyeceğiz; iddia olarak bırakmayız.

---

## 🚀 Kurulum ve Yerel Çalıştırma

### Gereksinimler
* Python 3.10+
* `pip install fastapi uvicorn httpx` (veya `pip install -r requirements.txt`)
* (Opsiyonel) Bir model ucu: Ollama / 9Router / LM Studio / bulut API anahtarı — hiçbir uç yoksa uygulama **demo simülasyon modu**nda açılır.

### Çalıştırma
```bash
python app.py
# → http://127.0.0.1:8888 (tarayıcı otomatik açılır)
```
Windows için `baslat.bat` mevcut. Farklı host/port:
```bash
KONSUL_HOST=0.0.0.0 KONSUL_PORT=9000 python app.py
```

### API Uç Noktaları (Görünür Yüzey)
| Yöntem | Yol | Görev |
|---|---|---|
| GET | `/api/health` | Sağlık + sürüm |
| GET | `/api/ping?url=...` | Uç doğrulama + model listesi |
| POST | `/api/chat` | Tek atış üretim (persona-filtreli) |
| POST | `/api/chat/stream` | SSE streaming üretim |
| GET | `/api/characters` | Karakter kütüphanesi |
| GET | `/api/character/{id}` | Karakter + son hafıza girdileri |
| POST | `/api/characters/save` | Karakter kaydet |
| POST | `/api/character/architect` | Karakter Mimarı Ajanı |
| POST | `/api/session/start` · `/record_message` · `/conclude` | Oturum yaşam döngüsü + karakter hafızası |
| GET | `/api/sessions` | Arşiv listesi (yeni → eski, mesaj sayılı) |
| GET | `/api/session/{id}/messages` | Oturum tutanağı |
| POST | `/api/envelope/seal` | Zarf mühürle (SHA-256) |
| GET | `/api/envelope/{session_id}` | Zarf durumu (mühürlü/açık) |
| POST | `/api/envelope/open` | Zarfları aynı anda aç |
| POST | `/api/delta/compute` | İkna Deltası (LLM analizi + mekani̇k fallback) |
| POST | `/api/research/verify` | Canlı web doğrulama ajanı (İddia Defteri besler) |
| POST | `/api/debate/evaluate_rebuttal` | İtiraz hakemi (+ 0-100 gerilim ölçümü) |
| POST | `/api/convergence` | Yakınsama Radarı (LLM + mekani̇k fallback) |
| GET | `/api/memory/{char_id}` | Yaşayan Hafıza: karakterin önceki oturum anıları (istem bloğu olarak biçimlenmiş) |
| POST | `/api/memory/add` | Hafıza girdisi ekle (`entry` + `rivalries`) — Küskünlük Haritası bunu besler |
| POST | `/api/session/report` | Karar raporunu (şerhli) oturuma damgala |
| GET | `/api/session/{id}/report` | Oturumun en yeni karar raporu |
| GET | `/api/reports` | Karar raporu arşivi (tam metinsiz) |
| POST | `/api/persona/clean` | Persona Guard (temizle + raporla) |

Veri yerelde `konsul.db` (SQLite, WAL) dosyasında tutulur.

### Not: `legacy-react/`
Depodaki eski React+Vite sürümü (3 koltuklu) `legacy-react/` altına izole edildi. Tek resmî arayüz `static/index.html` + `app.py`'dir. Referans olarak kalır; derleme/çalıştırma hedefi değildir.

---

## 📄 Lisans
Bu proje kurumsal ve kişisel kullanım için açık standartlarda geliştirilmiştir.
