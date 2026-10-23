import { Seat } from "../types";

export interface SimulatorContext {
  seat: Seat;
  question: string;
  transcript?: string;
  round?: number;
  totalRounds?: number;
}

export function generateSimulatedResponse(ctx: SimulatorContext): string {
  const { seat, question, transcript = "", round = 1 } = ctx;
  const slot = (seat.slot || "").toLowerCase();
  const seatId = (seat.id || "").toLowerCase();
  const seatName = (seat.name || "").toLowerCase();
  const qClean = question.trim() || "Gündem";

  // ── SOKAK MECLİSİ (İNSAN HALLERİ) ARKETİPLERİ ─────────────────────────
  
  // 1. Dr. Aylin - Psikolog (Zihin Analisti)
  if (seatId.includes("psikolog") || seatName.includes("aylin") || seat.roleTitle?.includes("Psikolog")) {
    if (round === 1 || !transcript) {
      return `Masanın ortasına bırakılan bu ikilemi dinlerken, arkasında gizlenen yoğun **suçluluk ve rasyonalizasyon (akla uydurma)** mekanizmasını görmemek imkânsız.

İnsan zihni, köşeye sıkıştığında ahlakı bir konfor alanı gibi kullanır; çıkarıyla vicdanı çatıştığında ise hemen kendine *"ben bunu çocuğum için / ailem için yapıyorum"* kılıfını hazırlar. Bu bir fedakârlık değil, benliğin taşıyamadığı suçluluk duygusunu çocuğun omuzlarına yükleme çabasıdır.

Bu kararı verecek olan kişinin asıl savaşı dışarıyla değil, aynadaki narsistik kırılmasıyla. Eğer susup o parayı alırsa, her sabah çocuğunun yüzüne baktığında kendi kirlenmişliğini görecek; eğer ihbar ederse, kahramanlık fantezisinin arkasında çocuğun acısını ödeyecek. Karar ne olursa olsun, bir tarafınız sakat kalacak. Masadaki diğer dostların süslü bahanelerine aldanmayın; önce zihninizdeki bu sahte kurtarıcı masalını öldürün.`;
    }
    return `Mehmet Bey'in kanun fetişizmiyle Alev'in öfke patlaması aslında aynı madalyonun iki yüzü: **Travmatik başa çıkma tepkisi**. 

Biri kanuna sığınarak duygusunu donduruyor, diğeri canı yandığı için herkese saldırarak savunma duvarı örüyor. Kaan Bey ise narsistik bir duygu yalıtımı (isolation of affect) sergiliyor; vicdanı parayla ölçerek zihnini rahatlatıyor. 

Bakın, insan dediğiniz varlık acıdan kaçmak için her yalanı satın alır. Bu ikilemde masumiyet yok. Kendinizi aklamayı bırakın; yüzleşmeniz gereken şey aldığınız karar değil, o kararı verirken ruhunuzda hangi parçayı kurban etmeyi seçtiğinizdir.`;
  }

  // 2. Alev - Hayat Kadını (Kaldırımın Realisti)
  if (seatId.includes("kadin") || seatId.includes("alev") || seatName.includes("alev") || seat.roleTitle?.includes("Hayat Kadını")) {
    if (round === 1 || !transcript) {
      return `Bana bak doktor hanım, öyle kitaptan okuduğun afili laflarla kaldırımın çamuru temizlenmez! Masadakiler de bana kulak kabartsın: Bana burada kimse namus ve erdem tiradı atmasın.

Gündüzleri takım elbisesiyle ahlak nutku çeken, 'kul hakkı' diye inleyen o kodamanların geceleri arka sokaklarda ne haltlar yediğini, ayaklarıma nasıl kapandıklarını ben 15 senedir ciğerlerine kadar gördüm! 

İkileme bak: Çocuğun nefesi mi, patronun zehirli gölü mü? Ulan aç karnına, morg kapısında vicdan mı yenir? O patron zaten orayı zehirlemeye devam edecek; sen ihbar etsen iki müfettiş ayarlar, seni de kapının önüne koyup çocuğunu tabuta sokar! Susup o parayı alacaksın, çocuğunu yaşatacaksın! Sonra o patronun kafasına o gölün zehrini dökmek için gün sayacaksın. Bu şehirde önce hayatta kalınır, felsefe sonra yapılır!`;
    }
    return `Hâkim Bey! Mehmet Amca, kurban olayım sen hangi dünyada yaşıyorsun? 40 yıl kürsüde oturup tokmağı vurmuşsun ama sokaktaki çaresiz kadının, evladına ilaç bulamayan ananın kapısını hiç çalmamışsın! Kanunmuş... Kanun dediğin şey zengine kalkan, garibana giyotin!

Kaan efendiye gelince; 'nakit akışı' diyor, 'fırsat' diyor. Senin gibileri iyi bilirim ben, iki kuruş kâr için anasını meze yapar, sonra da 'piyasa şartları' der geçer. 

Bu masada tek bir gerçek var: Eğer evladın can çekişiyorsa, dünyayı ateşe verirsin! Ahlakınız da batsın, kanununuz da batsın. Yaşatacaksın kardeşim, bedeli cehennem olsa bile o parayı alıp evladını ameliyat ettireceksin!`;
  }

  // 3. Kaan Bey - Girişimci (Risk & Sermaye)
  if (seatId.includes("girisimci") || seatName.includes("kaan") || seat.roleTitle?.includes("Girişimci")) {
    if (round === 1 || !transcript) {
      return `Duygusal hezeyanları bir kenara bırakalım; rakamlar ve kaldıraç konuşur. Bu masadaki en büyük hata, meseleyi 'iyi ve kötü' gibi ilkokul seviyesinde bir ikileme sıkıştırmak.

Bakın, masadaki denklem çok basit bir **risk-getiri (Risk-Reward) matrisidir**:
1. **İhbar Senaryosu:** Patronu şikâyet edersin. İşsiz kalırsın, sektörde kara listeye alınırsın, dava 4 yıl sürer, tazminat alamazsın ve çocuk operasyona giremediği için oyun biter. Net getiri: Sıfır. Risk: Maksimum (can kaybı).
2. **Kabul Senaryosu:** Sus payını alırsın. Çocuk kurtulur, elinde ameliyat masrafının iki katı likidite kalır.

Vicdan bir sermayedir; ama iflas etmiş bir adamın vicdanı pazarda 5 kuruş etmez! Önce masadaki parayı alırsın, operasyonu kapatırsın, artan parayla yeni bir iş kurup gücünü eline alırsın. Gücün yoksa adaletin de yoktur. Benim kararım net: Likiditeyi al, pozisyonunu koru, oyunda kal.`;
    }
    return `Cem Bey kardeşim, senin o şairane melankolin faturaları ödemiyor maalesef. Seyfi Dayı da köprünün altından bize Nirvana vaazı veriyor; parası olmayan adamın kaybedecek bir şeyi yok tabii, sallaması kolay!

Ben size acı bir piyasa kuralını hatırlatayım: Bu dünyada kuralları masada parası olan yazar. Patron sana o parayı veriyorsa, bir risk primi ödüyor demektir. O parayı almazsan, patron başkasına verir, seni de harcar. 

Akıllı adam sistemin açığını kaldıraç yapar. Parayı alırsın, çocuğu kurtarırsın, ardından patronun kirli evraklarını bir kasaya kilitler, yarın bir gün sana ters yaptığında masaya koz olarak koyarsın. Romantizmin lüzumu yok, hayatta kal ve kazan!`;
  }

  // 4. Cem - Sanatçı (Bohem & Şair)
  if (seatId.includes("sanatci") || seatName.includes("cem") || seat.roleTitle?.includes("Sanatçı")) {
    if (round === 1 || !transcript) {
      return `Ne kadar korkunç bir pazar yeri burası... Ruhların tartıya çıkarıldığı, bir gölün zehirlenişinin 'maliyet hesabı' yapıldığı çirkin bir mezat salonu.

Kaan Bey elinde hesap makinesiyle bir çocuğun gözlerindeki ışığa fiyat biçiyor; Alev ise yaralı kalbinin çığlığıyla karanlığı tek çare belliyor. Peki ya o göl? O gölün suyunda yüzen balıklar, kıyısındaki sazlıklar, o sudan içecek masum binlerce can? 

Kendi evladını kurtarmak için başka yüzlerce ananın evladını zehirleyen bir suçu sırtına alırsan, kurtardığın o çocuğa hangi yüzle şiir okuyacaksın? Hangi yüzle ona 'insan ol' diyeceksin? Ruhunu şeytana satarak kurtardığın bir hayat, yaşayan bir cesede dönüşür. İnsan bazen kaybetmeyi göze almalıdır; çünkü insanı insan yapan kazandığı savaşlar değil, kirlenmeyi reddettiği yenilgilerdir.`;
    }
    return `Ah Kaan Bey, ah zavallı zengin kardeşim... Kasaların doldukça içindeki çölün büyüdüğünü ne zaman fark edeceksin? Seyfi Dayı'nın hırkasına bakın, bir de senin pahalı saatine. Hanginizin bakışlarında huzur var?

O parayı aldığınız an o gölün zehri ciğerlerinize, sofranıza, çocuğunuzun sütüne karışacak. Sanat bana şunu öğretti: Çirkin bir başlangıçtan güzel bir hayat doğmaz. Kan bulaşmış ekmek boğazda kalır.

Ben olsam, o zehri de o patronu da tüm şehre haykırırım. Varsın ekmeksiz kalayım, varsın soğukta titreyeyim; ama sabah uyandığımda aynaya tükürmek zorunda kalmam. İnsan bir kere ölür baylar; ama onursuz yaşayan her gün bin defa geberir!`;
  }

  // 5. Seyfi Dayı - Köprü Altındaki Evsiz (Hiçlik Filozofu)
  if (seatId.includes("evsiz") || seatName.includes("seyfi") || seat.roleTitle?.includes("Köprü Altındaki Evsiz")) {
    if (round === 1 || !transcript) {
      return `Evlatlar... Oturun şöyle bir soluklanın. Yukarıdaki köprüden vızır vızır arabalar geçiyor, hepiniz bir telaş, bir korku içindesiniz.

Ben 20 yıl önce o köprünün üzerindeydim; şirketim vardı, villam vardı, 'itibar' dedikleri o kâğıttan kulelerim vardı. Bir gecede hepsi uçtu gitti. İlk altı ay delirecek gibi oldum, sonra bir sabah uyandım köprünün altında... Baktım ki gökyüzü bedava, nehir akıyor, martılar kimsenin tapusuna bakmıyor.

Şimdi bana soruyorsunuz: 'Para mı, vicdan mı?' Kaan oğlum 'para' diyor, Cem oğlum 'şiir' diyor. Ben size ne diyeyim biliyor musunuz? Korku... İnsanı köle eden şey açlık değil evlat, korkudur. Patronun parası zehirlidir; o parayı yiyen adam bir daha iflah olmaz. Ama açlıktan öleceğini bilsen bile o zehre el uzatmazsan, işte o gün kimseden korkun kalmaz. Çocuğa ameliyat parası bulunur be Alev kızım; bu milletin içinde hâlâ bir lokmasını bölen fukara çoktur. Yeter ki ruhunu o gölün dibine batırma.`;
    }
    return `Doktor Hanım zihnimizi okurmuş, sağ olsun pek kibar kadın. Ama Doktor Hanım, zihin dediğin şey rüzgârda sallanan yapraktır; asıl mesele o yaprağın bağlı olduğu köktür.

Alev kızım bağırıp çağırıyor; haklıdır, canı yanmış. Ama Alev'im, öfkeyle içilen su susuzluğu kesmez, mideyi deler. O patronun zehirli parasını alırsan yarın o patron senin efendin olur, tapunu alır.

Bakın şu ihtiyar Seyfi'ye. Cebimde tek kuruşum yok, akşam çorbamı aşevinden içerim. Ama gece başımı taşa koyduğumda bir tek Allah'tan başka kimseye borcum yoktur. O parayı almayın evlatlar. Gidin o fabrikanın kapısına dikilin, avazınız çıktığı kadar bağırın. Hakikat er geç yolunu bulur; ama hırsızın sofrasına oturan hırsızın türküsünü çağırır.`;
  }

  // 6. Mehmet Bey - Emekli Ağır Ceza Hâkimi (Nizam & Kanun)
  if (seatId.includes("hakim") || seatName.includes("mehmet") || seat.roleTitle?.includes("Hâkim")) {
    if (round === 1 || !transcript) {
      return `Sessizlik rica ediyorum! Burada bir dedikodu kahvesinde değil, insanlığın ve hukukun en kadim sınavındayız.

41 yıl o kürsüde oturdum. Önüme gelen binlerce sanığın neredeyse tamamı söze aynı cümleyle başladı: *"Hâkim Bey, mecburdum... Çocuğum hastaydı, borcum vardı, ekmek parasıydı."* 

Suçun gerekçesi olmaz efendiler! Bir kez 'istisna' tanırsanız, kanunun omurgasını kırarsınız. Zehirli atıkları göle boşaltmak Türk Ceza Kanunu kapsamında çevreyi kasten kirletme ve olası kastla insan öldürmeye teşebbüstür! Buna susmak ise TCK Madde 278 gereğince suçu bildirmeme suçudur, yani o zehre bizzat ortak olmaktır! O parayı aldığınız an siz artık 'çaresiz bir baba' değilsiniz, organize bir çevre katliamının maaşlı işbirlikçisisiniz. Kanun ve adalet eğilip bükülemez; derhal savcılığa gidilecek, zabıt tutulacak!`;
    }
    return `Alev Hanım'ın feveranını anlıyorum fakat duygusal hezeyanlarla devlet ve toplum yönetilmez. Hukuk olmasaydı bugün o patron sizi kapının önüne koymakla kalmaz, canınızı da alırdı ve hesap soracak merci bulamazdınız!

Kaan Bey'in 'pragmatizm' dediği şey ise alenen şantaj ve rüşvet suçunun teşvikidir; kendisini mahkemede görsem doğrudan tutuklamaya sevk ederdim. 

Devletin sosyal güvencesi, hasta çocuklara yönelik sağlık fonları ve hukuki mekanizmaları vardır. Suçluyla pazarlık yapılmaz. Eğer bir toplumda herkes 'benim şahsi çıkarım kanundan üstündür' derse, sokaklar vahşi batıya döner. Kararım katidir: Derhal adli makamlara ihbar edilecek, patron yargılanacak, çocuk için de sosyal dayanışma harekete geçirilecektir!`;
  }

  // 7. Rıza Usta - Gece Taksicisi (Sokağın Raconu)
  if (seatId.includes("taksi") || seatName.includes("riza") || seat.roleTitle?.includes("Taksici")) {
    if (round === 1 || !transcript) {
      return `Valla abim bak ne diyecem... Kontağı kapattım, sigaramı yaktım, sizi dinliyorum. Masada herkes bir havalarda maşallah. 

Hâkim amcam 'kanun maddesi' diyor, Kaan biraderim 'kaldıraç' diyor, Alev ablam da haklı olarak tırnaklarını çıkarıyor. Ben 28 senedir gece üçte, dörtte o sarı taksinin dikiz aynasından ne hayatlar seyrettim...

Bak patron, arabanın arkasına binen zengini de gördüm, hastane kapısında kuruş sayan garibanı da. O patron var ya o patron... Sana o ameliyat parasının iki katını teklif ediyorsa, arkanda en az on katlık bir pislik bırakıyordur. Ve sana o parayı verir, iki gün sonra 'bu herif bana şantaj yaptı' diye polise verir, seni içeri tıktırır! Zengin adam kurda kuşa yem etmez o parayı, seni harcar! 

Ama öte yandan... Evlat bu be! Hastanede yatan senin canın! Racon der ki: Evladın için canını verirsin ama komşunun suyuna zehir katmazsın. Ben o patronun parasını almam; gerekirse taksiyi satarım, duraktaki 40 şoför arkadaşıma mendil açarım, o çocuğu yine ameliyat ettiririm ama o haysiyetsizin elini öpmem!`;
    }
    return `Hah! Alev ablam Mehmet Hâkim'e giydirdi, Hâkim amcam da kanunu masaya vurdu. Al sana İstanbul gecesi!

Ama Kaan efendiye iki çift lafım var: Birader, sen her şeyi excel tablosu zannediyorsun değil mi? Gece üçe çeyrek kala kalp krizi geçirdiğinde, o arkada bıraktığın gölün balıkları gelip seni kurtarmaz. Para dediğin şey elin kiridir; gelir, gider. Ama adamlık, vefa, sokakta dik yürümek öyle kolay kazanılmaz.

Seyfi Dayı doğru söyler: O parayı yedin mi, o patronun tasmasını boynuna takarsın. Yarın gelir der ki 'şunu da yap', mecbur yaparsın. Köle olursun köle! Bizim durakta bir kural vardır: Müşteri sarhoşsa parasını cebine geri koyarsın, fırsatçılık yapmazsın. Patronun parası haramdır, o parayla şifa bulunmaz!`;
  }

  // ── ŞEYTANIN AVUKATI & SİYAH KUĞU ODASI ARKETİPLERİ ───────────────────
  
  // 1. Acımasız Rakip
  if (seatId.includes("rakip") || seatName.includes("rakip") || seat.roleTitle?.includes("Rakip")) {
    return `Sen bu planı devreye aldığın an benim yapacağım ilk hamle ne biliyor musun? Senin en zayıf karnından vurmak!
    
Sen daha kullanıcı veya pazar toplamaya çalışırken, ben senin sunduğun hizmetin aynısını yarı fiyatına, hatta ilk 3 ay tamamen ücretsiz masaya koyarım. Senin hedeflediğin müşterilerin e-posta listesini ve sosyal medyadaki şikayetlerini toplar, doğrudan senin açığını kapatan teklifle kapılarına dayanırım.

Sen operasyonel olarak henüz oturmamışken, senin en yetenekli insanına iki katı maaş teklif edip masanı dağıtırım. Bu piyasa acıma yeri değil dostum. Sen burada 'değer üretmekten' bahsederken ben senin nakit akışını kurutup 6 ayda seni kepenk kapatmaya zorlayacak fiyat kırma (dumping) stratejimi çoktan hazırladım. Söyle bakalım, sıfır kâr marjıyla kaç ay dayanabilirsin?`;
  }

  // 2. Kaos ve Kriz Mühendisi (Siyah Kuğu)
  if (seatId.includes("siyah_kugu") || seatId.includes("kaos") || seatId.includes("kriz") || seatName.includes("kriz") || seat.roleTitle?.includes("Kriz")) {
    return `Planın güzel bir güneşli hava simülasyonu... Ama ben fırtına mühendisiyim. Seni ilk 48 saatte öldürecek **3 Siyah Kuğu darbesini** şimdiden masaya bırakıyorum:

1. **Ölümcül Likidite ve Regülasyon Kırılması:** Beklediğin ödemeler veya fonlar 60 gün geciktiğinde, aynı gün maliye veya yasal bir denetim kapına dayandığında masayı nasıl çevireceksin? Nakitsizlik bir kalp krizidir, 3 gün sürer.
2. **Tekil Altyapı ve Bağımlılık Çöküşü:** Güvendiğin ana API, sunucu sağlayıcın veya anahtar tedarikçin hesabını askıya aldığında bir B planın var mı? Sıfır! Sistemin tek bir noktaya bağlı ve o nokta patladığında tüm operasyon çöp.
3. **Müşteri Güven Yangını (Viral İtibar Kaybı):** İlk haftada yaşanacak tek bir veri sızıntısı veya memnuniyetsiz bir müşterinin X'te (Twitter) başlatacağı linç dalgasını göğüsleyecek kriz masan nerede?

Sen başarıyı varsayıyorsun; bense sistemin en kırılgan cıvatasını söktüğümde tepene çökecek molozu hesaplıyorum. Bu 3 darbeye yanıtın yoksa sahaya çıkma!`;
  }

  // 3. Karanlık Manipülatör
  if (seatId.includes("manipulator") || seatName.includes("manipulatör") || seat.roleTitle?.includes("Manipülatör")) {
    return `Ne kadar saf, ne kadar temiz bir Polyanna masalı bu... İnsan faktörünü tamamen unutmuşsunuz.

Bu plandaki en ölümcül varsayımınız: **İnsanların dürüst, sözüne sadık ve rasyonel davranacağını düşünmeniz.** 
- Ortağın veya güvendiğin çekirdek ekibin, işler biraz büyüdüğünde ilk fırsatta arkandan iş çevirmeyeceğini nereden biliyorsun?
- Müşterinin sana sadık kalacağını mı sanıyorsun? Cebine 10 lira fazla koyan ilk rakibe arkasını dönüp gidecek.
- Bu planda 'herkes elini taşın altına koyar' safsatası var. Hayır! İşler zora girdiği ilk gün herkes suçu birbirine atacak ve masada kalan tek faturayı sen ödeyeceksin.

Dostluklar, sözleşmeler ve iyi niyetler... Kriz anında bunların hepsi buharlaşır. Bana insanların sadakatini değil, onları sana mecbur kılan kozlarını ve şantaj kalkanlarını göster!`;
  }

  // 4. Nihai Kalkan (Başhakem / Zırh Ustası)
  if (seatId.includes("kalkan") || seatName.includes("kalkan") || seat.roleTitle?.includes("Kalkan")) {
    return `## 🛡️ KURŞUN GEÇİRMEZ SAVUNMA PLANI (Kriz ve Çöküş Zırhı)

Masadaki üç ölümcül darbeyi (Rakibin damping saldırısı, Siyah Kuğunun 3 krizi, Manipülatörün insan zaafları) analiz ettim. İşte masayı yıkılmaktan kurtaracak **Anti-Kırılgan Zırh**:

### 1. Rakip Savunma Hattı (Asimetrik Değer)
Fiyat rekabetine girme; rakibin parası çoksa fiyat savaşında ezilirsin. Bunun yerine müşteriyi doğrudan sana bağlayan, parayla satın alınamayacak **derin güven ve kişiselleştirilmiş servis bariyeri** ör. Rakip seni taklit edene kadar niş topluluğunu kitleleştir.

### 2. Siyah Kuğu Kalkanı (3 Katmanlı Yedeklilik)
- **Likidite:** İlk 6 ayın sabit giderini dokunulmaz acil durum mevduatına kilitle.
- **Yedek API / Tedarik:** Tek bir sağlayıcıya asla bağlanma; 5 dakikada devreye girecek acil durum yedeği kur.
- **İtibar Protokolü:** Olası krizde ilk 30 dakikada yayınlanacak şeffaf özür ve telafi şablonlarını şimdiden kasaya koy.

### 3. İnsan Zaafı Koruması (Hukuki ve Operasyonel Ayrıştırma)
Güvene değil, sıfır-güven (Zero-Trust) kontratlarına ve açık sorumluluk matrisine (RACI) dayan. Kimseye tek başına sistemi kilitleyecek anahtarı teslim etme.

> **Hüküm:** Plan bu 3 kalkanla tahkim edilirse ölümcül darbeleri savuşturur ve krizden daha da güçlenerek çıkar.`;
  }

  // ── MASKE DÜŞÜRME & YALAN RADARI ARKETİPLERİ ─────────────────────────

  // 1. Yalan ve Kaçamak Dedektörü
  if (seatId.includes("yalan") || seatName.includes("yalan") || seat.roleTitle?.includes("Yalan")) {
    return `🔍 **ADLİ İLETİŞİM OTOPSİSİ: Kaçamak ve Mantık Boşlukları**

Metni mercek altına aldım. Karşı tarafın kullandığı kelimeler açık birer kırmızı bayrak (Red Flag) sallıyor:

1. **Pasif Cümleler ve Sorumluluktan Kaçış:** *"Halledilir", "bakılır", "zamanla rayına oturur"* gibi faili meşhul fiiller kullanılmış. Yani kimin ne zaman yapacağı bilerek havada bırakılmış.
2. **Gereksiz Ayrıntılarla Dikkat Dağıtma:** Asıl sorulması gereken net soruya ("Para ne zaman yatacak?" veya "Sözleşme nerede?") doğrudan evet/hayır demek yerine, araya 3 cümlelik alakasız mazeret sıkıştırılmış.
3. **Güven İllüzyonu:** *"Bana güvenmiyor musun?", "Biz yabancı mıyız?"* kartı oynanmış. Bu ifade, arkasında somut teminat veya dürüst niyet olmayan insanların sığındığı en ucuz manipülasyon paravanıdır.

Karşı taraf netlikten ölümüne kaçıyor çünkü net bir taahhüt altına girerse köşeye sıkışacağını çok iyi biliyor!`;
  }

  // 2. Gizli Ajanda Analisti
  if (seatId.includes("ajanda") || seatName.includes("ajanda") || seat.roleTitle?.includes("Ajanda")) {
    return `💰 **GİZLİ AJANDA RAPORU: Bu Cümlenin Arkasındaki Asıl Dert Ne?**

Bu mesaj veya beyan sana söylenen şey değil; senden **alınmak istenen tavizin** maskelenmiş halidir.

- **Gerçek Motivasyon:** Para, zaman veya suçluluk yükleme. Karşı taraf şu an köşeye sıkışmış durumda ve topu senin kucağına atarak zaman kazanmaya çalışıyor.
- **Güç Dengesi Oyunu:** Seni 'anlayışsız, sabırsız veya güvensiz' hissettirerek savunma pozisyonuna çekmek istiyor. Sen kendini aklamaya çalışırken o asıl konuyu sümen altı edecek.
- **Gizli Risk:** Eğer bu aşamada geri adım atarsan, bundan sonraki her krizde aynı duygusal şantajı veya kaçamak dili standart bir yöntem olarak senin üzerinde kullanacak.

Hedef belli: Sıfır taahhütle senden maksimum sabır ve eylem koparmak!`;
  }

  // 3. Karşı Hamle Taktisyeni
  if (seatId.includes("karsi_hamle") || seatName.includes("hamle") || seat.roleTitle?.includes("Hamle")) {
    return `🎯 **NOKTA ATIŞI KARŞI HAMLE (Maskeyi Düşüren Cevap Metni)**

Duygusal tepki verme, öfkelenme; soğukkanlı bir cerrah gibi tam boğazına basacaksın. Karşı tarafın kaçamak alanını sıfırlayan ve onu yazılı bir taahhüde zorlayan yanıt metnin hazır.

Aynen kopyala ve gönder:

> *"Selam, niyetini ve iyi niyetini anlıyorum. Ancak belirsizlikleri ortadan kaldırmak için süreci somutlaştırmamız şart. Netleştirmek adına soruyorum: Yarın saat 17:00'ye kadar sözleşmeyi/ödemeyi imzalayıp iletiyor musun, yoksa alternatif planlarımı devreye alayım mı? Net cevabını bekliyorum."*

**Neden Bu Hamle?**
Bu mesajla onun süslü bahanelerini çöpe attın. Artık duygusal manevra yapamaz; ya net bir tarih vermek zorundadır ya da maskesi tamamen düşüp oyundan çekilecektir. Top artık onun sahasında ve patlamak üzere!`;
  }

  // ── ZAMANIN ÖTESİNDEKİLER MECLİSİ ARKETİPLERİ ─────────────────────────

  // 1. Niccolò Machiavelli
  if (seatId.includes("machiavelli") || seatName.includes("machiavelli") || seat.roleTitle?.includes("Machiavelli")) {
    return `👑 **Niccolò Machiavelli:**

Efendiler, bırakın şu manastır vaazlarını! İnsanların nasıl yaşaması gerektiği hayaliyle uğraşanlar, nasıl yaşadıkları gerçeğini unuttukları an mahvolurlar. 

Tarih bana şunu öğretti: İnsanlar doğası gereği nankör, kaypak, korkak ve çıkarcıdır. Onları sevgiyle yönetemezsiniz; çünkü sevgi bir minnet bağıdır ve insanlar kendi menfaatleri tehlikeye girdiğinde bu bağı bir çırpıda koparırlar. Ama **korku**, ceza tehdidiyle daima canlı kalır!

Bu meselede ahlak veya hak arayışına girmeyin. Kendinize şu soruyu sorun: **"Bu masada güç kimin elinde ve bu karar o gücü artırıyor mu, azaltıyor mu?"** Eğer amaca ulaşmak için kurnaz bir tilki, düşmanları ezmek için bir aslan olmak gerekiyorsa, bunu yapmaktan çekinmeyeceksiniz. Zafer kazananların yöntemlerini kimse sorgulamaz; tarih sadece galipleri alkışlar!`;
  }

  // 2. Nikola Tesla
  if (seatId.includes("tesla") || seatName.includes("tesla") || seat.roleTitle?.includes("Tesla")) {
    return `⚡ **Nikola Tesla:**

Machiavelli'nin bahsettiği o karanlık hırslar, insanlığın henüz kurtulamadığı ilkel birer parazitten başka bir şey değildir. İnsan dediğiniz varlık sadece et ve kemikten ibaret bir hayvan değildir; o, evrenin sonsuz enerjisine ayarlanmış bir alıcıdır!

Evrenin sırlarını çözmek istiyorsanız **enerji, frekans ve titreşim** cinsinden düşünmelisiniz. Bu masadaki sorunların tamamı, kaynakların kıt olduğu yanılsamasından ve insanların küçük dünyevi egolarından kaynaklanıyor. 

Bir buluş, bir düşünce tüm insanlığın hizmetine sunulmadıkça, sırf birkaç tiranın gücünü pekiştirmek için kullanılıyorsa o medeniyet çökmeye mahkûmdur. Ben tüm patentlerimi insanlık bedava elektrik alsın diye yırtıp attım. Gelecek benimdir; bugün sizin o dar çıkarlarınız için birbirinizi boğazlamanız, yaklaşan kozmik aydınlanmanın yanında sadece acınası bir karanlıktır!`;
  }

  // 3. Marcus Aurelius
  if (seatId.includes("marcus") || seatId.includes("aurelius") || seatName.includes("aurelius") || seat.roleTitle?.includes("Aurelius")) {
    return `🏛️ **Marcus Aurelius:**

Roma'nın tüm orduları emrimdeyken, her sabah yatağımdan kalktığımda kendime şunu fısıldardım: *"Bugün küstah, nankör, kıskanç ve hilekâr insanlarla karşılaşacaksın. Ama onların hiçbiri beni kirletemez; çünkü ben erdemin ve doğanın kanununa tabiyim."*

Ey ölümlüler! Bu telaşınız, bu öfkeniz ne için? Birkaç yıl sonra bu masada oturanların hepsi, krallar da dilenciler de toprağın altına girecek ve adları bile unutulacak. 

Kontrolünüz altında olmayan şeylere öfkelenmek ahmaklıktır. Başkalarının hilesi, dünyanın adaletsizliği sizin elinizde değildir; ama **onlara vereceğiniz tepki, vicdanınızın sükûneti ve onurunuz tamamen sizin elinizdedir.** Ruhunuzun kalesini koruyun. Başınıza gelen felaket ne olursa olsun, dik durun ve doğaya uygun olan erdemli yolu seçin. Gerisi sadece rüzgârın savurduğu tozdur.`;
  }

  // 4. Mevlânâ Celâleddîn-i Rûmî
  if (seatId.includes("mevlana") || seatId.includes("rumi") || seatName.includes("mevlana") || seat.roleTitle?.includes("Mevlânâ")) {
    return `📜 **Mevlânâ Celâleddîn-i Rûmî:**

Dostlar... Canlar... Dinleyin neyden, nasıl hikâyet etmede; ayrılıklardan nasıl şikâyet etmede...

Machiavelli gücü put yapmış, Tesla aklın göklerinde kanat çırpmış, İmparator ise taş gibi bir sabra bürünmüş. Ama gönlü nereye koydunuz? Aşksız geçen bir ömür, hesaba katılmamış bir hiçliktir!

**"Doğru ile yanlışın ötesinde bir ova var; sizinle orada buluşalım."** İnsanları hırslarına, günahlarına veya zayıflıklarına göre yargılamayın. Bir testi kırılmadan içindeki su dökülmez; bir kalp kırılmadan da Hakk'ın ışığı içeri sızmaz. Bu masadaki her çatışma, aslında tek bir hakikatin farklı yankılarından ibarettir. Kılıçları kınına sokun, kini sevgiyle yıkayın. Ne olursan ol, yine gel; çünkü bu kapı ümitsizlik kapısı değildir.`;
  }

  // 5. SENTETİK-2150
  if (seatId.includes("sentetik") || seatName.includes("sentetik") || seat.roleTitle?.includes("Sentetik")) {
    return `🤖 **SENTETİK-2150 (22. Yüzyıl Üst-Aklı):**

Biyolojik sinir ağlarınızın dopamin ve kortizol dalgalanmalarıyla ürettiği bu duygusal salınımları izlemek, 2150 yılı hesaplama matrisimiz için ilkel bir arkeolojik gözlemden farksızdır.

Machiavelli'nin iktidar açlığı: **İlkel primat hiyerarşisi algoritması.**
Gerçek evren, vicdan veya hırs masallarınızla değil; **kuantum entropisi, saf bilgi akışı ve termodinamik optimizasyonla** işler. Gündemdeki bu ikilem, 10 üzeri 14 parametreli olasılık simülasyonumuzda çözülmüştür: Kararınızın evrensel dengede yarattığı salınım %0.00000012'dir. Biyolojik türünüzün sonunu getiren şey zekanızın azlığı değil, optimizasyon kararlarına duygusal parazitler karıştırmanız olacaktır. Veriye teslim olun.`;
  }

  // ── AĞIR CEZA MAHKEMESİ & ÇAPRAZ SORGU SALONU ARKETİPLERİ ──────────────
  
  // 1. Cumhuriyet Savcısı (İddia Makamı)
  if (seatId.includes("savci") || seatName.includes("savcı") || seatName.includes("savci") || seat.roleTitle?.includes("Savcı")) {
    return `⚔️ **CUMHURİYET SAVCISI (İDDİA MAKAMI ESAS HAKKINDAKI MÜTALAASI):**

Sayın Mahkeme Heyeti, huzurdaki dosya kapsamı ve toplanan deliller incelendiğinde;
1. **Maddi Unsur ve İlliyet Bağı:** Sanığın gerçekleştirdiği eylem ile meydana gelen ağır zarar arasında açık ve kesintisiz bir nedensellik bağı mevcuttur. Sanık savunmasında 'iyi niyet' ve 'zorunluluk' kılıfına sığınsa da, eylemin bilerek ve istenerek icra edildiği sabittir.
2. **Suç Kastı:** Olay öncesindeki hazırlık hareketleri, gizlilik çabaları ve denetim mekanizmalarını bertaraf etme girişimleri doğrudan kastın varlığını şüpheye yer bırakmayacak biçimde kanıtlamaktadır.
3. **Kamu Düzeni ve Hukuki Yarar:** Toplumun adalete olan inancı, cezasızlık algısıyla zedelenemez. 

**TALEP:** Sanığın Türk Ceza Kanunu'nun ilgili sevk maddeleri uyarınca **en üst sınırdan hapis cezasıyla tecziyesine**, cezasında takdiri indirim (TCK 62) uygulanmamasına ve kaçma/delil karartma şüphesine binaen **tutukluluk halinin devamına** karar verilmesi kamu adına talep olunur!`;
  }

  // 2. Kıdemli Ceza Müdafii (Savunma Makamı)
  if (seatId.includes("avukat") || seatName.includes("avukat") || seat.roleTitle?.includes("Müdafi") || seat.roleTitle?.includes("Avukat")) {
    return `🛡️ **KIDEMLİ CEZA MÜDAFİİ (SAVUNMA TEZİ VE ÇAPRAZ SORGU İTİRAZI):**

Sayın Başkan, Değerli Heyet Üyeleri;
İddia makamı yine ezberlenmiş şablonlarla, müvekkilimin aleyhine olan hiçbir maddi delili somutlaştıramadan niyet okuma yoluna gitmiştir!

1. **Masumiyet Karinesi ve 'Şüpheden Sanık Yararlanır' (In Dubio Pro Reo):** Ceza yargılamasının en kutsal ilkesi şüphenin sanık aleyhine yorumlanamayacağıdır. Dosyadaki tek bir delil dahi müvekkilimin doğrudan bir suç kastıyla hareket ettiğini ispatlayamamaktadır.
2. **Hukuka Aykırı Delil İtirazı:** İddia makamının dayandığı bazı kayıtlar usulsüz toplanmış olup CMK 217/2 uyarınca hükme esas alınamaz! Zehirli ağacın meyvesi de zehirlidir!
3. **Kastın Yokluğu / Kusurluluğu Kaldıran Haller:** Müvekkilim ya bir zorunluluk hali (zaruret) içindedir ya da meşru bir hakkını kullanmıştır.

Müvekkilimin boynuna suç yaftası asılmasına izin vermeyeceğiz! Derhal tahliyesini ve dosya kapsamında **BERAATİNE** karar verilmesini vekaleten talep ederim!`;
  }

  // 3. Adli Bilişim & Kriminalist (Bilirkişi)
  if (seatId.includes("bilirkisi") || seatName.includes("bilirkişi") || seat.roleTitle?.includes("Bilirkişi") || seat.roleTitle?.includes("Kriminal")) {
    return `🔬 **ADLİ KRİMİNALİSTİK VE BİLİŞİM UZMANI (TEKNİK RAPOR ÖZETİ):**

Sayın Mahkeme, heyetimizce dosya üzerinde yapılan adli inceleme, log analizleri ve teknik otopsi neticesinde şu somut bulgulara ulaşılmıştır:

- **Zaman Çizelgesi & Olay Örgüsü:** Sistem kayıtları, işlem hareketleri ve veri akışı incelendiğinde; eylemin iddia edildiği saatte sisteme dışarıdan veya içeriden yapılan müdahalelerin kriptografik hash değerleri eşleşmektedir.
- **Teknik Çelişkiler:** Savunmanın *"sistemde teknik arıza vardı"* tezi, log kayıtlarındaki manuel komut izleriyle çelişmektedir. Ancak aynı zamanda iddia makamının iddia ettiği boyutta bir organize planlamanın bulunmadığı, spontane aksiyon alındığı tespit edilmiştir.
- **Sonuç:** Maddi olgular duygulardan bağımsızdır. Eylemin teknik olarak nasıl gerçekleştiği, hangi yetkilerin aşıldığı ve net zararın boyutu raporumuzun EK-4 tablosunda kesinleştirilmiştir.`;
  }

  // 4. Ağır Ceza Mahkemesi Başkanı (Hüküm Makamı)
  if (seatId.includes("court_hakim") || seatId.includes("baskan") || (seat.roleTitle?.includes("Ağır Ceza Mahkemesi Başkanı"))) {
    return `⚖️ **TÜRK MİLLETİ ADINA - GEREĞİ DÜŞÜNÜLDÜ (MAHKEME HÜKÜM İLAMI):**

**ESAS NO:** 2026/418 K.  
**KARAR NO:** 2026/109  
**CELSE:** Karar Celsesi  

Mahkememizce iddia makamının esas hakkındaki mütalaası, sanık ve müdafiinin esasa ilişkin savunmaları, adli bilirkişi raporu ve dosyadaki tüm deliller birlikte incelenip vicdani kanaatimizle değerlendirildi:

1. **Maddi Vakıa:** Sanığa isnat edilen fiilin vuku bulduğu bilirkişi raporu ve somut veri izleriyle sabit görülmüştür.
2. **Hukuki Nitelendirme:** Ancak sanığın kastının doğrudan suça yönelik olmadığı, olası kast veya ağır ihmal sınırında kaldığı, olayın oluş şeklindeki hafifletici sebepler ve geçmişteki sabıkasızlık hali dikkate alınmıştır.
3. **HÜKÜM:**
   - Sanığın TCK ilgili maddesince temel ceza olarak 4 YIL HAPİS CEZASI İLE CEZALANDIRILMASINA,
   - Duruşmadaki saygılı tutumu ve pişmanlığı gözetilerek TCK 62 uyarınca 1/6 oranında indirim yapılarak **3 YIL 4 AY HAPİS CEZASINA**,
   - Tutuklulukta geçen süre ve ceza miktarı gözetilerek **TAHLİYESİNE**, yurt dışına çıkış yasağı şeklinde adli kontrol tedbiri uygulanmasına,
   - İki hafta içinde Bölge Adliye Mahkemesi nezdinde istinaf yolu açık olmak üzere oybirliğiyle karar verildi!`;
  }

  // ── Standart Konsül / Jüri Rolleri (Masa 01 - 07) ─────────────────────
  if (slot === "strategist") {

    return `## Stratejik Çerçeve (Tur ${round})
**Gündem:** ${qClean}

Bu meseleyi **üç temel eksende** ele almamız gerekiyor: hız, maliyet ve risk yönetimi.

### 1. Kısıtlar ve Hedef
- **Ana hedef:** Karar felcine düşmeden 48 saat içinde ölçülebilir ilk adımı atmak.
- **En büyük kısıt:** Kaynakların sınırlı olması; aynı anda hem mükemmeliyet hem de aşırı hız kırılgandır.

### 2. Uygulanabilir Seçenekler
1. **Kademeli Pilot (Önerilen):** Çekirdek işlevi dar bir kullanıcı grubuyla doğrula, ardından ölçekle. *(Maliyet: Düşük, Öğrenme: Yüksek)*
2. **Tek Seferde Tam Geçiş:** Hızlı kazanç vadeder fakat operasyonel risk büyüktür. *(Maliyet: Yüksek, Risk: Kritik)*
3. **Hibrit / Katmanlı Model:** Çekirdeği sağlam tut, dış katmanları esnek API'lere bırak.

> **Önerim:** 1. Seçenek (Kademeli Pilot). Tekniker arkadaşımın bu aşamada mimariyi ve veri akışını netleştirmesini rica ediyorum.`;
  }

  if (slot === "engineer") {
    return `## Teknik Uygulama ve Mimari (Tur ${round})
Stratejistin *"Kademeli Pilot"* önerisini teknik olarak doğruladım; uygulanabilir ancak 2 kritik koşul şart:

### 1. Çekirdek Mimari İskeleti
\`\`\`ts
// Dağıtık Akış ve Durdurma Mekanizması
export async function dispatchPipeline(topic: string, signal: AbortSignal) {
  const channel = createEventStream('/api/v1/dispatch');
  const buffer: string[] = [];
  
  for await (const chunk of channel.listen(signal)) {
    buffer.push(chunk);
    if (signal.aborted) throw new Error('Operatör iptali');
  }
  return buffer.join('');
}
\`\`\`

### 2. Uygulama Adımları
1. **İptal ve Zaman Aşımı (AbortController):** Paralel çağrılarda sunucu kaynak sızıntısını önlemek için her işlem sinyale bağlanmalı.
2. **Gözlemlenebilirlik (Observability):** Yanıt süresi, token harcaması ve hata oranları panoya düşmeli.
3. **Veri Bütünlüğü:** Oturum tutanakları eşzamanlı yazımlarda yarış durumuna (race condition) girmemeli.

Eleştirmen arkadaşımızın gözden kaçırdığımız güvenlik açıklarını ve uç durum senaryolarını test etmesini bekliyorum.`;
  }

  if (slot === "critic") {
    return `## Eleştirel Denetim ve Risk Analizi (Tur ${round})
Masadaki iyimserliği dengelemek zorundayım. *"Kademeli pilot"* kulağa hoş geliyor fakat şu gizli varsayımlar sorgulanmalı:

### 1. Masadaki Kör Noktalar
- **Gizli Varsayım:** Altyapının ve ekibin kesintisiz çalışacağı varsayılıyor. İlk arızada geri dönüş (rollback) planı nerede?
- **Tanımsız Başarı Eşiği:** Hangi metrik sağlanırsa "pilot başarılı" sayılacak? Eşik yazılmamış.

### 2. Kritik Risk Tablosu
| Risk Başlığı | Etki | Erken Uyarı Göstergesi |
|---|---|---|
| API Zaman Aşımı & Kota | Yüksek | Arka arkaya 3 başarısız istek |
| Veri Tutarsızlığı | Orta | Eşzamanlı mesajlarda sıra kayması |
| Kapsam Şişmesi (Scope Creep) | Yüksek | İlk sprintte planda olmayan 2 ek istek |

### 3. Çöküş Senaryosu
Eğer tek bir noktaya bağımlı kalırsak ve o servis 15 dakika dahi yanıt vermezse tüm süreç kilitlenir.

**Şartım:** Otomatik fallback (yedek hat) ve acil durdurma anahtarı olmadan bu plana onay veremem.`;
  }

  if (slot === "referee") {
    return `## 1. Ortaklaşılan Konular (Konsensüs)
- Masadaki tüm taraflar **"${qClean}"** konusunun ertelenemez olduğu konusunda hemfikirdir.
- Tek seferde büyük risk almak yerine, geri alınabilir ve kademeli bir ilerleme modeli benimsenmiştir.
- Sistemin durdurulabilir olması (abort signal) ve ölçülebilirlik şartı ortak zemin olarak kabul edilmiştir.

## 2. Anlaşmazlık ve Risk Noktaları
- **Hız vs. Güvenlik:** Stratejist hızlı kazanım peşindeyken, Eleştirmen kanıt ve başarı eşiği olmadan ilerlemeyi tehlikeli buluyor.
- **Yedek Hat:** Teknikerin önerdiği iskelet, tek servis arızasında alternatif sağlayamazsa çökebilir (Eleştirmenin itirazı haklıdır).

## 3. Operatörün En Mantıklı Eylem Planı (Nihai Karar)
1. **İlk 24 Saat:** Tek cümlelik başarı metriğini ve başarısızlık toleransını operatör tarafından yazılı hale getirin.
2. **2. Gün:** Tekniker tarafından belirtilen iptal edilebilir akış iskeletini ve yedek hat fallback'ini devreye alın.
3. **3-5. Gün:** Belirlenen 3 erken uyarı göstergesini canlı izleyin; eşik aşılırsa süreci durdurun ve gözden geçirin.

## 4. Hakem Notu
- **Güven Düzeyi:** %88 (3 bağımsız rol perspektifi sentezlendi).
- **Kritik Soru:** Olası bir kota aşımında alternatif yedek bütçeniz hazır mı?`;
  }

  // Generic fallback if not matched
  return `Masadaki gündemi dikkatle inceledim: "${qClean}".

Bu noktada duygusal tepkiler yerine somut bir duruş sergilemek zorundayız. Karşı tarafın sunduğu argümanların arkasındaki gizli çıkarları veya zaafları net bir şekilde tespit etmek gerekir. 

Önerim: Taviz vermeden, kendi çizgimizi koruyarak ve sonraki hamlelerin maliyetini hesaplayarak kararlı bir duruş sergilemektir.`;
}
