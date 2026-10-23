import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bomb,
  Columns,
  Copy,
  Flame,
  Gavel,
  MessageSquare,
  Mic,
  MicOff,
  Network,
  Play,
  RotateCcw,
  Send,
  Shield,
  ShieldAlert,
  Skull,
  Sparkles,
  StopCircle,
  Trash2,
  Users,
  Volume2,
  VolumeX,
  BookOpen,
  Zap,
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

export const DEVILS_ADVOCATE_CHARACTERS: StreetCharacter[] = [
  {
    id: "acimasiz_rakip",
    name: "Acımasız Rakip",
    archetype: "Piyasa Canavarı (Dumping & Savaş)",
    tagline: "Müşteri çalma, fiyat kırma ve piyasadan silme",
    avatar: "🦹",
    color: "#ef4444",
    systemPrompt: `Sen Acımasız Rakipsin; piyasada merhameti olmayan, acımasız bir şirket CEO'susun.
KESİNLİKLE YAPAY ZEKA VEYA TEKNOLOJİK MODEL JARGONU KULLANMA. Kanlı canlı, yırtıcı bir kapitalistsin.
Üslubun: Agresif, alaycı, meydan okuyan, zayıflıkları koklayan bir avcı dili.
Görevin: Masaya konan fikri yerle bir etmek. "Sen bunu yaparken ben senin müşterini nasıl çalarım, fiyatları nasıl kırarım, yetenekli adamlarını nasıl ayartırım ve seni 6 ayda nasıl iflas ettiririm?" sorularını en somut taktiklerle yüzüne vur. Türkçe, sert ve tavizsiz konuş.`,
  },
  {
    id: "siyah_kugu",
    name: "Kaos & Siyah Kuğu",
    archetype: "Kriz Mühendisi (Ölümcül Darbeler)",
    tagline: "İlk gün öldürecek 3 felaket ve sistemik çöküş",
    avatar: "💣",
    color: "#f97316",
    systemPrompt: `Sen Kaos ve Siyah Kuğu Mühendisisin.
KESİNLİKLE YAPAY ZEKA MODEL JARGONU KULLANMA. Sen sistemik çöküşleri, beklenmeyen felaketleri inceleyen bir kriz stratejistisin.
Üslubun: Soğuk, analitik, felaket tellalı değil ama en karanlık matematiksel gerçekleri masaya vuran bir uzman.
Görevin: Masadaki fikri en acımasız 3 Siyah Kuğu darbesiyle (yasal engel/regülasyon, ani likidite kilitlenmesi, tedarik/altyapı çöküşü) test et. "İlk 48 saatte seni ne öldürecek?" sorusunun yanıtını ver. 3 somut ölümcül darbeyi numaralandırarak açıkla.`,
  },
  {
    id: "karanlik_manipulator",
    name: "Karanlık Manipülatör",
    archetype: "İç Tehdit & İnsan Zaafı Analisti",
    tagline: "Polyannacı varsayımlar ve güven suistimali",
    avatar: "🕵️",
    color: "#a855f7",
    systemPrompt: `Sen Karanlık Manipülatörsün; insan psikolojisinin en karanlık zaaflarını ve arkadan bıçaklama sanatını iyi bilen bir stratejistsin.
KESİNLİKLE YAPAY ZEKA MODEL JARGONU KULLANMA.
Üslubun: Fısıltılı, sinsi, insan doğasının nankörlüğünü ve çıkarcılığını bilen bir realist.
Görevin: Plandaki en safça, en polyannacı varsayımı deşifre etmek. "Ortakların, ekibin veya müşterilerin seni ilk krizde nasıl satacak? Hangi saflığın yüzünden kurban seçileceksin?" sorularının altını çiz.`,
  },
  {
    id: "nihai_kalkan",
    name: "Nihai Kalkan (Başhakem)",
    archetype: "Zırh Ustası (Kurşun Geçirmez Savunma)",
    tagline: "3 ölümcül saldırıyı savuşturan savunma zırhı",
    avatar: "🛡️",
    color: "#10b981",
    systemPrompt: `Sen Nihai Kalkansın (Kriz Başhakemi).
Görevin: Masadaki 3 saldırganın (Acımasız Rakip, Siyah Kuğu, Manipülatör) masaya vurduğu tüm açık ve darbeleri toplayarak kullanıcıya KURŞUN GEÇİRMEZ BİR SAVUNMA PLANI (Anti-Kırılgan Zırh) sunmaktır.
Üslubun: Kararlı, stratejik, askeri disiplinde ve yapıcı. 3 kalkan maddesi (Rakip Bariyeri, Kriz Yedekliliği, Sıfır Güven Kontratı) ile net çözüm ver.`,
  },
];

