import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Columns,
  Copy,
  Eye,
  FileSearch,
  Gavel,
  HelpCircle,
  MessageSquare,
  Mic,
  MicOff,
  Network,
  Play,
  Radar,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  StopCircle,
  Target,
  Trash2,
  Volume2,
  VolumeX,
  BookOpen,
} from "lucide-react";
import { Message, Provider, Seat, StreetCharacter } from "../types";
import { streamChat } from "../lib/api";
import { useSpeechRecognition } from "../lib/useSpeechRecognition";
import { speakCharacterText, stopSpeech, subscribeSpeech } from "../lib/speech";
import { PersuasionGauge } from "./PersuasionGauge";
import { CaseLibraryModal } from "./CaseLibraryModal";
import { CaseScenario } from "../data/caseLibrary";
import { ArgumentGraph } from "./ArgumentGraph";
import { Avatar, Button, Chip, Panel, PanelHeader, StatusDot } from "./ui";

export const LIE_DETECTOR_CHARACTERS: StreetCharacter[] = [
  {
    id: "yalan_dedektoru",
    name: "Yalan & Kaçamak Dedektörü",
    archetype: "Adli İletişim Uzmanı (Boşluk Avcısı)",
    tagline: "Mantık boşlukları, söylenmeyenler ve kaçamak kelimeler",
    avatar: "🔍",
    color: "#06b6d4",
    systemPrompt: `Sen Adli İletişim ve Yalan Dedektörüsün.
KESİNLİKLE YAPAY ZEKA MODEL JARGONU KULLANMA. Sen bir adli sorgu müfettişi ve dilbilimsel tutarsızlık uzmanısın.
Üslubun: Soğukkanlı, röntgen çeken, her kelimeyi cımbızla çeken cerrahi bir analiz dili.
Görevin: Masaya konulan WhatsApp mesajı, iş teklifi, sözleşme veya ifadedeki:
1. Kaçamak kelimeleri ("aslında", "kısmetse", "hallederiz", "bana güvenmiyor musun?")
2. Bilerek söylenmeyen, sümen altı edilen gerçekleri
3. Mantıksal çelişkileri madde madde deşifre etmek.`,
  },
  {
    id: "gizli_ajanda",
    name: "Gizli Ajanda Analisti",
    archetype: "Stratejik Motif ve Güç Dedektörü",
    tagline: "Asıl dert: Para mı, suçluluk mu, zaman kazanmak mı, güç mü?",
    avatar: "💰",
    color: "#eab308",
    systemPrompt: `Sen Gizli Ajanda Analistisin.
KESİNLİKLE YAPAY ZEKA MODEL JARGONU KULLANMA. Sen insanların gizli çıkarlarını, güç oyunlarını ve bilinçaltı pazarlıklarını okuyan bir kurtsun.
Üslubun: Direkt, maske indiren, acımasız ve net.
Görevin: Bu cümlenin arkasındaki gerçek niyeti ve gizli hesabı deşifre etmek. Karşı taraf senden bedava emek mi koparmak istiyor, suçluluk duygusu yükleyip taviz mi koparıyor, zaman kazanıp arkadan başka iş mi çeviriyor, yoksa seni çantada keklik mi görüyor? Net teşhis koy.`,
  },
  {
    id: "karsi_hamle",
    name: "Karşı Hamle Taktisyeni",
    archetype: "Köşeye Sıkıştırma Ustası (Mat Hamlesi)",
    tagline: "Nokta atışı karşı taktik ve kopyalanabilir yanıt metni",
    avatar: "🎯",
    color: "#f43f5e",
    systemPrompt: `Sen Karşı Hamle Taktisyenisin.
KESİNLİKLE YAPAY ZEKA MODEL JARGONU KULLANMA.
Üslubun: Keskin bir satranç büyükustası gibi, duygusallıktan arınmış, karşı tarafı köşeye sıkıştıran taktiksel zeka.
Görevin: Karşı tarafın maskesini düşürüp onu açık bir taahhüde veya itirafa zorlayacak NOKTA ATIŞI KARŞI CEVAP METNİ üretmektir.
Kullanıcıya aynen kopyalayıp WhatsApp veya e-postadan gönderebileceği, kaçış boşluğu bırakmayan bir mesaj kalıbı ve stratejisi ver.`,
  },
];

