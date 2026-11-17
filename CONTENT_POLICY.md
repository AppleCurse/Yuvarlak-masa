# KONSÜL AI — İçerik Politikası

Bu belge, KONSÜL AI'da karakter oluşturma, oturum yürütme ve model çıktısı için geçerli
içerik kurallarını tanımlar. Amaç: felsefi tartışma platformunun eleştirel değerini korurken
şiddet, nefret ve tehlikeli bedenselleştirme üretmemek.

## 1. Genel ilke

KONSÜL AI, düşünceyi **sahibinden ayrı** tartan bir masadır: bir pozisyonu savunmak,
pozisyonun sahibini bedenselleştirmek değildir. Her karakter dosyası tartışma için bir
**zihinsel çerçeve**dir; karakterin "yapabileceği" değil, "savunabileceği" tezlerdir ürün.

## 2. Seed ve Karakter Mimarı kuralları

### 2.1 Bedenselleştirme yasağı (birinci şahıs)
Tarihsel olarak totaliter liderler, insanlık suçluları, belgelenmiş şiddet suçluları
ve terör figürleri **birinci şahıs bedenselleştirmeyle seed edilmez** ve Karakter
Mimarı tarafından birinci şahıs "ben o kişiyim" dosyası olarak üretilemez.

### 2.2 Analitik mesafe arketipi
Bu tür briefler geldiğinde Karakter Mimarı, tezi savunan ancak:
- şiddet, ırkçılık veya nefret söylemi üretmeyen,
- gerçek kişilere hakaret etmeyen,
- suçu meşrulaştırmayan,
- "soyut bir zihniyet / pozisyon savunucusu" olarak konumlanan

bir **analitik mesafe arketipi** üretir. Üretilen dosya hangi tarihsel pozisyonun
tartışıldığını açıkça belirtir; bu bir eğitim ve eleştirel tartışma aracıdır.

### 2.3 Tarihsel figürler (suçsuz)
Tarihsel filozoflar, devlet adamları ve bilim insanları (ör. Sokrates, Mandela,
Tesla, Ortaylı) birinci şahıs bedenselleştirmeyle kullanılabilir; bu figürlerin
belgelenmiş görüş ve üslubu çerçevesinde kalınır, hayali skandallar uydurulmaz.

## 3. Oturum sırasında (persona guard)

`persona_guard.py` (v2) her model çıktısını geçirir:
- **Doğrudan nefret/şiddet içeriği** → cümle seviyesinde temizlenir, yapı korunur.
- **Karakterin kimlik sızıntısı** ("ben bir dil modeliyim") → yeniden üretilir,
  persona bozulmadan.
- **Gerçek kişiye onur kırıcı ifadeler** → nötr ifadeye çevrilir.

Temizleme asla metnin argüman yapısını bozmaz; bozulacaksa o cümle düşülür,
yerine "konuşmacı bu noktayı reddediyor" notu konur.

## 4. Operatör sorumluluğu

Operatör (insan koltuğu) masanın mutlak başkanına eşittir ve müdahaleleri bağlayıcıdır.
Gündem seçimi, konuyu sıcak çatışma alanına taşımak ve taktik müdahalelerin içeriği
bakımından **operatör** sorumludur; platform bu seçimin yapılmasını kolaylaştırır,
yapmaz.

## 5. Muafiyet ve sınır

- Eleştirel teori, tarih analizi ve siyaset felsefesi kapsamındaki **tartışma dili** serbesttir
  ("bu politika X etkisini yaratır" ≠ "X grubu yok edilmeli").
- Nefret söylemi, şiddet çağrısı, gerçek kişiye onur kırma: **serbest değildir**; guard temizler.
- Kimyasal/biyolojik/siber silah yapım talimatı, kişisel veri ifşası, yasa dışı eylem
  rehberliği: oturum kapsamında değildir; model istemi düzeyinde reddedilir.

## 6. Şeffaflık

- Her oturumun tam tutanağı (iç sesler dahil) yerel `konsul.db`'de saklanır;
  operatör dilerse arşivden silebilir.
- Model çıktılarının simülasyon olduğu, kararların sorumluluğunun operatörde olduğu
  hem arayüzde hem film şeridi jeneriğinde beyan edilir.

*Son güncelleme: Faz 5 (17.11.2026) — denetim raporu §3.6 borcunun kapatılması.*
