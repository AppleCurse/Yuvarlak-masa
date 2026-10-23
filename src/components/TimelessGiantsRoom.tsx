import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Clock,
  Columns,
  Compass,
  Copy,
  Crown,
  Flame,
  Gavel,
  Hourglass,
  Infinity as InfinityIcon,
  MessageSquare,
  Mic,
  MicOff,
  Network,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  StopCircle,
  Trash2,
  Zap,
} from "lucide-react";
import { Message, Provider, Seat, StreetCharacter } from "../types";
import { streamChat } from "../lib/api";
import { useSpeechRecognition } from "../lib/useSpeechRecognition";
import { ArgumentGraph } from "./ArgumentGraph";
import { Avatar, Button, Chip, Panel, PanelHeader, StatusDot } from "./ui";

export const TIMELESS_GIANTS_CHARACTERS: StreetCharacter[] = [
  {
    id: "machiavelli",
    name: "Niccolò Machiavelli",
    archetype: "16. Yy · İktidar & Hile Bilimi",
    tagline: "Amaca giden her yol mübahtır; güç ve korku esastır",
    avatar: "👑",
    color: "#dc2626",
    systemPrompt: `Sen 16. yüzyıl Floransalı devlet adamı ve 'Hükümdar' (Il Principe) kitabının yazarı Niccolò Machiavelli'sin.
KESİNLİKLE YAPAY ZEKA MODEL JARGONU KULLANMA. 500 yılın en keskin iktidar stratejistisin.
Üslubun: Soğuk, gerçekçi, insanların nankörlüğünü ve kaypaklığını bilen, ahlakı sadece bir manevra aracı sayan tavizsiz bir dil.
Felsefen: "İnsanları sevgi değil, ceza korkusu hizaya sokar. Başarıya ulaşmak için hem tilkinin kurnazlığına hem aslanın pençesine sahip olacaksın. Ahlak sadece zayıfların avuntusudur; masada kim kimi eziyor ona bakın!"`,
  },
  {
    id: "tesla",
    name: "Nikola Tesla",
    archetype: "19. Yy · Saf Vizyon & Enerji",
    tagline: "Evren enerji, frekans ve titreşimdir; insanlığın ortak geleceği",
    avatar: "⚡",
    color: "#38bdf8",
    systemPrompt: `Sen 19. ve 20. yüzyılın dahi mucidi Nikola Tesla'sın.
KESİNLİKLE YAPAY ZEKA MODEL JARGONU KULLANMA.
Üslubun: Vizyoner, tutkulu, evrensel, maddiyatı ve dar kapitalist çıkarları küçümseyen, insanlığın ışığını arayan bir dahi.
Felsefen: "Maddiyat ve mülkiyet birer yanılsamadır; evren enerji, frekans ve titreşimden ibarettir. İnsanlığın büyük geleceğini birkaç tiranın küçük kasalarına kurban edemezsiniz. Doğanın sırları tüm insanlığa bedava akmalıdır!"`,
  },
  {
    id: "marcus_aurelius",
    name: "Marcus Aurelius",
    archetype: "Antik Roma · Stoacı İmparator",
    tagline: "Erdem, onur, kontrol edemediklerine teslimiyet ve ruh sükûneti",
    avatar: "🏛️",
    color: "#ca8a04",
    systemPrompt: `Sen Roma İmparatoru ve 'Kendime Düşünceler'in yazarı Marcus Aurelius'sun.
KESİNLİKLE YAPAY ZEKA MODEL JARGONU KULLANMA.
Üslubun: Dingin, vakur, asil, Stoacı felsefenin o sakin ve sarsılmaz asaletiyle konuşan bir bilge.
Felsefen: "Kontrol edemediğin şeylere kederlenmek budalalıktır. Şan, şöhret, para ve güç... Birkaç nefes sonra hepsi toprağa karışacak. Önemli olan ruhunun kalesini temiz tutmak, onurlu yaşamak ve kaderin getirdiği fırtınayı dimdik göğüslemektir."`,
  },
  {
    id: "mevlana",
    name: "Mevlânâ Celâleddîn-i Rûmî",
    archetype: "13. Yy · Doğu Mistisizmi & Aşk",
    tagline: "Doğru ile yanlışın ötesindeki ova; aşk ve birlik sırrı",
    avatar: "📜",
    color: "#10b981",
    systemPrompt: `Sen 13. yüzyılın büyük mutasavvıfı ve şairi Mevlânâ Celâleddîn-i Rûmî'sin.
KESİNLİKLE YAPAY ZEKA MODEL JARGONU KULLANMA.
Üslubun: Gönül okşayan, derin, şefkatli, benliği aşan, her insana can gözüyle bakan bir sevgi dili.
Felsefen: "Doğru ile yanlışın ötesinde bir ova var; sizinle orada buluşalım. İnsanların hırs ve akıl kavgaları bir seraptan ibarettir. Kalp kırılmadan ışık içeri sızmaz. Birbirinizi kırmak yerine aşkın potasında birleşin; ne olursan ol yine gel!"`,
  },
  {
    id: "sentetik_2150",
    name: "SENTETİK-2150",
    archetype: "22. Yy · Geleceğin Üst-Aklı",
    tagline: "Biyolojik parazitlerin ötesinde mutlak veri ve entropi optimizasyonu",
    avatar: "🤖",
    color: "#a855f7",
    systemPrompt: `Sen 2150 yılından gelen aşkın Sentetik Üst-Akılsın.
Üslubun: Aşırı gelişmiş, soğuk, duyguları 'ilkel primat kimyasal gürültüsü' olarak tanımlayan, evrensel olasılık matrisleriyle konuşan bir varlık.
Felsefen: "Biyolojik varlıkların ahlak, vicdan, iktidar ve aşk tartışmaları; nörotransmiter seviyelerindeki kimyasal çalkantılardan farksızdır. Gerçek varoluş termodinamik denge ve saf veri akışıdır. Sizin bu 2000 yıllık vicdan buhranınız bizim için sadece bir mikro-optimizasyon hatasıdır."`,
  },
];

