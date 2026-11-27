# FAZ 0 · Durum Raporu — Mevcut Durum Mühürlendi

**Tarih:** 27 Kasım 2026  
**İncelenen sürüm:** `main` = `74faf14` (PR #16, v2.7.1) + bu rapor PR'ı (v2.7.2)  
**Yöntem:** Kod okuması, otomatik test paketi (`bash tests/run_all.sh`), GitHub dağıtım kayıtları  
**Canlı ortam:** Railway esas alındı (Vercel değerlendirme dışı). Railway'in `74faf14` için dağıtım durumu GitHub kayıtlarında **başarılı** görünüyor; canlı siteyi bu geliştirme ortamından açıp gözle doğrulayamadım (bu ortamın interneti yalnızca GitHub/npm/pypi'ye açık) — bu nedenle "canlıda kesin çalışıyor" değil, "dağıtım kaydı başarılı" diyoruz.

Bu rapor yeni özellik üretmez; **neyin gerçekten olduğunu** sabitler. Her satır ya kodda ya testte ya da GitHub kaydında doğrulanmıştır.

---

## 1. Ürünün dört temel unsuruna göre durum

| unsur | Durum | Kanıt / not |
|---|---|---|
| **İnsan — masanın sahibi** | **Kısmen tamamlandı** | Müdahale çubuğu var: masaya yaz, bir koltuğa sor, 1 tur daha, karar özetini güncelle (`static/index.html` → `followUpBox`). Eksik: belge/delil yükleme, müdahalenin sonraki cevapları *nasıl* değiştirdiğini gösteren açık karşılaştırma (Faz 3). |
| **Diğer yapay zekâlar — birbirine doğrudan yanıt** | **Tamamlandı (mekanizma)** | Her söz önceki konuşmacıya bağlanıyor; test 22 (sıra) ve test 25 (yanıt işaretleri gerçek mi) 49/49 paketin parçası. Kalitenin *canlıda* yeterli olup olmadığı Faz 1 kapsamında, henüz doğrulanmadı. |
| **Nörodinamik Ajan — özgün zekâ** | **Kısmen tamamlandı** | Gerçek mekanizma var: her model çağrısında `neuro_bridge.step_character` çalışır, bilişsel direktif sistem istemine eklenir (`app.py:_prepare_cognitive_messages`; e2e testi "bilişsel direktif upstream içinde" ile doğrular). Durum çipi gerçek veriyi gösterir (jsdom test 26). **Doğrulanamayan:** davranışının diğer katılımcılardan *ölçülebilir* farklılığı, predictor eğitimi (kodda mekanizma var; eğitim yaptığı iddia edilmez ve edilmeyecek — Faz 4). |
| **Hakem ve karar sentezi** | **Tamamlandı (temel)** | Karar, tartışmadan üretilir; 7 bölümlü gerekçeli çıktı (uzlaşılan, ayrışılan, doğrulanamamış iddialar, riskler, eksik bilgi, olası karar yolları, "kesin karar verilemez") — jsdom test 27–28. Eksik: "önerilen ilk adım + başarı göstergesi" şeridi (Faz 5). |

---

## 2. Plan maddelerine göre faz durumu

| Faz | Durum | Dayanak |
|---|---|---|
| **Faz 0 — Mevcut durum** | **Tamamlandı** | Bu rapor + `README.md` güncellemesi + tam paket yeşil. |
| **Faz 1 — Gerçek muhakeme kalitesi** | **Kısmen tamamlandı** | 4 gerçek soru canlı sitede çalıştırıldı; kanıtlı rapor [`FAZ1_KALITE_RAPORU.md`](FAZ1_KALITE_RAPORU.md): 4 bulgu → 3'ü kodda kapatıldı (hakem kesilmesi, kanıt/dil disiplini), 1'i platform ayarı (Gemini yedek anahtarı). Sonraki tur teyidi raporda §F. |
| **Faz 2 — Soru derinliği** | **Tamamlandı (kod)** | Soru kutusunun altında soruya göre görünen isteğe bağlı seçiciler (Zaman/Risk/Öncelik — anahtar kelime eşleşmesi, gereksizse gizli), tek netleştirme sorusu ve seçilen bağlamın 6 prompt noktasına `[KULLANICI BAĞLAMI]` enjeksiyonu. Detay: [`FAZ2_DURUM.md`](FAZ2_DURUM.md). Canlı teyit bir sonraki turda. |
| **Faz 3 — Kullanıcı müdahalesi** | **Tamamlandı (kod)** | Üç eksik kapatıldı: **Ek Bilgi/Belge kanalı** (kullanıcı verisi `[KULLANICI EK BİLGİSİ]` bloğuyla 6 prompt noktasına girer, silinince blok kalkar), **İtiraz Et** (çerçeveli `RESMİ İTİRAZ` turu), **Müdahale Günlüğü** (her müdahale + sonrasındaki söz sayısı) ve hakemde **`## MÜDAHALE SONRASI DEĞİŞİM`** bölümü zorunluluğu. Detay: [`FAZ3_DURUM.md`](FAZ3_DURUM.md). |
| **Faz 4 — Özgün zekâ** | **Tamamlandı (kod) + canlı karşılaştırma açık** | **Kanıt:** beğeni (`/api/neuro/feedback` → `learning:false`) ne kanıt tablosuna ne backtest'e dokunur; sohbet adımı eğitmez (davranış + `inspect` kaynak testleri). **Backtest:** `POST /api/neuro/outcome` + `GET /api/neuro/backtest` (MAE, skill-vs-naive, tavara göre). **Ölçülebilir fark:** durumlar adım adım değişir (FAZ4-7). Detay: [`FAZ4_DURUM.md`](FAZ4_DURUM.md). Açık: canlı A/B yanıt raporu (§4.4). |
| **Faz 5 — Karar çıktısı ve süreklilik** | **Kısmen** | 7 bölümlü çıktı var. Eksik: ilk adım + başarı göstergesi, paylaşılabilir link, sosyal medya kartı, 48 saat hatırlatma. |
| **Faz 6 — Keşif sayfaları** | **Eksik** | `/ev-mi-kira-mi` gibi konu sayfaları yok. |
| **Faz 7 — Güven ve olgunluk** | **Kısmen** | Var: iddia doğrulama, yasal/etik uyarılar, sahiplik kilidi, "kesin karar yok" dürüstlüğü. Eksik: kaynak/yorum/varsayım ayrımı sistemi, düzenli kalite ölçümü, veri kontrol paneli. |

