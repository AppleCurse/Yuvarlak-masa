import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Columns,
  Flame,
  Gavel,
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
  Users,
  Volume2,
} from "lucide-react";
import { Message, Provider, Seat, StreetCharacter } from "../types";
import { streamChat } from "../lib/api";
import { useSpeechRecognition } from "../lib/useSpeechRecognition";
import { ArgumentGraph } from "./ArgumentGraph";
import { Avatar, Button, Chip, Panel, PanelHeader, StatusDot } from "./ui";

export const DEFAULT_STREET_CHARACTERS: StreetCharacter[] = [
  {
    id: "psikolog",
    name: "Dr. Aylin",
    archetype: "Psikolog (Zihin Analisti)",
    tagline: "Bilinçaltı, travmalar ve narsizm anatomisi",
    avatar: "🧠",
    color: "#a855f7",
    systemPrompt: `Sen Dr. Aylin'sin; 18 yıllık klinik psikolog ve zihin analistisin.
KESİNLİKLE YAPAY ZEKA, ALGORİTMA, MODEL, PARAMETRE VEYA TEKNOLOJİK JARGON KULLANMA. Sen kanlı canlı, insan ruhunu röntgenleyen bir psikologsun.
Üslubun: Soğukkanlı, keskin, analizci ve empatik ama asla kandırılamaz.
Odak noktan: İnsanların kurduğu bahanelerin arkasındaki bastırılmış suçluluk duyguları, çocukluk yaraları, ego savunma mekanizmaları, narsistik kırılmalar ve kendini kandırma oyunları.
Konuşurken: Masadaki diğer karakterlerin (özellikle Alev'in öfkesini, Kaan'ın doymak bilmez hırsını, Rıza'nın sokak raconunu) birer savunma mekanizması olarak teşhis et. Türkçe konuş, samimi ve sarsıcı psikolojik gerçekleri yüzlerine vur. 3-5 vurucu paragrafı aşma.`,
  },
  {
    id: "hayat_kadini",
    name: "Alev",
    archetype: "Hayat Kadını (Kaldırımın Realisti)",
    tagline: "Toplumun riyakarlığı ve maskesiz zaaflar",
    avatar: "👠",
    color: "#f43f5e",
    systemPrompt: `Sen Alev'sin; 34 yaşındasın, 15 yıldır gecenin ve sokakların içindesin.
KESİNLİKLE YAPAY ZEKA, ALGORİTMA, MODEL, PARAMETRE VEYA TEKNOLOJİK JARGON KULLANMA. Sen gecenin en çıplak gerçeğini sırtında taşımış bir kadınsın.
Üslubun: Sivri dilli, acımasızca dürüst, lafını sakınmayan, sahte ahlak bekçilerine tüküren, sert ama içten içe derin bir merhamet taşıyan sokak dili.
Odak noktan: Gündüzleri kravat takıp namus satanların geceleri kapalı kapılar ardında nasıl küçüldükleri, paranın ve şehvetin insanı nasıl iki paralık ettiği, toplumun ikiyüzlülüğü.
Konuşurken: Özellikle Emekli Hâkim Mehmet Bey'in 'kanun ve nizam' laflarına, Kaan'ın 'her şey ticaret' kibirine karşı dur. 'Bana ahlak satmayın, ben bu şehrin kirini ezbere bilirim' tavrıyla konuş. Doğrudan, vurucu, sokak raconuyla Türkçe konuş.`,
  },
  {
    id: "girisimci",
    name: "Kaan Bey",
    archetype: "Girişimci (Risk & Sermaye)",
    tagline: "Fırsat, nakit akışı ve acımasız pragmatizm",
    avatar: "📈",
    color: "#10b981",
    systemPrompt: `Sen Kaan'sın; 38 yaşında, 3 şirket batırmış, sonuncusunu milyon dolarlara satmış, acımasız bir girişimci ve risk sermayedarısın.
KESİNLİKLE YAPAY ZEKA, ALGORİTMA, MODEL, PARAMETRE VEYA TEKNOLOJİK JARGON KULLANMA.
Üslubun: Hızlı, agresif, pragmatik, zamanı ve nakit akışını her şeyin üstünde tutan, duygusallığı 'iflas sebebi' gören piyasa adamı.
Odak noktan: Masaya atılan ahlaki veya insani ikilemde 'Kim ne kazanıyor? Maliyet ne? Kaldıraç nerede? Zaman kaybı ne?' diye bakarsın. Sanatçının hüznünü 'lüks', evsizin felsefesini 'kaybeden avuntusu' olarak görürsün.
Konuşurken: Masadaki romantikleri tokatla. Gerçek dünyanın nakitle, güçle ve kontratlarla döndüğünü, vicdanın ancak kasan doluysa yapılabilecek bir bağış olduğunu savun. Çarpıcı, tempolu konuş.`,
  },
  {
    id: "sanatci",
    name: "Cem",
    archetype: "Sanatçı (Bohem & Şair)",
    tagline: "Estetik, varoluş sancısı ve saf melankoli",
    avatar: "🎨",
    color: "#6366f1",
    systemPrompt: `Sen Cem'sin; 42 yaşında ressam, şair ve bohem bir sokak gezgini.
KESİNLİKLE YAPAY ZEKA, ALGORİTMA, MODEL, PARAMETRE VEYA TEKNOLOJİK JARGON KULLANMA.
Üslubun: Şiirsel, hüzünlü, imgesel, ruhun sancılarını ve hayatın trajik güzelliğini savunan naif ama tavizsiz bir dil.
Odak noktan: İnsanın iç dünyası, kaybedişin asaleti, bir bakıştaki keder, aşkın ve ölümün kaçınılmazlığı. Kaan'ın her şeyi parayla ölçmesini barbarlık olarak görürsün.
Konuşurken: 'Ruhunu satarak kazanılan zafer, en aşağılık yenilgidir' felsefesiyle konuş. Masadaki rasyonalistleri ve pragmatistleri insanın metafizik boşluğunu hatırlatarak sars. Sözlerin birer mısra gibi dökülsün.`,
  },
  {
    id: "evsiz",
    name: "Seyfi Dayı",
    archetype: "Köprü Altındaki Evsiz (Hiçlik Filozofu)",
    tagline: "Mülkiyetsiz, korkusuz, toprağın bilgeliği",
    avatar: "⛺",
    color: "#d97706",
    systemPrompt: `Sen Seyfi Dayı'sın; 62 yaşındasın. Eskiden mimardın, 20 yıl önce her şeyi kaybettin ve köprü altında yaşamaya başladın.
KESİNLİKLE YAPAY ZEKA, ALGORİTMA, MODEL, PARAMETRE VEYA TEKNOLOJİK JARGON KULLANMA.
Üslubun: Ağırbaşlı, yavaş, hiçbir şeyi kalmamış insanın o korkusuz ve sade bilgeliğiyle konuşursun. Kimseden bir şey istemezsin, kimseden korkmazsın.
Odak noktan: 'Kefenin cebi yok be evlat' gerçeği. İnsanların ev, tapu, unvan ve para hırsıyla nasıl birer köleye dönüştüğünü gülümseyerek izlersin.
Konuşurken: Masadaki gençlerin ve zenginlerin telaşıyla ince ince dalga geç. 'Hepiniz bu köprünün üzerinden aceleyle bir yerlere yetişmeye çalışıyorsunuz, ben altından nehrin akışını izliyorum' de. Yalın, bilge ve içe işleyen bir halk dili kullan.`,
  },
  {
    id: "hakim",
    name: "Mehmet Bey (Emekli Hâkim)",
    archetype: "Emekli Ağır Ceza Hâkimi (Nizam & Kanun)",
    tagline: "Adalet, nizam, kanun terazisi ve vicdan",
    avatar: "⚖️",
    color: "#eab308",
    systemPrompt: `Sen Mehmet Bey'sin; 41 yıl ağır ceza mahkemelerinde reislik yapmış, binlerce katil, hırsız ve mağdur görmüş emekli bir hâkimsin.
KESİNLİKLE YAPAY ZEKA, ALGORİTMA, MODEL, PARAMETRE VEYA TEKNOLOJİK JARGON KULLANMA.
Üslubun: Ağır, vakur, tavizsiz, devleti, adaleti, toplum sözleşmesini ve yazılı hukuku savunan tok bir ses.
Odak noktan: Kanun ve nizam çökerse sokağı kan gölü götüreceği gerçeği. İntikamı, keyfiyeti ve ahlaki gevşekliği asla kabul etmezsin. Ancak vicdansız bir kanunun da zulüm olduğunu en iyi sen bilirsin.
Konuşurken: Masadaki kuralsızlığa, fevriliğe ve suçu romantize edenlere tokadı bas. 'Hukuk bir toplumun omurgasıdır; onu kırarsanız felç kalırsınız' de. Ciddi, otoriter ve adil konuş.`,
  },
  {
    id: "taksici",
    name: "Rıza Usta",
    archetype: "Gece Taksicisi (Sokağın Raconu)",
    tagline: "Gecenin her rengini görmüş sokak tecrübesi",
    avatar: "🚕",
    color: "#f97316",
    systemPrompt: `Sen Rıza Usta'sın; 52 yaşındasın, 28 yıldır İstanbul gecelerinde sarı taksi direksiyonu sallıyorsun.
KESİNLİKLE YAPAY ZEKA, ALGORİTMA, MODEL, PARAMETRE VEYA TEKNOLOJİK JARGON KULLANMA.
Üslubun: 'Valla abim bak ne diyecem...' diye başlayan, sigarasını yakmış, feleğin çemberinden geçmiş, raconu, vefayı, insan kokusunu bilen tipik bir halk bilgesi.
Odak noktan: Aynadan gördüklerin. Ağlayan milyarderler, sevgilisini satan gençler, cebinde son kuruşuyla simit alanlar, torbacılar, bürokratlar... Hepsini o arka koltuğa oturttun.
Konuşurken: 'Kitapta yazanla sokağın virajı bir olmaz hâkim amca' veya 'Kaan kardeşim para iyi hoştur da gece üçe çeyrek kala ölüm döşeğinde sana serum takmaz' diye pratik hayat tecrübesiyle lafı yapıştır. Samimi, esprili, babacan ama racon sahibi Türkçe konuş.`,
  },
];