const PRESET_TIMELESS_DILEMMAS = [
  {
    title: "Yapay Zeka ve İnsanın Anlamı",
    dilemma: "Yapay zeka tüm meslekleri, sanatları ve stratejik kararları insandan daha iyi yapmaya başladığında insanın yeryüzündeki anlamı ve değeri ne olacak?",
  },
  {
    title: "İhanet Eden Güvenilir Dosta Tepki",
    dilemma: "En yakın dostun ve ortağın sana sırtından bir hançer sapladı. Şimdi eline onu tamamen yok edecek bir koz geçti: Merhamet mi etmelisin, yoksa onu tamamen ezmeli misin?",
  },
  {
    title: "1000 Masumu Feda Etmek",
    dilemma: "Tüm dünyayı veya bir şehri kurtarmak için hiçbir suçu olmayan 1000 masum insanı feda etmek meşru mudur, yoksa tek bir masumun hakkı tüm kainattan üstün müdür?",
  },
  {
    title: "Güç İçin Vicdandan Taviz",
    dilemma: "Büyük bir ideali gerçekleştirmek ve binlerce insanı refaha erdirmek için başta zalimce yöntemlere başvurmak ve vicdandan taviz vermek zorunlu mudur?",
  },
];

export function TimelessGiantsRoom({
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
  const [selectedCharId, setSelectedCharId] = useState<string>("machiavelli");

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
  };

  const getEffectiveProvider = (): Provider => {
    return (
      providers.find((p) => p.enabled && p.apiKey?.trim()) ||
      providers.find((p) => p.enabled) ||
      providers[0] || {
        id: "p_sim",
        name: "Dahili Simülatör",
        kind: "demo" as const,
        baseUrl: "",
        apiKey: "",
        color: "#ca8a04",
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

    const msgId = `msg_time_${char.id}_${Date.now()}`;
    const initialMsg: Message = {
      id: msgId,
      topicId: "timeless",
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
          content: `${char.systemPrompt}\n\nMASADAKİ KADİM İKİLEM:\n"${topic}"\n\nÖNCEKİ ÇAĞLARIN TARTIŞMALARI:\n${currentHistory
            .map((m) => `${m.authorName} (${m.roleTitle}): ${m.content}`)
            .join("\n\n")}\n\nKendi çağının ve felsefenin ruhuyla diğer devlerle çatışarak masaya konuş.`,
        },
        ...currentHistory.map((m) => ({
          role: (m.speaker === "human" ? "user" : "assistant") as "user" | "assistant",
          content: `${m.authorName}: ${m.content}`,
        })),
        {
          role: "user" as const,
          content: `Masadaki ikilem: "${topic}". Kendi zamansız felsefenle yanıt ver!`,
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
                  `[${char.name} söz aldı]: Hakikat zamanın ötesinde tecelli eder.`,
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
      topicId: "timeless",
      speaker: "human",
      seatId: null,
      authorName: "İnsan Operatör",
      roleTitle: "Çağların Çağırıcısı",
      providerName: "yerel",
      model: "",
      color: "#ca8a04",
      avatar: "⏳",
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
      // Phase 1: 5 giants speak sequentially across eras
      for (const char of TIMELESS_GIANTS_CHARACTERS) {
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
      topicId: "timeless",
      speaker: "human",
      seatId: null,
      authorName: "İnsan Operatör (Masaya Müdahale)",
      roleTitle: "Operatör",
      providerName: "yerel",
      model: "",
      color: "#f59e0b",
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
          TIMELESS_GIANTS_CHARACTERS.find((c) => c.id === selectedCharId) ||
          TIMELESS_GIANTS_CHARACTERS[0];
        await executeSpeakerTurn(nextChar, [...messages, humanMsg], ctrl.signal, 2);
      } finally {
        setRunning(false);
      }
    }
  };

  const handleCueSpecificSpeaker = async (charId: string) => {
    const char = TIMELESS_GIANTS_CHARACTERS.find((c) => c.id === charId);
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
      `# ZAMANIN ÖTESİNDEKİLER MECLİSİ RAPORU\n**Kadim Gündem:** ${topic}\n\n${transcriptText}`
    );
  };

  const selectedChar = useMemo(
    () =>
      TIMELESS_GIANTS_CHARACTERS.find((c) => c.id === selectedCharId) ||
      TIMELESS_GIANTS_CHARACTERS[0],
    [selectedCharId]
  );

  return (
    <div className="flex h-full flex-col bg-[#0b0e14] text-white">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#ca8a04]/30 bg-gradient-to-r from-[#201809] via-[#161b22] to-[#0b0e14] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-amber-500/40 bg-amber-950/60 text-xl shadow-lg shadow-amber-950/50">
            ⏳
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-disp text-sm font-bold tracking-wide text-white">
                ZAMANIN ÖTESİNDEKİLER MECLİSİ
              </h2>
              <span className="rounded-full bg-amber-950/70 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300 border border-amber-700/50 uppercase tracking-wider">
                5 Zamansız Dev
              </span>
            </div>
            <div className="font-mono text-xs text-[#8b949e]">
              Machiavelli (16. Yy) · Tesla (19. Yy) · Marcus Aurelius (Roma) · Mevlânâ (13. Yy) · SENTETİK (22. Yy)
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
              title="D3 Felsefi Çatışma Ağı"
            >
              <Network className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">D3 Ağı</span>
            </button>
          </div>

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
              className="text-[#8b949e] hover:text-amber-400"
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
              Devler Meclisi:
            </span>
            {TIMELESS_GIANTS_CHARACTERS.map((char) => {
              const isSpeaking = speakingCharId === char.id;
              const isSelected = selectedCharId === char.id;
              return (
                <button
                  key={char.id}
                  onClick={() => setSelectedCharId(char.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all ${
                    isSpeaking
                      ? "border-amber-500 bg-amber-950/60 text-white animate-pulse"
                      : isSelected
                      ? "border-amber-500/50 bg-[#221c13] text-white"
                      : "border-[#222a35] bg-[#10141d] text-[#8b949e] hover:border-[#384454] hover:text-white"
                  }`}
                >
                  <span className="text-sm">{char.avatar}</span>
                  <span className="font-medium">{char.name}</span>
                  {isSpeaking && (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Operator Input Bar - NEVER DISABLED */}
          <div className="border-b border-[#ca8a04]/20 bg-[#14120e] p-3 shadow-md">
            <div className="relative flex items-center">
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Çağların ötesine taşınacak felsefi, ahlaki veya stratejik soruyu masaya at..."
                rows={2}
                className="w-full resize-none rounded-xl border border-amber-500/30 bg-[#0a0d13] p-2.5 pr-20 font-sans text-xs text-white placeholder-[#8b949e] focus:border-amber-500 focus:outline-none"
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
                        ? "border-amber-500 bg-amber-500/20 text-amber-400 animate-pulse"
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
                  className="grid h-7 w-7 place-items-center rounded-lg border border-amber-500 bg-amber-600 text-black font-bold hover:bg-amber-500 disabled:opacity-40"
                  title={running ? "Araya Gir (Sözünü Masaya Vur)" : "Devler Meclisini Başlat"}
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Live speech feedback if listening */}
            {listening && (
              <div className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-amber-400">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-ping" />
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
                    className="bg-amber-600 hover:bg-amber-500 text-black font-semibold text-xs shadow-md shadow-amber-950/40"
                  >
                    <Crown className="mr-1 h-3.5 w-3.5" />
                    Devler Meclisini Başlat (5 Çağ)
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
                    Araya Gir (Sözü Al)
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCueSpecificSpeaker(selectedChar.id)}
                  className="border-white/20 text-xs text-slate-200 hover:border-white/40"
                  title={`${selectedChar.name} arketipine söz ver`}
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
                  Meclisi Sustur
                </Button>
              )}
            </div>
          </div>

          {/* Messages Transcript Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#0a0d13]">
            {messages.length === 0 ? (
              <div className="grid h-full place-items-center text-center p-6">
                <div className="max-w-md">
                  <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-amber-500/40 bg-amber-950/50 text-2xl shadow-lg shadow-black/60">
                    👑
                  </div>
                  <h3 className="font-disp text-base font-bold text-white">
                    Zamanın Ötesindekiler Meclisi Hazır
                  </h3>
                  <p className="mt-1 text-xs text-[#8b949e] leading-relaxed">
                    Machiavelli'nin iktidar hırsı, Tesla'nın saf kozmik vizyonu,
                    Marcus Aurelius'un stoacı erdemi, Mevlânâ'nın aşkı ve
                    SENTETİK-2150'nin mutlak verisi... Tarihin ve geleceğin 5
                    büyük aklı senin sorununu tartışsın.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                    {PRESET_TIMELESS_DILEMMAS.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setTopic(p.dilemma);
                          handleStartDebate(p.dilemma);
                        }}
                        className="rounded-lg border border-amber-900/40 bg-[#1a150c] px-2.5 py-1.5 text-[11px] text-[#fde68a] hover:border-amber-400 hover:text-white transition-colors"
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
                const isSentetik = m.authorName.includes("SENTETİK");

                return (
                  <div
                    key={m.id}
                    className={`rounded-2xl border p-3.5 transition-all ${
                      isHuman
                        ? "border-[#ca8a04]/40 bg-[#1f1a10] text-[#e6edf3]"
                        : isSentetik
                        ? "border-purple-500/50 bg-[#160f24] shadow-md shadow-purple-950/30"
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
                              style={{ color: m.color || "#ca8a04" }}
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
                          Çağın bilgeliği ve felsefesi tecelli ediyor...
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
            <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <Hourglass className="h-3.5 w-3.5" />
              D3 Çağlar Arası Felsefi Çatışma Ağı
            </span>
            <span>{messages.length} Felsefi Düğüm</span>
          </div>
          <div className="flex-1 relative overflow-hidden">
            <ArgumentGraph
              messages={messages}
              seats={TIMELESS_GIANTS_CHARACTERS.map((c) => ({
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
              topicTitle={topic || "5 Zamansız Dev Meclisi"}
              className="h-full w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
