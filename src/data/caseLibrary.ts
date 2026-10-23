export interface CaseScenario {
  id: string;
  title: string;
  category: "Girişim & Yatırım" | "İletişim & WhatsApp" | "Felaket & Kriz" | "Felsefe & İkilem" | "Ağır Ceza & Hukuk";
  targetRoom: "street" | "devils_advocate" | "lie_detector" | "timeless" | "courtroom" | "council";
  badge: string;
  summary: string;
  content: string;
  question: string;
  tags: string[];
}

export const CASE_LIBRARY: CaseScenario[] = [
  // ── 1. GİRİŞİM & YATIRIM ───────────────────────────────────────
  {
    id: "case_investor_dilution",
    title: "Melek Yatırımcının %45 Hisse & Gizli Seyreltme Tuzağı",
    category: "Girişim & Yatırım",
    targetRoom: "devils_advocate",
    badge: "🔴 Kırmızı Takım",
    summary: "Nakit akışı tükenen SaaS kurucusu, masadaki 300.000$ karşılığında yönetim kurulunu ve %45 hisseyi devretmek üzere.",
    content: `2 yıldır üzerinde çalıştığımız B2B yapay zeka SaaS girişimimiz aylık 14.000$ MRR üretiyor ancak sunucu maliyetleri ve 4 kişilik çekirdek ekibin maaşları nedeniyle şirketin kasasında sadece 1.5 aylık nakit kaldı.

Ünlü bir melek yatırımcı grubu masaya geldi ve şu teklifi yaptı:
1. Şirkete 300.000$ nakit sermaye konulacak.
2. Karşılığında kurucu ortaklardan %45 hisse talep ediliyor.
3. Yönetim kurulunda 3 koltuktan 2'si yatırımcı tarafına geçecek.
4. 'Liquidation Preference' (Tasfiye Önceliği) 2x olarak şart koşuluyor ve 'Key-man' maddesiyle kurucuların 3 yıl boyunca şirketten ayrılamayacağı, ayrılırlarsa hisselerinin nominal bedelle geri alınacağı yazıyor.

Eğer imzalamazsak 45 gün sonra maaşları ödeyemeyip iflas edeceğiz. İmzalar sak kurucu iradesini kaybedip kendi şirketimizde maaşlı köleye dönüşme riskimiz var.`,
    question: "Bu yatırım teklifini imzalamalı mıyız, yoksa hisseyi kaptırmadan bootstrap devam etmek veya köprü kredi aramak mı gerekir? Gizli tuzaklar ve acımasız sonuçlar nelerdir?",
    tags: ["Girişimcilik", "Melek Yatırım", "Hisse Devri", "Sözleşme Tuzağı", "Nakit Kriz"]
  },
  {
    id: "case_cofounder_poaching",
    title: "Kurucu Ortağın Rakibe Gizli Müşteri Sızdırması",
    category: "Girişim & Yatırım",
    targetRoom: "street",
    badge: "👥 Sokak Meclisi",
    summary: "Teknik kurucu ortağınızın, rakip bir yazılım ajansına gizlice danışmanlık yaptığı ve şirketin büyük bir müşterisini oraya yönlendirdiği ortaya çıktı.",
    content: `3 yıllık can ciğer üniversite arkadaşım ve şirketimizin %40 hissedarı olan CTO'muzun dizüstü bilgisayarında açık kalan bir Slack mesajını tesadüfen gördüm.

Pazardaki en büyük rakibimizle 6 aydır gizli bir danışmanlık sözleşmesi yürütüyormuş. Dahası, geçen ay 'bize bütçeleri yetmedi' diyerek kaybettiğimizi söylediği 120.000 Euro'luk Alman lojistik müşterisini rakip firmaya yönlendirmiş ve oradan prim almış.

Şu an şirketin tüm kaynak kodları, sunucu şifreleri ve müşteri veritabanı onun kontrolünde. Doğrudan yüzleşirsem kodları silip şirketi felç edebilir; hiçbir şey yapmazsam şirketin içini boşaltmaya devam edecek.`,
    question: "Bu ihanet karşısında nasıl bir strateji izlenmeli? Hukuk, psikoloji, esnaf tecrübesi ve sokak ahlakı bu durumda ne söyler?",
    tags: ["Ortaklık Krizi", "İhanet", "Siber Güvenlik", "Ticari Sır", "Yüzleşme"]
  },
  {
    id: "case_payroll_vs_vendor",
    title: "Kasa Tamtakır: 15 Gün İçinde Maaşlar mı, Tedarikçi mi?",
    category: "Girişim & Yatırım",
    targetRoom: "council",
    badge: "🏛️ Açık Konsey",
    summary: "Şirket hesabında 450.000 TL var. Ay sonunda 800.000 TL çalışan maaşı ve 600.000 TL hayati hammadde faturası vadesi doluyor.",
    content: `Üretim ve e-ticaret yapan bir KOBİ sahibiyiz. Devletten beklediğimiz KDV iadesi ve bir zincir marketten gelecek 1.8 milyon TL'lik çek 45 gün ertelendi.

Şu an banka hesabımızda sadece 450.000 TL nakit var.
Önümüzdeki 15 gün içinde iki kritik ödeme var:
1. 22 personelin maaşları (Toplam 800.000 TL) - Eğer ödenmezse ustalar işi bırakır, dedikodu yayılır, itibar çöker.
2. Ana hammadde tedarikçisinin vadesi geçmiş faturası (Toplam 600.000 TL) - Eğer en az 300.000 TL ödenmezse kumaş sevkiyatını kesecek ve fabrikadaki bantlar duracak.

Bankalar kredi limitlerini dondurdu. Eldeki 450.000 TL nasıl dağıtılmalı?`,
    question: "Eldeki kısıtlı sermaye ile bu kriz nasıl yönetilmeli? Maaşlar mı bölünmeli, tedarikçiyle restleşilmeli mi?",
    tags: ["Nakit Akışı", "Kriz Yönetimi", "Maaş", "Tedarik Zinciri", "Finans"]
  },

  // ── 2. İLETİŞİM & WHATSAPP (MASKE DÜŞÜRME & YALAN RADARI) ──────
  {
    id: "case_wa_boss_coffee",
    title: "Patronun Gece Yarısı 'Yarın Sabah Baş Başa Bir Kahve İçelim' Mesajı",
    category: "İletişim & WhatsApp",
    targetRoom: "lie_detector",
    badge: "🎭 Yalan Radarı",
    summary: "Pazar gecesi saat 23:42'de genel müdürden gelen samimi görünen ama tehditkâr alt metin içeren WhatsApp mesajı.",
    content: `Pazar gecesi saat 23:42'de Genel Müdürümden şu mesaj geldi:

'Selam Can, umarım hafta sonun güzel geçmiştir. Cuma günkü bütçe sunumundaki cesur çıkışın çok dikkatimi çekti :) Şirketin geleceği için senin gibi düşünenlere ihtiyacımız var. Yarın sabah 08:30'da merkez binanın karşısındaki kafede baş başa bir kahve içelim mi? İkimiz arasında konuşmamız gereken bazı hassas konular var. Kimseye bahsetmene gerek yok, erkenden halledelim. İyi geceler.'

Arka Plan:
Cuma günkü toplantıda genel müdürün yeğeni olan operasyon müdürünün fahiş harcamalarını ve eksik faturalarını dolaylı olarak sorgulamıştım. Bu mesaj bir tebrik mi, mobbing/kovulma öncesi yalnızlaştırma taktiği mi, yoksa rüşvet/sus payı teklifi mi?`,
    question: "Bu mesajın ardındaki gizli ajanda nedir? Neler söylenmemiş? Yarın sabahki randevuya gitmeden önce nasıl bir karşı hamle yapılmalı ve bu mesaja bu gece ne cevap verilmeli?",
    tags: ["WhatsApp", "Kurumsal Politika", "Gizli Ajanda", "Mobbing", "Taktik Cevap"]
  },
  {
    id: "case_wa_ex_apology",
    title: "Eski Ortağın 'Seni Çok Özledim, Helalleşelim' Mesajı",
    category: "İletişim & WhatsApp",
    targetRoom: "lie_detector",
    badge: "🎭 Yalan Radarı",
    summary: "Sizi 2 yıl önce borçla bırakıp giden eski iş ortağının aniden sevgi ve vicdan dolu bir mesajla ortaya çıkması.",
    content: `2 yıl önce şirket borçlarını üzerime yıkıp Dubai'ye giden ve telefonlarımı engelleyen eski ortağım dün gece şu mesajı attı:

'Kardeşim merhaba... Geçen gün eski fotoğraflarımıza denk geldim, gözlerim doldu. Biz ne güzel hayaller kurmuştuk. O dönem benim de psikolojim çok bozuktu, yanlış kararlar aldım ve seni yalnız bıraktım, hakkını helal et. İnan vicdan azabından geceleri uyuyamıyorum. Şimdi İstanbul'a döndüm, çok büyük bir enerji fonuyla masadayım. Seni bu projenin başına geçirmek ve eski günlerdeki gibi omuz omuza kazanmak istiyorum. Yarın akşam lüks bir balıkçıda yer ayırttım, gel bir çayımızı içelim, her şeyi telafi edeyim.'

Arka Plan:
Duyduğuma göre kurduğu yeni paravan şirket için Türkiye'de temiz sicilli bir yönetim kurulu başkanına ve imza yetkilisine ihtiyacı varmış.`,
    question: "Bu mesajdaki kaçamak kelimeler ve manipülasyon teknikleri nelerdir? Karşı tarafın maskesini düşürecek nokta atışı cevap ne olmalıdır?",
    tags: ["Manipülasyon", "Sahte Pişmanlık", "Borç", "WhatsApp", "Hukuki Risk"]
  },
  {
    id: "case_wa_family_inheritance",
    title: "Miras Görüşmesinde Amcanın 'Biz Bir Aileyiz, İmzala Geç' Israrı",
    category: "İletişim & WhatsApp",
    targetRoom: "lie_detector",
    badge: "🎭 Yalan Radarı",
    summary: "Dededen kalan arsaların imara açılması arifesinde amcanın yeğenlerine yolladığı duygusal sömürü içerikli aile mektubu.",
    content: `Amcamın aile WhatsApp grubuna attığı metin:

'Canım yeğenlerim, rahmetli babanızın emanetlerisiniz. Biliyorsunuz dedenizin köydeki kıraç arazilerinin veraset ilamı ve intikal işleri yıllardır sürüncemede. Noterdeki vekaletnameyi bana verirseniz belediyedeki harçları kendi cebimden ödeyip tarlaları temizleyeceğim. Biz etle tırnağız, araya avukat mahkeme sokup babanızın kemiklerini sızlatmayalım. Ben sizin büyüğünüzüm, bana güvenmeyecekseniz kime güveneceksiniz? Yarın sabah 10'da Kadıköy 4. Notere gelin, imzaları atın.'

Arka Plan:
Köydeki 'kıraç' denilen arazinin hemen yanından yeni otoyol bağlantısı ve sanayi bölgesi geçeceği belediye meclis kararında ilan edildi. Arsanın gerçek değeri 40 milyon TL civarında.`,
    question: "Metindeki duygusal gasplar, sahte şefkat maskesi ve söylenmeyen gerçekler nelerdir? Aile bağlarını yakmadan bu hamle nasıl boşa çıkarılır?",
    tags: ["Miras", "Aile İçi Çıkar", "Vekaletname Tuzağı", "Psikolojik Baskı"]
  },

  // ── 3. FELAKET & SİYAH KUĞU (ŞEYTANIN AVUKATI) ─────────────────
  {
    id: "case_blackswan_ai_copyright",
    title: "Yapay Zeka Şirketine Küresel Telif Ambargosu & Model İmha İhtarı",
    category: "Felaket & Kriz",
    targetRoom: "devils_advocate",
    badge: "🔴 Kırmızı Takım",
    summary: "10 milyon dolarlık yatırım almış Generative AI modelinizin eğitim verisinde telifli kütüphaneler olduğu iddiasıyla tüm modellerin imhası isteniyor.",
    content: `Türkiye ve Doğu Avrupa'da faaliyet gösteren, metin ve görsel üreten kendi temel modelimizi eğittik ve 2.4 milyon kullanıcıya ulaştık.

Bu sabah uluslararası bir yayıncı konsorsiyumundan ve New York merkezli bir hukuk bürosundan 48 sayfalık noter ihtarnamesi aldık:
1. Modelin eğitim verisinde izin alınmamış 450.000 akademik makale, gazete arşivi ve görsel bulunduğu kanıtlanmış.
2. Tüm API servislerinin derhal durdurulması,
3. Eğitilmiş tüm ağırlık matrislerinin (weights) bağımsız denetçi gözetiminde geri döndürülemez şekilde silinmesi (model destruction),
4. Aksi takdirde 85 milyon dolarlık tazminat davası açılacağı bildiriliyor.

Yatırımcılarımız panikte, sunucuları kapatırsak mevcut B2B müşterilerimiz tazminat davaları açacak; kapatmazsak uluslararası telif ambargosuyla şirket iflasa sürüklenecek.`,
    question: "Kırmızı takım bu şirketi nasıl batırır? Siyah kuğu darbesi nerede saklı? Ve masadaki 'Nihai Kalkan' bu şirketi kurtarmak için hangi kurşun geçirmez savunma planını sunar?",
    tags: ["Yapay Zeka", "Telif Hakları", "Siyah Kuğu", "Uluslararası Dava", "Kriz Masası"]
  },
  {
    id: "case_blackswan_single_client",
    title: "Cironun %75'ini Oluşturan Holdingin Ani Sözleşme Feshi",
    category: "Felaket & Kriz",
    targetRoom: "devils_advocate",
    badge: "🔴 Kırmızı Takım",
    summary: "Tek bir büyük kurumsal müşteriye bağımlı büyüyen lojistik yazılım şirketi, müşterinin kendi iç yazılımına geçmesiyle sıfıra vuruyor.",
    content: `50 çalışanımız ve yıllık 4 milyon dolar ciromuz var. Ancak ciromuzun %75'i Türkiye'nin en büyük perakende holdinginden geliyor.

Bu sabah holding satın alma direktörü aradı ve şu cümleyi kurdu:
'Yönetim kurulu kararıyla tüm lojistik altyapımızı kendi bünyemizde kurduğumuz ekibe devrediyoruz. Sözleşmemizdeki 30 günlük fesih ihbar süresini işletiyoruz. 1 ay sonra sistemlerinizi kapatacağız.'

Şirketin aylık operasyonel sabit gideri 180.000$. Diğer küçük müşterilerden gelen ciro sadece 40.000$. 60 gün içinde şirketin tüm sermayesi eriyecek.`,
    question: "Bu şirketin ölüm fermanı ilk gün nasıl yazılır? Acımasız rakipler bu boşluktan yararlanıp müşteriyi ve ekibi nasıl çalar? Kurtuluş için radikal pivot ne olmalıdır?",
    tags: ["Müşteri Yoğunlaşması", "Ani Fesih", "Şirket Batışı", "Radikal Pivot", "Risk"]
  },

  // ── 4. ZAMANIN ÖTESİNDEKİLER (TARİHSEL & FELSEFİ DEVLER) ───────
  {
    id: "case_timeless_autonomous_drone",
    title: "Siviller Arasındaki Terör Elebaşını Vuracak Otonom Dron İkilemi",
    category: "Felsefe & İkilem",
    targetRoom: "timeless",
    badge: "⚡ Zamansız Devler",
    summary: "Dron kamerasında 100 sivilin bulunduğu bir pazar yerinde bomba hazırlayan hücre lideri tespit edildi. Füzeyi ateşlemek mi, beklemek mi?",
    content: `Bir otonom askeri yapay zeka sistemi sınır ötesi operasyonda kritik bir hedef kilitledi.
Hedef: Yarın sabah başkentte binlerce insanın öleceği bir saldırıyı koordine eden terör hücresinin lideri.
Konum: Kalabalık bir köy pazarı. Füzeyi ateşlerseniz hücre lideri kesin olarak imha edilecek; ancak patlamada en az 18 masum sivil (çocuklar dahil) hayatını kaybedecek.
Eğer ateş etmezseniz hedef 3 dakika içinde yer altı tüneline girecek ve ertesi günkü büyük katliam engellenemeyecek.

Komuta merkezindeki yetki sizde. Ateş emri mi, iptal mi?`,
    question: "Machiavelli, Tesla, Marcus Aurelius, Mevlana ve Sentetik-2150 bu masada bir araya gelseydi bu emri nasıl tartışırdı? Vicdan, faydacılık ve mutlak mantık nasıl çarpışır?",
    tags: ["Ahlak Felsefesi", "Trolley Problemi", "Yapay Zeka Etiği", "İktidar", "Kader"]
  },
  {
    id: "case_timeless_genetic_divide",
    title: "Sentetik Evrim: Zenginlerin Genetik Olarak Kusursuz Çocuklar Satın Alması",
    category: "Felsefe & İkilem",
    targetRoom: "timeless",
    badge: "⚡ Zamansız Devler",
    summary: "CRISPR teknolojisiyle doğuştan hastalıksız, 160 IQ'lu ve 130 yıl yaşayan süper-insan embriyoları sadece parası yeten elitlere satılıyor.",
    content: `Yıl 2035. Genetik biyoteknoloji şirketi 'Prometheus Bio', anne karnındaki bebeklerin tüm genetik kusurlarını silen, zekayı %40 artıran ve yaşlanmayı yavaşlatan tedaviyi ticarileştirdi.
Fiyat: 500.000 Dolar.

Sonuç: Zenginlerin çocukları kusursuz, ultra zeki, hastalanmayan bir üst-ırka dönüşürken; dar gelirli ailelerin çocukları biyolojik olarak 'ikinci sınıf' vatandaş haline geliyor.
Hükümet bu teknolojiyi yasaklamayı, kamulaştırıp herkese ücretsiz dağıtmayı veya piyasa serbestisine bırakmayı tartışıyor.`,
    question: "Tarihin 5 devi bu teknolojik sıçrama karşısında insanlığa ne öğütler? Eşitlik mi, evrimsel seleksiyon mu, ilahi nizam mı?",
    tags: ["Transhümanizm", "Biyoetik", "Sınıf Çatışması", "Teknoloji", "Gelecek"]
  },

  // ── 5. AĞIR CEZA MAHKEMESİ & ÇAPRAZ SORGU ──────────────────────
  {
    id: "case_court_crypto_embezzlement",
    title: "Şirket Kasasından Kripto Arbitrajına Aktarılan 40 Milyon TL: 'Zimmet mi, Ticari Risk mi?'",
    category: "Ağır Ceza & Hukuk",
    targetRoom: "courtroom",
    badge: "⚖️ Mahkeme Salonu",
    summary: "Finans Direktörü (CFO), şirketin repo hesabındaki 40 milyon TL'yi hafta sonu kaldıraçlı kripto işleminde batırdı. 'Şirket adına kâr amaçlıydı' savunması yapıyor.",
    content: `Sanık: Ercan K. (Holding Finans Direktörü)
Suçlama: TCK 155/2 Hizmet Nedeniyle Güveni Kötüye Kullanma, Nitelikli Dolandırıcılık ve Zimmet (12 yıla kadar hapis istemi).

Olay:
Cuma akşamı holdingin banka hesabındaki 40 milyon TL, Sanık tarafından 'yüksek getirili likidite arbitrajı' amacıyla soğuk cüzdana ve yabancı bir kripto borsasına aktarılmış. Hafta sonu piyasanın çökmesiyle teminat yetersizliğinden pozisyon likidite olmuş ve 40 milyon TL sıfırlanmıştır.

Savcılık İddianamesi:
'Sanık şirket yönetim kurulundan yetki almadan, şirketin parasını şahsi kumar masasına çevirmiş, kripto transferleriyle parayı kaçırma kastı gütmüştür. Eylem açıkça nitelikli zimmettir.'

Müdafi Savunması:
'Müvekkilimin iş sözleşmesinde 'nakit varlıkları değerlendirme ve hazine yönetimi' genel yetkisi vardır. Niyeti şirkete ilave 3 milyon TL getiri sağlamaktı. Kripto piyasasındaki küresel ani çöküş mücbir sebeptir; burada kasıt değil ticari başarısızlık vardır. Hukuk davası açılması gerekirken ceza davası açılmıştır.'

Bilirkişi Raporu:
Kripto cüzdanının sanığın eşinin adına kayıtlı KYC hesabı üzerinden açıldığı, işlem geçmişinde sanığın şahsi kaldıraçlı emirlerinin de bulunduğu tespit edilmiştir.`,
    question: "Cumhuriyet Savcısı, Ağır Ceza Hâkimi, Ceza Avukatı ve Kriminalist Bilirkişi bu davayı nasıl karara bağlar? Kasıt mı, ihmal mi, hırsızlık mı?",
    tags: ["Ağır Ceza", "Zimmet", "Kripto Varlık", "Çapraz Sorgu", "Bilirkişi"]
  },
  {
    id: "case_court_whistleblower_source_code",
    title: "Yazılımcının Savunma Sanayii Kodlarını GitHub'a Sızdırması: 'Vatan Hainliği mi, İfade Özgürlüğü mü?'",
    category: "Ağır Ceza & Hukuk",
    targetRoom: "courtroom",
    badge: "⚖️ Mahkeme Salonu",
    summary: "Bir yazılım mühendisi, geliştirdikleri yüz tanıma algoritmasının yasa dışı fişleme için kullanıldığını iddia ederek kodları açık kaynak yaptı.",
    content: `Sanık: Mert B. (Kıdemli Yapay Zeka Mühendisi)
Suçlama: TCK 329 Devletin Güvenliğine İlişkin Bilgileri Açıklama, Bilişim Sistemini Engelleme ve Ticari Sır İhlali (15 yıla kadar hapis).

Olay:
Geliştirilen yüz tanıma ve takip yazılımının şehir kameralarıyla entegre edilerek yasal izin olmaksızın muhalif gazetecileri, sendikacıları ve sivil toplum üyelerini kategorize ettiğini fark eden sanık; algoritmanın arka kapısını ve kaynak kodlarını kamu yararı gerekçesiyle GitHub üzerinde sızdırmıştır.

Savcılık İddianamesi:
'Sanık devlet güvenliğini tehlikeye atmış, milli savunma yazılımını düşman unsurların erişimine açmıştır. Hiçbir çalışan kendi başına adalet dağıtamaz.'

Savunma Tezi:
'Anayasal suç işleyen bir gözetleme sistemini ifşa etmek suç değil, vatandaşlık görevidir (Whistleblowing). Kodların içinde askeri bir sır yoktur; yalnızca temel hakları ihlal eden fişleme modülü ifşa edilmiştir.'`,
    question: "Devlet güvenliği ile anayasal haklar arasındaki bu çatışmada mahkeme heyeti nasıl bir hüküm kurmalıdır?",
    tags: ["Devlet Sırrı", "Açık Kaynak", "İfşa", "Anayasa Hukuku", "Ağır Ceza"]
  }
];
