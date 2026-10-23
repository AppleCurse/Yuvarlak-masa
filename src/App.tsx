import React, { useCallback, useEffect, useRef, useState } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { CouncilRoom } from "./components/CouncilRoom";
import { JuryColumnState, JuryRoom } from "./components/JuryRoom";
import { SynthesisRoom } from "./components/SynthesisRoom";
import { ImageStudioRoom } from "./components/ImageStudioRoom";
import { CodeAutopsyRoom } from "./components/CodeAutopsyRoom";
import { RecordsRoom } from "./components/RecordsRoom";
import { SettingsRoom } from "./components/SettingsRoom";
import { StreetCouncilRoom } from "./components/StreetCouncilRoom";
import { DevilsAdvocateRoom } from "./components/DevilsAdvocateRoom";
import { LieDetectorRoom } from "./components/LieDetectorRoom";
import { TimelessGiantsRoom } from "./components/TimelessGiantsRoom";
import { DEFAULT_PROVIDERS, DEFAULT_SEATS } from "./lib/defaults";
import {
  createSession,
  deleteSession,
  fetchImages,
  fetchSessions,
  generateAiImage,
  streamChat,
  updateSession,
} from "./lib/api";
import { AspectRatio, ImageAsset, ImageModel, Message, Provider, RoomId, Seat, SessionTopic } from "./types";

