import React, { useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Eraser,
  EyeOff,
  Mic,
  MicOff,
  OctagonX,
  Scale,
  Zap,
} from "lucide-react";
import { Message, Provider, Seat } from "../types";
import { Avatar, Button, Chip, Panel, PanelHeader, Select, StatusDot, TextInput } from "./ui";
import { MarkdownView } from "./MarkdownView";
import { useSpeechRecognition } from "../lib/useSpeechRecognition";

export interface JuryColumnState {
  seatId: string;
  model: string;
  content: string;
  status: "idle" | "streaming" | "done" | "stopped" | "error";
  tokens: number;
  latencyMs: number;
  error?: string;
}

export function JuryRoom({
  seats,
  providers,
  juryColumns,
  onUpdateColumnSeat,
  onUpdateColumnModel,
  running,
  onRunParallelJury,
  onStopAll,
  onClearJury,
  onExportToSynthesis,
}: {
  seats: Seat[];
  providers: Provider[];
  juryColumns: JuryColumnState[];
  onUpdateColumnSeat: (colIndex: number, seatId: string) => void;
  onUpdateColumnModel: (colIndex: number, model: string) => void;
  running: boolean;
  onRunParallelJury: (question: string) => Promise<void>;
  onStopAll: () => void;
  onClearJury: () => void;
  onExportToSynthesis: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const speech = useSpeechRecognition({
    defaultLang: "tr-TR",
    onFinalResult: (finalText) => {
      setQuestion((prev) => (prev ? `${prev} ${finalText}` : finalText));
    },
  });

  const handleRun = () => {
    const q = question.trim();
    if (!q) return;
    onRunParallelJury(q);
  };

  const copyColumn = (index: number, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const hasAnyContent = juryColumns.some((c) => c.content);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      {/* Top Question Panel */}
      <Panel glowColor="#38bdf8">
        <PanelHeader
          accent="#38bdf8"
          icon={<Scale size={15} />}
          title="MASA 02 · KÖR JÜRİ ODASI"
          right={
            <div className="flex items-center gap-2">
              <Chip color={running ? "#38bdf8" : hasAnyContent ? "#22c55e" : undefined}>
                <StatusDot tone={running ? "#38bdf8" : hasAnyContent ? "#22c55e" : "#57606a"} pulse={running} />
                <span>{running ? "paralel üretim aktif" : "hazır"}</span>
              </Chip>
              <Button size="sm" variant="primary" onClick={handleRun} disabled={!question.trim() || running}>
                <Zap size={13} />
                <span>Paralel Karşılaştır</span>
              </Button>
              <Button size="sm" variant="danger" onClick={onStopAll} disabled={!running}>
                <OctagonX size={13} />
                <span>Durdur</span>
              </Button>
              <Button size="sm" variant="outline" onClick={onExportToSynthesis} disabled={!hasAnyContent}>
                <ArrowRight size={13} />
                <span>Senteze Aktar</span>
              </Button>
              <Button size="sm" variant="ghost" onClick={onClearJury} disabled={!hasAnyContent && !question}>
                <Eraser size={13} />
                <span>Temizle</span>
              </Button>
            </div>
          }
        />
        <div className="border-t border-[#222a35] p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#8b949e]">
            <div className="flex items-center gap-1.5">
              <EyeOff size={13} className="text-[#38bdf8]" />
              <span>Kör jüri kuralı: 3 model birbirini görmez ve duymaz. Aynı soru paralel işlenir.</span>
            </div>
            {speech.listening && (
              <span className="font-disp text-xs font-bold text-[#ef4444] animate-pulse">
                🔴 Canlı ses dinleniyor ({speech.lang})...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <TextInput
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) handleRun();
              }}
              placeholder={
                speech.listening
                  ? "Sorunuzu sesli söyleyin, yazıya dökülüyor..."
                  : "Üç modele aynı anda sorulacak soruyu yazın veya mikrofonla dikte edin..."
              }
              className="flex-1"
            />

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
                  title={speech.listening ? "Mikrofonu Kapat" : "Sesle Soru Dikte Et (Mikrofon)"}
                >
                  {speech.listening ? <MicOff size={15} className="animate-bounce" /> : <Mic size={15} />}
                </button>
                <button
                  type="button"
                  onClick={() => speech.setLang(speech.lang === "tr-TR" ? "en-US" : "tr-TR")}
                  className="h-8 rounded-lg border border-[#303a48] bg-[#111722] px-2 font-mono text-[10px] text-[#8b949e] hover:text-white"
                >
                  {speech.lang === "tr-TR" ? "TR" : "EN"}
                </button>
              </div>
            )}
          </div>
        </div>
      </Panel>

      {/* 3 Parallel Columns */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-3">
        {juryColumns.map((col, index) => {
          const seat = seats.find((s) => s.id === col.seatId) || seats[index] || seats[0];
          const provider = providers.find((p) => p.id === seat.providerId);
          const accent = seat?.color || "#38bdf8";

          const statusTone =
            col.status === "streaming"
              ? "#38bdf8"
              : col.status === "error"
              ? "#ef4444"
              : col.status === "done"
              ? "#22c55e"
              : col.status === "stopped"
              ? "#fbbf24"
              : "#57606a";

          return (
            <Panel
              key={index}
              className="flex min-h-0 flex-col overflow-hidden"
              style={{ borderColor: `${accent}40` }}
            >
              {/* Column Header */}
              <div className="border-b border-[#222a35] bg-[#111722] p-2.5">
                <div className="flex items-center gap-2">
                  <Avatar label={seat?.avatar || String(index + 1)} color={accent} size={28} ring={col.status === "streaming"} />
                  <div className="min-w-0 flex-1">
                    <div className="font-disp text-xs font-bold text-white truncate">
                      Jüri Kolonu {index + 1} · {seat?.name}
                    </div>
                    <div className="text-[10px] text-[#8b949e] truncate">
                      {seat?.roleTitle}
                    </div>
                  </div>
                  <Chip color={statusTone}>
                    <StatusDot tone={statusTone} pulse={col.status === "streaming"} />
                    <span className="capitalize">{col.status === "streaming" ? "üretiliyor" : col.status}</span>
                  </Chip>
                </div>

                {/* Model & Seat Selectors */}
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <Select
                    value={col.seatId}
                    onChange={(e) => onUpdateColumnSeat(index, e.target.value)}
                    className="py-1 text-[11px]"
                  >
                    {seats.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.roleTitle})
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={col.model}
                    onChange={(e) => onUpdateColumnModel(index, e.target.value)}
                    className="py-1 font-mono text-[10.5px]"
                  >
                    {(provider?.models || [seat.model]).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Column Response Content */}
              <div className="flex-1 overflow-y-auto p-3.5">
                {col.content ? (
                  <MarkdownView content={col.content} streaming={col.status === "streaming"} />
                ) : col.status === "streaming" ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-[#8b949e]">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#38bdf8] border-t-transparent" />
                    <span className="font-mono text-xs text-[#38bdf8]">Bağımsız yanıt üretiliyor...</span>
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center p-6 text-center text-[#57606a]">
                    <EyeOff size={24} className="mb-2 opacity-50" />
                    <p className="text-xs leading-relaxed">
                      Soruyu yazıp <b>Paralel Karşılaştır</b>'a basın.
                      Bu kolon diğer modellerin cevabını asla görmeden bağımsız çalışır.
                    </p>
                  </div>
                )}
                {col.error && (
                  <div className="mt-2 rounded-lg border border-[#ef4444]/40 bg-[#2a1215] p-2 text-xs text-[#ff9aa2]">
                    ⚠ {col.error}
                  </div>
                )}
              </div>

              {/* Column Footer */}
              <div className="flex items-center justify-between border-t border-[#222a35] bg-[#0b1016] px-3 py-1.5 font-mono text-[10px] text-[#8b949e]">
                <span>
                  {col.tokens ? `${col.tokens} tok` : ""} {col.latencyMs ? `· ${(col.latencyMs / 1000).toFixed(1)}s` : ""}
                </span>
                <button
                  onClick={() => copyColumn(index, col.content)}
                  disabled={!col.content}
                  className="flex items-center gap-1 rounded border border-[#303a48] px-2 py-0.5 text-[#8b949e] hover:border-white hover:text-white disabled:opacity-40"
                >
                  {copiedIndex === index ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  <span>Kopyala</span>
                </button>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
