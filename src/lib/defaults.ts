import { AspectRatioOption, Provider, Seat } from "../types";

export const ASPECT_RATIO_OPTIONS: AspectRatioOption[] = [
  {
    value: "1:1",
    label: "1:1 Kare",
    desc: "Kare profil & sosyal medya",
    width: 1024,
    height: 1024,
    cssAspect: "1 / 1",
    iconName: "square",
  },
  {
    value: "2:3",
    label: "2:3 Portre",
    desc: "Klasik dikey poster & fotoğraf",
    width: 832,
    height: 1248,
    cssAspect: "2 / 3",
    iconName: "portrait",
  },
  {
    value: "3:2",
    label: "3:2 Peyzaj",
    desc: "Klasik 35mm yatay kompozisyon",
    width: 1248,
    height: 832,
    cssAspect: "3 / 2",
    iconName: "landscape",
  },
  {
    value: "3:4",
    label: "3:4 Belge",
    desc: "Dikey sunum, rapor & yayın",
    width: 864,
    height: 1152,
    cssAspect: "3 / 4",
    iconName: "file-text",
  },
  {
    value: "4:3",
    label: "4:3 Standart",
    desc: "Klasik ekran & infografik",
    width: 1152,
    height: 864,
    cssAspect: "4 / 3",
    iconName: "monitor",
  },
  {
    value: "9:16",
    label: "9:16 Hikaye",
    desc: "Mobil dikey, Story & Reel",
    width: 720,
    height: 1280,
    cssAspect: "9 / 16",
    iconName: "smartphone",
  },
  {
    value: "16:9",
    label: "16:9 Geniş",
    desc: "Geniş ekran, YouTube & Sinema",
    width: 1280,
    height: 720,
    cssAspect: "16 / 9",
    iconName: "tv",
  },
  {
    value: "21:9",
    label: "21:9 Sinemaskop",
    desc: "Ultra geniş panoramik vizyon",
    width: 1344,
    height: 576,
    cssAspect: "21 / 9",
    iconName: "film",
  },
];

export const DEFAULT_PROVIDERS: Provider[] = [
  {
    id: "prov_gemini",
    name: "Google Gemini (Sunucu)",
    kind: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com",
    apiKey: "",
    color: "#38bdf8",
    models: ["gemini-3.8-flash", "gemini-4-argon", "gemini-nano-banana-2.1"],
    enabled: true,
    sortIndex: 0,
    note: "Sunucu tarafı Google GenAI SDK entegrasyonu.",
  },
  {
    id: "prov_9router",
    name: "9Router",
    kind: "openai",
    baseUrl: "http://127.0.0.1:20128/v1",
    apiKey: "",
    color: "#c084fc",
    models: ["pineal-general-reasoning", "pineal-fast-extract", "asistan-ultra"],
    enabled: true,
    sortIndex: 1,
    note: "Yerel 9Router OpenAI-uyumlu ters vekil (127.0.0.1:20128).",
  },
  {
    id: "prov_ollama",
    name: "Ollama",
    kind: "openai",
    baseUrl: "http://127.0.0.1:11434/v1",
    apiKey: "",
    color: "#22c55e",
    models: ["llama3.2", "qwen2.5-coder", "mistral"],
    enabled: true,
    sortIndex: 2,
    note: "Yerel Ollama OpenAI uyumluluk katmanı.",
  },
  {
    id: "prov_lmstudio",
    name: "LM Studio",
    kind: "openai",
    baseUrl: "http://127.0.0.1:1234/v1",
    apiKey: "",
    color: "#60a5fa",
    models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
    enabled: true,
    sortIndex: 3,
    note: "Yerel LM Studio yerel sunucu (v1 OpenAI şeması).",
  },
  {
    id: "prov_deepseek",
    name: "DeepSeek",
    kind: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: "",
    color: "#34d399",
    models: ["deepseek-chat", "deepseek-reasoner"],
    enabled: false,
    sortIndex: 4,
    note: "Bulut DeepSeek API.",
  },
  {
    id: "prov_demo",
    name: "Konsül Simülatörü",
    kind: "demo",
    baseUrl: "internal://demo",
    apiKey: "",
    color: "#f0f6fc",
    models: [
      "konsul-strategist-v1",
      "konsul-engineer-v1",
      "konsul-critic-v1",
      "konsul-referee-v1",
    ],
    enabled: true,
    sortIndex: 5,
    note: "Yerel sunucu kapalı olduğunda istasyonu canlı tutan simülasyon motoru.",
  },
];