export default function App() {
  const [activeRoom, setActiveRoom] = useState<RoomId>("council");
  const [providers, setProviders] = useState<Provider[]>(() => {
    try {
      const saved = localStorage.getItem("konsul_providers_v2");
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_PROVIDERS;
  });

  const [seats, setSeats] = useState<Seat[]>(() => {
    try {
      const saved = localStorage.getItem("konsul_seats_v2");
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_SEATS;
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("konsul_providers_v2", JSON.stringify(providers));
    } catch {}
  }, [providers]);

  useEffect(() => {
    try {
      localStorage.setItem("konsul_seats_v2", JSON.stringify(seats));
    } catch {}
  }, [seats]);

  // ── Global Abort Controllers ──
  const abortMapRef = useRef<Map<string, AbortController>>(new Map());

  const getNewAbortSignal = (key: string) => {
    abortMapRef.current.get(key)?.abort();
    const ctrl = new AbortController();
    abortMapRef.current.set(key, ctrl);
    return ctrl.signal;
  };

  const abortKey = (key: string) => {
    abortMapRef.current.get(key)?.abort();
    abortMapRef.current.delete(key);
  };

  const stopAll = useCallback(() => {
    for (const ctrl of abortMapRef.current.values()) {
      ctrl.abort();
    }
    abortMapRef.current.clear();
    setCouncilRunning(false);
    setJuryRunning(false);
    setSynthRunning(false);
    setJuryColumns((cols) =>
      cols.map((c) => (c.status === "streaming" ? { ...c, status: "stopped" } : c))
    );
  }, []);

  // ── Council State ──
  const [councilTopic, setCouncilTopic] = useState<SessionTopic | null>(null);
  const [councilMessages, setCouncilMessages] = useState<Message[]>([]);
  const [councilRunning, setCouncilRunning] = useState(false);

  // ── Jury State ──
  const [juryColumns, setJuryColumns] = useState<JuryColumnState[]>([
    {
      seatId: DEFAULT_SEATS[0]?.id || "seat_strategist",
      model: DEFAULT_SEATS[0]?.model || "gemini-3.8-flash",
      content: "",
      status: "idle",
      tokens: 0,
      latencyMs: 0,
    },
    {
      seatId: DEFAULT_SEATS[1]?.id || "seat_engineer",
      model: DEFAULT_SEATS[1]?.model || "gemini-3.8-flash",
      content: "",
      status: "idle",
      tokens: 0,
      latencyMs: 0,
    },
    {
      seatId: DEFAULT_SEATS[2]?.id || "seat_critic",
      model: DEFAULT_SEATS[2]?.model || "gemini-3.8-flash",
      content: "",
      status: "idle",
      tokens: 0,
      latencyMs: 0,
    },
  ]);
  const [juryRunning, setJuryRunning] = useState(false);

  // ── Synthesis State ──
  const [synthSource, setSynthSource] = useState("");
  const [synthOperatorNote, setSynthOperatorNote] = useState("");
  const [synthReport, setSynthReport] = useState("");
  const [synthRunning, setSynthRunning] = useState(false);

  // ── Image Studio State ──
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [imageGenerating, setImageGenerating] = useState(false);

  // ── Sessions Archive ──
  const [savedSessions, setSavedSessions] = useState<SessionTopic[]>([]);

  // Load initial backend state
  useEffect(() => {
    fetchSessions().then((list) => setSavedSessions(list));
    fetchImages().then((imgs) => setImages(imgs));
  }, []);

  // ── Keyboard Shortcuts (Ctrl+1..6, Ctrl+.) ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "1") {
          e.preventDefault();
          setActiveRoom("council");
        } else if (e.key === "2") {
          e.preventDefault();
          setActiveRoom("jury");
        } else if (e.key === "3") {
          e.preventDefault();
          setActiveRoom("synthesis");
        } else if (e.key === "4") {
          e.preventDefault();
          setActiveRoom("autopsy");
        } else if (e.key === "5") {
          e.preventDefault();
          setActiveRoom("images");
        } else if (e.key === "6") {
          e.preventDefault();
          setActiveRoom("records");
        } else if (e.key === "7") {
          e.preventDefault();
          setActiveRoom("settings");
        } else if (e.key === "8") {
          e.preventDefault();
          setActiveRoom("street");
        } else if (e.key === "9") {
          e.preventDefault();
          setActiveRoom("devils_advocate");
        } else if (e.key === "0") {
          e.preventDefault();
          setActiveRoom("lie_detector");
        } else if (e.key === "-") {
          e.preventDefault();
          setActiveRoom("timeless");
        } else if (e.key === ".") {
          e.preventDefault();
          stopAll();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stopAll]);

  // ═══════════════════════════════════════════════════════════════
  // MASA 1: AÇIK KONSEY İŞLEMLERİ
  // ═══════════════════════════════════════════════════════════════
  const councilSeats = seats.filter((s) => s.slot !== "referee" && s.active);

  const startCouncil = async (question: string) => {
    const newTopic: SessionTopic = {
      id: `top_${Date.now()}`,
      room: "council",
      title: question.slice(0, 50),
      question,
      status: "running",
      rounds: 2,
      pinned: false,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setCouncilTopic(newTopic);
    const humanMsg: Message = {
      id: `msg_h_${Date.now()}`,
      topicId: newTopic.id,
      speaker: "human",
      seatId: null,
      authorName: "İnsan Operatör",
      roleTitle: "Operatör",
      providerName: "yerel",
      model: "",
      color: "#e6edf3",
      avatar: "OP",
      content: `**Gündem Belirlendi:** ${question}`,
      round: 0,
      tokens: 0,
      latencyMs: 0,
      status: "done",
      createdAt: new Date().toISOString(),
    };

    setCouncilMessages([humanMsg]);
    newTopic.messages = [humanMsg];
    await createSession(newTopic);
    refreshSessions();

    // Trigger Model A turn immediately
    setCouncilRunning(true);
    await speakSeat(councilSeats[0], question, [humanMsg], 1);
    setCouncilRunning(false);
  };

  const speakSeat = async (
    seat: Seat,
    question: string,
    history: Message[],
    roundNo: number
  ) => {
    if (!seat) return;
    const provider =
      providers.find((p) => p.id === seat.providerId && p.apiKey?.trim()) ||
      providers.find((p) => p.apiKey?.trim()) ||
      providers.find((p) => p.id === "prov_demo" || p.kind === "demo") ||
      providers.find((p) => p.id === seat.providerId) ||
      providers[0];

    const liveId = `msg_${seat.id}_${Date.now()}`;
    const liveMsg: Message = {
      id: liveId,
      topicId: councilTopic?.id || "temp",
      speaker: "seat",
      seatId: seat.id,
      authorName: seat.name,
      roleTitle: seat.roleTitle,
      providerName: provider?.name || "Sağlayıcı",
      model: seat.model,
      color: seat.color,
      avatar: seat.avatar,
      content: "",
      round: roundNo,
      tokens: 0,
      latencyMs: 0,
      status: "streaming",
      createdAt: new Date().toISOString(),
    };

    setCouncilMessages((prev) => [...prev, liveMsg]);

    const transcriptText = history
      .map((m) => `${m.authorName} (${m.roleTitle || "Operatör"}):\n${m.content}`)
      .join("\n\n---\n\n");

    const chatMessages = [
      {
        role: "system",
        content: `${seat.systemPrompt}\n\nKonsey Tartışması Gündemi: ${question}\nSıra sende. Önceki konuşmacıların argümanlarını dikkate al, tekrar etmeden kendi uzmanlık perspekfitinden somut katkı ver.`,
      },
      {
        role: "user",
        content: transcriptText
          ? `GÜNDEM: ${question}\n\nÖNCEKİ TUTANAK:\n${transcriptText}\n\nSöz sırası sende: ${seat.name} (${seat.roleTitle}, Tur ${roundNo}).`
          : `GÜNDEM: ${question}\n\nMasadaki ilk sözü alıyorsun. Gündemi stratejik çerçeveye oturt ve açılışı yap.`,
      },
    ];

    const signal = getNewAbortSignal("council");
    const result = await streamChat({
      provider,
      seat,
      model: seat.model,
      messages: chatMessages,
      temperature: seat.temperature,
      signal,
      onToken: (_tok, full) => {
        setCouncilMessages((prev) =>
          prev.map((m) => (m.id === liveId ? { ...m, content: full } : m))
        );
      },
    });

    const finalStatus = result.error ? "error" : result.stopped ? "stopped" : "done";
    setCouncilMessages((prev) =>
      prev.map((m) =>
        m.id === liveId
          ? {
              ...m,
              content: result.content || (result.stopped ? "(üretim durduruldu)" : ""),
              status: finalStatus,
              tokens: result.tokens,
              latencyMs: result.latencyMs,
              error: result.error,
            }
          : m
      )
    );

    if (councilTopic?.id) {
      updateSession(councilTopic.id, {
        messages: [...history, { ...liveMsg, content: result.content, status: finalStatus }],
      });
    }
  };

  const nextTurn = async () => {
    if (councilRunning || !councilTopic) return;
    const modelMsgs = councilMessages.filter((m) => m.speaker === "seat");
    const nextIndex = modelMsgs.length % councilSeats.length;
    const nextSeat = councilSeats[nextIndex];
    const roundNo = Math.floor(modelMsgs.length / councilSeats.length) + 1;

    setCouncilRunning(true);
    await speakSeat(nextSeat, councilTopic.question, councilMessages, roundNo);
    setCouncilRunning(false);
  };

  const autoDebate = async (rounds: number) => {
    if (councilRunning || !councilTopic) return;
    setCouncilRunning(true);

    const totalSpeakers = councilSeats.length * rounds;
    let currentMsgs = [...councilMessages];

    for (let i = 0; i < totalSpeakers; i++) {
      if (!abortMapRef.current.has("council") && i > 0 && !councilRunning) break;
      const modelMsgs = currentMsgs.filter((m) => m.speaker === "seat");
      const nextIndex = modelMsgs.length % councilSeats.length;
      const nextSeat = councilSeats[nextIndex];
      const roundNo = Math.floor(modelMsgs.length / councilSeats.length) + 1;

      await speakSeat(nextSeat, councilTopic.question, currentMsgs, roundNo);
      currentMsgs = councilMessages;
    }

    setCouncilRunning(false);
    refreshSessions();
  };

  const interjectOperator = async (content: string) => {
    if (!content.trim()) return;
    const opMsg: Message = {
      id: `msg_op_${Date.now()}`,
      topicId: councilTopic?.id || "temp",
      speaker: "human",
      seatId: null,
      authorName: "İnsan Operatör",
      roleTitle: "Müdahale",
      providerName: "yerel",
      model: "",
      color: "#e6edf3",
      avatar: "OP",
      content,
      round: 0,
      tokens: 0,
      latencyMs: 0,
      status: "done",
      createdAt: new Date().toISOString(),
    };

    setCouncilMessages((prev) => [...prev, opMsg]);
    if (councilTopic?.id) {
      await updateSession(councilTopic.id, {
        messages: [...councilMessages, opMsg],
      });
    }
  };

  const clearCouncil = () => {
    abortKey("council");
    setCouncilRunning(false);
    setCouncilTopic(null);
    setCouncilMessages([]);
  };

  // ═══════════════════════════════════════════════════════════════
  // MASA 2: KÖR JÜRİ İŞLEMLERİ (PARALEL)
  // ═══════════════════════════════════════════════════════════════
  const runParallelJury = async (question: string) => {
    setJuryRunning(true);
    setJuryColumns((cols) =>
      cols.map((c) => ({
        ...c,
        content: "",
        status: "streaming",
        tokens: 0,
        latencyMs: 0,
        error: undefined,
      }))
    );

    // Save jury session
    const topic: SessionTopic = {
      id: `top_jury_${Date.now()}`,
      room: "jury",
      title: question.slice(0, 50),
      question,
      status: "running",
      rounds: 1,
      pinned: false,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await createSession(topic);
    refreshSessions();

    await Promise.all(
      juryColumns.map(async (col, idx) => {
        const seat = seats.find((s) => s.id === col.seatId) || seats[idx] || seats[0];
        const provider =
          providers.find((p) => p.id === seat.providerId && p.apiKey?.trim()) ||
          providers.find((p) => p.apiKey?.trim()) ||
          providers.find((p) => p.id === "prov_demo" || p.kind === "demo") ||
          providers.find((p) => p.id === seat.providerId) ||
          providers[0];

        const chatMessages = [
          {
            role: "system",
            content: `${seat.systemPrompt}\n\nKÖR JÜRİ KURALI: Diğer modellerin yanıtlarını göremezsin ve duyamazsın. Yalnızca kendi bağımsız uzmanlık analizinle yanıt üret. İskelet: ## Kısa Cevap / ## Gerekçe / ## Somut Adımlar / ## Belirsizlikler.`,
          },
          {
            role: "user",
            content: `OPERATÖRÜN SORUSU:\n${question}\n\nBağımsız yanıtını sun.`,
          },
        ];

        const signal = getNewAbortSignal(`jury_${idx}`);
        const result = await streamChat({
          provider,
          seat,
          model: col.model || seat.model,
          messages: chatMessages,
          temperature: seat.temperature,
          signal,
          onToken: (_tok, full) => {
            setJuryColumns((prev) =>
              prev.map((c, i) => (i === idx ? { ...c, content: full } : c))
            );
          },
        });

        const status = result.error ? "error" : result.stopped ? "stopped" : "done";
        setJuryColumns((prev) =>
          prev.map((c, i) =>
            i === idx
              ? {
                  ...c,
                  content: result.content || (result.stopped ? "(üretim durduruldu)" : ""),
                  status,
                  tokens: result.tokens,
                  latencyMs: result.latencyMs,
                  error: result.error,
                }
              : c
          )
        );
      })
    );

    setJuryRunning(false);
    refreshSessions();
  };

  const clearJury = () => {
    [0, 1, 2].forEach((i) => abortKey(`jury_${i}`));
    setJuryRunning(false);
    setJuryColumns((cols) =>
      cols.map((c) => ({
        ...c,
        content: "",
        status: "idle",
        tokens: 0,
        latencyMs: 0,
        error: undefined,
      }))
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // MASA 3: SENTEZ VE BAŞHAKEM İŞLEMLERİ
  // ═══════════════════════════════════════════════════════════════
  const refereeSeat =
    seats.find((s) => s.slot === "referee") ||
    seats[seats.length - 1] ||
    DEFAULT_SEATS[3];

  const pullFromCouncil = () => {
    if (!councilMessages.length) return;
    const header = councilTopic?.question ? `GÜNDEM: ${councilTopic.question}\n\n` : "";
    const transcript = councilMessages
      .map((m) => `[${m.authorName} - ${m.roleTitle}]:\n${m.content}`)
      .join("\n\n---\n\n");
    setSynthSource(header + transcript);
    setActiveRoom("synthesis");
  };

  const pullFromJury = () => {
    const answered = juryColumns.filter((c) => c.content);
    if (!answered.length) return;
    const body = answered
      .map((c, idx) => {
        const s = seats.find((seat) => seat.id === c.seatId);
        return `=== JÜRİ ${idx + 1} (${s?.name || "Model"} - ${s?.roleTitle || ""}) [${c.model}] ===\n${c.content}`;
      })
      .join("\n\n");
    setSynthSource(body);
    setActiveRoom("synthesis");
  };

  const runSynthesis = async () => {
    if (!synthSource.trim() || synthRunning) return;
    setSynthRunning(true);
    setSynthReport("");

    const provider =
      providers.find((p) => p.id === refereeSeat.providerId && p.apiKey?.trim()) ||
      providers.find((p) => p.apiKey?.trim()) ||
      providers.find((p) => p.id === "prov_demo" || p.kind === "demo") ||
      providers.find((p) => p.id === refereeSeat.providerId) ||
      providers[0];
    const prompt = [
      "AŞAĞIDAKİ ÇOKLU MODEL TUTANAĞINI ANALİZ ET VE NİHAİ BAŞHAKEM RAPORUNU ÜRET.",
      "=== KAYNAK METİN ===",
      synthSource,
      "=== SON ===",
      synthOperatorNote ? `\nOPERATÖRÜN EK TALİMATI: ${synthOperatorNote}` : "",
      "\nLütfen raporunu 4 net başlıkla sun:",
      "## 1. Ortaklaşılan Konular (Konsensüs)",
      "## 2. Anlaşmazlık ve Risk Noktaları",
      "## 3. Operatörün En Mantıklı Eylem Planı (Nihai Karar)",
      "## 4. Hakem Notu",
    ].join("\n");

    const chatMessages = [
      { role: "system", content: refereeSeat.systemPrompt },
      { role: "user", content: prompt },
    ];

    const signal = getNewAbortSignal("synthesis");
    const result = await streamChat({
      provider,
      seat: refereeSeat,
      model: refereeSeat.model,
      messages: chatMessages,
      temperature: refereeSeat.temperature,
      signal,
      onToken: (_tok, full) => {
        setSynthReport(full);
      },
    });

    setSynthReport(result.content || (result.stopped ? "(rapor durduruldu)" : ""));
    setSynthRunning(false);

    // Save synthesis session
    await createSession({
      room: "synthesis",
      title: "Başhakem Sentez Raporu",
      question: synthOperatorNote || "Çoklu model sentez ve karar raporu",
      status: "done",
      sourceText: synthSource,
      report: result.content,
    });
    refreshSessions();
  };

  // ═══════════════════════════════════════════════════════════════
  // MASA 4: GÖRSEL STÜDYOSU (ASPECT RATIO 1:1, 2:3, 3:2, 3:4, 4:3, 9:16, 16:9, 21:9)
  // ═══════════════════════════════════════════════════════════════
  const generateImageAction = async (params: {
    prompt: string;
    aspectRatio: AspectRatio;
    model: ImageModel;
    style: string;
  }) => {
    setImageGenerating(true);
    try {
      const res = await generateAiImage({
        prompt: params.prompt,
        aspectRatio: params.aspectRatio,
        model: params.model,
        style: params.style,
        sourceTopic: councilTopic?.question || "KONSÜL AI Stüdyosu",
      });

      if (res.ok && res.asset) {
        setImages((prev) => [res.asset!, ...prev]);
      }
    } finally {
      setImageGenerating(false);
    }
  };

  const exportToImageStudio = (promptText: string) => {
    setActiveRoom("images");
  };

  // ═══════════════════════════════════════════════════════════════
  // MASA 5: KAYITLAR & ARŞİV
  // ═══════════════════════════════════════════════════════════════
  const refreshSessions = async () => {
    const list = await fetchSessions();
    setSavedSessions(list);
  };

  const handleOpenSession = (s: SessionTopic) => {
    if (s.room === "council") {
      setCouncilTopic(s);
      setCouncilMessages(s.messages || []);
      setActiveRoom("council");
    } else if (s.room === "jury") {
      setJuryColumns((cols) =>
        cols.map((c, i) => {
          const m = s.messages?.[i];
          return {
            ...c,
            content: m?.content || "",
            status: "done",
          };
        })
      );
      setActiveRoom("jury");
    } else {
      setSynthSource(s.sourceText || "");
      setSynthReport(s.report || "");
      setActiveRoom("synthesis");
    }
  };

  const handleTogglePin = async (id: string) => {
    const session = savedSessions.find((s) => s.id === id);
    if (!session) return;
    const nextPin = !session.pinned;
    setSavedSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, pinned: nextPin } : s))
    );
    await updateSession(id, { pinned: nextPin });
  };

  const handleDeleteSession = async (id: string) => {
    setSavedSessions((prev) => prev.filter((s) => s.id !== id));
    await deleteSession(id);
  };

  // ═══════════════════════════════════════════════════════════════
  // MASA 6: SAĞLAYICILAR VE SANDALYE DÜZENLEME
  // ═══════════════════════════════════════════════════════════════
  const handleUpdateProvider = (id: string, patch: Partial<Provider>) => {
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const handleAddProvider = (newP: Provider) => {
    setProviders((prev) => [...prev, newP]);
  };

  const handleDeleteProvider = (id: string) => {
    setProviders((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdateSeat = (id: string, patch: Partial<Seat>) => {
    setSeats((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const handleBindAllSeatsToProvider = (providerId: string) => {
    const targetProvider = providers.find((p) => p.id === providerId);
    if (!targetProvider) return;
    const fallbackModel = targetProvider.models[0] || "default-model";

    setSeats((prev) =>
      prev.map((s, idx) => ({
        ...s,
        providerId,
        model: targetProvider.models[idx % targetProvider.models.length] || fallbackModel,
      }))
    );
  };

  const busy = councilRunning || juryRunning || synthRunning || imageGenerating;

  return (
    <div className="ambient-grid relative flex h-screen w-screen flex-col overflow-hidden bg-[#0a0e14] text-[#e6edf3]">
      {/* Top Header Command Bar */}
      <Header
        activeRoom={activeRoom}
        onSelectRoom={setActiveRoom}
        busy={busy}
        onStopAll={stopAll}
        onOpenSettings={() => setActiveRoom("settings")}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left Navigation Rail */}
        <Sidebar
          activeRoom={activeRoom}
          onSelectRoom={setActiveRoom}
          seats={seats}
          providers={providers}
          onEditSeat={(seatId) => {
            setActiveRoom("settings");
          }}
        />

        {/* Main Workstation Stage */}
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          {activeRoom === "council" && (
            <CouncilRoom
              seats={seats}
              providers={providers}
              activeTopic={councilTopic}
              messages={councilMessages}
              running={councilRunning}
              onStartCouncil={startCouncil}
              onNextTurn={nextTurn}
              onAutoDebate={autoDebate}
              onInterject={interjectOperator}
              onStop={() => abortKey("council")}
              onClear={clearCouncil}
              onExportToSynthesis={pullFromCouncil}
              onExportToImageStudio={exportToImageStudio}
            />
          )}

          {activeRoom === "jury" && (
            <JuryRoom
              seats={seats}
              providers={providers}
              juryColumns={juryColumns}
              onUpdateColumnSeat={(idx, seatId) => {
                setJuryColumns((prev) =>
                  prev.map((c, i) => (i === idx ? { ...c, seatId } : c))
                );
              }}
              onUpdateColumnModel={(idx, model) => {
                setJuryColumns((prev) =>
                  prev.map((c, i) => (i === idx ? { ...c, model } : c))
                );
              }}
              running={juryRunning}
              onRunParallelJury={runParallelJury}
              onStopAll={() => {
                [0, 1, 2].forEach((i) => abortKey(`jury_${i}`));
                setJuryRunning(false);
              }}
              onClearJury={clearJury}
              onExportToSynthesis={pullFromJury}
            />
          )}

          {activeRoom === "synthesis" && (
            <SynthesisRoom
              refereeSeat={refereeSeat}
              providers={providers}
              sourceText={synthSource}
              onUpdateSourceText={setSynthSource}
              operatorNote={synthOperatorNote}
              onUpdateOperatorNote={setSynthOperatorNote}
              reportText={synthReport}
              running={synthRunning}
              onRunSynthesis={runSynthesis}
              onStop={() => abortKey("synthesis")}
              onClear={() => {
                setSynthReport("");
                setSynthSource("");
                setSynthOperatorNote("");
              }}
              onPullFromCouncil={pullFromCouncil}
              onPullFromJury={pullFromJury}
              savedSessions={savedSessions}
              onLoadSession={(id) => {
                const s = savedSessions.find((x) => x.id === id);
                if (s) {
                  setSynthSource(
                    s.sourceText ||
                      (s.messages
                        ? s.messages.map((m) => `[${m.authorName}]: ${m.content}`).join("\n\n")
                        : s.question)
                  );
                }
              }}
              onExportToImageStudio={exportToImageStudio}
            />
          )}

          {activeRoom === "autopsy" && (
            <CodeAutopsyRoom
              seats={seats}
              providers={providers}
              onSendToCouncil={(question) => {
                startCouncil(question);
                setActiveRoom("council");
              }}
            />
          )}

          {activeRoom === "images" && (
            <ImageStudioRoom
              images={images}
              onGenerateImage={generateImageAction}
              generating={imageGenerating}
              councilTopic={councilTopic?.question}
              refereeReport={synthReport}
            />
          )}

          {activeRoom === "records" && (
            <RecordsRoom
              sessions={savedSessions}
              onOpenSession={handleOpenSession}
              onTogglePin={handleTogglePin}
              onDeleteSession={handleDeleteSession}
            />
          )}

          {activeRoom === "settings" && (
            <SettingsRoom
              providers={providers}
              onUpdateProvider={handleUpdateProvider}
              onAddProvider={handleAddProvider}
              onDeleteProvider={handleDeleteProvider}
              seats={seats}
              onUpdateSeat={handleUpdateSeat}
              onBindAllSeatsToProvider={handleBindAllSeatsToProvider}
            />
          )}

          {activeRoom === "street" && (
            <StreetCouncilRoom
              providers={providers}
              seats={seats}
              onSendToSynthesis={(text) => {
                setSynthSource(text);
                setActiveRoom("synthesis");
              }}
            />
          )}

          {activeRoom === "devils_advocate" && (
            <DevilsAdvocateRoom
              providers={providers}
              seats={seats}
              onSendToSynthesis={(text) => {
                setSynthSource(text);
                setActiveRoom("synthesis");
              }}
            />
          )}

          {activeRoom === "lie_detector" && (
            <LieDetectorRoom
              providers={providers}
              seats={seats}
              onSendToSynthesis={(text) => {
                setSynthSource(text);
                setActiveRoom("synthesis");
              }}
            />
          )}

          {activeRoom === "timeless" && (
            <TimelessGiantsRoom
              providers={providers}
              seats={seats}
              onSendToSynthesis={(text) => {
                setSynthSource(text);
                setActiveRoom("synthesis");
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
