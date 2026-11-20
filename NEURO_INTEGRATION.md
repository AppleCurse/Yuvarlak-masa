# Konseyde nörodinamik köprü — mevcut durum

Gerçek konsey konuşmalarında istemci karakter ve oturum kimliğini gönderir; enerji, yorgunluk, tahmin ve politika hesapları modele verilen sistem istemini etkiler. Demo, iç ses, yardımcı istekler ve diğer odalar bu entegrasyonun kapsamı dışındadır. Yeni karakterler mevcut konsey koltuklarına atanırsa çalışır; yeni koltuklar otomatik oluşturulmaz.

## Ödül ve güvenli geçiş

Onay/itiraz sözcükleri ödül değildir. Arayüzdeki Faydalı/Kısmen/Faydasız değerlendirmeleri **öznel geri bildirimdir** ve `neuro_subjective_ratings` tablosuna kaydedilir; tahmin modelini eğitmez. Kimlik, oturum ve istemci mesaj kimliğiyle saklanır. Bu kimlikler istemciden geldiği için sunucu tarafından doğrulanmış kanıt veya güvenilir bir kimlik sistemi değildir. Kimlik doğrulama ve yetkilendirme olmadan internete açık çok kullanıcılı kullanım güvenli değildir.

Önceki sürümün `neuro_estimates` ve `neuro_feedback_queue` tabloları silinmez veya dönüştürülmez. Onay kelimeleri ve öznel puanlarla kirlenmiş olabileceğinden aktif öğrenmeye aktarılmaz. Yeni tahmin alanı `neuro_evidence_estimates_v1` ayrı tutulur. Kanıtı doğrulayacak ve belirli bir tamamlanmış yanıta/tutuma bağlayacak güvenilir bir mekanizma henüz entegre edilmediğinden **konsey köprüsü şu anda tahmin güncellemesi yapmaz**. Eski bekleyen puanlar da tüketilmez.

Yeni bir kanıta dayalı mekanizma için en azından kaynak/köken, iddia, kanıtın bağımsız değerlendirmesi, değerlendirilen yanıt/tutum kimliği, idempotent uygulama ve değerlendirme ile tahmin güncellemesini kapsayan tek bir işlem gerekir. Kullanıcı puanı veya modelin kendi beyanı tek başına doğrulama sayılamaz. Bu, planlanan bir çalışma olup henüz uygulanmamıştır.

## Diğer sınırlamalar

Enerji, duygulanım ve çalışma belleği süreç içinde oturum+karakter bazındadır; yeniden başlatmada sıfırlanır, 512 etkin kimlikle sınırlıdır ve sunucu çalışanları arasında paylaşılmaz. Kütüphane ID'si olmayan üyeler adlarıyla tanımlanır; aynı isim çakışabilir, isim değişikliği yeni kimlik oluşturur. Kalıcı veritabanı için `KONSUL_DB_PATH` ve kalıcı disk/backup gereklidir. `/api/neuro/reset` yalnızca süreçteki geçici durumu siler. Sistem istemindeki direktif, LLM'in buna uyacağını veya gerçekten düşündüğünü garanti etmez.