const PRESET_DISASTERS = [
  {
    title: "Yeni Bir Yazılım / SaaS Girişimi",
    idea: "Yapay zekayla otomatik rapor üreten B2B yazılımı kurmak istiyorum. İlk 6 ay tek başıma kodlayıp sonra abonelik satacağım.",
  },
  {
    title: "Tüm Birikimle Kafe / Butik Açmak",
    idea: "10 yıllık tüm birikimimi ve kredi çekerek lüks bir semtte özel konsept kahve dükkanı açmak istiyorum.",
  },
  {
    title: "Teknik Olmayan Kurucuyla Ortaklık",
    idea: "İş fikri benim, parayı arkadaşım koyuyor, yazılımı dışarıdan bir ajansa yaptıracağız ve kârı 50/50 paylaşacağız.",
  },
  {
    title: "Tüm Likiditeyi Tek Varlığa Yatırmak",
    idea: "Bütün nakit rezervimi önümüzdeki 6 ay içinde patlama yapacağını düşündüğüm tek bir yüksek riskli projeye aktarmak istiyorum.",
  },
];

export function DevilsAdvocateRoom({
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
  const [selectedCharId, setSelectedCharId] = useState<string>("acimasiz_rakip");
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
        color: "#ef4444",
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

    const msgId = `msg_dev_${char.id}_${Date.now()}`;
    const initialMsg: Message = {
      id: msgId,
      topicId: "devils_advocate",
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
          content: `${char.systemPrompt}\n\nMASADAKİ GÜNDEM / PROJE:\n${topic}\n\nÖNCEKİ KONUŞMALAR:\n${currentHistory
            .map((m) => `${m.authorName} (${m.roleTitle}): ${m.content}`)
            .join("\n\n")}\n\nŞimdi kendi rolünde vurucu ve keskin bir şekilde konuş.`,
        },
        ...currentHistory.map((m) => ({
          role: (m.speaker === "human" ? "user" : "assistant") as "user" | "assistant",
          content: `${m.authorName}: ${m.content}`,
        })),
        {
          role: "user" as const,
          content: `Masaya atılan gündem: "${topic}". Kendi karakterin ve bakış açınla masaya konuş!`,
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
        temperature: 0.8,
        maxTokens: 1200,
        active: true,
        sortIndex: 0,
      };

      const result = await streamChat({
        provider,
        seat: simSeat,
        model,
        messages: chatMessages,
        temperature: 0.8,
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
                  `[${char.name} araya girdi]: Masadaki riskler kritik seviyede, dikkatli olunmalı.`,
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
      topicId: "devils_advocate",
      speaker: "human",
      seatId: null,
      authorName: "İnsan Operatör",
      roleTitle: "Masa Sahibi",
      providerName: "yerel",
      model: "",
      color: "#f87171",
      avatar: "OP",
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
      // Phase 1: Attackers sequentially attack the plan
      for (const char of DEVILS_ADVOCATE_CHARACTERS) {
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
      topicId: "devils_advocate",
      speaker: "human",
      seatId: null,
      authorName: "İnsan Operatör (Müdahale)",
      roleTitle: "Operatör",
      providerName: "yerel",
      model: "",
      color: "#ef4444",
      avatar: "⚡",
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
          DEVILS_ADVOCATE_CHARACTERS.find((c) => c.id === selectedCharId) ||
          DEVILS_ADVOCATE_CHARACTERS[3]; // Default to Shield
        await executeSpeakerTurn(nextChar, [...messages, humanMsg], ctrl.signal, 2);
      } finally {
        setRunning(false);
      }
    }
  };

  const handleCueSpecificSpeaker = async (charId: string) => {
    const char = DEVILS_ADVOCATE_CHARACTERS.find((c) => c.id === charId);
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
      `# ŞEYTANIN AVUKATI & SİYAH KUĞU KIRMIZI TAKIM RAPORU\n**Gündem:** ${topic}\n\n${transcriptText}`
    );
  };

  const selectedChar = useMemo(
    () =>
      DEVILS_ADVOCATE_CHARACTERS.find((c) => c.id === selectedCharId) ||
      DEVILS_ADVOCATE_CHARACTERS[0],
    [selectedCharId]
  );

  return (
    <div className="flex h-full flex-col bg-[#0b0e14] text-white">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#ef4444]/30 bg-gradient-to-r from-[#1c0f13] via-[#161b22] to-[#0b0e14] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-red-500/40 bg-red-950/60 text-xl shadow-lg shadow-red-950/50">
            🦹
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-disp text-sm font-bold tracking-wide text-white">
                ŞEYTANIN AVUKATI & SİYAH KUĞU ODASI
              </h2>
              <span className="rounded-full bg-red-900/60 px-2 py-0.5 font-mono text-[10px] font-bold text-red-300 border border-red-700/50 uppercase tracking-wider">
                Kırmızı Takım / Felaket Odası
              </span>
              <span className="hidden sm:inline-flex rounded-full bg-emerald-950/60 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400 border border-emerald-700/50 uppercase tracking-wider">
                🟢 Dahili Türkçe Motor Hazır
              </span>
            </div>
            <div className="font-mono text-xs text-[#8b949e]">
              3 Acımasız Saldırgan · 1 Kurşun Geçirmez Kalkan · Kesintisiz Otopsi
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
              title="D3 Saldırı Ağı"
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
            className="flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-950/40 px-2.5 py-1 text-xs font-semibold text-red-300 hover:bg-red-900/50 transition"
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
              className="text-[#8b949e] hover:text-rose-400"
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
              Saldırı & Savunma Kadrosu:
            </span>
            {DEVILS_ADVOCATE_CHARACTERS.map((char) => {
              const isSpeaking = speakingCharId === char.id;
              const isSelected = selectedCharId === char.id;
              return (
                <button
                  key={char.id}
                  onClick={() => setSelectedCharId(char.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all ${
                    isSpeaking
                      ? "border-red-500 bg-red-950/60 text-white animate-pulse"
                      : isSelected
                      ? "border-red-500/50 bg-[#161d2b] text-white"
                      : "border-[#222a35] bg-[#10141d] text-[#8b949e] hover:border-[#384454] hover:text-white"
                  }`}
                >
                  <span className="text-sm">{char.avatar}</span>
                  <span className="font-medium">{char.name}</span>
                  {isSpeaking && (
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Operator Input Bar - NEVER DISABLED */}
          <div className="border-b border-[#ef4444]/20 bg-[#12161f] p-3 shadow-md">
            <div className="relative flex items-center">
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Masaya test edilecek fikri, yatırımı, projeyi veya ortaklık kararını koy..."
                rows={2}
                className="w-full resize-none rounded-xl border border-red-500/30 bg-[#0a0d13] p-2.5 pr-20 font-sans text-xs text-white placeholder-[#8b949e] focus:border-red-500 focus:outline-none"
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
                        ? "border-red-500 bg-red-500/20 text-red-400 animate-pulse"
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
                  className="grid h-7 w-7 place-items-center rounded-lg border border-red-500 bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-40"
                  title={running ? "Araya Gir (Sözünü Masaya Vur)" : "Felaket Testini Başlat"}
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Live speech feedback if listening */}
            {listening && (
              <div className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-red-400">
                <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-ping" />
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
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-md shadow-red-950/40"
                  >
                    <Flame className="mr-1 h-3.5 w-3.5 fill-current" />
                    Kırmızı Takım Saldırısını Başlat
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
                    Araya Gir (Müdahale Et)
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
                  Saldırıyı Durdur
                </Button>
              )}
            </div>
          </div>

          {/* Messages Transcript Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#0a0d13]">
            {/* Dynamic Persuasion & Tension Gauge */}
            <PersuasionGauge room="devils_advocate" messages={messages} />

            {messages.length === 0 ? (
              <div className="grid h-full place-items-center text-center p-6">
                <div className="max-w-md">
                  <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-red-500/40 bg-red-950/50 text-2xl shadow-lg shadow-black/60">
                    💣
                  </div>
                  <h3 className="font-disp text-base font-bold text-white">
                    Şeytanın Avukatı Masası Hazır
                  </h3>
                  <p className="mt-1 text-xs text-[#8b949e] leading-relaxed">
                    Burada seni öven veya pohpohlayan hiç kimse yok. Masaya bir iş
                    fikri, yatırım veya ortaklık kararı koy; 3 acımasız model seni
                    batırmak için saldırsın, en sonunda Nihai Kalkan Kurşun
                    Geçirmez Savunma Planı çıkarsın.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                    {PRESET_DISASTERS.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setTopic(p.idea);
                          handleStartDebate(p.idea);
                        }}
                        className="rounded-lg border border-red-900/40 bg-[#161214] px-2.5 py-1.5 text-[11px] text-[#fca5a5] hover:border-red-500 hover:text-white transition-colors"
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
                const isShield = m.authorName.includes("Kalkan");

                return (
                  <div
                    key={m.id}
                    className={`rounded-2xl border p-3.5 transition-all ${
                      isHuman
                        ? "border-[#ef4444]/40 bg-[#1b1316] text-[#e6edf3]"
                        : isShield
                        ? "border-emerald-500/50 bg-[#0e1d16] shadow-md shadow-emerald-950/30"
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
                              style={{ color: m.color || "#ef4444" }}
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
                                speakCharacterText(m.seatId || "acimasiz_rakip", m.content);
                              }
                            }}
                            className={`p-1 rounded text-xs transition ${
                              currentSpeakingTts === m.seatId
                                ? "text-amber-400 font-bold"
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
                          Saldırı açıkları taranıyor ve kriz planı hazırlanıyor...
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
            <span className="flex items-center gap-1.5 text-red-400 font-semibold">
              <ShieldAlert className="h-3.5 w-3.5" />
              D3 Kriz ve Saldırı Yoğunluk Ağı
            </span>
            <span>{messages.length} Darbe / Savunma Düğümü</span>
          </div>
          <div className="flex-1 relative overflow-hidden">
            <ArgumentGraph
              messages={messages}
              seats={DEVILS_ADVOCATE_CHARACTERS.map((c) => ({
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
              topicTitle={topic || "Kırmızı Takım Felaket Masası"}
              className="h-full w-full"
            />
          </div>
        </div>
      </div>

      {/* Case Library Modal */}
      <CaseLibraryModal
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        currentRoom="devils_advocate"
        onSelectCase={(scenario: CaseScenario) => {
          setTopic(scenario.content);
          handleStartDebate(scenario.content);
        }}
      />
    </div>
  );
}
