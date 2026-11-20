# Yuvarlak-masa — Geri Bildirim Öğrenme Hattı

> Tarihsel rapor: aşağıdaki öğrenme davranışı artık etkin değildir. Öznel puanlar öğrenmeye uygulanmaz; güncel durum için `NEURO_INTEGRATION.md` dosyasına bakın.

## Bu sürümde yapılanlar

- `POST /api/neuro/feedback` eklendi. `feedback_id`, `character_id`, `session_id` ve 0–1 arası `reward` alır.
- Geri bildirimler `neuro_feedback_queue` SQLite tablosunda tutulur; konuşma metni bu kuyruğa yazılmaz.
- `feedback_id` birincil anahtardır. Tekrar gönderim ikinci öğrenme üretmez; aynı kimliğin başka karakter/oturum için kullanılması reddedilir.
- Bekleyen geri bildirim, yalnızca aynı karakter + oturumun bir sonraki `/api/chat` veya `/api/chat/stream` bilişsel adımında atomik olarak tüketilir.
- Birden fazla bekleyen geri bildirim varsa ortalama ödül kullanılır.
- Konsey arayüzünde tamamlanan model yanıtlarına Faydalı (1.0), Kısmen (0.5), Faydasız (0.0) kontrolleri eklendi.
- Demo/backend kapalıyken geri bildirim kontrolleri gösterilmez.
- `NEURO_INTEGRATION.md` yeni davranış ve sınırlarla güncellendi.

## Doğrulama

- Nörodinamik entegrasyon testleri: **11/11 geçti**.
- Python `compileall`: **başarılı**.
- Konsey arayüzü JavaScript sözdizimi (`node --check`): **başarılı**.
- E2E kasa testi: bu çalıştırmada tamamlanamadı; test süreci zaman sınırında yanıt vermedi. Bu nedenle E2E sonucu PASS olarak raporlanmıyor.
- Test sırasında SQLite bağlantıları için mevcut `ResourceWarning` uyarıları görüldü. Testler başarılı olsa da bağlantı yaşam döngüsü ayrıca temizlenmeli.

## Bilinen sınırlar

- Bu, kullanıcı tarafından verilen açık değerlendirmeyle öğrenmedir. Ajanın kararlarının gerçek dünyadaki etkisini kendi başına ölçen otomatik değerlendirici henüz yoktur.
- Bu güncelleme model ağırlıklarını eğitmez; karakter bazlı tahmin istatistiklerini günceller.
- Feedback API için kullanıcı/oturum yetkilendirmesi eklenmedi. İnternete açık, çok kullanıcılı dağıtım öncesinde kimlik doğrulama ve sunucu tarafı oturum sahipliği doğrulaması gereklidir.
- Değerlendirme bir sonraki aynı karakter/oturum çağrısında uygulanır. O oturumda tekrar çağrı olmazsa kuyrukta bekler.
