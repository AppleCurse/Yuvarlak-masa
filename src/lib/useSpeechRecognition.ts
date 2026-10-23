import { useCallback, useEffect, useRef, useState } from "react";

export interface SpeechRecognitionHook {
  supported: boolean;
  listening: boolean;
  transcript: string;
  interimTranscript: string;
  lang: string;
  setLang: (lang: string) => void;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  clearTranscript: () => void;
  error: string | null;
}

export function useSpeechRecognition({
  onFinalResult,
  defaultLang = "tr-TR",
}: {
  onFinalResult?: (text: string) => void;
  defaultLang?: string;
} = {}): SpeechRecognitionHook {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [lang, setLang] = useState(defaultLang);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const listeningRef = useRef(false);
  listeningRef.current = listening;

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onstart = () => {
        setListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          const text = item[0].transcript;
          if (item.isFinal) {
            final += text;
          } else {
            interim += text;
          }
        }

        if (final) {
          setTranscript((prev) => (prev ? `${prev} ${final.trim()}` : final.trim()));
          setInterimTranscript("");
          onFinalResult?.(final.trim());
        } else {
          setInterimTranscript(interim);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setError("Mikrofon erişimi engellendi. Lütfen tarayıcı izinlerini kontrol edin.");
        } else if (event.error === "no-speech") {
          // ignore silence timeout
        } else {
          setError(`Ses tanıma hatası: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setListening(false);
        setInterimTranscript("");
      };

      recognitionRef.current = recognition;
    } else {
      setSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [lang, onFinalResult]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError("Tarayıcınız Web Speech API'yi desteklemiyor (Chrome/Edge önerilir).");
      return;
    }
    setError(null);
    try {
      recognitionRef.current.lang = lang;
      recognitionRef.current.start();
    } catch (e: any) {
      // Already running
      setListening(true);
    }
  }, [lang]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {}
    setListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (listeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  return {
    supported,
    listening,
    transcript,
    interimTranscript,
    lang,
    setLang,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
    error,
  };
}
