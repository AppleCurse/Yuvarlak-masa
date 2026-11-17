# YUVARLAK MASA — NİHAİ KOD DENETİMİ VE VİZYON RAPORU

**Tarih:** 17.11.2026 · **Dallanan nokta:** `f38714c` · **Kapsam:** `app.py`, `engine.py`, `persona_guard.py`, `static/index.html`, `src/**` (React), `characters.json`, `README.md`

---

## 0. YÖNETİCİ ÖZETİ (5 MADDE)

1. **Çalışan ürün `static/index.html` + `app.py`** (FastAPI, 8888). Depodaki `src/` React uygulaması **eski, 3 koltuklu (A/B/C/H) terk edilmiş bir ön yüz** — README bu yüzden de gerçekliği anlatmıyor. İki paralel frontend, iki ayrı `localStorage` şeması (`v1`/`v3`), iki ayrı varsayılan karakter seti var. Birini resmileştir, diğerini göm.
2. **4 ölü/parçalı özellik:** `insertTactic()` fonksiyonu hiç tanımlanmamış (4 taktik butonu ReferenceError fırlatıyor), `verifyClaimWithAgent` (doğrulama ajanı) hiçbir yere bağlı değil, "Mühürlü Zarf" ve "Arşiv/Tutanak Odası" hiç yazılmamış, README'deki TTS/STT/mobil portal kodda **sıfır satır**.
3. **Persona Guard'ın `clean()` iki doğrulanmış hata yapıyor:** (a) metnin paragraf/markdown yapısını tek satıra yassıtıyor — yani her mesajda yapı bozuluyor; (b) tüm cümle elenince kalanını `sub()` ile siliyor → **"Bir dil modeli olarak size yardım edemem"** → **"Bir size yardım edemem"** gibi kırık Türkçe. Ayrıca *konu olarak* AI'dan söz eden meşru cümleleri de "chatgpt/openai" gibi kelime eşleşmeleriyle sessizce siliyor.
4. **Hafıza döngüsü ölü:** `build_character_runtime_prompt` (memory-aware istem derleyici) hiçbir rotadan çağrılmıyor; frontend `/api/session/conclude`'u hiç çağırmadığı için hafıza **asla yazılmıyor**, yazılsa bile **asla okunmuyor**. Karakterler oturumlar arası hiçbir şey hatırlamıyor. `inner_thought` (iç ses) sütunu veritabanında var, model onu üretmiyor, UI göstermiyor — README'nin "İki Katmanlı Zihin"i kağıt üzerinde.
5. **Etik/branding riski:** `characters.json` içinde **Adolf Hitler (dogma 10)** tam birinci şahıs bedenlemesiyle varsayılan seed karakter. Uç sağlayıcıların (OpenAI/Anthropic/Google) büyük bölümü bu istemi içerik politikasıyla reddeder → sandalye çalışırken hata döner; ürünün "profesyonel karar istasyonu" kimliğine de zarar verir. Acil müdahale gerekli.

---

## 1. KOD TABANININ HARİTASI (Ne var, ne hayatta)

| Katman | Dosya | Durum |
|---|---|---|
| Proxy backend | `app.py` (412 satır) | **Canlı.** SSE stream proxy, ping, karakter/arşiv rotaları. |
| Motor | `engine.py` (461 satır) | **Yarı canlı.** SQLite (5 tablo), web araştırma, itiraz hakemi. |
| Güvenlik | `persona_guard.py` (96 satır) | **Hatalı canlı.** (Bkz. §3.2) |
| Gerçek UI | `static/index.html` (2569 satır, vanilla JS) | **Canlı, amiral gemisi.** 5 YZ + 1 Operatör + Hakem, holografik masa, karakter kütüphanesi. |
| React UI | `src/**` (11 dosya, 4 koltuk) | **Ölü miras.** 3 koltuklu eski sürüm; `npm run dev` bunu derliyor. |
| Veri | `characters.json` (10 karakter), `konsul.db` | Seed'ler iyi; DB write-only kullanılıyor. |

**Gerçek kullanıcı akışı:** `python app.py` → 8888 → `static/index.html` → `/api/chat/stream` → 9Router/Ollama/LM Studio/bulut.

---

## 2. GÜÇLÜ YÖNLER (Doğru Kurulan İskelet)

