import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Columns,
  Copy,
  Eraser,
  FileText,
  Image as ImageIcon,
  Landmark,
  Mic,
  MicOff,
  Network,
  OctagonX,
  Play,
  RotateCcw,
  Send,
  SkipForward,
  Sparkles,
  Volume2,
} from "lucide-react";
import { Message, Provider, Seat, SessionTopic } from "../types";
import { Avatar, Button, Chip, Panel, PanelHeader, StatusDot, TextInput } from "./ui";
import { MarkdownView } from "./MarkdownView";
import { useSpeechRecognition } from "../lib/useSpeechRecognition";
import { ArgumentGraph } from "./ArgumentGraph";

export function CouncilRoom({
  seats,
  providers,
  activeTopic,
  messages,
  running,
  onStartCouncil,
  onNextTurn,
  onAutoDebate,
  onInterject,
  onStop,
  onClear,
  onExportToSynthesis,
  onExportToImageStudio,
}: {
  seats: Seat[];
  providers: Provider[];
  activeTopic: SessionTopic | null;
  messages: Message[];
  running: boolean;
  onStartCouncil: (question: string) => Promise<void>;
  onNextTurn: () => Promise<void>;
  onAutoDebate: (rounds: number) => Promise<void>;
  onInterject: (content: string) => Promise<void>;
  onStop: () => void;
  onClear: () => void;
  onExportToSynthesis: () => void;
  onExportToImageStudio: (prompt: string) => void;
}) {
  const [draftTopic, setDraftTopic] = useState("");
  const [interjection, setInterjection] = useState("");
  const [autoRounds, setAutoRounds] = useState(2);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [debateTone, setDebateTone] = useState<"war_room" | "pragmatic" | "truth_seeker">("war_room");
  const [autoSendVoice, setAutoSendVoice] = useState(false);
  const [viewMode, setViewMode] = useState<"transcript" | "graph" | "split">("split");

  // Real-time Speech-to-Text via Web Speech API
  const speech = useSpeechRecognition({
    defaultLang: "tr-TR",
    onFinalResult: (finalText) => {
      if (activeTopic) {
        setInterjection((prev) => (prev ? `${prev} ${finalText}` : finalText));
        if (autoSendVoice && finalText.trim()) {
          onInterject(finalText.trim());
        }
      } else {
        setDraftTopic((prev) => (prev ? `${prev} ${finalText}` : finalText));
      }
    },
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const councilSeats = seats.filter((s) => s.slot !== "referee" && s.active);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleStart = async () => {
    const q = draftTopic.trim();
    if (!q) return;
    setDraftTopic("");
    await onStartCouncil(q);
  };

  const handleInterject = async () => {
    const text = interjection.trim();
    if (!text) return;
    setInterjection("");
    await onInterject(text);
  };

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Find next speaker index
  const modelMsgs = messages.filter((m) => m.speaker === "seat");
  const nextSeatIndex = modelMsgs.length % (councilSeats.length || 1);
  const nextSeat = councilSeats[nextSeatIndex];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4 lg:flex-row">
      {/* Main Transcript Card */}
      <Panel className="flex min-w-0 flex-1 flex-col overflow-hidden" glowColor="#c084fc">
        <PanelHeader
          accent="#c084fc"
          icon={<Landmark size={15} />}
          title={
            <div className="flex items-center gap-2">
              <span>MASA 01 · AÇIK KONSEY ODASI</span>
              {activeTopic?.question && (
                <span className="hidden max-w-md truncate font-normal text-[#8b949e] md:inline">
                  — {activeTopic.question}
                </span>
              )}
            </div>
          }
          right={
            <div className="flex items-center gap-2">
              {running && (
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-black/40 border border-[#38bdf8]/30">
                  <span className="h-2 w-0.5 animate-pulse bg-[#38bdf8]" />
                  <span className="h-4 w-0.5 animate-pulse bg-[#c084fc] delay-75" />
                  <span className="h-3 w-0.5 animate-pulse bg-[#fbbf24] delay-150" />
                  <span className="h-5 w-0.5 animate-pulse bg-[#22c55e] delay-200" />
                  <span className="h-2.5 w-0.5 animate-pulse bg-[#38bdf8]" />
                  <span className="ml-1 font-mono text-[9.5px] text-[#38bdf8]">CANLI AKIŞ</span>
                </div>
              )}

              {/* View Mode Toggle (Tutanak, D3 Ağ, Böl) */}
              <div className="flex rounded-lg border border-[#303a48] bg-[#0b1016] p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("transcript")}
                  className={`flex items-center gap-1 rounded px-2 py-1 font-disp text-[11px] font-semibold transition-colors ${
                    viewMode === "transcript" ? "bg-[#1c2330] text-white" : "text-[#8b949e] hover:text-white"
                  }`}
                  title="Sadece Tutanak Akışı"
                >
                  <FileText size={11} />
                  <span className="hidden xl:inline">Tutanak</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("graph")}
                  className={`flex items-center gap-1 rounded px-2 py-1 font-disp text-[11px] font-semibold transition-colors ${
                    viewMode === "graph" ? "bg-[#1c2330] text-[#38bdf8]" : "text-[#8b949e] hover:text-white"
                  }`}
                  title="Sadece D3.js Argüman Ağı"
                >
                  <Network size={11} />
                  <span className="hidden xl:inline">D3 Ağı</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("split")}
                  className={`flex items-center gap-1 rounded px-2 py-1 font-disp text-[11px] font-semibold transition-colors ${
                    viewMode === "split" ? "bg-[#1c2330] text-[#c084fc]" : "text-[#8b949e] hover:text-white"
                  }`}
                  title="Tutanak ve D3 Ağı Birlikte"
                >
                  <Columns size={11} />
                  <span className="hidden xl:inline">Böl</span>
                </button>
              </div>

              <Chip color={running ? "#38bdf8" : messages.length ? "#22c55e" : undefined}>
                <StatusDot tone={running ? "#38bdf8" : messages.length ? "#22c55e" : "#57606a"} pulse={running} />
                <span>{running ? "tartışma akıyor" : messages.length ? "oturum açık" : "boş masa"}</span>
              </Chip>

              <Button
                size="sm"
                variant="outline"
                onClick={onExportToSynthesis}
                disabled={!messages.length}
                title="Tutanakları Başhakem Sentezine aktar"
              >
                <ArrowRight size={12} />
                <span className="hidden sm:inline">Senteze Aktar</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => onExportToImageStudio(activeTopic?.question || "Konsey Kararı")}
                disabled={!activeTopic?.question}
                title="Görsel & Konsept Stüdyosuna aktar"
              >
                <ImageIcon size={12} />
                <span className="hidden sm:inline">Görsel Üret</span>
              </Button>

              <Button size="sm" variant="ghost" onClick={onClear} disabled={!messages.length}>
                <Eraser size={12} />
                <span className="hidden sm:inline">Temizle</span>
              </Button>
            </div>
          }
        />

        {/* Optional D3 Argument Network Graph in Split or Full Graph Mode */}
        {viewMode === "graph" ? (
          <div className="flex-1 min-h-0 overflow-hidden p-2">
            <ArgumentGraph
              messages={messages}
              seats={seats}
              topicTitle={activeTopic?.question}
              className="h-full border-0"
            />
          </div>
        ) : (
          <>
            {viewMode === "split" && (
              <div className="border-b border-[#222a35] p-2 bg-[#0a0e14]/60">
                <ArgumentGraph
                  messages={messages}
                  seats={seats}
                  topicTitle={activeTopic?.question}
                  className="border-[#222a35]"
                />
              </div>
            )}

            {/* Messages Transcript Scroll Area */}
            <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          {!activeTopic && messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-[#8b949e]">
              <div className="mb-3 grid h-16 w-16 place-items-center rounded-2xl border border-[#222a35] bg-[#111722] text-[#c084fc] shadow-lg shadow-purple-950/20">
                <Landmark size={32} />
              </div>
              <h3 className="font-disp text-base font-bold text-white">Konsey Masası Kuruldu</h3>
              <p className="mt-1.5 max-w-md text-xs leading-relaxed text-[#8b949e]">
                Aşağıya gündemi yazarak konseyi başlatın. Model A (Stratejist) açılışı yapar,
                Model B (Tekniker) mimariyi kurar, Model C (Eleştirmen) riskleri denetler.
                Siz de insan operatör olarak dilediğiniz turda araya girebilirsiniz.
              </p>
            </div>
          ) : (
            <>
              {activeTopic?.question && (
                <div className="rounded-xl border border-[#303a48] bg-[#141a25] p-3 shadow-inner">
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#38bdf8]">
                    GÜNDEM MADDESİ
                  </div>
                  <div className="mt-1 text-xs font-semibold text-white leading-relaxed">
                    {activeTopic.question}
                  </div>
                </div>
              )}

              {messages.map((m) => {
                const isHuman = m.speaker === "human";
                const accent = m.color || (isHuman ? "#e6edf3" : "#c084fc");
                return (
                  <div
                    key={m.id}
                    className="flex flex-col gap-1 rounded-xl border p-3 transition-colors"
                    style={{
                      borderColor: isHuman ? "#303a48" : `${accent}35`,
                      backgroundColor: isHuman ? "#131924" : "#111722",
                      borderLeftWidth: isHuman ? 1 : 4,
                      borderLeftColor: accent,
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Avatar label={m.avatar || (isHuman ? "OP" : "AI")} color={accent} size={24} ring={m.status === "streaming"} />
                      <span className="font-disp text-xs font-bold" style={{ color: isHuman ? "#ffffff" : accent }}>
                        {m.authorName}
                      </span>
                      {m.roleTitle && (
                        <span className="text-[11px] text-[#8b949e]">· {m.roleTitle}</span>
                      )}
                      {m.round > 0 && <Chip>Tur {m.round}</Chip>}
                      {m.model && <Chip color={accent}>{m.model}</Chip>}

                      {m.status === "streaming" && (
                        <Chip color="#38bdf8">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#38bdf8]" />
                          yazıyor
                        </Chip>
                      )}
                      {m.status === "stopped" && <Chip color="#fbbf24">durduruldu</Chip>}

                      <div className="ml-auto flex items-center gap-2 font-mono text-[10px] text-[#8b949e]">
                        {m.tokens > 0 && <span>{m.tokens} tok</span>}
                        {m.latencyMs > 0 && <span>{(m.latencyMs / 1000).toFixed(1)}s</span>}
                        <button
                          onClick={() => copyMessage(m.id, m.content)}
                          className="rounded p-1 text-[#8b949e] hover:text-white"
                          title="Mesajı kopyala"
                        >
                          {copiedId === m.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>

                    <div className="mt-1">
                      <MarkdownView content={m.content} streaming={m.status === "streaming"} />
                    </div>

                    {m.error && (
                      <div className="mt-2 rounded-lg border border-[#ef4444]/40 bg-[#2a1215] p-2 text-xs text-[#ff9aa2]">
                        ⚠ {m.error}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
        </>
      )}

        {/* Input Bar with Real-Time Web Speech API Microphone Integration */}
        <div className="border-t border-[#222a35] bg-[#0d1117] p-3 space-y-2">
          {/* Live Speech Recognition Banner / Interim Feedback */}
          {speech.listening && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-[#ef4444]/40 bg-[#ef4444]/10 px-3 py-1.5 text-xs text-[#ff9aa2] shadow-sm animate-pulse">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444] animate-ping shrink-0" />
                <span className="font-disp font-bold text-white shrink-0">CANLI DİNLİYOR ({speech.lang}):</span>
                <span className="truncate italic text-[#fecdd3]">
                  {speech.interimTranscript || "Konuşmanız bekleniyor..."}
                </span>
              </div>
              <button
                type="button"
                onClick={speech.stopListening}
                className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-mono border border-[#ef4444]/50 bg-black/40 hover:bg-black/60 text-white"
              >
                Durdur ⏹
              </button>
            </div>
          )}

          {speech.error && (
            <div className="rounded-lg border border-[#ef4444]/40 bg-[#2a1215] px-3 py-1.5 text-xs text-[#ff9aa2]">
              ⚠ {speech.error}
            </div>
          )}

          {!activeTopic ? (
            <div className="flex items-center gap-2">
              <TextInput
                value={draftTopic}
                onChange={(e) => setDraftTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) handleStart();
                }}
                placeholder={
                  speech.listening
                    ? "Konuşun, sesiniz yazıya dökülüyor..."
                    : "Konsey gündemini yazın veya mikrofonla sesli söyleyin..."
                }
                className="flex-1"
              />

              {/* Web Speech API Mic Toggle Button */}
              {speech.supported && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={speech.toggleListening}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all cursor-pointer ${
                      speech.listening
                        ? "border-[#ef4444] bg-[#ef4444]/25 text-[#ef4444] shadow-lg shadow-red-950/50 scale-105"
                        : "border-[#303a48] bg-[#161b22] text-[#8b949e] hover:border-[#38bdf8] hover:text-white"
                    }`}
                    title={speech.listening ? "Mikrofonu Kapat" : "Sesle Gündem Belirt (Mikrofon)"}
                  >
                    {speech.listening ? <MicOff size={15} className="animate-bounce" /> : <Mic size={15} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => speech.setLang(speech.lang === "tr-TR" ? "en-US" : "tr-TR")}
                    className="h-8 rounded-lg border border-[#303a48] bg-[#111722] px-2 font-mono text-[10px] text-[#8b949e] hover:text-white"
                    title="Ses tanıma dili"
                  >
                    {speech.lang === "tr-TR" ? "TR" : "EN"}
                  </button>
                </div>
              )}

              <Button variant="primary" onClick={handleStart} disabled={!draftTopic.trim() || running}>
                <Send size={13} />
                <span>Konseyi Başlat</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="grid shrink-0 place-items-center rounded-lg border border-[#303a48] bg-[#161b22] px-2.5 font-mono text-[10px] text-white">
                OPERATÖR
              </span>
              <TextInput
                value={interjection}
                onChange={(e) => setInterjection(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) handleInterject();
                }}
                placeholder={
                  speech.listening
                    ? "Konuşun, operatör müdahaleniz canlı dinleniyor..."
                    : "Tartışmaya operatör olarak araya girin veya mikrofona konuşun..."
                }
                className="flex-1"
              />

              {/* Web Speech API Mic Toggle Button */}
              {speech.supported && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={speech.toggleListening}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all cursor-pointer ${
                      speech.listening
                        ? "border-[#ef4444] bg-[#ef4444]/25 text-[#ef4444] shadow-lg shadow-red-950/50 scale-105"
                        : "border-[#303a48] bg-[#161b22] text-[#8b949e] hover:border-[#38bdf8] hover:text-white"
                    }`}
                    title={speech.listening ? "Mikrofonu Kapat" : "Sesli Müdahale Yap (Mikrofon)"}
                  >
                    {speech.listening ? <MicOff size={15} className="animate-bounce" /> : <Mic size={15} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => speech.setLang(speech.lang === "tr-TR" ? "en-US" : "tr-TR")}
                    className="h-8 rounded-lg border border-[#303a48] bg-[#111722] px-2 font-mono text-[10px] text-[#8b949e] hover:text-white"
                    title="Ses tanıma dili"
                  >
                    {speech.lang === "tr-TR" ? "TR" : "EN"}
                  </button>
                </div>
              )}

              <Button variant="outline" onClick={handleInterject} disabled={!interjection.trim()}>
                <Send size={13} />
                <span>Söz Al</span>
              </Button>
            </div>
          )}
        </div>
      </Panel>

      {/* Right Command Column */}
      <div className="flex w-full shrink-0 flex-col gap-3 lg:w-72">
        {/* Council Seats Panel */}
        <Panel glowColor="#c084fc">
          <PanelHeader
            title="Masadaki Üyeler"
            accent="#c084fc"
            icon={<Sparkles size={14} />}
          />
          <div className="space-y-2 p-3">
            {councilSeats.map((seat, index) => {
              const provider = providers.find((p) => p.id === seat.providerId);
              const isSpeaking = messages.some((m) => m.seatId === seat.id && m.status === "streaming");
              const isNext = nextSeat?.id === seat.id && !running;

              return (
                <div
                  key={seat.id}
                  className={`flex items-center gap-2.5 rounded-xl border p-2.5 transition-all ${
                    isSpeaking
                      ? "border-[#38bdf8] bg-[#38bdf8]/10"
                      : "border-[#222a35] bg-[#111722]"
                  }`}
                  style={{
                    borderLeft: `3px solid ${seat.color}`,
                  }}
                >
                  <Avatar label={seat.avatar} color={seat.color} size={28} ring={isSpeaking} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 font-disp text-xs font-semibold text-white">
                      <span>{seat.name}</span>
                      <span className="text-[10px] text-[#8b949e] font-normal truncate">
                        · {seat.roleTitle}
                      </span>
                    </div>
                    <div className="truncate font-mono text-[9px] text-[#8b949e]">
                      {provider?.name || "Sağlayıcı"} / {seat.model}
                    </div>
                  </div>
                  {isNext && <Chip color="#c084fc">sırada</Chip>}
                  {isSpeaking && <Chip color="#38bdf8">konuşuyor</Chip>}
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Debate Flow Controls */}
        <Panel glowColor="#38bdf8">
          <PanelHeader
            title="Tartışma Kontrolü"
            accent="#38bdf8"
            icon={<Play size={14} />}
          />
          <div className="space-y-2.5 p-3">
            <div>
              <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-[#8b949e]">
                <span>Münazara Modu</span>
                <span className="text-[#38bdf8] font-bold">
                  {debateTone === "war_room" ? "Savaş Odası" : debateTone === "pragmatic" ? "Hızlı MVP" : "Hakikat Arama"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => setDebateTone("war_room")}
                  className={`rounded-lg border px-1.5 py-1 text-[10px] font-disp font-semibold transition-colors ${
                    debateTone === "war_room"
                      ? "border-[#ef4444] bg-[#ef4444]/20 text-white shadow-sm"
                      : "border-[#222a35] bg-[#111722] text-[#8b949e] hover:text-white"
                  }`}
                  title="Agresif strateji, tavizsiz tartışma"
                >
                  ⚔ Savaş Odası
                </button>
                <button
                  type="button"
                  onClick={() => setDebateTone("pragmatic")}
                  className={`rounded-lg border px-1.5 py-1 text-[10px] font-disp font-semibold transition-colors ${
                    debateTone === "pragmatic"
                      ? "border-[#38bdf8] bg-[#38bdf8]/20 text-white shadow-sm"
                      : "border-[#222a35] bg-[#111722] text-[#8b949e] hover:text-white"
                  }`}
                  title="Uygulama ve kod odaklı pragmatizm"
                >
                  ⚡ Hızlı MVP
                </button>
                <button
                  type="button"
                  onClick={() => setDebateTone("truth_seeker")}
                  className={`rounded-lg border px-1.5 py-1 text-[10px] font-disp font-semibold transition-colors ${
                    debateTone === "truth_seeker"
                      ? "border-[#c084fc] bg-[#c084fc]/20 text-white shadow-sm"
                      : "border-[#222a35] bg-[#111722] text-[#8b949e] hover:text-white"
                  }`}
                  title="Kör noktaları ve kanıt boşluklarını avlar"
                >
                  🔍 Hakikat
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-[#222a35] pt-2">
              <span className="font-mono text-[11px] text-[#8b949e]">Tur Sayısı</span>
              <div className="flex gap-1">
                {[1, 2, 3, 5].map((r) => (
                  <button
                    key={r}
                    onClick={() => setAutoRounds(r)}
                    className={`rounded border px-2 py-1 font-mono text-xs transition-colors ${
                      autoRounds === r
                        ? "border-[#38bdf8] bg-[#38bdf8]/15 text-[#38bdf8]"
                        : "border-[#222a35] bg-[#111722] text-[#8b949e] hover:text-white"
                    }`}
                  >
                    {r} Tur
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              variant="outline"
              onClick={onNextTurn}
              disabled={running || !activeTopic}
            >
              <SkipForward size={14} />
              <span>Sonraki Sözü Ver ({nextSeat?.name || "Sıradaki"})</span>
            </Button>

            <Button
              className="w-full"
              variant="primary"
              onClick={() => onAutoDebate(autoRounds)}
              disabled={running || !activeTopic}
            >
              <Play size={14} />
              <span>Otomatik Tartışma ({autoRounds} Tur)</span>
            </Button>

            <Button
              className="w-full"
              variant="danger"
              onClick={onStop}
              disabled={!running}
            >
              <OctagonX size={14} />
              <span>Durdur</span>
            </Button>

            <div className="rounded-lg border border-[#222a35] bg-[#0b1016] p-2 text-[10.5px] leading-relaxed text-[#8b949e]">
              Modeller sıralı olarak önceki konuşmacının argümanlarını değerlendirir,
              teknik fizibilitesini sınar ve zayıf varsayımlarını sorgular.
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