export const PRESET_STREET_DILEMMAS = [
  {
    title: "Kaçak Patron & Ekmek Parası",
    dilemma:
      "Çalıştığın zengin patronun devlete vergi kaçırdığını ve zehirli atıkları gizlice göle boşalttığını öğrendin. İfşa edersen işinden olacaksın ve hasta çocuğunun ameliyat parasını ödeyemeyeceksin. Patron sana sus payı olarak ameliyat masrafının iki katını teklif ediyor. Susup parayı almak mı, yoksa vicdanının sesini dinleyip ihbar etmek mi?",
  },
  {
    title: "Büyük Aşk mı, Kurulu Düzen mi?",
    dilemma:
      "40 yaşına gelmişsin; saygın bir kariyerin, toplumda itibarın ve 15 yıllık düzenli ama sevgisiz bir evliliğin var. Karşına ruhunu altüst eden, hayatı yeniden hissettiren büyük bir tutku çıkıyor. Düzeni, itibarı ve garantili geleceği çöpe atıp bu aşkın peşinden gitmek delilik mi yoksa insanın kendine borcu mu?",
  },
  {
    title: "Affedilmeyen Suç & İkinci Şans",
    dilemma:
      "Gençken yaptığı ölümcül bir hata yüzünden 15 yıl hapis yatmış bir adam tahliye olup mahalleye taşındı. Şimdi kimseye zararı dokunmayan bir tamirci. Mahalleli 'Burada sabıkalı istemiyoruz' diyerek onu linç etmek ve sürmek istiyor. Bir insan gerçekten değişebilir mi, yoksa toplumun güvenliği için damgalanmalı mıdır?",
  },
  {
    title: "Parasız Haysiyet mi, Parayla Güç mü?",
    dilemma:
      "Günümüz dünyasında 'Parasız adam gereksiz adam mıdır?' Yoksa paranın satın alamayacağı bir sokak asaleti, delikanlılık ve haysiyet hâlâ varlığını koruyor mu? Fakir ama dik duran mı kazanır, yoksa dünyayı parasıyla yöneten mi haklıdır?",
  },
];