- **SSE streaming proxy** sağlam: parçalı JSON, `application/json` fallback (stream'i yok sayan uçlar), disconnect handling, dostane Türkçe hata mesajları (`app.py:130-211`).
- **Sıralı argüman zinciri + itiraz motoru** fikri doğru: her sözden sonra LLM hakemi "başkasının kırmızı çizgisi mi tetiklendi"yi tartıyor (`engine.py:393`). Bu, sıradan "round-robin bot sohbeti"nden ayıran çekirdek.
- **Canlı web doğrulama ajanı** gerçekten web'e gidiyor (DuckDuckGo + TR/EN Vikipedi, `engine.py:238-326`) — çoğu rakip ürün "araştırıyorum" diye sadece LLM'e sorar; burada kaynak URL'si toplanıyor.
- **Persona Guard konsepti** doğru yerde duruyor: meta-leak'leri yakalayıp `build_revision_instruction` ile modele *yeniden üretim* emri verebilecek bir mimari var (`persona_guard.py:86-96`) — ama şu an yeniden üretim döngüsü kurulmamış, sadece kaba metin ameliyatı yapılıyor.
- **Karakter derinliği** iyi: dogma (inat) derecesi, irritantlar, kelime dağarcığı, tartışma üslubu + "gerekçe köprüsü" kuralı (`engine.py:192-258`) — karakterin *neden* görüş değiştireceğini yöneten en güzel detay.
- `.gitignore` temiz (`*.db` dışarıda), bağımlılıklar minimum (3 Python paketi).

---

## 3. KRİTİK BULGULAR

### 3.1 ÖLÜ / KIRIK UI BAĞLANTILARI (P0)

| # | Bulgu | Kanıt | Etki |
|---|---|---|---|
| B1 | **`insertTactic()` tanımsız.** 4 taktik butonu `onclick="insertTactic(...)"` çağırıyor; fonksiyon hiçbir yerde yok. | `static/index.html:1024-1027` (grep: tanım yok) | Operatör taktik butonlarına tıkladığında konsolda ReferenceError; hiçbir şey olmaz. "Müdahale Taktikleri" çubuğu tamamen dekoratif. |
| B2 | **`#toggleHoloTable` butonu handler'sız.** | `static/index.html:980` | "GÖRÜNÜMÜ DARALT" butonu ölü. |
| B3 | **`verifyClaimWithAgent` çağrılmıyor** (sadece `:1796`'da tanımlı). Mesaj üzerinde "iddiayı doğrula" aksiyonu yok. Dahili `state.sessionId` global — doğru olan `state.council.sessionId`. | grep: tek referans tanım satırı | README'nin övündüğü "Fakt-Checker Ajanı" kullanıcıya hiç ulaşmıyor. |
| B4 | **Demo modu 5 karakterli yeni düzen için bozuk.** `demoTextFor` rolü `"stratej"`, `"tekn"` alt dizesiyle eşliyor; yeni roller ("Kozmik Vizyoner", "Atina Diyalektikçisi"…) eşleşmiyor → **5 sandalyenin hepsi aynı eleştirmen metnini** üretiyor. | `static/index.html:1572-1580` | Backend'siz açan her kullanıcı homojen bir "bot korosu" görür. İlk izlenim öldürücü. |
| B5 | **İtiraz akışı yarış durumu.** `checkForRebuttal` sonucu gelmeden otomatik mod 1200 ms sonrası sıradaki sözü başlatır; otomatik paslaşma *zaten sürerken* operatör "Sözü Ver"e basarsa `overrideNextSpeaker` `if(state.council.running) return;` ile **sessizce yutar**. | `static/index.html:1727-1806, 1841` | Operatörün itiraz sözü talebi kaybolur, neden olduğu anlaşılmaz. |
| B6 | **Karakter→sandalye ataması karakter DNA'sının yarısını düşürüyor:** `argument_style` ve `vocabulary` taşınmıyor (sadece `system_prompt` içinde gömülü kalıyor); atama sonrası `alert()` ile bildirim. | `static/index.html:2492-2512` | Karakter kütüphanesinin en değerli alanları masada kullanılmıyor. |
| B7 | **Modal'da her tuşa basışta zengin istem eziliyor:** `triggerRecompilePrompt` ad/yaş/şehir alanlarının `oninput`'unda tetiklenip mimarın ürettiği zengin `system_prompt`'u 8 satırlık temel şablonla değiştiriyor. | `static/index.html:2294-2300, 2302-2308` | Kullanıcı ismi 1 karakter değiştirdiğinde mimarın işi kayboluyor. |
| B8 | `esc()` tırnak bastırmıyor; `title="..."` attribute'larına konan kullanıcı girdisiyle attribute kırılması mümkün (self-XSS sınıfı, düşük). | `static/index.html:1218, 2101` | Küçük hijyienlik. |

### 3.2 PERSONA GUARD — DOĞRULANMIŞ HATALAR (P0)

Test çıktılarının kendisi kanıt:

```
GİRDİ : 'Birinci paragraf iddiam.\n\nİkinci paragraf.\n\n- madde 1\n- madde 2'
ÇIKTI : 'Birinci paragraf iddiam. İkinci paragraf. - madde 1\n- madde 2'   ← yapı yassılaştı

GİRDİ : 'Bir dil modeli olarak size yardım edemem, çünkü bu benim kapasitemin dışında.'
ÇIKTI : 'Bir size yardım edemem, çünkü bu benim kapasitemin dışında.'       ← kırık Türkçe
```

1. **Yapı yassılama (`persona_guard.py:67,76`):** cümleler `(?<=[.!?])\s+` ile bölünüp `" ".join` ile geri yapıştırılıyor → paragraf boşlukları, madde işaretleri, `##` başlıkları ile bloklar bozuluyor. Frontend `cleaned !== text` ise mesajı değiştiriyor (her çok paragraflı çıktı değişir) → **masadaki her model cevabı görünüş olarak çöpe dönüyor.**
2. **Kırık fallback (`persona_guard.py:78-80`):** tek cümlelik tam sızıntıda cümle elenip `cleaned_text` boşalınca `_META_REGEX.sub("", text)` devreye giriyor → kalıbı *cümle içinde* siliyor, gramer ölür.
3. **Konusal sansür:** desen listesi `chatgpt|openai|anthropic|deepseek|claude` ve "sistem istemi/prompt" içeriyor → masada AI *tartışılırken* bu kelimeler geçtikçe meşru cümleler **sessizce siliniyor** (kullanıcı fark etmez). Bekçinin işi "konuşan model olduğunu itiraf etmesin" olmaldı; "AI'dan bahsetmesin" olmamalı.
4. **Yeniden üretim döngüsü kurulu değil:** `build_revision_instruction` hazır ama hiçbir akış çağırmıyor; temizlik yalnızca sonradan metin ameliyatı. Doğru mimari: `validate` → ihlal varsa *istemle yeniden üret* (maks. 2 deneme) → hâlâ ihlal varsa o cümleyi `[kırıldı]` ile işaretle.
5. Eksik desenler: "language model", "LLM olarak", "yardımcı olmaktan memnuniyet", "sınırlarım var", "bir asistan olarak" vs.

### 3.3 GÜVENLİK (P0/P1)

| # | Bulgu | Kanıt | Risk |
|---|---|---|---|
| S1 | **SSRF:** `/api/chat` ve `/api/ping` tarayıcının verdiği *herhangi bir* `base_url`/`url` değerine sunucu adına istek atıyor. Host doğrulaması, özel IP engeli, allowlist yok. CORS `allow_origins=["*"]`. | `app.py:44,79-93,96-128` | Aynı makinedeki/lan'a açılan her sekme, proxy'yi iç servisler (örn. `169.254.169.254`, `127.0.0.1:*`) veya harici hedeflere yönlendirebilir. |
| S2 | **API anahtarları tarayıcıda.** Anahtarlar `localStorage`'da düz metin (`konsul_seats_v3`), her istekte gövdede uç proxy'ye gidiyor. | `static/index.html:1458-1490` | XSS veya kötü niyetli bir sekme (CORS `*` ile) anahtarları süpürür. En azından anahtarları backend'de saklama + `Authorization` yerine geçici token; minimum: anahtarı UI'da maskeleme ve "anahtarı bu makinede sakla" uyarısı. |
| S3 | `HOST = "127.0.0.1"` yerel için doğru; ama README'deki "bulut/Postgres" anlatısıyla ve herhangibir LAN kullanım senaryosuyla çelişiyor. S1 açıkken 0.0.0.0'a bağlamak doğrudan açığa çıkar. | `app.py:34` | Dokümantasyon + S1 birlikte çözülmezse tuzak. |
| S4 | `payload: dict` — Pydantic modeli yok; `float(payload.get("temperature"))` çöplerde 500 fırlatır; `messages` boyutu sınırsız. | `app.py:96,130` | Dayanıklılık. |
| S5 | **DB hijyeni:** her çağrıda yeni bağlantı, WAL yok, `busy_timeout` yok, `messages.session_id` üzerinde index yok; async handler'lar içinde senkron SQLite → event loop'u blokluyor. `INSERT OR REPLACE`'le aynı `session_id` yeniden başlatılırsa kapanmış oturumun durumu sıfırlanır. | `engine.py:20-22,162-175` | Yük altında "database is locked", yavaş sorgular. |
| S6 | `save_character` REPLACE'i karakteri değiştirirken `episodic_memory` referanslarını örsüz bırakıyor; mimar aynı `id`'i üretirse mevcut karakter **sessizce ezilir**. | `engine.py:120-137` | Veri kaybı. |

### 3.4 ÖLÜ HAFIZA DÖNGÜSÜ (P0 — ürünün vaadi bu)

README'nin kalbi "karakterler kanlı canlı insan gibi hatırlar" diyor. Gerçeklik:

- `add_character_memory` → **yalnızca** `close_session` içinde çağrılıyor (`engine.py:176-181`).
- `close_session`'u çağıran `/api/session/conclude` rotası **frontend'den hiç çağrılmıyor** (grep: 0 sonuç).
- `build_character_runtime_prompt` (hafızayı isteme dokuyan derleyici) **hiçbir rotadan çağrılmıyor** (grep: sadece tanım `engine.py:192`).
- `get_session_messages` rotasız (`engine.py:171`) → arşiv salt yazımlı.
- `inner_thought` sütunu: model yapılandırılmamış (`{content, inner}` JSON hiç istenmemiş), frontend göndermiyor, UI göstermiyor.

**Sonuç:** 461 satırlık motorun yaklaşık 1/3'ü (hafıza, oturum, iç ses) hiç akışa girmemiş. Bu ürünün "özel" kısmı bugün koda değil README'ye yazılı.

### 3.5 README ↔ GERÇEKLİK TABLOSU

| README vaadi | Kod |
|---|---|
| 5 oda (Konsey, Jüri, Sentez, **Zarflar**, **Arşiv/Tutanak**) | 4 oda var; Zarf ve Arşiv **yok** |
| Nöral Türkçe TTS (Azure Ahmet/Emel), ElevenLabs portu, STT konuşarak yazma | **0 satır** |
| Mobil Katılım Portali `/katil/[token]` | **Yok** |
| Canlı API doğrulama + yanıt süresi (ms) ölçümü | `/api/ping` var; ms ölçümü **yok** |
| MBTI + Big Five, bağlanma stili, kaygı/ego/savunma mekanizması | DB'de ve modalda **yok** (sadece dogma+irritant) |
| İki katmanlı zihin (`content`/`inner`) | Sütun var, üretim/gösterim **yok** |
| `npm run dev` → `localhost:3000` (Postgres opsiyonel) | Gerçek uygulama `python app.py` → 8888, SQLite; 3000'de **eski 3 koltuklu React** açılır |
| Söz kesme / ihraç / sessize alma kontrolleri | Durdurma ve itiraz var; **mute/ihraç yok** |

### 3.6 ETİK / İÇERİK POLİTİĞİ (P0)

`characters.json → adolf_hitler` (dogma 10): *"Sen ADOLF HITLER'sin… zayıflar boyun eğer… sert bir şekilde azarlarsın"*. Sonundaki "şiddeti övmek için değil" notu, istemin ruhunu değiştirmiyor:

1. **Sağlayıcı reddi:** OpenAI/Anthropic/Google bu tipte tam bedenleme istemini büyük olasılıkla `content_policy` hatasıyla döndürür → o sandalye kullanılamaz.
2. **Marka:** "Profesyonel karar alma ve felsefi denetim istasyonu" vitrininde bu seed, ürünün algılanan sınırlarını aşağı çeker.
3. **Öneri:** Varsayılan seed'den çıkar. Ya yerine *analitik mesafe* kuralına bağlı, üçüncü şahıs "karşı-argüman arketipi" (örn. "Radikal Otoriter Zihniyet — yalnızca tezini savunan, asla insanlara hakaret etmeyen soyut bir düşman kavşak"), ya da ürün içinde açık bir **"İçerik Politikası + Hassas Figür Modu"** (birinci şahıs yasak, yalnızca tez analizi, operatör onayı) olarak sun. Bu kararı kullanıcının önüne koyan bir onay akışı da ekleyin — 25 yıllık denetçi gözüyle söyleyeyim: **ürünün sınırlarını açıkça çizebilmek, sınırsız görünmekten güçlüdür.**

### 3.7 PERFORMANS & UX (P2)

- **O(n²) stream render:** her delta'da `mountMd` tüm mesajın markdown'ını yeniden derliyor (`static/index.html:1538-1552` + `updateCouncilMsg`). Uzun oturumlarda UI takması garantili. İnceleme: delta'yı yalnızca son bloğa yama, tam render'ı `onDone`'da.
- **Sınırsız bağlam:** her turda *tüm* tutanak yeniden gönderiliyor; `max_tokens` yok, özetleme/yumuşak kırpma yok → uzun konsey 8k yerel modellerde patlar.
- **Fake telemetri:** "NÖRAL BAĞLANTI: %99.8" (`static/index.html:991`) — dekoratif sayı gerçek telemetri değil; ya gerçek veriye bağla ya kaldır. Bir denetçi olarak not: *gerçek* veri göstermek, süslü sahte veriden pahalıdır.
- **Çelişen kopya:** jüri istemi hâlâ "Aynı soru **iki** modele daha soruldu" diyor (`static/index.html:2147`) — masada 5 var.
- `alert()` ile atama bildirimi; toast/HUD bannerı hazır bekliyor, kullanılmıyor.
- `httpx.AsyncClient` her istekte yeniden kuruluyor (TLS el sıkışma + bağlantı havuzu israfı, `app.py:107,145,285`); tek paylaşımlı istemci + `aclose` yeterli.
- `research_fact_check` LLM zaman aşımı **8 sn** (`engine.py:370`) — reasoning modellerde sürekli fallback'e düşer; 8→60 sn + akışlı.

---

## 4. "EN ÖZEL NOKTA" — VİZYON

### 4.1 Konumlandırma (tek cümle)

> Bugün bu ürün "5 botun konuştuğu istasyon". Özel noktası şuna dönüşmeli:
> **"İknanın ölçüldüğü istasyon."** — Kararı değil, kararın *nasıl* oluştuğunu, kimin kime hangi kanıtla ikna olduğunu, hangi iddianın doğrulandığını, iç sesin dış söze ne kadar sadık kaldığını **ölçen ve belgeleyen** masada tek ürün.

Bunu satırla değil **ölçülebilir özelliklerle** kurarsak rakip "çoklu asistan" dalgasının tamamından ayrılırız.

### 4.2 TAÇ: İkna Deltası + Mühürlü Zarf Protokolü (ürünün kalbi)

Şu an yok; README'de vaat edilmiş; mimari (izole jüri kanalları) zaten hazır. Akış:

1. **Mühürleme:** Konu masaya inmeden önce her sandalye *izole kanaldan* (jüri motoru) nihai pozisyonunu + tek kelimesini yazar; yanıtlar `sha256` mühürlenip DB'ye "zarf" olarak düşer. UI'da zarflar mühürlü kartlar olarak durur.
2. **Açık konsey** bugünkü gibi akar.
3. **Aynı anda açılış:** Konsey kapanınca zarflar aynı saniyede açılır (tiyatro anı — bu ürünün "wow" sahnesi).
4. **İkna Deltası:** Her sandalye için `mühürlü pozisyon` ↔ `nihai pozisyon` farkı → **0-100 İkna Skoru** + "kimi ikna etti / kim ikna etti" matrisi. Rapor: *"Mühürde X diyordu, şimdi Y diyor; değişimi tetikleyen kanıt: Sandalye B'nin 14:32 tarihli doğrulanmış iddiası."*

Bu özellik bugün hiçbir çoklu-ajan ürününde yok. Ürünün adını **yuvarlak masadan ikna laboratuvarına** taşır.

### 4.3 KADİRİ (P1) — Ayırt Edici Çekirdek

| # | Özellik | Mevcut iskelet | Ek mesafe |
|---|---|---|---|
| K1 | **İç Ses Modu (director's cut):** Model `{content, inner}` JSON üretir; `inner` kapalı durur. Operatör "İÇ SES" düğmesiyle masanın gizli şüphelerini, önyargılarını izler. İç/dış çelişki skoru sandalye kartında "GÜVENİRLİK" rozeti. | `inner_thought` sütunu hazır | Yapılandırılmış çıktı + toggle UI + çelişki skoru |
| K2 | **Gerilim Metresi:** İtiraz hakemi zaten çalışıyor; kararından 0-100 gerilim değeri + kaynağı çıkar; masanın altında canlı gerilim grafiği; eşiği aşınca otomatik "soğutma" (operatör müdahale önerisi). | `evaluate_rebuttals` hazır | Skor alanı + HUD grafiği + eşik kuralı |
| K3 | **Yakınsama Radarı:** Her turun sonunda 5 yanıtın gömme/leksiksel benzerlik matrisi → 5 düğümlü yıldız diyagramı + oturum boyunca yakınsama eğrisi. Tartışmanın *bir mi oluyor yoksa kutuplaşıyor mu* olduğunu canlı gösterir. | Yok | Küçük embed (ya da basit TF-IDF) + canvas/SVG |
| K4 | **Arşiv & Tutanak Odası:** Arama, etiket, pin, Markdown/PDF tutanak indirme, **"masayı yeniden aç"** (eski oturum + aynı karakterlerle devam). | Tablolar dolu, rotalar ölü | 3-4 GET rotası + 1 oda |
| K5 | **İddia Defteri:** `verifyClaimWithAgent` bağlanır; doğrulanmış/iddia sahte/çarpıtılmış iddialar oturum düzeyinde "İddia Defteri" panelinde birikir; sentez raporu yalnız doğrulanmış iddialara atıf yapar. | Motor + rota hazır | Mesaj üstü aksiyon + panel + sentez entegrasyonu |
| K6 | **Gerçek Başkan Kontrolleri:** Durdurma var; ekle: **Sözü Kes** (stream ortasında abort + "söz kesildi" damgası), **Sessize Al** (oturum boyu), **İhraç & Yeniden Oturttur** (konsey sırasında karakter değişimi), **Süre Kısıtı** (koltuk başına max_tokens), **Zorunlu Oylama** (her sandalyeden 0-10 + tek kelime). | Kısmen var | Abort zaten var; kontrol katmanı |
| K7 | **Kör Jüri 2.0:** Gerçek anonimizasyon (harita backend'de tutulur, "AÇILIŞ TÖRENİ"ne kadar UI asla isim görmez) + operatörün kör oyu + kazanan/kaybeden yan yana diff. | Jüri odası var | Anonizasyon + oylama + açılış |
| K8 | **Yaşayan Hafıza:** Ölüm döngüsünü canlandır (`conclude` → `add_character_memory` → `build_character_runtime_prompt`); karakterler geçmiş oturumları **kullanır**: *"Geçen ay bu masada sen bana X demiştin."* `rivalries` alanı (hazır!) ile karakterler birbirine küskün kalır. Karakter Dosyası görünür zaman çizelgesi. | %70 kodu yazılmış | Çağrıları bağla + zaman çizelgesi UI |

### 4.4 TAÇIN UZANTISI (P2) — Efsane Katmanı

- **Sesli Yuvarlak Masa:** `edge-tts` (anahtarsız, ücretsiz, kalabalık tr-TR sesler) ile her koltuğa *farklı* Türkçe sesi + operatör için Web Speech API STT → "YAYIN MODU": masa duyulur. README vaadi bu şekilde, bedavaya gerçeğe dönüşür.
- **Karar Protokolü (Hukuki Üslup):** Sentez çıktı standart bir "KARAR RAPORU": **Görev / Süreç / Kanıt Raporu (İddia Defteri'nden) / Karar / Muhalefet Şerhleri / Eylem Planı / Başarı Metrikleri / Risk Kaydı**; koltuk mührü (avatar damgası) + rapora `sha256` parmak izi. "Muhalefet şerhi" Türk kurum kültürüne özgü, dünyada benzeri olmayan bir imza.
- **Arena (1v1):** İki sandalye seçilir, sırayla itirazlı düello; her rauntta hakem 0-5 puan dağıtır; maç kartı.
- **Zaman Makinesi:** `era` + `knowledge_cutoff` alanı; 1923 Sülün Osman 1980 olayını *bilemez* — istemde sabitlenir. Dönem kılığı karakteri derinleştirir.
- **Koltuk Sayısı Esnekliği:** 5 sabit değil, 2-8 sandalye (jüri de dahil) — grid ve sıra motoru zaten dizisel çalışıyor.
- **Paylaşılabilir Çıktı:** Oturumun "film şeridi" dışa aktarımı (Markdown + zaman damgaları + sesler) → masadan çıkıp gitmeyen belge.

### 4.5 MİMARİ KARARI (Denetçi Kararı)

1. **Tek frontend.** Kısa vadede (bu sprint): `src/` React ağacını **sil** veya `legacy/`'e it; amiral `static/index.html` kalır, `package.json`/`README` buna hizalanır. Uzun vadede (1-2 sprint): 5 koltuk + karakter kütüphanesi + hologram tasarımı React'e taşınır; vanilla dosyası emekliye ayrılır. İkisi birden asla yaşamaz.
2. **Backend tekilleştirme:** Pydantic şemaları (`ChatPayload`, `CharacterPayload`…), tek paylaşımlı `httpx.AsyncClient`, `base_url` doğrulama (şema + host allowlist + RFC1918/link-local engeli), SQLite WAL + `busy_timeout(2000)` + indexler, `max_tokens` ve tur başına token bütçesi, bağlam özetleyici (tutanak N turu aşınca "şu ana kadar" özeti).
3. **Yapılandırılmış çıktı standardı:** Tüm model çağrıları `{content, inner?, stance?}` şemasına döner (fallback: düz metin kabul). Bu, İç Ses + İkna Deltası + Oylama için ortak temeldir.
4. **Persona Guard v2:** (a) temizlik yapma, *yalnızca* doğrula; (b) ihlalde istemle yeniden üret (2 deneme); (c) konusal kelime listesi yok — yalnız **kendini tanımlama** kalıpları; (d) kalıntı cümle `[…karakter dışı ifade elendi…]` damgasıyla bırakılır, sessizce silinmez.
5. **İçerik Politikası dosyası** (`CONTENT_POLICY.md`) + hassas figür onay akışı (§3.6).

---

## 5. UYGULAMA YOLU

> ### ✅ FAZ 1 YÜRÜTME NOTU (17.11.2026 — tamamlandı)
>
> | # | Madde | Sonuç |
> |---|---|---|
> | 1 | `insertTactic` + `toggleHoloTable` tanımsız (B1, B2) | Tanımlandı; taktikler operatör mikrofonuna yüklenir + toast bildirimi |
> | 2 | Persona Guard (B: §3.2) | **v2 yeniden yazıldı:** yapı koruyucu temizlik, kendini-tanımlama/ konusal ayrımı, placeholder damgası, `validate` iki kademeli (violations + warnings). 6 test senaryosu geçti |
> | 3 | Hassas seed (§3.6) | `adolf_hitler` → `guc_radikal_arketip` (analitik mesafe, şiddet/yasağı yazılı). Eski DB'ler için `init_database` içine koruyucu `DELETE`. Mimar istemine hassas figür kuralı eklendi |
> | 4 | SSRF + doğrulama (S1, S4) | `_validate_base_url` (http(s) + yerel port allowlist `KONSUL_LOCAL_PORTS=11434,1234,20128`), Pydantic `ChatPayload` (temperature 422), 14 birim testi + canlı uç testi geçti |
> | 5 | Demo modu (B4) | Koltuk-anahtarı bazlı 5 işlevli demo (Çerçeve·Kanıt·Sahaya İndirme·Güç Haritası·Derin Soru); 5 farklı açılış + 5 farklı tur-4 yanıtı doğrulandı |
> | 6 | README ↔ gerçeklik | README yeniden yazıldı: 4 oda, gerçek uç tablosu, görünür API yüzeyi, SSRF kilidi, Faz 2/3 yol haritası. React ağacı `legacy-react/` altına izole edildi |
> | + | Ek düzeltmeler | `overrideNextSpeaker` sessiz yutma (B5), modal otomatik-istem ezme (B7), `esc` tırnak (B8), karakter→sandalye DNA transferi + toast (B6), `verifyClaimWithAgent` sessionId (B3), gerçek telemetri (fake %99.8), paylaşımlı httpx istemcisi + lifespan, SQLite WAL + indeksler + `list_sessions` rotaları, research 8sn→60sn, rebuttal 15sn→45sn, verdict sütunu düzeltmesi, **f-string backslash (Py 3.10/3.11 crash — yeni bulgu),** `KONSUL_HOST/PORT` env |
>
> **Kalan (Faz 2/3):** K6'nin geniş kontrol seti (Sözü Kes ✅ Faz 3b, Sessize Al ✅ Faz 3b, İhraç & Yeniden Oturttur ✅ Faz 3b, Süre Kısıtı — hâlâ borç), K1'in iç/dış çelişki "GÜVENİRLİK" skoru ✅ Faz 3b, K5'in sentez-raporu-bağlama adımı (borç), K7'nin operatör kör oyu + kazanan/kaybeden diff'i (borç), K8'in `rivalries` küskünlük döngüsü ✅ Faz 3b + görünür zaman çizelgesi ✅ Faz 3b (Zaman Makinesi); Faz 3'te 1v1 Arena ✅ Faz 3b, Zaman Makinesi ✅ Faz 3b, film şeridi dışa aktarma ✅ Faz 3b, 2-8 sandalye esnekliği (borç).
>
> ### ✅ FAZ 2a YÜRÜTME NOTU (17.11.2026 — taç tamamlandı)
>
> **Mühürlü Zarf Protokolü + İkna Deltası** uçtan uca kuruldu:
> * **Backend:** `envelopes` tablosu (SHA-256 mühür, zaman damgası, tek seferlik açılış damgası), `/api/envelope/{seal,status,open}` + `/api/delta/compute`. Delta analizi hakem modeliyle çalışır; model yoksa **mekanik difflib fallback** devreye girer (özellik asla ölmez). 8 birim test + canlı HTTP senaryosu geçti (deterministik mühür, idempotent açma, A=0 "dayandı" / B=75 "ikna edildi" doğrulaması).
> * **Frontend:** Masa 05 "Mühürlü Zarf & İkna Deltası" — izole kanallardan paralel mühürleme (canlı yazım izleme + tek tıkla durdur), mühürlü kartlar (hash damgalı), açılış töreni, delta panosu (0-100 skor çubukları, "ikna eden", tetikleyen kanıt, İkna Haritası).
> * **Akış:** ✉ Mühürle → Masa 01'de aynı konuyu tartış → ⚖ Aç → ◆ İkna Deltası Hesapla.
>
> ### ✅ FAZ 2b YÜRÜTME NOTU (17.11.2026 — kalkan tamamlandı)
>
> Kalan tüm Faz 2 Kale-i Kalesi (K1-K8) tek dalgada kuruldu; 13 uçtan uca canlı test + tension fallback testi geçti:
> * **K1 İç Ses Modu:** Her sözün ardından aynı model izole geçişte 1-2 cümlelik iç monolog üretir (`record_message.inner_thought` tek kayıtta düşer); kırmızı kesikli blok + tek toggle (demo modda sahte üretim YOK). Arşiv tutanağında da görünür.
> * **K2 Gerilim Metresi:** `evaluate_rebuttals` şablonu `tension:0-100` ister; parser clamp'ler, iki fallback yolu 30 döner; konsolda mavi→amber→kırmızı gauge.
> * **K3 Yakınsama Radarı:** `POST /api/convergence` — hakem modeli 5 pozisyonu 0-100 puanlar (JSON şablon, 45 sn, temp 0.1); model yoksa **mekanik çift-benzerlik fallback** (difflib). Tam tur bitince otomatik çalışır; tur başı sparkline.
> * **K4 Arşiv & Tutanak Odası (Masa 06):** Oturum listesi (konu/durum/kayıt sayısı/karar), konu filtresi, tam tutanak görünümü (iç ses + itiraz bağları dahil), Markdown indirme, "MASAYA TAŞI".
> * **K5 İddia Defteri:** `verifyClaimWithAgent` artık **mesaj üstü "🔍 İDDİAYI DOĞRULA" butonuyla bağlı** (Hakem kanalı, tarafsızlık); darbe vuran hüküm tutanağa, tam kaynaklı rapor deftere düşer.
> * **K6 Zorunlu Oylama:** Başkan yetkisi — 5 paralel izole oylama (PUAN 0-10 / KELİME / GEREKÇE protokolü), canlı şerit, 5/5 oyla ortalama + çoğunluk kelimesi tutanağa.
> * **K7 Kör Jüri 2.0:** Başhakem yanıtları *JÜRİ 1..5* olarak (her çalıştırmada yeniden karılan eşleme, isim soyulmuş) okur; sıralama + güçlü/zayıf argümanlar + sentez; rapor bitince **Kimlik Açılışı** şeridi.
> * **K8 Yaşayan Hafıza:** Döngü canlandı — `conclude` (otomatik karar metni dökümü) → `add_character_memory` → `GET /api/memory/{char_id}` → oturum açılışında 5 sandalyenin anıları çekilir → sistem istemine "GEÇMİŞ MÜZAKERELERDEN KALAN KİŞİSEL HAFIZAN" bloğu enjekte edilir. Karakterler artık *geçen oturumda* atfı yapacak.
>
> ### ✅ FAZ 3a YÜRÜTME NOTU (17.11.2026 — resmî belge + sesli masa)
>
> **Hukuki Karar Protokolü & Muhalefet Şerhi (L2)** ve **Sesli Masa (L1)** kuruldu; 16 uçtan uca canlı test geçti (rapor kaydet/oku/liste/en-yeni, 400/404, regressions).
> * **L2 Karar Raporu:** Başhakem, Türk kurum kültüründeki resmî karar raporları üslubunda 8 bölümlü belgeyi döküyor. **KANIT RAPORU** bölümü İddia Defteri'nden besleniyor (doğrulanmamış iddia "kanıt boşluğu" olarak işaretleniyor). **MUHALEFET ŞERHLERİ:** kararın gerekçesiyle çelişen her sandalye **kendi sesiyle** (kendi karakter istemiyle, paralel + izole, 45 sn zaman aşımı) resmî şerh yazar; şerhler belgenin 5. maddesine gömülür. Belge `SHA-256` parmak izi + 5 sandalye mührü (ŞERH İLE RED / ONAY) + başkan onayıyla imzalanır, `decision_reports` tablosuna damgalanır, `.md` indirilir, Arşiv Odası'nda 📜 rozeti + açılır bölüm olarak görünür. `rowid` sıralamasıyla aynı saniyedeki çoklu rapor için "en yeni" belirleyici.
> * **L1 Sesli Masa:** Ses TAMAMEN tarayıcıda üretilir (Web Speech API; harici TTS servisi yok, sunucuya ses gitmez, gecikme yok). Mesaj üstü `🔊` tek söz okuma; konsol **CANLI SES** ile sözler karakterin sesiyle otomatik akar; sandalye modalında kalıcı ses ataması + `🎭 SESLİ TANITIM`; operatör barında `🎙` tr-TR dikte. Dogma değeri tonu (pitch) etkiler; hakem daha düşük/başka bir tonda konuşur.
>
> **Düzeltme:** Veritabanı dosyası `konsul.db` (k ile) — önceki dalgaların `consul.db` adıyla yaptığı temizlikler no-op'tu; arşivden test kalıntıları doğru adla temizlendi.
>
> ### ✅ FAZ 3b YÜRÜTME NOTU (17.11.2026 — arena + zaman + kalem)
>
> Faz 2'nin kalan K-madde borçlarının büyük kısmı + Faz 3 vizyonunun ilk üç kalemi tek dalgada kuruldu; 15 uçtan uca canlı test geçti (arena marker'ları, hafıza/rivalries döngüsü, arena oturum yaşam döngüsü, 400 doğrulaması, regresyon).
> * **Arena 1v1 (Masa 07 "Sıfır Sığınak"):** A sandalyesi "iddia GEÇERSİZ", B sandalyesi "iddia GEÇERLİDİR" savunur; salvo sayısı 1/2/3/5; her salvo rakibin *önceki sözünü adıyla ve içeriğiyle* çürütmek zorunda (anti-tekrar istem kuralı, son 1200 karakter beslenir); 60-120 kelime, birinci şahıs, tam persona. Salvolar A→B gerçek zamanlı akar; `■ KES` her iki kanaldaki AbortController'ı vurur. Bitişte Başhakem (H) tutanağı okuyup KAZANAN (A/B) / EN GÜÇLÜ DARBE / EN ZAYIF AN / NİHAİ HÜKMÜ döküyor; kazanan altın çerçeveye, kaybeden soluklaşır. Düello `arena_…` dosya numarasıyla arşive yazılır.
> * **Zaman Makinesi (Masa 01):** Konsol altındaki sinematik şerit, her sözü bir kareye çizer (renk = sandalye/operatör, yükseklik ∝ uzunluk, tur ayracı her 5 model sözünde). Kareye tık → konsol o indekse geri sarar ("SÖZ i/n · konuşmacı · saat · tur" çubuğu, ◀ ▶ kare-kare, `ŞİMDİYE DÖN`). `tmRendering` guard'ı timeline yeniden çizim döngüsünü keser; geçmişteyken yeni model sözü gelirse masa otomatik şimdiki zamana sarılır.
> * **K6 geniş başkan kontrolleri:** Satır başı `🔇/🎤` (Sessize Al — `nextSpeaker` sessiz/ihraç edilmiş koltukları atlar, tümü kapalıysa null döner ve oturum nazikçe durur), sandalye modalında `⛔ OTURUMDAN İHRAÇ ET` / `↻ GERİ OTURT` (yalnız aktif oturumda görünür; modal açık kalır ki yenisini oturtasın), konsolda `⚡ SÖZÜ KES` (çalışma sırasında etkin; akışı keser + operatör damgası). İHRAÇ/SESSİZ etiketleri satırlarda görünür. Operatör sözü artık `record_message` ile tutanağa da yazılır (arşiv tam sürük).
> * **GÜVENİRLİK (K1 borcu kapandı):** İç ses protokolü modele "GUVENILIRLIK: 0-100" satırı yazdırıyor (0 = söylenenle hissedilen tamamen çelişiyor); frontend bu satırı ayıklayıp iç sesten temizliyor, `GÜV` rozetini sandalye satırına işliyor (<40 kırmızı ikiyüzlülük, <70 amber, ≥70 yeşil).
> * **Küskünlük Haritası (K8 `rivalries` döngüsü):** Oturum kapatılırken Başhakem tutanağı JSON olarak tarar (30 sn zaman aşımı, hata toleranslı): `{grudges:[{a,b,why,intensity}]}`. Her çiftin iki tarafına da *kendi karakterinin* defterine `POST /api/memory/add` ile girdi damıtılır. `get_character_memory_text` (engine.py) rivalries satırlarını "KİŞİSEL HESAPLARIN" bloğu olarak kişisel hafıza metnine ekliyor — karakter bir sonraki oturumda bu kişileri nezaket kurallarıyla birlikte hatırlıyor.
> * **Film Şeridi (Arşiv):** `🎬 FİLM ŞERİDİ (.html)` — seçili oturumun (arşiv) mesajları + iç ses + karar raporu, tek dosyalık bağımsız `.html` filme dökülür: açılış kartı, söz başına tam ekran sayfa (dev sandalye harfi, konuşmacı şeridi, iç ses bloğu), resmî belge sayfası (SHA-256 bandı), jenerik. Sayfa içi `mdToHtml` yeniden kullanılıyor; ölü kopya butonları statik belgeden soğruluyor.
>
> **Kalan borç (Faz 4'a):** 2-8 sandalye esnekliği; K5→sentez bağlama adımı; K7 operatör kör oyu + kazanan/kaybeden diff; K6 süre kısıtı; O(n²) markdown yeniden çizim; sınırsız bağlam; API anahtarları localStorage'da açık metin; CORS `*`; CONTENT_POLICY.md yok.


### Faz 1 — "Önce Kanı Durdur" (P0, ~1 gün)
1. `insertTactic`, `toggleHoloTable` tanımla (B1, B2)
2. Persona Guard v2 (yapı koruyan, yeniden üreten) — §4.5.4
3. Hitler seed → güvenli arketip/analitik-mod + onay akışı (§3.6)
4. `base_url` SSRF kilidi + Pydantic + paylaşımlı istemci (S1, S4, 3.7)
5. Demo modunu 5 karaktere uyarla (B4)
6. README ↔ gerçeklik hizala; `src/` statüsünü netleştir (kaydet/göm)

### Faz 2 — "Özel Oluş" (P1, ~1-2 hafta)
- İkna Deltası + Mühürlü Zarf (taç) → İç Ses (K1) → İddia Defteri (K5) → Arşiv Odası (K4) → Gerilim Metresi (K2) → Başkan kontrolleri (K6) → Jüri 2.0 (K7) → Hafıza döngüsü (K8) → Yakınsama Radarı (K3)

### Faz 3 — "Efsane" (P2, ürün sonrası)
- Sesli masa (edge-tts + STT) ✅ 3a (Web Speech ile) → Hukuki Karar Protokolü + muhalefet şerhi ✅ 3a → Arena ✅ 3b → Zaman Makinesi ✅ 3b → film şeridi dışa aktarma ✅ 3b → 2-8 sandalye esnekliği (Faz 4)

---

## 6. SON SÖZ

İskelet doğru, estetik iddialı, ruh güzel: *güçlü bir "felsefi ring" tasarımı var. Ama ürün bugün %55 tamamlanmış bir vizyon: motorun kalbi (hafıza, iç ses, zarf, arşiv) kodda var ama akışa dokunmamış; README ise ürünün "istenen" halini satıyor. İlk sprintte 6 küçük müdahale ile kanayan yaralar kapanır; İkna Deltası + İç Ses ikilisi kurulduğunda bu, "5 chatbot konuşturuyor" kalıplarının dışına çıkan, **ikna mekanizmasını ölçen** — yani gerçekten benzersiz — bir ürüne dönüşür.

*Denetçi notu: En pahalı hata bu koda "daha fazla özellik" eklemek olur. Önce ölüm döngülerini canlandır, bozuk düğmeleri onar, sonra taçı tak.*