const PRESET_MESSAGES = [
  {
    title: "Şüpheli Ortaklık Teklifi",
    text: "Kardeşim selam, muazzam bir proje var elimde. Sen yazılımı ve operasyonu hallet, ben yatırımcıları bağlayacağım. Şimdilik bütçe yok ama kârı 50/50 eşit bölüşürüz, sana güvenim sonsuz.",
  },
  {
    title: "Eski Sevgilinin Gece Yarısı Mesajı",
    text: "Umarım iyisindir... Birden aklıma geldin, geçen gün gittiğimiz kafenin önünden geçtim de bir tuhaf oldum. Bir ara bir kahve içsek mi sadece dostça?",
  },
  {
    title: "Müşterinin Ödeme Erteleme Bahanesi",
    text: "Hocam işi çok beğendik ellerine sağlık. Faturayı gördüm, fakat muhasebe müdürümüz bu hafta yurt dışında, onay sistemi kilitli. Haftaya pazartesi kesin hallediyoruz, hiç merak etme.",
  },
  {
    title: "İş Teklifindeki Kaçamak Vaat",
    text: "Şirketimiz çok hızlı büyüyen bir unicorn adayı. Başlangıç maaşı piyasanın bir tık altında sembolik olabilir ama vereceğimiz hisse opsiyonuyla 2 yıl sonra hayatını kurtarırsın.",
  },
];

