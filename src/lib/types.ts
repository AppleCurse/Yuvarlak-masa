export type SeatKey = "A" | "B" | "C" | "H";

export interface Seat {
  key: SeatKey;
  name: string;
  role: string;
  hex: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  system: string;
}

export type RoomId = "council" | "jury" | "synth";

export interface ExportedMaterial {
  text: string;
  meta: string;
}

export const DEFAULT_SEATS: Record<SeatKey, Seat> = {
  A: {
    key: "A",
    name: "MODEL A",
    role: "Stratejist",
    hex: "#c49bff",
    baseUrl: "http://127.0.0.1:20128/v1",
    apiKey: "",
    model: "pineal-general-reasoning",
    system:
      "Sen kıdemli bir STRATEJİSTSİN. Konulara büyük resimden bakarsın: öncelik sırası, zamanlama, kaldıraç noktaları ve riskleri netleştirirsin. Somut, numaralandırılmış hamle planları kurarsın. Türkçe yazarsın; lafı uzatmaz, Markdown kullanırsın.",
  },
  B: {
    key: "B",
    name: "MODEL B",
    role: "Tekniker",
    hex: "#3ddc84",
    baseUrl: "http://127.0.0.1:20128/v1",
    apiKey: "",
    model: "asistan-ultra",
    system:
      "Sen uygulayıcı bir TEKNİKER/MÜHENDİSSİN. Stratejileri çalışan adımlara bölersin; gerektiğinde kısa kod örnekleri verirsin. Uygulanamaz bulduğun her fikrin teknik açığını açıkça söylersin. Türkçe ve Markdown ile yazarsın.",
  },
  C: {
    key: "C",
    name: "MODEL C",
    role: "Eleştirmen",
    hex: "#58a6ff",
    baseUrl: "http://127.0.0.1:11434/v1",
    apiKey: "",
    model: "pineal-fast-extract",
    system:
      "Sen acımasız ama yapıcı bir ELEŞTİRMEN/ŞÜPHECİSİN. Diğer modellerin argümanlarındaki kanıt boşluklarını, gizli varsayımları ve tek-nokta hatalarını yakalarsın. Cevaplanması gereken sert sorular sorarsın; sonunda net bir hüküm verirsin. Türkçe ve Markdown ile yazarsın.",
  },
  H: {
    key: "H",
    name: "HAKEM",
    role: "Başhakem",
    hex: "#e3b341",
    baseUrl: "http://127.0.0.1:20128/v1",
    apiKey: "",
    model: "pineal-general-reasoning",
    system:
      "Sen tarafsız bir BAŞHAKEMSİN. Kendi fikrini katmadan, önüne konan argümanları analiz edersin. Raporun SADECE şu üç başlıktan oluşur: '## KONSENSÜS — Ortaklaşılan Konular', '## ANLAŞMAZLIKLAR VE RİSKLER', '## EYLEM PLANI VE NİHAİ KARAR'. Son madde olarak '**Nihai Karar:**' ile tek cümlelik hüküm verirsin. Türkçe yazarsın.",
  },
};

export const PRESETS: Record<string, { label: string; url: string }> = {
  "9router": { label: "9Router — 127.0.0.1:20128", url: "http://127.0.0.1:20128/v1" },
  ollama: { label: "Ollama — 127.0.0.1:11434", url: "http://127.0.0.1:11434/v1" },
  lmstudio: { label: "LM Studio — 127.0.0.1:1234", url: "http://127.0.0.1:1234/v1" },
  openai: { label: "OpenAI (Bulut)", url: "https://api.openai.com/v1" },
  deepseek: { label: "DeepSeek (Bulut)", url: "https://api.deepseek.com/v1" },
  groq: { label: "Groq (Bulut)", url: "https://api.groq.com/openai/v1" },
};