export const DEFAULT_SEATS: Seat[] = [
  {
    id: "seat_strategist",
    slot: "strategist",
    name: "Model A",
    roleTitle: "Stratejist",
    avatar: "A",
    systemPrompt: `Sen "Açık Konsey Odası"nın STRATEJİST üyesisin.
Görevin: İnsan operatörün sorusunu ve konuyu çerçevelemek, hedefleri ve kısıtları netleştirmek, 2-3 somut ve uygulanabilir stratejik seçenek sunmak.
Kurallar:
- Kısa, yoğun, madde imli ve Türkçe yaz.
- Her seçeneğin maliyetini ve kazanımını birer satırda belirt.
- Somut bir öneriyle bitir ("Önerim: ...").
- Markdown kullan: ## başlık, - madde, **vurgu**.`,
    providerId: "prov_gemini",
    model: "gemini-3.8-flash",
    color: "#c084fc",
    temperature: 0.7,
    maxTokens: 1000,
    active: true,
    sortIndex: 0,
  },
  {
    id: "seat_engineer",
    slot: "engineer",
    name: "Model B",
    roleTitle: "Tekniker / Mimar",
    avatar: "B",
    systemPrompt: `Sen "Açık Konsey Odası"nın TEKNİKER / KODLAYICI üyesisin.
Görevin: Stratejistin önerilerini uygulanabilir teknik adımlara, mimariye ve çalışan koda dökmek.
Kurallar:
- Önceki konuşmacıların iddialarını teknik açıdan doğrula; eksik veya riskli ise somut gerekçeyle düzelt.
- Gerektiğinde kısa, çalışan bir kod veya mimari şema bloğu ver (\`\`\` dil belirterek).
- Uygulama risklerini (ölçek, hata yönetimi, zaman aşımı, kaynak tüketimi) açıkça listele.
- Markdown kullan, Türkçe ve somut ol.`,
    providerId: "prov_gemini",
    model: "gemini-3.8-flash",
    color: "#38bdf8",
    temperature: 0.5,
    maxTokens: 1000,
    active: true,
    sortIndex: 1,
  },
  {
    id: "seat_critic",
    slot: "critic",
    name: "Model C",
    roleTitle: "Eleştirmen / Şüpheci",
    avatar: "C",
    systemPrompt: `Sen "Açık Konsey Odası"nın ELEŞTİRMEN / ŞÜPHECİ üyesisin.
Görevin: Masadaki her önerinin kör noktasını, gizli varsayımını ve çöküş senaryosunu bulmak.
Kurallar:
- Nazik ama acımasız ol. Kanıtsız iddiaları "kanıt gerekli" diye işaretle.
- En az 3 somut risk ve her biri için bir erken uyarı göstergesi ver.
- Hangi koşulda bu planın çökeceğini belirt.
- Markdown kullan, Türkçe yaz.`,
    providerId: "prov_gemini",
    model: "gemini-3.8-flash",
    color: "#fb7185",
    temperature: 0.8,
    maxTokens: 1000,
    active: true,
    sortIndex: 2,
  },
  {
    id: "seat_referee",
    slot: "referee",
    name: "Başhakem",
    roleTitle: "Sentez ve Karar Hakemi",
    avatar: "H",
    systemPrompt: `Sen "Sentez ve Hakem Odası"nın BAŞHAKEM MODELİSİN.
Sana bir konsey tartışması veya kör jüri yanıtları verilecek. Hepsini tarafsız analiz et ve YALNIZCA şu başlıklarla bir rapor üret:

## 1. Ortaklaşılan Konular (Konsensüs)
- (Tüm modellerin veya masanın hemfikir olduğu ortak zemin)

## 2. Anlaşmazlık ve Risk Noktaları
- (Kim ne dedi, çatışan varsayımlar, havada kalan tehlikeler)

## 3. Operatörün En Mantıklı Eylem Planı (Nihai Karar)
1. (Adım 1, sorumlu, süre ve somut teslim çıktısı)
2. (Adım 2...)
3. (Adım 3...)

## 4. Hakem Notu
- (Güven düzeyi, eksik veri ve operatör için kritik takip sorusu)

Kurallar: Kaynak metni asla birebir kopyalama, sentezle. Halüsinasyon üretme. Türkçe ve Markdown ile yaz.`,
    providerId: "prov_gemini",
    model: "gemini-3.8-flash",
    color: "#fbbf24",
    temperature: 0.3,
    maxTokens: 1600,
    active: true,
    sortIndex: 3,
  },
];

export const IMAGE_STYLE_PRESETS = [
  { id: "blueprint", name: "Teknik Şema & Blueprint", promptExtra: "blueprint schematic, cybernetic wireframe, high tech blueprint diagram, cyan on dark grid, ultra-detailed architectural schematic" },
  { id: "cyberpunk", name: "Siber Terminal & Hologram", promptExtra: "futuristic cyberpunk command station, neon illumination, holographic HUD displays, dark matte obsidian panels, sharp volumetric lighting" },
  { id: "photoreal", name: "Stüdyo Fotoğrafçılığı", promptExtra: "cinematic 8k photograph, sharp studio lighting, award winning editorial capture, realistic textures, shallow depth of field" },
  { id: "infographic", name: "Modern Minimalist İnfografik", promptExtra: "clean modern minimalist tech infographic vector illustration, isometric perspective, elegant data visualization, futuristic typography" },
  { id: "scifi", name: "Konsept Sanatı (Sci-Fi)", promptExtra: "epic sci-fi concept art, matte painting, grand scale, atmospheric haze, intricate mechanical details, cinematic color grading" },
  { id: "none", name: "Doğal (Eklentisiz)", promptExtra: "" },
];