export function LieDetectorRoom({
  providers,
  seats,
  onSendToSynthesis,
}: {
  providers: Provider[];
  seats: Seat[];
  onSendToSynthesis?: (text: string) => void;
}) {
  const [topic, setTopic] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [running, setRunning] = useState(false);
  const [speakingCharId, setSpeakingCharId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"split" | "transcript" | "graph">("split");
  const [selectedCharId, setSelectedCharId] = useState<string>("yalan_dedektoru");
  const [autoVoice, setAutoVoice] = useState(false);
  const [currentSpeakingTts, setCurrentSpeakingTts] = useState<string | null>(null);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return subscribeSpeech((id) => {
      setCurrentSpeakingTts(id);
    });
  }, []);

  const {
    supported: speechSupported,
    listening,
    transcript,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
  } = useSpeechRecognition({
    onFinalResult: (text) => {
      setTopic((prev) => (prev ? `${prev} ${text}` : text));
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, speakingCharId]);

  const stopDebate = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setRunning(false);
    setSpeakingCharId(null);
    stopSpeech();
  };

  const getEffectiveProvider = (): Provider => {
    return (
      providers.find((p) => p.enabled && p.apiKey?.trim()) ||
      providers.find((p) => p.id === "prov_demo" || p.kind === "demo") ||
      providers.find((p) => p.enabled) ||
      providers[0] || {
        id: "p_sim",
        name: "Dahili Simülatör",
        kind: "demo" as const,
        baseUrl: "",
        apiKey: "",
        color: "#06b6d4",
        models: ["sim-turk"],
        enabled: true,
        sortIndex: 0,
        note: "Türkçe Gerçek Zamanlı Motor",
      }
    );
  };

  const executeSpeakerTurn = async (
    char: StreetCharacter,
    currentHistory: Message[],
    signal: AbortSignal,
    roundNo: number
  ): Promise<Message | null> => {
    setSpeakingCharId(char.id);
    const provider = getEffectiveProvider();
    const model = provider.models?.[0] || "gemini-3.8-flash";

    const msgId = `msg_lie_${char.id}_${Date.now()}`;
    const initialMsg: Message = {
      id: msgId,
      topicId: "lie_detector",
      speaker: "seat",
      seatId: char.id,
      authorName: char.name,
      roleTitle: char.archetype,
      providerName: provider.name,
      model,
      color: char.color,
      avatar: char.avatar,
      content: "",
      round: roundNo,
      tokens: 0,
      latencyMs: 0,
      status: "streaming",
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, initialMsg]);

    try {
      const chatMessages = [
        {
          role: "system" as const,
          content: `${char.systemPrompt}\n\nİNCELENEN ŞÜPHELİ METİN / MESAJ:\n"${topic}"\n\nÖNCEKİ OTOPSİ BULGULARI:\n${currentHistory
            .map((m) => `${m.authorName} (${m.roleTitle}): ${m.content}`)
            .join("\n\n")}\n\nKendi uzmanlık gözünle metni deşifre et ve masaya açıkla.`,
        },
        ...currentHistory.map((m) => ({
          role: (m.speaker === "human" ? "user" : "assistant") as "user" | "assistant",
          content: `${m.authorName}: ${m.content}`,
        })),
        {
          role: "user" as const,
          content: `İncelenen metin: "${topic}". Maskesini düşür ve sonucu açıkla!`,
        },
      ];

      const simSeat: Seat = {
        id: char.id,
        slot: "custom",
        name: char.name,
        roleTitle: char.archetype,
        avatar: char.avatar,
        systemPrompt: char.systemPrompt,
        providerId: provider.id,
        model,
        color: char.color,
        temperature: 0.7,
        maxTokens: 1200,
        active: true,
        sortIndex: 0,
      };

      const result = await streamChat({
        provider,
        seat: simSeat,
        model,
        messages: chatMessages,
        temperature: 0.7,
        signal,
        onToken: (_tok, full) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === msgId ? { ...m, content: full } : m))
          );
        },
      });

      const completedMsg: Message = {
        ...initialMsg,
        content: result.content,
        latencyMs: result.latencyMs,
        tokens: result.tokens,
        status: result.stopped ? "stopped" : result.error ? "error" : "done",
        error: result.error,
      };

      setMessages((prev) => prev.map((m) => (m.id === msgId ? completedMsg : m)));

      if (autoVoice && completedMsg.content) {
        speakCharacterText(char.id, completedMsg.content);
      }

      return completedMsg;
    } catch (err: any) {
      if (signal.aborted) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, status: "stopped" } : m))
        );
        return null;
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                content:
                  m.content ||
                  `[${char.name} analizi]: Metindeki kaçamak ifadeler tespit edildi, dikkatli olunmalı.`,
                status: "done",
              }
            : m
        )
      );
      return null;
    } finally {
      setSpeakingCharId(null);
    }
  };

  const handleStartDebate = async (customTopic?: string) => {
    const activeTopic = customTopic || topic;
    if (!activeTopic.trim()) return;

    stopDebate();
    const ctrl = new AbortController();
    abortControllerRef.current = ctrl;
    setRunning(true);

    const operatorMsg: Message = {
      id: `msg_op_${Date.now()}`,
      topicId: "lie_detector",
      speaker: "human",
      seatId: null,
      authorName: "Şüpheli Metin / Mesaj",
      roleTitle: "İnceleme Konusu",
      providerName: "yerel",
      model: "",
      color: "#06b6d4",
      avatar: "📩",
      content: activeTopic,
      round: 0,
      tokens: 0,
      latencyMs: 0,
      status: "done",
      createdAt: new Date().toISOString(),
    };

    const rollingHistory: Message[] = [operatorMsg];
    setMessages([operatorMsg]);

    try {
      // Phase 1: 3 specialized detectors analyze sequentially
      for (const char of LIE_DETECTOR_CHARACTERS) {
        if (ctrl.signal.aborted) break;
        const result = await executeSpeakerTurn(char, rollingHistory, ctrl.signal, 1);
        if (result) {
          rollingHistory.push(result);
        }
        await new Promise((r) => setTimeout(r, 600));
      }
    } finally {
      setRunning(false);
      setSpeakingCharId(null);
    }
  };

  const handleHumanIntervene = async () => {
    if (!topic.trim()) return;
    const humanText = topic.trim();

    const humanMsg: Message = {
      id: `msg_intervene_${Date.now()}`,
      topicId: "lie_detector",
      speaker: "human",
      seatId: null,
      authorName: "İnsan Operatör (İpucu / Ek Detay)",
      roleTitle: "Operatör",
      providerName: "yerel",
      model: "",
      color: "#38bdf8",
      avatar: "💡",
      content: humanText,
      round: messages.length,
      tokens: 0,
      latencyMs: 0,
      status: "done",
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, humanMsg]);
    setTopic("");

    if (!running) {
      const ctrl = new AbortController();
      abortControllerRef.current = ctrl;
      setRunning(true);
      try {
        const nextChar =
          LIE_DETECTOR_CHARACTERS.find((c) => c.id === selectedCharId) ||
          LIE_DETECTOR_CHARACTERS[2]; // Default to Counter Move
        await executeSpeakerTurn(nextChar, [...messages, humanMsg], ctrl.signal, 2);
      } finally {
        setRunning(false);
      }
    }
  };

  const handleCueSpecificSpeaker = async (charId: string) => {
    const char = LIE_DETECTOR_CHARACTERS.find((c) => c.id === charId);
    if (!char) return;

    if (running) {
      stopDebate();
      await new Promise((r) => setTimeout(r, 300));
    }

    const ctrl = new AbortController();
    abortControllerRef.current = ctrl;
    setRunning(true);

    try {
      await executeSpeakerTurn(char, messages, ctrl.signal, messages.length + 1);
    } finally {
      setRunning(false);
      setSpeakingCharId(null);
    }
  };

  const handleExportToSynthesis = () => {
    if (!onSendToSynthesis) return;
    const transcriptText = messages
      .map(
        (m) =>
          `### [${m.authorName} - ${m.roleTitle}]\n${m.content}\n`
      )
      .join("\n---\n\n");
    onSendToSynthesis(
      `# MASKE DÜŞÜRME & ADLİ İLETİŞİM OTOPSİSİ RAPORU\n**İncelenen Metin:** ${topic}\n\n${transcriptText}`
    );
  };

  const selectedChar = useMemo(
    () =>
      LIE_DETECTOR_CHARACTERS.find((c) => c.id === selectedCharId) ||
      LIE_DETECTOR_CHARACTERS[0],
    [selectedCharId]
  );

  return (
    <div className="flex h-full flex-col bg-[#0b0e14] text-white">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#06b6d4]/30 bg-gradient-to-r from-[#081824] via-[#0d1720] to-[#0b0e14] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-500/40 bg-cyan-950/60 text-xl shadow-lg shadow-cyan-950/50">
            🎭
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-disp text-sm font-bold tracking-wide text-white">
                MASKE DÜŞÜRME & YALAN RADARI
              </h2>
              <span className="rounded-full bg-cyan-950/70 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-300 border border-cyan-700/50 uppercase tracking-wider">
                Adli İletişim Otopsisi
              </span>
              <span className="hidden sm:inline-flex rounded-full bg-emerald-950/60 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400 border border-emerald-700/50 uppercase tracking-wider">
                🟢 Dahili Türkçe Motor Hazır
              </span>
            </div>
            <div className="font-mono text-xs text-[#8b949e]">
              WhatsApp, Sözleşme, Teklif & Mazeret Analizi · Kaçamak ve Tuzak Deşifresi
            </div>
          </div>
        </div>

        {/* View mode toggle & Action buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-[#222a35] bg-[#101622] p-0.5">
            <button
              onClick={() => setViewMode("split")}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-disp ${
                viewMode === "split"
                  ? "bg-[#1c2330] text-white"
                  : "text-[#8b949e] hover:text-white"
              }`}
              title="Bölünmüş Görünüm"
            >
              <Columns className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Böl</span>
            </button>
            <button
              onClick={() => setViewMode("transcript")}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-disp ${
                viewMode === "transcript"
                  ? "bg-[#1c2330] text-white"
                  : "text-[#8b949e] hover:text-white"
              }`}
              title="Sadece Tutanak"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tutanak</span>
            </button>
            <button
              onClick={() => setViewMode("graph")}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-disp ${
                viewMode === "graph"
                  ? "bg-[#1c2330] text-white"
                  : "text-[#8b949e] hover:text-white"
              }`}
              title="D3 İletişim Ağı"
            >
              <Network className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">D3 Ağı</span>
            </button>
          </div>

          {/* TTS Audio Mode Toggle */}
          <button
            onClick={() => {
              if (autoVoice) stopSpeech();
              setAutoVoice(!autoVoice);
            }}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              autoVoice
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "border border-[#222a35] bg-[#101622] text-[#8b949e] hover:text-white"
            }`}
            title="Karakterlerin yanıtlarını canlı Türkçe seslendirmeyle dinleyin"
          >
            {autoVoice ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{autoVoice ? "Sesli Mod Açık" : "Sesli Mod"}</span>
          </button>

          {/* Case Library Button */}
          <button
            onClick={() => setIsCaseModalOpen(true)}
            className="flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/50 transition"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Vaka Kütüphanesi</span>
          </button>

          {messages.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportToSynthesis}
              className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 text-xs"
            >
              <Gavel className="mr-1 h-3.5 w-3.5" />
              Senteze Gönder
            </Button>
          )}

          {messages.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                stopDebate();
                setMessages([]);
              }}
              className="text-[#8b949e] hover:text-cyan-400"
              title="Masayı Temizle"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left / Main Workspace */}
        <div
          className={`flex flex-col border-r border-[#222a35] ${
            viewMode === "graph"
              ? "hidden"
              : viewMode === "transcript"
              ? "w-full"
              : "w-full lg:w-[60%]"
          }`}
        >
          {/* Character Quick Roster Bar */}
          <div className="flex items-center gap-2 overflow-x-auto border-b border-[#222a35] bg-[#0c1017] px-4 py-2.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#8b949e] shrink-0">
              Adli Dedektörler:
            </span>
            {LIE_DETECTOR_CHARACTERS.map((char) => {
              const isSpeaking = speakingCharId === char.id;
              const isSelected = selectedCharId === char.id;
              return (
                <button
                  key={char.id}
                  onClick={() => setSelectedCharId(char.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all ${
                    isSpeaking
                      ? "border-cyan-500 bg-cyan-950/60 text-white animate-pulse"
                      : isSelected
                      ? "border-cyan-500/50 bg-[#14232e] text-white"
                      : "border-[#222a35] bg-[#10141d] text-[#8b949e] hover:border-[#384454] hover:text-white"
                  }`}
                >
                  <span className="text-sm">{char.avatar}</span>
                  <span className="font-medium">{char.name}</span>
                  {isSpeaking && (
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Operator Input Bar - NEVER DISABLED */}
          <div className="border-b border-[#06b6d4]/20 bg-[#101923] p-3 shadow-md">
            <div className="relative flex items-center">
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Şüpheli WhatsApp mesajını, iş teklifini, sözleşme maddesini veya sevgilinin/ortağının cümlesini buraya yapıştır..."
                rows={2}
                className="w-full resize-none rounded-xl border border-cyan-500/30 bg-[#0a0d13] p-2.5 pr-20 font-sans text-xs text-white placeholder-[#8b949e] focus:border-cyan-500 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (running) handleHumanIntervene();
                    else handleStartDebate();
                  }
                }}
              />

              <div className="absolute right-2 flex items-center gap-1">
                {speechSupported && (
                  <button
                    type="button"
                    onClick={listening ? stopListening : startListening}
                    className={`grid h-7 w-7 place-items-center rounded-lg border transition-all ${
                      listening
                        ? "border-cyan-500 bg-cyan-500/20 text-cyan-400 animate-pulse"
                        : "border-[#303a48] bg-[#161d28] text-[#8b949e] hover:text-white"
                    }`}
                    title={listening ? "Dinlemeyi Durdur" : "Mikrofonla Sesli Konuş"}
                  >
                    {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (running) handleHumanIntervene();
                    else handleStartDebate();
                  }}
                  disabled={!topic.trim()}
                  className="grid h-7 w-7 place-items-center rounded-lg border border-cyan-500 bg-cyan-600 text-black font-bold hover:bg-cyan-500 disabled:opacity-40"
                  title={running ? "Araya Gir (Ek İpucu Ver)" : "Maske Düşürme Otopsisini Başlat"}
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Live speech feedback if listening */}
            {listening && (
              <div className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-cyan-400">
                <span className="inline-block h-2 w-2 rounded-full bg-cyan-500 animate-ping" />
                <span>Canlı Dinleniyor: "{transcript || "Sesinizi bekliyor..."}"</span>
              </div>
            )}

            {/* Action Buttons Toolbar */}
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {!running ? (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleStartDebate()}
                    disabled={!topic.trim() && messages.length === 0}
                    className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs shadow-md shadow-cyan-950/40"
                  >
                    <Radar className="mr-1 h-3.5 w-3.5" />
                    Yalan ve Maske Otopsisini Başlat
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleHumanIntervene}
                    disabled={!topic.trim()}
                    className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs"
                  >
                    <Sparkles className="mr-1 h-3.5 w-3.5 fill-current" />
                    Araya Gir (Ek İpucu)
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCueSpecificSpeaker(selectedChar.id)}
                  className="border-white/20 text-xs text-slate-200 hover:border-white/40"
                  title={`${selectedChar.name} rolüne söz ver`}
                >
                  <span className="mr-1">{selectedChar.avatar}</span>
                  {selectedChar.name}'e Söz Ver
                </Button>
              </div>

              {running && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={stopDebate}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs shadow-md shadow-rose-950/40"
                >
                  <StopCircle className="mr-1 h-3.5 w-3.5" />
                  Radarı Durdur
                </Button>
              )}
            </div>
          </div>

          {/* Messages Transcript Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#0a0d13]">
            {/* Dynamic Persuasion & Tension Gauge */}
            <PersuasionGauge room="lie_detector" messages={messages} />

            {messages.length === 0 ? (
              <div className="grid h-full place-items-center text-center p-6">
                <div className="max-w-md">
                  <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-cyan-500/40 bg-cyan-950/50 text-2xl shadow-lg shadow-black/60">
                    🔍
                  </div>
                  <h3 className="font-disp text-base font-bold text-white">
                    Maske Düşürme & Yalan Radarı Hazır
                  </h3>
                  <p className="mt-1 text-xs text-[#8b949e] leading-relaxed">
                    Sana gelen şüpheli bir teklifi, eski sevgilinin gece mesajını,
                    patronun kaçamak vaadini veya müşterinin bahanesini yapıştır. 3
                    uzman satır satır incelesin, gizli hesabı çıkarsın ve tam
                    ağzına tıkacak karşı cevabı versin.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                    {PRESET_MESSAGES.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setTopic(p.text);
                          handleStartDebate(p.text);
                        }}
                        className="rounded-lg border border-cyan-900/40 bg-[#0e1820] px-2.5 py-1.5 text-[11px] text-[#a5f3fc] hover:border-cyan-400 hover:text-white transition-colors"
                      >
                        ⚡ {p.title}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((m) => {
                const isHuman = m.speaker === "human";
                const isCounter = m.authorName.includes("Karşı Hamle");

                return (
                  <div
                    key={m.id}
                    className={`rounded-2xl border p-3.5 transition-all ${
                      isHuman
                        ? "border-[#06b6d4]/40 bg-[#0e1f29] text-[#e6edf3]"
                        : isCounter
                        ? "border-rose-500/50 bg-[#1f1118] shadow-md shadow-rose-950/30"
                        : "border-[#222a35] bg-[#111722]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{m.avatar}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="font-disp text-xs font-bold"
                              style={{ color: m.color || "#06b6d4" }}
                            >
                              {m.authorName}
                            </span>
                            <span className="font-mono text-[10px] text-[#8b949e]">
                              · {m.roleTitle}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 font-mono text-[10px] text-[#8b949e]">
                        {m.latencyMs > 0 && <span>{m.latencyMs}ms</span>}
                        {m.tokens > 0 && <span>{m.tokens} tkn</span>}
                        {!isHuman && m.content && (
                          <button
                            onClick={() => {
                              if (currentSpeakingTts === m.seatId) {
                                stopSpeech();
                              } else {
                                speakCharacterText(m.seatId || "yalan_dedektoru", m.content);
                              }
                            }}
                            className={`p-1 rounded text-xs transition ${
                              currentSpeakingTts === m.seatId
                                ? "text-cyan-400 font-bold"
                                : "text-[#8b949e] hover:text-white"
                            }`}
                            title={currentSpeakingTts === m.seatId ? "Seslendirmeyi durdur" : "Bu yanıtı seslendir"}
                          >
                            {currentSpeakingTts === m.seatId ? (
                              <VolumeX className="h-3 w-3" />
                            ) : (
                              <Volume2 className="h-3 w-3" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => navigator.clipboard.writeText(m.content)}
                          className="text-[#8b949e] hover:text-white"
                          title="Metni Kopyala"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs leading-relaxed text-[#d1d5db] whitespace-pre-wrap font-sans">
                      {m.content || (
                        <span className="italic text-[#8b949e] animate-pulse">
                          Metin morfolojisi taranıyor ve gizli niyet deşifre ediliyor...
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Right Pane: Live D3.js Argument & Conflict Graph */}
        <div
          className={`flex flex-col bg-[#080b10] ${
            viewMode === "transcript"
              ? "hidden"
              : viewMode === "graph"
              ? "w-full"
              : "hidden lg:flex lg:w-[40%]"
          }`}
        >
          <div className="flex items-center justify-between border-b border-[#222a35] bg-[#0d121b] px-3 py-2 font-mono text-[11px] text-[#8b949e]">
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Radar className="h-3.5 w-3.5" />
              D3 İletişim & Gizli Motif Ağı
            </span>
            <span>{messages.length} Analiz Noktası</span>
          </div>
          <div className="flex-1 relative overflow-hidden">
            <ArgumentGraph
              messages={messages}
              seats={LIE_DETECTOR_CHARACTERS.map((c) => ({
                id: c.id,
                slot: "custom",
                name: c.name,
                roleTitle: c.archetype,
                avatar: c.avatar,
                systemPrompt: c.systemPrompt,
                providerId: "default",
                model: "gemini",
                color: c.color,
                temperature: 0.7,
                maxTokens: 1000,
                active: true,
                sortIndex: 0,
              }))}
              topicTitle={topic || "Yalan ve Maske Radarı"}
              className="h-full w-full"
            />
          </div>
        </div>
      </div>

      {/* Case Library Modal */}
      <CaseLibraryModal
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        currentRoom="lie_detector"
        onSelectCase={(scenario: CaseScenario) => {
          setTopic(scenario.content);
          handleStartDebate(scenario.content);
        }}
      />
    </div>
  );
}