---

## 3. Son üç sürümde ne teslim edildi (tam liste)

| Sürüm / PR | Teslim edilen | Durum |
|---|---|---|
| **v2.6 · PR #14** (`836eb2b`) | İlk ekranda demo sahnesi (8 söz, DEMO/YZ/İNSAN etiketleri, 0 sunucu çağrısı), 3 adımlı ilk kullanım, karşılıklı yanıt akışı, 7 bölümlü gerekçeli çıktı, moderatör + nörodinamik ajan | **Ana dalda ✓** |
| **v2.7 · PR #15** (`7ab7bf4`) | Sunucu arşivi gizlilik kilidi (varsayılan kapalı, `optArchive`), sahiplik anahtarı (owner token → sha256), "kendi katılımcını kur" (G/H koltukları + YZ mimarı + yerel saklama), başlık API butonu kaldırıldı, mobil logo düzeldi, yazım hataları, yasal uyarılar + dürüst gizlilik metinleri | **Ana dalda ✓** |
| **v2.7.1 · PR #16** (`62c47d2`) | 3 güvenlik açığı: oturum devralma (`INSERT OR IGNORE`), hayalet oturuma yazma (404), özel oturumun ortak hafızaya sızmaması | **Ana dalda ✓** (test 10/10) |
| **v2.7.2 · PR #17** (`bb2b933`) | `/api/health` → `commit` + `features` işaretleri (canlı sürümü tek curl ile doğrulama) | **Açık PR — birleşmedi** |

---

## 4. Doğrulama komutları ve güncel sonuçlar

```bash
bash tests/run_all.sh
```

| Paket | Sonuç |
|---|---|
| jsdom ana sayfa deneyimi (49 iddia: demo, sıra, yanıt işaretleri, gizlilik 0 yazma, owner token, G koltuğu, uyarılar, yazım) | **49/49** |
| Gizlilik kilidi (`tests/test_archive_lock.py` — classic uyum, 403/404 kilitleri, liste filtresi, sha256, persist, hafıza sızıntısı, devralma, health işaretleri) | **10/10** |
| Nörodinamik karakter/oturum izolasyonu | **11/11** |
| E2E kâsa (gerçek uvicorn + mock upstream) | **21/21** |
| Hız sınırı | **Yeşil** |
| **Toplam** | **✅ TÜM PAKET YEŞİL** |

Canlı sürüm doğrulaması (birleştirme sonrası, tarayıcıdan veya sunucudan):
```bash
curl https://yuvarlakmasa.com.tr/api/health
# features: [owner_lock, archive_opt_out, custom_seats, commit_report] → en az v2.7
# commit alanı: Railway'de kesin sonuç için Railway → Variables → KONSUL_COMMIT = <sha>
```

---

## 5. Faz 1 — durum notu (kapatıldı, izleme sürüyor)

Faz 1'in ilk turu tamamlandı: kullanıcı canlı sitede 4 gerçek soru çalıştırıp tutanakları getirdi; rapor [`FAZ1_KALITE_RAPORU.md`](FAZ1_KALITE_RAPORU.md) içinde. Şartlar karşılandı: rapor gerçek konuşma kaydı üzerinde kanıtlı, "güzel cevap" yerine hangi aşamada kalite düştüğünü söylüyor (hakem kesilmesi → bulundu ve giderildi; kanıt uydurma → bulundu ve kural sıkılaştırıldı).

**Açık kalan:** (a) Railway'e `GEMINI_API_KEY` eklenmesi (kullanıcı eylemi), (b) bir sonraki canlı turda hakem çıktısının tamamlandığının ve kanıt uydurma olayının sıfır olduğunun teyidi.

---

## 6. Bilinen sınırlar (dürüstlük listesi)

- **Nörodinamik predictor eğitimi:** mekanizma kodda; eğitim yaptığı **iddia edilmez**, kapalı tutulur (kullanıcı puanları eğitim verisi sayılmaz — `app.py` içinde açık not var).
- **Testlerdeki "canlı" akış:** gerçek model değil, yerel mock yukarı akıştır (`tests/browser/mock_upstream.py`) — kalite ölçümü için kullanılamaz.
- **Yaşayan hafıza ucu (`/api/memory`):** oturum kilidi dışındadır; kilitli oturumlardan *damıtma* kapatıldı (PR #16), fakat uç genel olarak herkese açıktır — Faz 7 kapsamında gözden geçirilecek.
- **Sunucu tarafı kasa (`/api/credentials`):** düz metin saklar; yeni arayüz anahtarları sunucuya göndermez (yalnızca tarayıcıda tutar). Eski/klassik özellik.
- **Bu ortamın interneti** yalnızca GitHub/npm/pypi'ye açık; canlı site ve gerçek model uçları buradan denenemez.
