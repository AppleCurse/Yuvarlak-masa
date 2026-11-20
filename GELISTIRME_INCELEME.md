# Nörodinamik entegrasyon incelemesi — geliştirme başlangıcı

## Kapsam ve dayanak

İnceleme başlangıcı: `main` 1bc70db. Çalışma ayrı dalda yapılır. Depodaki Python uygulama/engine, statik konsey arayüzü, neuro köprüsü, `neurodynamic_agent` modülleri ve mevcut test/deploy düzeni incelendi; bu belge deponun tüm satırlarının güvenlik denetiminden geçtiği iddiası değildir. Harici v0.7.5 kaynak paketi tespit edilmedi; 1bc70db değişikliği `neurodynamic_agent` klasörünü değiştirmiyor, dolayısıyla v0.7.5 karşılaştırması yapılmış değildir.

## Bulgular ve bu dalda ilk müdahale

1. Eski ödül tahminleri `neuro_estimates` içinde onay/itiraz sözcüklerinden ve öznel değerlendirmelerden beslenmiş olabilir. Veriler korunur, aktif politika ayrı `neuro_evidence_estimates_v1` kullanır; eski veriler otomatik taşınmaz.
2. Puanlar belirli kanıt veya tamamlanmış model eylemi için doğrulanmış değerlendirme değildir. Öznel geri bildirim ayrı `neuro_subjective_ratings` tablosuna kaydedilir; tahmin güncellenmez. Önceki bekleyen `neuro_feedback_queue` kayıtları silinmez ya da tüketilmez.
3. Önceki kuyruk tüketimi ve tahmin kaydı ayrı işlemlerdi; puan kaybolabilirdi. Bu güvensiz otomatik yol kapalıdır. Gelecekte doğrulanmış kanıt hattı uygulanırsa geri bildirimin eyleme atfı, tek seferlik işlenmesi ve tahmin kaydı **aynı işlemin** parçası olmalıdır.
4. Arayüz artık geri bildirimi yanıt oluşturulurken yakalanan karakter/oturum ve mesaj kimliğiyle yollar. Bunlar istemci verisidir, sunucu tarafından doğrulanmış değildir; kimlik doğrulama/oturum yetkilendirmesi bulunmayan kurulumlarda güvenilemez.
5. Sistem isteminde sırf uzlaşma için fikir değiştirmeme, belirsizlik ve eksik kanıtı belirtme talimatı netleştirildi. Bu sadece bir istemdir, model davranışı için garanti değildir.

## Henüz yapılmayanlar

- Kanıt doğrulama, kaynak kökeni, iddia-karar-kanıt bağı, araştırma eylemi, kalıcı homeostaz/duygulanım, uzun vadeli epizodik öğrenme ve bütünleşik çok katılımcılı deney uygulanmadı.
- Güvenilir doğrulama olmadığı için konsey tahmin modeli bu dalda **öğrenmeyi durdurur**; öznel puanlar da öğrenmeye gitmez. Bu, kanıta dayalı öğrenmenin tamamlandığı anlamına gelmez.
- İstemci karakter kimliği ve açık geribildirim ucu yetkilendirilmemiştir. Çok kullanıcılı kamuya açık dağıtım öncesi ayrıca güvenlik tasarımı gerekir.
- Kullanıcının önerdiği v0.7.6–v0.8.0 henüz sürüm olarak yayınlanmamıştır.
