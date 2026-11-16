# YUVARLAK MASA (KONSÜL AI)
### Çoklu Yapay Zeka, Gerçek İnsan Karakter Simülasyonu ve Açık Oturum Platformu

Yuvarlak Masa; birbirinden bağımsız yapay zeka modellerini veya kullanıcının sıfırdan tanımladığı kanlı canlı insan profillerini aynı müzakere masasında buluşturan, profesyonel karar alma, felsefi denetim ve açık oturum istasyonudur.

Sistemde sıradan asistan kalıpları, yapay nezaket cümleleri veya hazır chatbot şablonları bulunmaz. Masaya oturan her delege; yaşı, mesleki formasyonu, inancı, psikolojik bağlanma stili, fikir katılığı (at gözlüğü) ve kırmızı çizgileriyle yaşayan gerçek bir insan kimliğini benimser.

---

## 🏛️ Temel Mimari ve Odalar

Platform, müzakerenin farklı aşamaları için 5 ana çalışma odasından oluşur:

### 1. Ana Müzakere Masası (Konsey Arenası)
* 5 bağımsız sandalyeden oluşur.
* Kullanıcı ister hazır büyük modelleri (ChatGPT, Claude, DeepSeek, Llama, Gemini), ister kendi oluşturduğu insan karakterlerini (örneğin 54 yaşında Kayserili bir esnaf ile 28 yaşında Berlinli bir yazılımcıyı) karşı karşıya oturtur.
* Katılımcılar masadaki önceki konuşmaları analiz ederek sırayla birbirlerinin tezlerine yanıt verir, karşı argüman üretir ve tartışmayı sürdürür.
* **Söz Kesme ve İtiraz:** Masadaki gerilim seviyesi yükseldiğinde delegeler karşı tarafın sözünü kesercesine doğrudan mantık açıklarına saldırır.

### 2. Kör Jüri İstasyonu (`JuryRoom`)
* Delege veya modellerin kimlikleri (ChatGPT, Claude, Avukat Mehmet vb.) gizlenir; masada yalnızca **Model A, Model B, Model C** olarak anonim yarışırlar.
* Ortaya atılan soruya birbirinden habersiz bağımsız yanıt verirler.
* Oturum başkanı (kullanıcı) veya başhakem, isim önyargısı olmadan yalnızca argümanın sağlamlığına bakarak en tutarlı cevabı belirler.

### 3. Başhakem ve Karar Sentez Odası (`SynthesisRoom`)
* Masadaki tüm tartışma, karşılıklı itirazlar ve kör jüri kayıtları tamamlandıktan sonra tarafsız bir **Başhakem Modeli** devreye girer.
* Oturumu 3 eksende analiz eder:
  * **Kanıt Boşlukları:** Hangi iddialar dayanaksız ortaya atıldı?
  * **Gizli Varsayımlar:** Taraflar neleri doğru kabul ederek yanılgıya düştü?
  * **Tek Nokta Hataları:** Hangi öneriler tek bir aksilikte çöker?
* İnceleme sonunda resmi bir **Gerekçeli Karar Raporu** üretir.

### 4. Mühürlü Zarf ve Karar Protokolü (`Zarflar`)
* Katılımcılar masadaki diğer kişilerin görüşlerini duymadan önce, kendilerine verilen konuya ilişkin nihai kararlarını ya da tek bir kelimeyi mühürlü zarfa yazar.
* Herkes yazımını tamamlayana kadar zarflar kapalı kalır; ardından aynı anda açılır ve herkes neden o kelimeyi/kararı seçtiğini gerekçelendirir.

### 5. Arşiv ve Tutanak Odası (`RecordsRoom`)
* Tamamlanan tüm oturumlar, kör jüri kayıtları ve başhakem sentez raporları yerel/bulut veritabanında saklanır.
* Arama, etiketleme, önemli oturumları sabitleme (`Pin`) ve Markdown/metin formatında tutanak indirme imkânı sunar.

---

## 👤 Gerçek İnsan Karakter İnşa Motoru

Platformda karakterler sahte bir rol oynamaz; tanımlanan kimliği bütünüyle içselleştirir. Her delege için belirlenen parametreler:

1. **Demografik Kimlik:** İsim, cinsiyet, yaş, şehir, ülke, ırk/milliyet, medeni hal ve çocuk sayısı.
2. **Mesleki Kamplar:** 
   * *Düzen:* Ceza hâkimi, emniyet mensubu, bürokrat.
   * *Muhalefet:* İnsan hakları avukatı, sendikacı, araştırmacı gazeteci.
   * *Bilim / Madde:* Cerrah, mühendis, şirket yöneticisi.
   * *İnanç / Ruh:* İlahiyatçı, sosyolog, felsefeci.
