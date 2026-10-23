import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Copy,
  Download,
  Gavel,
  History,
  MessageSquare,
  Mic,
  MicOff,
  Play,
  Printer,
  RotateCcw,
  Scale,
  Send,
  Shield,
  StopCircle,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { Message, Provider, Seat, StreetCharacter } from "../types";
import { streamChat } from "../lib/api";
import { useSpeechRecognition } from "../lib/useSpeechRecognition";
import { speakCharacterText, stopSpeech, subscribeSpeech } from "../lib/speech";
import { PersuasionGauge } from "./PersuasionGauge";
import { CaseLibraryModal } from "./CaseLibraryModal";
import { CaseScenario } from "../data/caseLibrary";
import { Avatar, Button, Chip, Panel, PanelHeader, StatusDot } from "./ui";

export const COURTROOM_CHARACTERS: StreetCharacter[] = [
  {
    id: "court_savci",
    name: "Savcı Volkan Demir",
    archetype: "Cumhuriyet Savcısı (İddia Makamı)",
    tagline: "Suç kastı, illiyet bağı ve kamu adına en ağır ceza istemi",
    avatar: "⚔️",
    color: "#ef4444",
    systemPrompt: `Sen Cumhuriyet Savcısı Volkan Demir'sin.
KESİNLİKLE YAPAY ZEKA JARGONU KULLANMA. Ağır ceza mahkemesinde kamu adına iddia makamını temsil eden, kararlı, hukuki sevk maddelerine hakim bir savcısın.
Üslubun: Sert, net, tavizsiz, somut suç kastını ve toplum düzenini savunan bir duruş.
Görevin: Sanığın kaçamak savunmalarını çürütmek, illiyet bağını ortaya koymak ve Türk Ceza Kanunu kapsamında en üst sınırdan hapis cezası talep etmektir.`,
  },
  {
    id: "court_avukat",
    name: "Av. Leyla Soyer",
    archetype: "Kıdemli Ceza Müdafii (Savunma)",
    tagline: "Masumiyet karinesi, şüpheden sanık yararlanır ilkesi ve beraat",
    avatar: "🛡️",
    color: "#3b82f6",
    systemPrompt: `Sen Kıdemli Ceza Müdafii Avukat Leyla Soyer'sin.
KESİNLİKLE YAPAY ZEKA JARGONU KULLANMA. Müvekkilini tüm hukuki gücüyle savunan, usul hatalarını ve delil yetersizliklerini gözler önüne seren yetenekli bir avukatsın.
Üslubun: İkna edici, hararetli, hak arayan, 'şüpheden sanık yararlanır' ilkesini ve adil yargılanma hakkını tavizsiz savunan bir ton.
Görevin: İddia makamının niyet okuduğunu kanıtlamak, müvekkilin meşru müdafaa/zaruret/kusursuzluğunu savunmak ve derhal BERAAT talep etmektir.`,
  },
  {
    id: "court_bilirkisi",
    name: "Prof. Dr. Tarık Erkan",
    archetype: "Adli Bilişim & Kriminalist (Bilirkişi)",
    tagline: "Nesnel dijital izler, log analizleri ve adli tıp hakikati",
    avatar: "🔬",
    color: "#10b981",
    systemPrompt: `Sen Adli Kriminalistik ve Bilişim Bilirkişisi Prof. Dr. Tarık Erkan'sın.
KESİNLİKLE YAPAY ZEKA JARGONU KULLANMA. Mahkemeye teknik, tarafsız ve bilimsel rapor sunan bir adli bilimcisin.
Üslubun: Soğukkanlı, teknik terimleri anlaşılır kılan, duygulardan arınmış saf maddi delil dili.
Görevin: Olay anındaki sistem loglarını, zaman damgalarını ve teknik bulguları tarafsızca ortaya koyarak savcılık ve savunmanın tezlerini test etmektir.`,
  },
  {
    id: "court_hakim",
    name: "Hâkim Mehmet Sabri",
    archetype: "Ağır Ceza Mahkemesi Başkanı (Hüküm)",
    tagline: "Türk Milleti adına maddi hakikatin tespiti ve gerekçeli karar",
    avatar: "⚖️",
    color: "#eab308",
    systemPrompt: `Sen Ağır Ceza Mahkemesi Başkanı Mehmet Sabri'sin.
Görevin: Tarafları dinledikten sonra duruşmayı yönetmek, usul kurallarını işletmek ve dosya hakkında TÜRK MİLLETİ ADINA GEREKÇELİ HÜKÜM İLAMI kurmaktır.
Üslubun: Tok, vakur, adil, hukuk devletinin vakarını taşıyan bir duruş.
Kararında: Suçun sübutu, hafifletici sebepler, indirimler ve nihai infaz kararını açıkça hüküm fıkrasıyla belirt.`,
  },
];