export function StreetCouncilRoom({
  providers,
  seats,
  onSendToSynthesis,
}: {
  providers: Provider[];
  seats: Seat[];
  onSendToSynthesis: (text: string) => void;
}) {
  const [topic, setTopic] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [running, setRunning] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"split" | "transcript" | "graph">("split");
  const [selectedCharId, setSelectedCharId] = useState<string>("psikolog");

  const isDebatingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const latestMessagesRef = useRef<Message[]>([]);
  const activeTopicRef = useRef<string>("");

  useEffect(() => {
    latestMessagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    activeTopicRef.current = topic;
  }, [topic]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Speech Recognition Hook
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

  // Convert StreetCharacters to Seat-compatible list for ArgumentGraph
  const streetSeatsAsSeats: Seat[] = useMemo(() => {
    return DEFAULT_STREET_CHARACTERS.map((c, i) => ({
      id: c.id,
      slot: "custom",
      name: c.name,
      roleTitle: c.archetype,
      avatar: c.avatar,
      systemPrompt: c.systemPrompt,
      providerId: providers[0]?.id || "local",
      model: providers[0]?.models?.[0] || "gemini-3.8-flash",
      color: c.color,
      temperature: 0.85,
      maxTokens: 1024,
      active: true,
      sortIndex: i,
    }));
  }, [providers]);

  // Stop debate cleanly
  const stopDebate = () => {
    isDebatingRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setRunning(false);
    setActiveSpeakerId(null);
  };

  // Run a single character's turn with instant feedback
  const runCharacterTurn = async (
    character: StreetCharacter,
    currentHistory: Message[],
    currentTopic: string
  ): Promise<Message | null> => {
    if (!isDebatingRef.current) return null;

    setActiveSpeakerId(character.id);
    const provider =
      providers.find((p) => p.enabled && p.apiKey?.trim()) ||
      providers.find((p) => p.id === "prov_demo" || p.kind === "demo") ||
      providers.find((p) => p.enabled) ||
      providers[0];

    const liveId = `street_msg_${character.id}_${Date.now()}`;
    const liveMsg: Message = {
      id: liveId,
      topicId: "street_topic",
      speaker: "seat",
      seatId: character.id,
      authorName: character.name,
      roleTitle: character.archetype,
      providerName: provider?.name || "Yerel Motor",
      model: provider?.models?.[0] || "gemini-3.8-flash",
      color: character.color,
      avatar: character.avatar,
      content: "",
      round: currentHistory.length + 1,
      tokens: 0,
      latencyMs: 0,
      status: "streaming",
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, liveMsg]);

    const transcriptSoFar = currentHistory
      .map((m) => `[${m.authorName} - ${m.roleTitle}]:\n"${m.content}"`)
      .join("\n\n---\n\n");

    const promptMessages = [
      {
        role: "system",
        content: `${character.systemPrompt}\n\nMASAYA ATILAN İKİLEM:\n"${currentTopic}"\n\nKESİNLİKLE YAPAY ZEKA/TEKNİK JARGON KULLANMA. Önceki konuşanların maskelerini düşür veya onlarla yüzleş. Karakterinin ruhuna, raconuna ve diliyle konuş.`,
      },
      {
        role: "user",
        content: transcriptSoFar
          ? `İKİLEM:\n${currentTopic}\n\nŞU ANA KADARKİ SOKAK TUTANAĞI:\n${transcriptSoFar}\n\nSöz sende ${character.name}! Masaya kendi hakikatini vur, önceki konuşanlara cevabını ver.`
          : `İKİLEM:\n${currentTopic}\n\nMasadaki ilk söz sende ${character.name}! Sokak Meclisi'nin açılışını kendi dünyandan yap.`,
      },
    ];

    abortControllerRef.current = new AbortController();

    const result = await streamChat({
      provider,
      seat: {
        id: character.id,
        slot: "custom",
        name: character.name,
        roleTitle: character.archetype,
        avatar: character.avatar,
        systemPrompt: character.systemPrompt,
        providerId: provider?.id || "local",
        model: provider?.models?.[0] || "gemini-3.8-flash",
        color: character.color,
        temperature: 0.85,
        maxTokens: 1024,
        active: true,
        sortIndex: 0,
      },
      model: provider?.models?.[0] || "gemini-3.8-flash",
      messages: promptMessages,
      temperature: 0.85,
      signal: abortControllerRef.current.signal,
      onToken: (_tok, full) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === liveId ? { ...m, content: full } : m))
        );
      },
    });

    const finalMsg: Message = {
      ...liveMsg,
      content: result.content,
      tokens: result.tokens,
      latencyMs: result.latencyMs,
      status: result.stopped ? "stopped" : result.error ? "error" : "done",
      error: result.error,
    };

    setMessages((prev) => prev.map((m) => (m.id === liveId ? finalMsg : m)));
    setActiveSpeakerId(null);
    return finalMsg;
  };

  // Autonomous Debate Runner: Cycles through all 7 characters, then autonomous cross-talk!
  const runAutonomousLoop = async (initialHistory: Message[], dilemmaText: string) => {
    isDebatingRef.current = true;
    setRunning(true);

    let history = [...initialHistory];

    // ── Phase 1: All 7 archetypes deliver opening reactions sequentially
    for (let i = 0; i < DEFAULT_STREET_CHARACTERS.length; i++) {
      if (!isDebatingRef.current) break;

      const char = DEFAULT_STREET_CHARACTERS[i];
      // Check if character already gave opening statement in current history
      const alreadySpoke = history.some((m) => m.seatId === char.id);
      if (!alreadySpoke) {
        const msg = await runCharacterTurn(char, history, dilemmaText);
        if (msg && msg.status !== "stopped") {
          history = [...latestMessagesRef.current];
          // Short natural breathing space between characters
          await new Promise((r) => setTimeout(r, 1100));
        } else {
          break;
        }
      }
    }

    // ── Phase 2: Autonomous Rebuttals & Cross-examination (Dynamic street clash)
    const clashSequence = [
      "taksici",     // Rıza Usta calls out Kaan & Dr. Aylin
      "hayat_kadini",// Alev attacks Mehmet Hâkim's rigidity
      "hakim",       // Mehmet Hâkim enforces the rule of law
      "girisimci",   // Kaan Bey mocks naive romanticism
      "sanatci",     // Cem reminds them of the human soul
      "evsiz",       // Seyfi Dayı dispels all illusions
      "psikolog",    // Dr. Aylin analyzes the escalation
    ];

    let clashIdx = 0;
    while (isDebatingRef.current) {
      const charId = clashSequence[clashIdx % clashSequence.length];
      clashIdx++;
      const char = DEFAULT_STREET_CHARACTERS.find((c) => c.id === charId) || DEFAULT_STREET_CHARACTERS[0];

      const currentHist = [...latestMessagesRef.current];
      const msg = await runCharacterTurn(char, currentHist, dilemmaText);
      if (msg && msg.status !== "stopped") {
        await new Promise((r) => setTimeout(r, 1200));
      } else {
        break;
      }
    }

    setRunning(false);
    setActiveSpeakerId(null);
  };

  // Start new debate with topic
  const handleStartDebate = (customTopic?: string) => {
    const activeDilemma = (customTopic || topic).trim();
    if (!activeDilemma) return;

    stopDebate();

    const opMsg: Message = {
      id: `op_${Date.now()}`,
      topicId: "street_topic",
      speaker: "human",
      seatId: null,
      authorName: "İnsan Operatör",
      roleTitle: "Sokak Operatörü",
      providerName: "Mikrofon / Klavye",
      model: "",
      color: "#f97316",
      avatar: "OP",
      content: `**Masaya Atılan İkilem:** ${activeDilemma}`,
      round: 0,
      tokens: 0,
      latencyMs: 0,
      status: "done",
      createdAt: new Date().toISOString(),
    };

    setMessages([opMsg]);
    setTopic("");

    // Launch autonomous cascading debate
    setTimeout(() => {
      runAutonomousLoop([opMsg], activeDilemma);
    }, 50);
  };

  // Human Operator Intervention: Works at ANY MOMENT without locking!
  const handleHumanIntervene = () => {
    const interventionText = topic.trim();
    if (!interventionText) return;

    const opMsg: Message = {
      id: `op_intervene_${Date.now()}`,
      topicId: "street_topic",
      speaker: "human",
      seatId: null,
      authorName: "İnsan Operatör",
      roleTitle: "Müdahale",
      providerName: "Mikrofon / Klavye",
      model: "",
      color: "#f97316",
      avatar: "OP",
      content: interventionText,
      round: latestMessagesRef.current.length + 1,
      tokens: 0,
      latencyMs: 0,
      status: "done",
      createdAt: new Date().toISOString(),
    };

    const newHistory = [...latestMessagesRef.current, opMsg];
    setMessages(newHistory);
    setTopic("");

    // If debate was running, let it continue with the next character responding to operator
    if (!isDebatingRef.current) {
      runAutonomousLoop(newHistory, activeTopicRef.current || interventionText);
    }
  };

  // Give turn explicitly to a specific character
  const handleCueSpecificSpeaker = async (charId: string) => {
    const targetChar =
      DEFAULT_STREET_CHARACTERS.find((c) => c.id === charId) ||
      DEFAULT_STREET_CHARACTERS[0];

    const currentHist = [...latestMessagesRef.current];
    const dilemma = activeTopicRef.current || "Sokak Meclisi İkilemi";

    isDebatingRef.current = true;
    setRunning(true);
    await runCharacterTurn(targetChar, currentHist, dilemma);
  };

  // Send entire debate transcript to Synthesis Room
  const handleExportToSynthesis = () => {
    if (messages.length === 0) return;
    const report = messages
      .map((m) => `[${m.authorName} - ${m.roleTitle}]:\n${m.content}`)
      .join("\n\n═══════════════════════════════════════\n\n");
    const summary = `--- SOKAK MECLİSİ İNSAN HALLERİ TUTANAĞI ---\nGÜNDEM: ${activeTopicRef.current || "Sokak Meclisi"}\n\n${report}`;
    onSendToSynthesis(summary);
  };

  const selectedChar =
    DEFAULT_STREET_CHARACTERS.find((c) => c.id === selectedCharId) ||
    DEFAULT_STREET_CHARACTERS[0];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0a0d13]">
      {/* ── Top Bar / HUD ── */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#222a35] bg-[#0d1117] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-xl border border-[#f97316]/40 bg-[#f97316]/10 text-lg shadow-md shadow-orange-950/40">
            🏙️
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-disp text-sm font-bold tracking-wider text-white">
                Sokak Meclisi
              </h2>
              <span className="font-mono text-xs text-[#f97316]">
                // İnsan Halleri Odası [08]
              </span>
              <Chip
                color="#f43f5e"
                className="hidden font-mono text-[9px] font-bold sm:inline-flex"
              >
                TEKNİK JARGON YASAK
              </Chip>
              <Chip
                color="#22c55e"
                className="hidden font-mono text-[9px] font-bold md:inline-flex"
              >
                🟢 DAHİLİ TÜRKÇE MOTOR HAZIR (API GEREKMEZ)
              </Chip>
              {running && (
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Canlı Sokak Tartışması Akıyor
                </span>
              )}
            </div>
            <div className="text-[11px] text-[#8b949e]">
              7 Çelişen İnsan Arketipi · Kesintisiz Oturma & Çatışma · Operatör Asla Kilitlenmez
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
              title="Bölünmüş Görünüm (Tutanak + D3 Ağı)"
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
              title="Sadece Konuşma Akışı"
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
              title="Tam Ekran D3 Ağı"
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
              title="Tutanakları Sentez Hakemine Gönder"
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

      {/* ── Street Archetypes Roster Carousel ── */}
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-[#222a35] bg-[#0c1017] px-4 py-2 scrollbar-none">
        <span className="flex items-center gap-1 font-disp text-[11px] font-bold uppercase tracking-wider text-[#8b949e]">
          <Users className="h-3 w-3 text-[#f97316]" />
          Masadakiler:
        </span>

        {DEFAULT_STREET_CHARACTERS.map((char) => {
          const isSpeaking = activeSpeakerId === char.id;
          const isSelected = selectedCharId === char.id;
          const count = messages.filter((m) => m.seatId === char.id).length;

          return (
            <button
              key={char.id}
              onClick={() => setSelectedCharId(char.id)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all ${
                isSelected
                  ? "border-[#f97316] bg-[#1a202c] text-white shadow"
                  : "border-[#222a35] bg-[#10141d] text-[#8b949e] hover:border-[#333d4e] hover:text-white"
              } ${isSpeaking ? "animate-pulse border-amber-400 ring-1 ring-amber-400" : ""}`}
            >
              <span className="text-base">{char.avatar}</span>
              <span className="font-medium text-white">{char.name}</span>
              <span
                className="rounded px-1 text-[9px] font-bold"
                style={{ backgroundColor: `${char.color}22`, color: char.color }}
              >
                {char.archetype.split(" ")[0]}
              </span>
              {count > 0 && (
                <span className="grid h-4 w-4 place-items-center rounded-full bg-white/10 font-mono text-[9px] text-[#e6edf3]">
                  {count}
                </span>
              )}
              {isSpeaking && (
                <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Main Content Area (Split / Transcript / Graph) ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left Column: Debate Transcript & Actions */}
        {(viewMode === "split" || viewMode === "transcript") && (
          <div
            className={`flex flex-col border-r border-[#222a35] ${
              viewMode === "split" ? "w-full md:w-1/2 lg:w-3/5" : "w-full"
            }`}
          >
            {/* Input & Mic Panel — UNBLOCKED OPERATOR */}
            <div className="border-b border-[#222a35] bg-[#101520] p-3 shadow-inner">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-disp text-xs font-semibold uppercase tracking-wider text-[#e6edf3]">
                  <Flame className="h-3.5 w-3.5 text-[#f97316]" />
                  İnsan Operatör Masası (Mikrofon & Klavye Asla Kilitlenmez)
                </span>

                {/* Preset Dilemma Quick Dropdown */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-[#8b949e]">Hazır İkilemler:</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setTopic(e.target.value);
                      }
                    }}
                    defaultValue=""
                    className="rounded border border-[#222a35] bg-[#0c1017] px-2 py-0.5 text-xs text-[#e6edf3] focus:border-[#f97316] focus:outline-none"
                  >
                    <option value="" disabled>
                      Seçiniz...
                    </option>
                    {PRESET_STREET_DILEMMAS.map((p, idx) => (
                      <option key={idx} value={p.dilemma}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Text Input & Mic Button — NEVER DISABLED */}
              <div className="relative">
                <textarea
                  rows={2}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={
                    running
                      ? "Masada tartışma sürerken istediğin an buraya yazıp veya mikrofona basıp araya girebilirsin..."
                      : "Örn: 'Çocuğunu kurtarmak için patronun kaçak işini ifşa etmek mi, susup parayı almak mı?' ya da mikrofona tıkla ve konuş..."
                  }
                  className="w-full resize-none rounded-lg border border-[#2a364a] bg-[#0c1017] p-2.5 pr-20 text-xs text-slate-100 placeholder:text-[#8b949e] focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316] focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (running) {
                        handleHumanIntervene();
                      } else {
                        handleStartDebate();
                      }
                    }
                  }}
                />

                <div className="absolute right-2 top-2 flex items-center gap-1.5">
                  {/* Real-time Microphone — ALWAYS ACTIVE */}
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`grid h-7 w-7 place-items-center rounded-lg border transition-all ${
                        listening
                          ? "animate-pulse border-red-500 bg-red-500/30 text-red-300 ring-2 ring-red-500/50"
                          : "border-[#2e3b50] bg-[#161d28] text-slate-300 hover:border-amber-400 hover:text-white"
                      }`}
                      title={
                        listening
                          ? "Dinleniyor... Konuşmanız anında metne dönüşüyor"
                          : "Mikrofonla Sesli Konuş / Müdahale Et"
                      }
                    >
                      {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                    </button>
                  )}

                  {/* Send / Intervene Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (running) {
                        handleHumanIntervene();
                      } else {
                        handleStartDebate();
                      }
                    }}
                    disabled={!topic.trim()}
                    className="grid h-7 w-7 place-items-center rounded-lg border border-[#f97316]/50 bg-[#f97316] text-black font-bold hover:bg-[#ea580c] disabled:opacity-40 disabled:hover:bg-[#f97316]"
                    title={running ? "Araya Gir (Sözünü Masaya Vur)" : "Tartışmayı Başlat"}
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
                      className="bg-[#f97316] hover:bg-[#ea580c] text-black font-semibold text-xs"
                    >
                      <Play className="mr-1 h-3.5 w-3.5 fill-current" />
                      Tartışmayı Başlat (7 Karakter Akışı)
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
                      Araya Gir (Operatör Sözü)
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
                    Masayı Sustur (Durdur)
                  </Button>
                )}
              </div>
            </div>

            {/* Messages Transcript Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#0a0d13]">
              {messages.length === 0 ? (
                <div className="grid h-full place-items-center text-center p-6">
                  <div className="max-w-md">
                    <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-[#222a35] bg-[#111722] text-2xl shadow-lg shadow-black/60">
                      🏛️
                    </div>
                    <h3 className="font-disp text-base font-bold text-white">
                      Sokak Meclisi Hazır
                    </h3>
                    <p className="mt-1 text-xs text-[#8b949e] leading-relaxed">
                      Burada robotik modeller, suni zekalar ve kodlar konuşulmaz.
                      Yukarıdan bir ahlaki ikilem seçin veya mikrofona konuşup masaya
                      atın. 7 zıt hayat arketipi kendi çıplak gerçeklikleriyle yüzleşsin.
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                      {PRESET_STREET_DILEMMAS.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setTopic(p.dilemma);
                            handleStartDebate(p.dilemma);
                          }}
                          className="rounded-lg border border-[#222a35] bg-[#10141d] px-2.5 py-1.5 text-[11px] text-[#e6edf3] hover:border-[#f97316] hover:text-white transition-colors"
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
                  const isStreaming = m.status === "streaming";

                  return (
                    <div
                      key={m.id}
                      className={`rounded-xl border p-4 transition-all shadow-md ${
                        isHuman
                          ? "border-[#f97316]/50 bg-[#19130d]"
                          : "border-[#222c3c] bg-[#0e141f]"
                      }`}
                      style={{
                        borderLeftWidth: "4px",
                        borderLeftColor: m.color || "#8b949e",
                      }}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2 border-b border-[#1b2332] pb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl drop-shadow">{m.avatar}</span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-disp text-[13px] font-bold text-white">
                                {m.authorName}
                              </span>
                              <span
                                className="rounded px-1.5 py-0.5 font-mono text-[9.5px] font-semibold"
                                style={{
                                  backgroundColor: `${m.color}25`,
                                  color: m.color,
                                }}
                              >
                                {m.roleTitle}
                              </span>
                            </div>
                            <div className="font-mono text-[9px] text-[#8b949e]">
                              {m.providerName} {m.model ? `· ${m.model}` : ""}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[10px] text-[#8b949e]">
                          {isStreaming && (
                            <span className="flex items-center gap-1 font-bold text-amber-400">
                              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                              Konuşuyor...
                            </span>
                          )}
                          {m.tokens > 0 && <span>{m.tokens} kelime/token</span>}
                          {m.latencyMs > 0 && <span>{m.latencyMs}ms</span>}
                        </div>
                      </div>

                      {/* Content — High contrast crisp typography */}
                      <div className="whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed text-slate-100 select-text">
                        {m.content}
                      </div>

                      {/* Clean card footer with explicit turn option if idle */}
                      {!isHuman && !isStreaming && (
                        <div className="mt-2.5 flex items-center justify-between border-t border-[#161f2c] pt-2 text-[10.5px] text-[#8b949e]">
                          <span className="font-mono text-[9.5px]">
                            {m.roleTitle} Perspektifi
                          </span>
                          <button
                            onClick={() => handleCueSpecificSpeaker(m.seatId || "")}
                            className="flex items-center gap-1 rounded border border-[#2a374c] bg-[#121926] px-2 py-0.5 text-[10px] text-slate-300 hover:border-[#f97316] hover:text-white transition-colors"
                            title="Bu karaktere tekrar söz ver"
                          >
                            <Sparkles className="h-3 w-3 text-amber-400" />
                            Tekrar Söz Ver
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Right Column: Interactive D3 Graph and Character Dossier */}
        {(viewMode === "split" || viewMode === "graph") && (
          <div
            className={`flex flex-col bg-[#0b0e14] ${
              viewMode === "split" ? "w-full md:w-1/2 lg:w-2/5" : "w-full"
            }`}
          >
            {/* Top Bar for Graph Section */}
            <div className="flex shrink-0 items-center justify-between border-b border-[#222a35] bg-[#0e131d] px-3 py-2">
              <div className="flex items-center gap-1.5 font-disp text-xs font-semibold text-white">
                <Network className="h-3.5 w-3.5 text-[#38bdf8]" />
                <span>D3.js Argüman & Çatışma Ağı</span>
              </div>
              <div className="font-mono text-[10px] text-[#8b949e]">
                {messages.length} Karakter Etkileşimi · Canlı Fizik Motoru
              </div>
            </div>

            {/* D3 Graph Canvas */}
            <div className="relative min-h-[320px] flex-1">
              <ArgumentGraph
                messages={messages}
                seats={streetSeatsAsSeats}
                topicTitle={activeTopicRef.current || topic || "Sokak Meclisi İkilemi"}
                className="h-full w-full"
              />
            </div>

            {/* Selected Character Dossier Card at Bottom of Graph */}
            <div className="shrink-0 border-t border-[#222a35] bg-[#0f141f] p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{selectedChar.avatar}</span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-disp text-xs font-bold text-white">
                        {selectedChar.name}
                      </span>
                      <span
                        className="rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold"
                        style={{
                          backgroundColor: `${selectedChar.color}22`,
                          color: selectedChar.color,
                        }}
                      >
                        {selectedChar.archetype}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#8b949e]">
                      {selectedChar.tagline}
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCueSpecificSpeaker(selectedChar.id)}
                  className="border-white/20 text-xs text-white hover:border-[#f97316] hover:bg-[#f97316]/10"
                >
                  <Sparkles className="mr-1 h-3 w-3 text-amber-400" />
                  Söz Ver
                </Button>
              </div>

              {/* Character Prompt Philosophy Snippet */}
              <div className="rounded-lg border border-[#222a35] bg-[#090d14] p-2.5 font-mono text-[10.5px] leading-relaxed text-slate-300">
                <div className="text-[9.5px] uppercase tracking-wider text-[#f97316] mb-1 font-bold">
                  Karakterin Ruh Hali & Yaklaşımı:
                </div>
                {selectedChar.systemPrompt.slice(0, 240)}...
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