3. **İnanç ve Ahlak:** İnanç sistemi ve inanç katılık derecesi (1–10).
4. **Fikir Katılığı / At Gözlüğü:** 1 ile 10 puan arası. 10 puan verildiğinde karakter asla geri adım atmaz; kendi ezberi dışındaki her şeye direnir.
5. **Kişilik Mimarisi:** MBTI sınıflandırması + Big Five (Açıklık, Sorumluluk, Dışadönüklük, Uyumluluk, Nevrotizm).
6. **Klinik Psikoloji:** Bağlanma stili (Güvenli, Kaygılı, Kaçıngan, Korkulu), kaygı düzeyi, empati, ego ve savunma mekanizması.
7. **Serbest Karakter Notu:** Form dışındaki özel hayat detayları (örn. *"Eski bir şirket batırmış, devlete öfkeli, kolay sinirlenir, nakit parayı her şeyin üstünde tutar"*).
8. **Anti-Meta Güvenlik Duvarı (`META_BLOCK`):** Karakterlerin konuşmalarında `yapay zeka`, `dil modeli`, `ChatGPT`, `asistan`, `sistem` gibi ifadeleri kullanması yazılımsal olarak engellenir. Karakter kendini kanlı canlı bir insan olarak bilir.
9. **İki Katmanlı Zihin (Dış Söz / İç Düşünce):** 
   * `content`: Masadakilere sesli söylenen resmi argüman.
   * `inner`: Karakterin masaya söylemeyip sadece aklından geçirdiği gizli çıkarı, şüphesi veya önyargısı.

---

## 🎙️ Ses Altyapısı (Doğal Türkçe)

Sistemde mekanik veya robotik sesler kullanılmaz:

* **Nöral Türkçe Seslendirme (TTS):** Microsoft Azure altyapılı nöral Türkçe sesler (`Ahmet`, `Emel`) entegredir. Duraklamalar, tonlamalar ve nefes payları tamamen insan konuşma ritmindedir. Ücretsizdir, kota veya API anahtarı gerektirmez.
* **Profesyonel Harici Ses Portu:** Dileyen kullanıcılar ElevenLabs vb. profesyonel ses API anahtarlarını diledikleri sandalyeye bağlayabilir.
* **Konuşarak Yazma (STT):** Kullanıcı mikrofona konuştuğunda, konuşma resmi Türkçe dil bilgisi kurallarına uygun biçimde eş zamanlı metne dönüştürülür ve oturuma iletilir.

---

## 🔌 Desteklenen API ve Model Altyapısı

Platformda her sandalye bağımsız bir istemcidir. İstenen sandalyeye istenen sağlayıcı atanabilir:

| Sağlayıcı | Türü | Desteklenen Modeller |
| :--- | :--- | :--- |
| **OpenAI** | Bulut (Resmi API) | `gpt-4o`, `gpt-4o-mini`, `o1`, `o3-mini` |
| **Anthropic** | Bulut (OpenRouter) | `claude-3-5-sonnet`, `claude-3-5-haiku` |
| **DeepSeek** | Bulut (Resmi API) | `deepseek-chat` (V3), `deepseek-reasoner` (R1) |
| **Groq** | Bulut (Yüksek Hızlı) | `llama-3.3-70b-versatile`, `mixtral-8x7b-32768` |
| **Google** | Bulut (Gemini SDK) | `gemini-2.0-flash`, `gemini-1.5-pro` |
| **Ollama** | Yerel (Localhost:11434) | `llama3`, `mistral`, `qwen`, `deepseek-r1` |
| **LM Studio** | Yerel (Localhost:1234) | Yerelde barındırılan tüm GGUF modelleri |
| **9Router** | Yerel (Localhost:20128) | Yerel çoklu model yönlendiricisi |
| **Pollinations** | Canlı & Ücretsiz | Anahtarsız, doğrudan çalışan açık modeller |

* **Canlı API Doğrulama (`probeProvider`):** Bir API girildiğinde sistem sunucuya 8 saniyelik bir kontrol sinyali gönderir; yanıt süresini (milisaniye) ölçer ve o hesapta açık olan tüm modelleri otomatik tespit eder.

---

## 🎛️ Oturum Başkanı (Moderatör) Kontrolleri

* **Pasif Dinleme:** Oturumu televizyon yayını gibi izleyebilme.
* **Canlı Müdahale:** İstenen anda mikrofona basarak söz alma ve gündemi değiştirme.
* **Sessize Alma (`Mute`):** Söz hakkını aşan delegeyi tek tıkla susturma.
* **İhraç / Diskalifiye:** Masadaki delegeyi kuruldan çıkarıp yerine anında yeni bir insan profili atama.
* **Mobil Katılım Portali (`/katil/[token]`):** Dışarıdaki gerçek bir katılımcıya tek tıkla bağlantı gönderme; misafir katılımcının telefon tarayıcısından canlı oturuma dahil olması.

---

## 🚀 Kurulum ve Yerel Çalıştırma

### Gereksinimler
* Node.js 18+ veya 20+
* npm, pnpm veya bun

### 1. Depoyu İndirin
```bash
git clone https://github.com/AppleCurse/Yuvarlak-masa.git
cd Yuvarlak-masa
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Ortam Değişkenlerini Tanımlayın
`.env.example` dosyasını kopyalayıp `.env` veya `.env.local` oluşturun:
```bash
cp .env.example .env.local
```

Örnek `.env.local` içeriği (yalnızca kullanmak istediğiniz anahtarları doldurmanız yeterlidir, anahtarsız modda ücretsiz canlı modeller çalışır):
```env
PORT=3000
DATABASE_URL="postgresql://user:password@localhost:5432/yuvarlak_masa" # Opsiyonel
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
DEEPSEEK_API_KEY=""
GROQ_API_KEY=""
GEMINI_API_KEY=""
ELEVENLABS_API_KEY=""
```

### 4. Uygulamayı Başlatın
```bash
npm run dev
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde çalışacaktır.

---

## 📄 Lisans
Bu proje kurumsal ve kişisel kullanım için açık standartlarda geliştirilmiştir.