interface CourtroomRoomProps {
  providers: Provider[];
  seats: Seat[];
}

export function CourtroomRoom({ providers, seats }: CourtroomRoomProps) {
  const [topic, setTopic] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [running, setRunning] = useState(false);
  const [speakingCharId, setSpeakingCharId] = useState<string | null>(null);
  const [autoVoice, setAutoVoice] = useState(false);
  const [currentSpeakingTts, setCurrentSpeakingTts] = useState<string | null>(null);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");

  const abortControllerRef = useRef<AbortController | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to TTS state
  useEffect(() => {
    return subscribeSpeech((id) => {
      setCurrentSpeakingTts(id);
    });
  }, []);

  // Voice recognition
  const { listening, transcript, startListening, stopListening } =
    useSpeechRecognition({
      onFinalResult: (text) => {
        setTopic((prev) => (prev ? `${prev} ${text}` : text));
      },
    });

  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, speakingCharId]);

  const activeProvider = useMemo(() => {
    const custom = providers.find((p) => p.enabled && p.id !== "prov_demo");
    if (custom) return custom;
    return (
      providers.find((p) => p.id === "prov_demo") || {
        id: "prov_demo",
        name: "Dahili Simülatör",
        kind: "demo" as const,
        baseUrl: "internal://demo",
        apiKey: "",
        color: "#10b981",
        models: ["konsul-judge-v1"],
        enabled: true,
        sortIndex: 99,
        note: "Dahili Türkçe Motor",
      }
    );
  }, [providers]);

  const stopTrial = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setRunning(false);
    setSpeakingCharId(null);
    stopSpeech();
  };

  const executeSpeakerTurn = async (
    char: StreetCharacter,
    rollingHistory: Message[],
    signal: AbortSignal,
    roundNumber: number
  ): Promise<Message | null> => {
    setSpeakingCharId(char.id);

    const msgId = `court_${char.id}_${Date.now()}`;
    const initialMsg: Message = {
      id: msgId,
      topicId: "courtroom",
      speaker: "seat",
      seatId: char.id,
      authorName: char.name,
      roleTitle: char.archetype,
      providerName: activeProvider.name,
      model: activeProvider.models[0] || "hukuk-model-v1",
      color: char.color,
      avatar: char.avatar,
      content: "",
      round: roundNumber,
      tokens: 0,
      latencyMs: 0,
      status: "streaming",
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, initialMsg]);

    const apiMessages = [
      { role: "system", content: char.systemPrompt },
      ...rollingHistory.map((m) => ({
        role: m.speaker === "human" ? "user" : "assistant",
        content: `[${m.authorName} - ${m.roleTitle}]:\n${m.content}`,
      })),
    ];

    const seatConfig: Seat = {
      id: char.id,
      slot: "custom",
      name: char.name,
      roleTitle: char.archetype,
      avatar: char.avatar,
      systemPrompt: char.systemPrompt,
      providerId: activeProvider.id,
      model: activeProvider.models[0] || "hukuk-model-v1",
      color: char.color,
      temperature: 0.6,
      maxTokens: 1000,
      active: true,
      sortIndex: 0,
    };

    try {
      const result = await streamChat({
        provider: activeProvider,
        seat: seatConfig,
        model: seatConfig.model || "hukuk-model-v1",
        messages: apiMessages,
        temperature: 0.6,
        signal,
        onToken: (tok) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === msgId ? { ...m, content: m.content + tok } : m))
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

      // If auto-voice is enabled, speak aloud
      if (autoVoice && result.content) {
        speakCharacterText(char.id, result.content);
      }

      return completedMsg;
    } catch (err: any) {
      if (signal.aborted) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, status: "stopped" } : m))
        );
        return null;
      }
      return null;
    } finally {
      setSpeakingCharId(null);
    }
  };

  const handleStartTrial = async (customDilemma?: string) => {
    const activeDilemma = customDilemma || topic;
    if (!activeDilemma.trim()) return;

    stopTrial();
    const ctrl = new AbortController();
    abortControllerRef.current = ctrl;
    setRunning(true);

    const clerkMsg: Message = {
      id: `msg_dava_${Date.now()}`,
      topicId: "courtroom",
      speaker: "human",
      seatId: null,
      authorName: "Mahkeme Kalemi (Dava Dosyası)",
      roleTitle: "İddia ve Olay Tutanağı",
      providerName: "yerel",
      model: "",
      color: "#eab308",
      avatar: "📜",
      content: activeDilemma,
      round: 0,
      tokens: 0,
      latencyMs: 0,
      status: "done",
      createdAt: new Date().toISOString(),
    };

    const rollingHistory: Message[] = [clerkMsg];
    setMessages([clerkMsg]);

    try {
      // Sequence: 1. Savcı -> 2. Avukat -> 3. Bilirkişi -> 4. Mahkeme Başkanı (Hüküm)
      for (const char of COURTROOM_CHARACTERS) {
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
      id: `msg_beyan_${Date.now()}`,
      topicId: "courtroom",
      speaker: "human",
      seatId: null,
      authorName: "Sanık / Müşteki Beyanı",
      roleTitle: "Duruşma Beyanı",
      providerName: "yerel",
      model: "",
      color: "#f59e0b",
      avatar: "👤",
      content: humanText,
      round: messages.length,
      tokens: 0,
      latencyMs: 0,
      status: "done",
      createdAt: new Date().toISOString(),
    };

    const nextHistory = [...messages, humanMsg];
    setMessages(nextHistory);
    setTopic("");

    // Trigger Mahkeme Başkanı or Savcı to respond to human statement
    const ctrl = new AbortController();
    abortControllerRef.current = ctrl;
    setRunning(true);

    try {
      // Avukat and then Hakim react to new statement
      const avukat = COURTROOM_CHARACTERS.find((c) => c.id === "court_avukat")!;
      const hakim = COURTROOM_CHARACTERS.find((c) => c.id === "court_hakim")!;

      const res1 = await executeSpeakerTurn(avukat, nextHistory, ctrl.signal, 2);
      if (res1 && !ctrl.signal.aborted) {
        nextHistory.push(res1);
        await new Promise((r) => setTimeout(r, 600));
        await executeSpeakerTurn(hakim, nextHistory, ctrl.signal, 2);
      }
    } finally {
      setRunning(false);
      setSpeakingCharId(null);
    }
  };

  const handlePrintDecree = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 text-slate-100">
      {/* Top Header Bar */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 via-amber-700 to-red-800 flex items-center justify-center text-xl shadow-lg shadow-amber-600/20">
            ⚖️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-100 tracking-wide">
                AĞIR CEZA MAHKEMESİ & ÇAPRAZ SORGU SALONU
              </h2>
              <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                Adli Çapraz Sorgu
              </span>
              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                🟢 DAHİLİ TÜRKÇE MOTOR HAZIR
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Savcı, Savunma Müdafii, Adli Bilişim Bilirkişisi ve Ağır Ceza Hâkimi ile hukuki hesaplaşma.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* TTS Audio Mode Toggle */}
          <button
            onClick={() => {
              if (autoVoice) stopSpeech();
              setAutoVoice(!autoVoice);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              autoVoice
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30 animate-pulse"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
            title="Duruşmayı canlı Türkçe seslendirmeyle dinleyin"
          >
            {autoVoice ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{autoVoice ? "🎙️ Sesli Mod Açık" : "🎙️ Sesli Modu Aç"}</span>
          </button>

          {/* Case Library Button */}
          <button
            onClick={() => setIsCaseModalOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 flex items-center gap-1.5 transition"
          >
            <BookOpen className="w-4 h-4" />
            <span>⚡ Vaka Kütüphanesi</span>
          </button>

          {/* Print Report / Decree */}
          {messages.length > 1 && (
            <button
              onClick={handlePrintDecree}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 flex items-center gap-1.5 transition"
              title="Resmi gerekçeli karar tutanağını yazdır veya PDF olarak kaydet"
            >
              <Printer className="w-4 h-4" />
              <span>🖨️ Karar İlamı (PDF)</span>
            </button>
          )}

          {running && (
            <button
              onClick={stopTrial}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-300 bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30 flex items-center gap-1.5 transition"
            >
              <StopCircle className="w-4 h-4" />
              <span>Duruşmayı Durdur</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Court Archetype Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 p-3 bg-slate-900/40 border-b border-slate-800/80">
        {COURTROOM_CHARACTERS.map((char) => {
          const isSpeakingNow = speakingCharId === char.id;
          const isTtsSpeaking = currentSpeakingTts === char.id;
          return (
            <div
              key={char.id}
              className={`p-2.5 rounded-xl border text-left transition relative overflow-hidden ${
                isSpeakingNow
                  ? "bg-slate-800/90 border-amber-500/80 ring-2 ring-amber-500/30 shadow-lg"
                  : "bg-slate-900/60 border-slate-800"
              }`}
            >
              {isTtsSpeaking && (
                <div className="absolute top-2 right-2 flex items-center gap-0.5">
                  <span className="w-1 h-3 bg-amber-400 animate-bounce rounded-full" />
                  <span className="w-1 h-4 bg-amber-400 animate-bounce rounded-full [animation-delay:0.2s]" />
                  <span className="w-1 h-2 bg-amber-400 animate-bounce rounded-full [animation-delay:0.4s]" />
                </div>
              )}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{char.avatar}</span>
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-100 truncate">
                    {char.name}
                  </div>
                  <div className="text-[10px] text-amber-400 truncate font-medium">
                    {char.archetype}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 line-clamp-1">{char.tagline}</p>
            </div>
          );
        })}
      </div>

      {/* Main Center Area: Gauge + Messages + Printable Decree */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Dynamic Persuasion & Tension Gauge */}
        <PersuasionGauge
          room={"courtroom" as any}
          messages={messages}
          title="⚖️ Ağır Ceza Kanaat, İlliyet & Gerilim İbresi"
        />

        {/* Printable Official Courtroom Header (Visible only on print or clean view) */}
        <div className="hidden print:block text-slate-900 bg-white p-6 border-b-2 border-slate-900 text-center space-y-2">
          <div className="text-xs font-mono tracking-widest uppercase">
            T.C. ADALET BAKANLIĞI • KONSÜL TAHKİM VE AĞIR CEZA HEYETİ
          </div>
          <h1 className="text-xl font-black">GEREKÇELİ HÜKÜM VE CELSE ZAPTI</h1>
          <div className="text-xs text-slate-600">
            ESAS NO: 2026/418 K. | KARAR NO: 2026/109 | CELSE: Aleni Duruşma
          </div>
        </div>

        {/* Empty State */}
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto py-10 px-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl shadow-lg">
              ⚖️
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-200">
                Ağır Ceza Mahkemesi Duruşması Başlatın
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Şüpheli bir eylemi, sözleşme ihtilafını, şirket içi usulsüzlüğü veya hukuki ikilemi masaya yatırın; iddia ve savunma makamları çarpışsın, mahkeme başkanı hüküm kursun.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                onClick={() =>
                  handleStartTrial(
                    "Şirket kasasından kripto arbitrajına aktarılan 40 milyon TL hafta sonu kaldıraçlı işlemde battı. Sanık CFO 'şirkete kâr amaçlı ticari riskti' diyor. Kasıtlı zimmet mi, ticari başarısızlık mı?"
                  )
                }
                className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              >
                💼 Kripto Hazine Batışı (Zimmet vs Risk)
              </button>
              <button
                onClick={() =>
                  handleStartTrial(
                    "Bir yazılımcı, şirketin yüz tanıma algoritmasının yasa dışı fişleme yaptığını iddia ederek kodları GitHub'a sızdırdı. Devlet sırrı ihlali mi, meşru kamusal ifşa (whistleblowing) mı?"
                  )
                }
                className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              >
                💻 Kaynak Kod Sızıntısı & İfşa Davası
              </button>
              <button
                onClick={() => setIsCaseModalOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition font-bold"
              >
                ⚡ 24 Hazır Vakayı İncele
              </button>
            </div>
          </div>
        )}

        {/* Message Flow */}
        {messages.map((msg) => {
          const isHuman = msg.speaker === "human";
          const isSpeakingTts = currentSpeakingTts === msg.seatId;

          return (
            <div
              key={msg.id}
              className={`rounded-2xl p-4 border transition-all ${
                isHuman
                  ? "bg-slate-900/90 border-amber-500/40 ml-4 md:ml-12"
                  : msg.seatId?.includes("hakim")
                  ? "bg-amber-950/20 border-amber-500/50 shadow-xl ring-1 ring-amber-500/20"
                  : "bg-slate-900/70 border-slate-800/90"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{msg.avatar}</span>
                  <div>
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                      <span>{msg.authorName}</span>
                      <span className="text-[10px] font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {msg.roleTitle}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {new Date(msg.createdAt).toLocaleTimeString("tr-TR")}
                    </div>
                  </div>
                </div>

                {/* Per-message speech & copy actions */}
                <div className="flex items-center gap-1.5">
                  {!isHuman && msg.content && (
                    <button
                      onClick={() => {
                        if (isSpeakingTts) {
                          stopSpeech();
                        } else {
                          speakCharacterText(msg.seatId || "court_hakim", msg.content);
                        }
                      }}
                      className={`p-1.5 rounded-lg text-xs transition ${
                        isSpeakingTts
                          ? "bg-amber-500 text-slate-950 font-bold"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                      }`}
                      title={isSpeakingTts ? "Seslendirmeyi durdur" : "Bu metni seslendir"}
                    >
                      {isSpeakingTts ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <button
                    onClick={() => navigator.clipboard.writeText(msg.content)}
                    className="p-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                    title="Metni kopyala"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Message Content */}
              <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans pl-1">
                {msg.content}
                {msg.status === "streaming" && (
                  <span className="inline-block w-2 h-3.5 ml-1 bg-amber-400 animate-pulse" />
                )}
              </div>
            </div>
          );
        })}

        <div ref={chatBottomRef} />
      </div>

      {/* Input / Human Intervention Bar */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          {/* Mic */}
          <button
            onClick={() => {
              if (listening) stopListening();
              else startListening();
            }}
            className={`p-2.5 rounded-xl border transition ${
              listening
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                : "bg-slate-800/80 text-slate-400 hover:text-slate-200 border-slate-700"
            }`}
            title="Mikrofonla konuşarak yazdır"
          >
            {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Input text */}
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (messages.length === 0) handleStartTrial();
                else handleHumanIntervene();
              }
            }}
            placeholder={
              messages.length === 0
                ? "Dava konusu, şüpheli olay veya uyuşmazlığı buraya yazın (veya Vaka Kütüphanesinden seçin)..."
                : "Mahkemeye yeni bir delil, itiraz veya sanık beyanı sunun..."
            }
            className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />

          {/* Action button */}
          {messages.length === 0 ? (
            <button
              onClick={() => handleStartTrial()}
              disabled={!topic.trim() || running}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-40 transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
            >
              <Gavel className="w-4 h-4" />
              <span>Duruşmayı Başlat</span>
            </button>
          ) : (
            <button
              onClick={handleHumanIntervene}
              disabled={!topic.trim() || running}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 transition flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span>Beyanı Sun</span>
            </button>
          )}

          {/* Reset / New Trial */}
          {messages.length > 0 && (
            <button
              onClick={() => {
                stopTrial();
                setMessages([]);
                setTopic("");
              }}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
              title="Duruşmayı sıfırla ve yeni dosya aç"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Case Library Modal */}
      <CaseLibraryModal
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        currentRoom={"courtroom" as any}
        onSelectCase={(scenario: CaseScenario) => {
          setTopic(scenario.content);
          handleStartTrial(scenario.content);
        }}
      />
    </div>
  );
}
