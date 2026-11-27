# FAZ 1 · Canlı Kalite Raporu — Gerçek Konuşma Kaydı Üzerinden

**Test ortamı:** https://yuvarlakmasa.com.tr (canlı — Groq `qwen/qwen3.8-27b`; yoğunlukta otomatik yedek "Hazır Ücretsiz Havuz / openai")  
**Tarih:** 27 Kasım 2026  
**Kapsam:** 4 gerçek soru, özel tanımlanmış katılımcılar + canlı sunucudaki Moderatör, Nörodinamik Ajan ve 7 bölümlü Karar Hakemi, uçtan uca canlı çalıştırıldı.  
**Kaynak:** Kullanıcının canlı siteden aldığı tam tutanaklar (oturumlar: `faz1_live_q1_q3`, `faz1_live_q2_q4`). Bu rapor, o tutanakların denetimi ve kod tarafı düzeltmelerinin kaydıdır.

---

## A. Neyin gerçekten çalıştığı (tutanak kanıtıyla)

| Bulgu | Kanıt |
|---|---|
| **Karşılıklı tartışma %100 çalıştı** | 4 soruda hiçbir koltuk havaya konuşmadı; herkes bir öncekinin sözünü **adıyla anıp** doğrudan yanıt verdi ("Klinik Psikolog'a katılıyorum…", "Hekim abi…", "Psikanalist 'sahte performans' lafına…"). |
| **Karakterler gerçekten farklı düşündü** | Tek tanrılı din örneğinde: Kelâmcı (irade/kulluk), Hristiyan İlahiyatçı (özgür sevgi), Haham (Tora'da hak edilmiş iyilik), Tasavvuf (gizli hazine) — aynı konuda dört ayrı gerekçe. |
| **Moderatör Çelişki Turu işe yaradı** | Soru 1 ve 2'de masadaki tekrarları ve kanıtlanmamış varsayımları kesip doğrudan derinleştirme sorusu sordu. |
| **Hakem tartışmaya bağlı kaldı** | Yeni bilgi uydurmadı; kanıtsız büyük lafları tek tek **DOĞRULANMAMIŞ İDDİALAR** altına yazdı; "kesin karar verilemez" diyebildi. |

## B. Yakalanan hatalar, doğrulamalar ve düzeltmeler

| # | Öncelik | Bulgu (canlı) | Kodda doğrulama | Durum |
|---|---|---|---|---|
| 1 | **Kritik** | Hakem çıktısı RİSKLER 2. maddede **cümlenin ortasında kesiliyor** (Soru 1–2, `max_tokens: 1100`) | `static/index.html` hakem çağrısında `maxTokens: 1100` bulundu; qwen gizli düşünme payıyla bu sınırı harcıyordu | ✅ **Kapatıldı** → `2048` + `timeoutMs 45000` + talimata "düşünmeyi uzatmadan bölümleri yaz" eklendi. Test 48. |
| 2 | **Orta** | Nörodinamik Ajan bazen kanıt uyduruyor ("evrim biyolojisi kanıtladığı"), kesin metafizik hüküm veriyor ("ontolojik zorunluluktur") | `characters.json` → `norodinamik_ajan.system_prompt` incelendi; böyle bir yasak yoktu | ✅ **Kapatıldı** → isteme "DIŞ OTORİTE YOK" ve "SADE TÜRKÇE" maddeleri eklendi. |
| 3 | **Orta** | Ardışık çağrılar Groq hız/kota sınırına çarpıyor; bazı çağrılar yedeğe (Pollinations) düşüyor | Havuz kodu doğrulandı: `_fallback_candidates` birincil sağlayıcı hatasında sırayla diğer sağlayıcılara, sonra Pollinations'a geçiyor — **mekanizma çalışıyor**; tek eksik, ikinci bir anahtarın ortamda olmaması | 🟡 **Platform ayarı kaldı** (aşağıda §C) |
| 4 | **Düşük** | Sert benzetmeler ("insanın köpek gibi…", "saf hayvana dönüşürdüm") ve çekim hatası | Özel katılımcıların promptu kullanıcının; fakat ortak dil kuralı yoktu | ✅ **Kapatıldı** → **tüm** koltuklara (özel katılımcılar dahil) eklenen `EVIDENCE_LANG_RULE`: aşağılayıcı/çeviri kokan benzetme yasağı + sade Türkçe. Test 49. Nörodinamik istemine de ayrı eklendi. |

## C. Kalan tek açık iş (kod değil, platform ayarı)

**Groq'un yedeği için ikinci ücretsiz anahtar.** Kod zaten sırayla deniyor; ortamda yalnız `GROQ_API_KEY` olduğu için yedek doğrudan Pollinations'a düşüyor.

**Yapılacak (Railway panelinden, senin eylemin):** Railway → servis → Variables → **`GEMINI_API_KEY`** ekle (ücretsiz: https://aistudio.google.com/apikey).  
Kod tarafı hazır: `PROVIDER_CATALOG` içinde Gemini tanımlı (`env_key: GEMINI_API_KEY`); anahtar eklenince arka planda ikinci yedek olarak devreye girer, çağrılar Pollinations'a düşmeden önce Gemini'ye uğrar.

## D. Bu turda değiştirilen dosyalar

| Dosya | Değişiklik |
|---|---|
| `static/index.html` | Hakem `maxTokens 1100 → 2048`, `timeoutMs 45000`, hakem talimatına "boşluk harcama" cümlesi; tüm koltuklara `EVIDENCE_LANG_RULE` (kanıt kuralı + dil kuralı) |
| `characters.json` | `norodinamik_ajan.system_prompt`: "DIŞ OTORİTE YOK" ve "SADE TÜRKÇE" maddeleri |
| `tests/dom/test_home_experience.js` | Test 48 (hakem 2048) ve 49 (ortak kural) |

## E. Testler

`bash tests/run_all.sh` → **✅ TÜM PAKET YEŞİL**  
jsdom ana sayfa **51/51** · gizlilik kilidi 10/10 · nörodinamik 11/11 · e2e kasa 21/21 · hız sınırı yeşil.

## F. Faz 1'in statüsü ve sonraki tur

- **Kısmen tamamlandı:** 4 canlı oturum üzerinden kanıtlı rapor üretildi; 4 bulgunun **3'ü kodda kapatıldı**, 1'i platform ayarı bekliyor (§C).
- **İzlenmeye devam edilecek (açık):** dil doğallığı (özel katılımcı promptları kullanıcının), Groq yoğunlukta yedek anahtar sonrası hız, hakem çıktısının 2048 ile gerçekten tamamlandığının bir sonraki canlı turda teyidi.
- **Sonraki Faz 1 turu:** yeni bir canlı turda hakem çıktısının RİSKLER–OLASI KARAR YOLLARI bölümlerini eksiksiz tamamlaması ve Nörodinamik Ajan'ın "kanıt uydurma" olayının sıfıra inmesi beklenecek; ikisi de tutanakla ölçülecek.
