// TTS (Text-to-Speech) Audio & Dubbing Engine for KONSÜL AI

export interface VoiceProfile {
  pitch: number; // 0.1 to 2 (default 1)
  rate: number;  // 0.1 to 10 (default 1)
  preferredGender?: "female" | "male";
}

// Character-specific acoustic signatures
const CHARACTER_VOICE_MAP: Record<string, VoiceProfile> = {
  // Sokak Meclisi
  psikolog: { pitch: 1.15, rate: 0.98, preferredGender: "female" }, // Dr. Aylin - Sakin, analitik, orta-tiz
  hayat_kadini: { pitch: 1.1, rate: 1.05, preferredGender: "female" }, // Alev - Duygulu, sokak temposu
  girisimci: { pitch: 0.95, rate: 1.15, preferredGender: "male" },   // Kaan Bey - Hızlı, pragmatik, iş dünyası
  sanatci: { pitch: 1.05, rate: 0.92, preferredGender: "male" },     // Cem - Melankolik, şiirsel, yavaş
  evsiz: { pitch: 0.8, rate: 0.85, preferredGender: "male" },        // Seyfi Dayı - Derin, pürüzlü, bilge
  hakim: { pitch: 0.78, rate: 0.88, preferredGender: "male" },       // Mehmet Bey - Otoriter, yavaş, tok
  taksici: { pitch: 0.92, rate: 1.12, preferredGender: "male" },     // Rıza Usta - Esnaf enerjisi, canlı

  // Şeytanın Avukatı
  acimasiz_rakip: { pitch: 1.02, rate: 1.18, preferredGender: "male" }, // Hızlı, acımasız, meydan okuyan
  siyah_kugu: { pitch: 0.82, rate: 0.94, preferredGender: "male" },      // Soğukkanlı, felaket tınısı
  karanlik_manipulator: { pitch: 0.88, rate: 0.98, preferredGender: "male" }, // Fısıltılı, iç tehdit
  nihai_kalkan: { pitch: 0.85, rate: 0.95, preferredGender: "male" },    // Başhakem / Zırh

  // Yalan Radarı
  yalan_dedektoru: { pitch: 1.08, rate: 1.06, preferredGender: "female" }, // Dikkatli, keskin
  gizli_ajanda: { pitch: 0.9, rate: 1.02, preferredGender: "male" },
  karsi_hamle: { pitch: 1.0, rate: 1.1, preferredGender: "male" },

  // Zamanın Ötesindekiler
  machiavelli: { pitch: 0.9, rate: 1.04, preferredGender: "male" }, // Hesaplanmış, soğuk
  tesla: { pitch: 1.12, rate: 1.1, preferredGender: "male" },       // Heyecanlı, vizyoner
  marcus_aurelius: { pitch: 0.78, rate: 0.84, preferredGender: "male" }, // Stoacı, dingin, ağır
  mevlana: { pitch: 0.88, rate: 0.82, preferredGender: "male" },     // Derin huşu, mistik, yavaş
  sentetik_2150: { pitch: 0.65, rate: 0.96, preferredGender: "male" }, // Monoton, sibernetik, bas

  // Ağır Ceza Mahkemesi
  court_hakim: { pitch: 0.75, rate: 0.86, preferredGender: "male" },  // Mahkeme Başkanı tok ve vakur
  court_savci: { pitch: 0.98, rate: 1.12, preferredGender: "male" },  // İddia makamı sert ve iddialı
  court_avukat: { pitch: 1.05, rate: 1.02, preferredGender: "female" }, // Savunma hararetli ve ikna edici
  court_bilirkisi: { pitch: 0.9, rate: 0.95, preferredGender: "male" }, // Bilirkişi teknik ve nesnel
};

function cleanTextForSpeech(text: string): string {
  if (!text) return "";
  return text
    // Markdown headers, bold, italics, links, codes
    .replace(/#+\s+/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Emoji removal
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
    // Bullets and dashes at line start
    .replace(/^\s*[-*•]\s+/gm, "")
    // Excess spaces
    .replace(/\s+/g, " ")
    .trim();
}

let cachedVoices: SpeechSynthesisVoice[] = [];

function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  if (cachedVoices.length > 0) return cachedVoices;
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    cachedVoices = voices;
  }
  return voices || [];
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

function findBestVoice(profile: VoiceProfile): SpeechSynthesisVoice | null {
  const voices = getAvailableVoices();
  if (!voices || voices.length === 0) return null;

  // 1. Look for Turkish voices
  const trVoices = voices.filter(
    (v) =>
      v.lang.toLowerCase().startsWith("tr") ||
      v.name.toLowerCase().includes("turk") ||
      v.name.toLowerCase().includes("türk")
  );

  if (trVoices.length > 0) {
    if (profile.preferredGender === "female") {
      const female = trVoices.find(
        (v) =>
          v.name.toLowerCase().includes("female") ||
          v.name.toLowerCase().includes("yelda") ||
          v.name.toLowerCase().includes("filiz") ||
          v.name.toLowerCase().includes("zira") ||
          v.name.toLowerCase().includes("kadın")
      );
      if (female) return female;
    } else if (profile.preferredGender === "male") {
      const male = trVoices.find(
        (v) =>
          v.name.toLowerCase().includes("male") ||
          v.name.toLowerCase().includes("cem") ||
          v.name.toLowerCase().includes("ahmet") ||
          v.name.toLowerCase().includes("erkek")
      );
      if (male) return male;
    }
    return trVoices[0];
  }

  // Fallback to default or first available voice
  return voices.find((v) => v.default) || voices[0] || null;
}

type SpeechListener = (speakingId: string | null) => void;
const listeners = new Set<SpeechListener>();
let currentSpeakingId: string | null = null;

function notifyListeners(id: string | null) {
  currentSpeakingId = id;
  for (const fn of listeners) {
    try {
      fn(id);
    } catch {}
  }
}

export function subscribeSpeech(listener: SpeechListener): () => void {
  listeners.add(listener);
  listener(currentSpeakingId);
  return () => {
    listeners.delete(listener);
  };
}

export function getCurrentSpeakingId(): string | null {
  return currentSpeakingId;
}

export function stopSpeech() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {}
  notifyListeners(null);
}

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export function speakCharacterText(
  speakerId: string,
  text: string,
  options?: {
    onStart?: () => void;
    onEnd?: () => void;
  }
) {
  if (!isSpeechSupported()) return;

  // Stop any active speech first
  stopSpeech();

  const clean = cleanTextForSpeech(text);
  if (!clean) return;

  const profileKey = Object.keys(CHARACTER_VOICE_MAP).find((k) =>
    speakerId.toLowerCase().includes(k)
  );
  const profile: VoiceProfile = profileKey
    ? CHARACTER_VOICE_MAP[profileKey]
    : { pitch: 1.0, rate: 1.0 };

  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = "tr-TR";
  utterance.pitch = profile.pitch;
  utterance.rate = profile.rate;

  const bestVoice = findBestVoice(profile);
  if (bestVoice) {
    utterance.voice = bestVoice;
  }

  utterance.onstart = () => {
    notifyListeners(speakerId);
    options?.onStart?.();
  };

  utterance.onend = () => {
    notifyListeners(null);
    options?.onEnd?.();
  };

  utterance.onerror = (e) => {
    console.warn("Speech synthesis notice:", e);
    notifyListeners(null);
    options?.onEnd?.();
  };

  try {
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("Speech speak error:", err);
    notifyListeners(null);
  }
}
