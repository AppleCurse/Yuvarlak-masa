import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  Eraser,
  FileText,
  Gavel,
  Image as ImageIcon,
  Landmark,
  OctagonX,
  Printer,
  Scale,
  Sparkles,
  Target,
  Volume2,
  VolumeX,
  Wand2,
} from "lucide-react";
import { Provider, Seat, SessionTopic } from "../types";
import { speakCharacterText, stopSpeech, subscribeSpeech } from "../lib/speech";
import { Avatar, Button, Chip, Panel, PanelHeader, Select, StatusDot, TextArea } from "./ui";
import { MarkdownView } from "./MarkdownView";

interface SectionCard {
  key: "consensus" | "risk" | "action" | "note" | "other";
  title: string;
  color: string;
  body: string;
}

export function SynthesisRoom({
  refereeSeat,
  providers,
  sourceText,
  onUpdateSourceText,
  operatorNote,
  onUpdateOperatorNote,
  reportText,
  running,
  onRunSynthesis,
  onStop,
  onClear,
  onPullFromCouncil,
  onPullFromJury,
  savedSessions,
  onLoadSession,
  onExportToImageStudio,
}: {
  refereeSeat: Seat;
  providers: Provider[];
  sourceText: string;
  onUpdateSourceText: (text: string) => void;
  operatorNote: string;
  onUpdateOperatorNote: (note: string) => void;
  reportText: string;
  running: boolean;
  onRunSynthesis: () => Promise<void>;
  onStop: () => void;
  onClear: () => void;
  onPullFromCouncil: () => void;
  onPullFromJury: () => void;
  savedSessions: SessionTopic[];
  onLoadSession: (id: string) => void;
  onExportToImageStudio: (prompt: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"official" | "cards" | "raw">("official");
  const [isSpeakingTts, setIsSpeakingTts] = useState(false);

  useEffect(() => {
    return subscribeSpeech((id) => {
      setIsSpeakingTts(Boolean(id));
    });
  }, []);

  const provider = providers.find((p) => p.id === refereeSeat.providerId);

  // Parse report into structured cards if possible
  const sections = useMemo<SectionCard[]>(() => {
    if (!reportText.trim()) return [];

    const lines = reportText.split("\n");
    const result: SectionCard[] = [];
    let current: { title: string; lines: string[] } | null = null;

    for (const line of lines) {
      if (/^#{1,3}\s+/.test(line)) {
        if (current) {
          const t = current.title.toLowerCase();
          const key: SectionCard["key"] = t.includes("konsensüs") || t.includes("ortak")
            ? "consensus"
            : t.includes("anlaşmazlık") || t.includes("risk") || t.includes("çelişki")
            ? "risk"
            : t.includes("eylem") || t.includes("nihai") || t.includes("karar") || t.includes("plan")
            ? "action"
            : t.includes("hakem notu") || t.includes("not") || t.includes("güven")
            ? "note"
            : "other";

          const color =
            key === "consensus"
              ? "#22c55e"
              : key === "risk"
              ? "#fb7185"
              : key === "action"
              ? "#fbbf24"
              : key === "note"
              ? "#38bdf8"
              : "#c084fc";

          result.push({
            key,
            title: current.title,
            color,
            body: current.lines.join("\n").trim(),
          });
        }
        current = {
          title: line.replace(/^#{1,3}\s+/, "").trim(),
          lines: [],
        };
      } else if (current) {
        current.lines.push(line);
      }
    }

    if (current) {
      const t = current.title.toLowerCase();
      const key: SectionCard["key"] = t.includes("konsensüs") || t.includes("ortak")
        ? "consensus"
        : t.includes("anlaşmazlık") || t.includes("risk")
        ? "risk"
        : t.includes("eylem") || t.includes("nihai") || t.includes("karar")
        ? "action"
        : "note";

      const color =
        key === "consensus"
          ? "#22c55e"
          : key === "risk"
          ? "#fb7185"
          : key === "action"
          ? "#fbbf24"
          : "#38bdf8";

      result.push({
        key,
        title: current.title,
        color,
        body: current.lines.join("\n").trim(),
      });
    }

    return result;
  }, [reportText]);

  const copyReport = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadMarkdown = () => {
    const blob = new Blob([reportText], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `konsul-hakem-raporu-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4 lg:flex-row">
      {/* Left Input & Referee Config Panel */}
      <div className="flex w-full shrink-0 flex-col gap-3 lg:w-96">
        <Panel glowColor="#fbbf24">
          <PanelHeader
            title="Kaynak Malzeme Aktarımı"
            accent="#fbbf24"
            icon={<Wand2 size={15} />}
          />
          <div className="space-y-3 p-3">
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={onPullFromCouncil}>
                <Landmark size={12} className="text-[#c084fc]" />
                <span>Konseyden Çek</span>
              </Button>
              <Button size="sm" variant="outline" onClick={onPullFromJury}>
                <Scale size={12} className="text-[#38bdf8]" />
                <span>Kör Jüriden Çek</span>
              </Button>
            </div>

            {savedSessions.length > 0 && (
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[#8b949e]">
                  Arşivden Oturum Çek
                </label>
                <Select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) onLoadSession(e.target.value);
                  }}
                  className="py-1.5 text-xs"
                >
                  <option value="">Kayıtlı bir oturum seçin...</option>
                  {savedSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.room === "council" ? "Konsey" : "Jüri"}: {s.title}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <div>
              <div className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-[#8b949e]">
                <span>Ham Malzeme Metni</span>
                <span>{sourceText.length} karakter</span>
              </div>
              <TextArea
                rows={8}
                value={sourceText}
                onChange={(e) => onUpdateSourceText(e.target.value)}
                placeholder="Konsey tutanağı ya da kör jüri yanıtları buraya aktarılır. Dilerseniz elle de yapıştırabilir veya düzenleyebilirsiniz..."
                className="font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[#8b949e]">
                Operatör Talimatı (Opsiyonel)
              </label>
              <TextArea
                rows={2}
                value={operatorNote}
                onChange={(e) => onUpdateOperatorNote(e.target.value)}
                placeholder="Örn: Bütçe kısıtlarını önceliklendir, 1 aylık teslim hedefine göre karar ver..."
                className="text-xs"
              />
            </div>
          </div>
        </Panel>

        {/* Referee Seat Card */}
        <Panel glowColor="#fbbf24">
          <PanelHeader
            title="Başhakem Kürsüsü"
            accent="#fbbf24"
            icon={<Gavel size={15} />}
          />
          <div className="space-y-3 p-3">
            <div className="flex items-center gap-2.5 rounded-xl border border-[#fbbf24]/30 bg-[#161b22] p-2.5">
              <Avatar label={refereeSeat.avatar} color={refereeSeat.color} size={32} ring={running} />
              <div className="min-w-0 flex-1">
                <div className="font-disp text-xs font-bold text-white">
                  {refereeSeat.name} · {refereeSeat.roleTitle}
                </div>
                <div className="font-mono text-[10px] text-[#8b949e]">
                  {provider?.name || "Sağlayıcı"} / {refereeSeat.model}
                </div>
              </div>
              <Chip color={running ? "#38bdf8" : "#fbbf24"}>
                <StatusDot tone={running ? "#38bdf8" : "#fbbf24"} pulse={running} />
                <span>{running ? "sentezliyor" : "hazır"}</span>
              </Chip>
            </div>

            <Button
              variant="gold"
              className="w-full py-2.5 text-xs font-bold"
              onClick={onRunSynthesis}
              disabled={running || !sourceText.trim()}
            >
              <Target size={14} />
              <span>Nihai Hakem Raporu Üret</span>
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="danger" size="sm" onClick={onStop} disabled={!running}>
                <OctagonX size={12} />
                <span>Durdur</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={onClear} disabled={!reportText && !sourceText}>
                <Eraser size={12} />
                <span>Temizle</span>
              </Button>
            </div>
          </div>
        </Panel>
      </div>

      {/* Right Synthesis Output Panel */}
      <Panel className="flex min-w-0 flex-1 flex-col overflow-hidden" glowColor="#fbbf24">
        <PanelHeader
          accent="#fbbf24"
          icon={<Gavel size={15} />}
          title="MASA 03 · NİHAİ BAŞHAKEM SENTEZİ"
          right={
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-[#303a48] bg-[#0b1016] p-0.5">
                <button
                  onClick={() => setActiveTab("official")}
                  className={`rounded px-2.5 py-1 font-disp text-[11px] font-bold transition-colors flex items-center gap-1.5 ${
                    activeTab === "official"
                      ? "bg-amber-500 text-slate-950 shadow-sm"
                      : "text-[#8b949e] hover:text-white"
                  }`}
                >
                  <FileText size={12} />
                  <span>Resmi İlam (PDF)</span>
                </button>
                <button
                  onClick={() => setActiveTab("cards")}
                  className={`rounded px-2 py-1 font-disp text-[11px] font-semibold transition-colors ${
                    activeTab === "cards" ? "bg-[#1c2330] text-white" : "text-[#8b949e] hover:text-white"
                  }`}
                >
                  Kart Görünümü
                </button>
                <button
                  onClick={() => setActiveTab("raw")}
                  className={`rounded px-2 py-1 font-disp text-[11px] font-semibold transition-colors ${
                    activeTab === "raw" ? "bg-[#1c2330] text-white" : "text-[#8b949e] hover:text-white"
                  }`}
                >
                  Düz Metin
                </button>
              </div>

              {/* TTS Listen Button */}
              {reportText && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (isSpeakingTts) {
                      stopSpeech();
                    } else {
                      speakCharacterText("court_hakim", reportText);
                    }
                  }}
                  className={`text-xs ${isSpeakingTts ? "bg-amber-500 text-slate-950 font-bold" : "text-amber-300 border-amber-500/30"}`}
                  title={isSpeakingTts ? "Seslendirmeyi durdur" : "Kararı Başhakem sesiyle dinle"}
                >
                  {isSpeakingTts ? <VolumeX size={12} /> : <Volume2 size={12} />}
                  <span>{isSpeakingTts ? "Durdur" : "Sesli Dinle"}</span>
                </Button>
              )}

              {/* Print / PDF Button */}
              {reportText && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="text-xs border-slate-700 hover:border-slate-500"
                  title="Resmi mühürlü kararı yazdır veya PDF olarak kaydet"
                >
                  <Printer size={12} />
                  <span>Yazdır / PDF</span>
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => onExportToImageStudio(reportText.slice(0, 200) || "Hakem Sentezi")}
                disabled={!reportText}
                title="Sentez eylem planından konsept görsel üret"
              >
                <ImageIcon size={12} className="text-[#ec4899]" />
                <span className="hidden sm:inline">Görsele Aktar</span>
              </Button>

              <Button size="sm" variant="outline" onClick={copyReport} disabled={!reportText}>
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copied ? "Kopyalandı" : "Kopyala"}</span>
              </Button>

              <Button size="sm" variant="ghost" onClick={downloadMarkdown} disabled={!reportText}>
                <Download size={12} />
                <span className="hidden sm:inline">.md İndir</span>
              </Button>
            </div>
          }
        />

        <div className="flex-1 overflow-y-auto p-4">
          {!reportText && !running ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-[#8b949e]">
              <div className="mb-3 grid h-16 w-16 place-items-center rounded-2xl border border-[#222a35] bg-[#111722] text-[#fbbf24] shadow-lg shadow-amber-950/20">
                <Gavel size={32} />
              </div>
              <h3 className="font-disp text-base font-bold text-white">Başhakem Kürsüde</h3>
              <p className="mt-1.5 max-w-md text-xs leading-relaxed text-[#8b949e]">
                Soldaki panelden <b>Konseyden Çek</b> veya <b>Kör Jüriden Çek</b> butonuna basarak
                tutanağı aktarın ve <b>Nihai Hakem Raporu Üret</b> deyin.
                Hakem masadaki konsensüsü, anlaşmazlık noktalarını ve tek bir somut eylem planını sentezler.
              </p>
            </div>
          ) : activeTab === "official" ? (
            /* Official Printable Arbitration Decree & Seal */
            <div className="max-w-4xl mx-auto bg-slate-900 border-2 border-amber-500/30 rounded-2xl p-8 shadow-2xl relative overflow-hidden print:bg-white print:text-slate-900 print:border-slate-900 print:p-6 print:m-0">
              {/* Official Seal Watermark */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] print:opacity-[0.06] pointer-events-none text-[280px] font-black select-none">
                ⚖️
              </div>

              {/* Document Header */}
              <div className="text-center border-b-2 border-amber-500/40 pb-5 mb-6 print:border-slate-900">
                <div className="text-[11px] font-mono tracking-[0.25em] uppercase text-amber-400 print:text-slate-700 font-bold mb-1">
                  T.C. KONSÜL TAHKİM HEYETİ & BAŞHAKEM DİVANI
                </div>
                <h1 className="text-lg md:text-xl font-black text-slate-100 print:text-slate-950 tracking-wide uppercase">
                  GEREKÇELİ TAHKİM HÜKMÜ VE NİHAİ MÜTALAA İLAMI
                </h1>
                <div className="flex flex-wrap items-center justify-center gap-4 mt-2 text-xs font-mono text-slate-400 print:text-slate-600">
                  <span>ESAS NO: 2026/89-T</span>
                  <span>•</span>
                  <span>KARAR NO: 2026/14</span>
                  <span>•</span>
                  <span>TARİH: {new Date().toLocaleDateString("tr-TR")}</span>
                  <span>•</span>
                  <span className="text-emerald-400 print:text-slate-800 font-bold">BAĞLAYICI & NİHAİ</span>
                </div>
              </div>

              {/* Source Case Summary */}
              {sourceText && (
                <div className="mb-6 bg-slate-950/60 print:bg-slate-100 border border-slate-800 print:border-slate-400 rounded-xl p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 print:text-slate-800 mb-1">
                    📋 DOSYA / UYUŞMAZLIK ÖZETİ
                  </div>
                  <p className="text-xs text-slate-300 print:text-slate-800 line-clamp-4 leading-relaxed font-sans">
                    {sourceText.slice(0, 450)}...
                  </p>
                </div>
              )}

              {/* Decision Markdown Body */}
              <div className="text-xs text-slate-200 print:text-slate-950 leading-relaxed font-serif prose prose-invert print:prose-neutral max-w-none mb-8">
                <MarkdownView content={reportText} streaming={running} />
              </div>

              {/* Official Signatures & Seal Section */}
              <div className="border-t-2 border-amber-500/40 print:border-slate-900 pt-6 mt-8">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-slate-200 print:text-slate-900">
                      Prof. Dr. Tahkim Hakemi
                    </div>
                    <div className="text-[10px] text-slate-400 print:text-slate-600">
                      Heyet Başkanı (Mühür Sahibi)
                    </div>
                    <div className="font-mono text-xs text-amber-400 print:text-slate-800 italic pt-3">
                      [İmza / Mühür]
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-amber-500/60 print:border-slate-900 flex items-center justify-center text-xs font-bold text-amber-400 print:text-slate-900 uppercase">
                      RESMİ MÜHÜR
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-slate-200 print:text-slate-900">
                      Kıdemli Raportör
                    </div>
                    <div className="text-[10px] text-slate-400 print:text-slate-600">
                      Tutanak ve İnfaz Kâtibi
                    </div>
                    <div className="font-mono text-xs text-amber-400 print:text-slate-800 italic pt-3">
                      [İmza / Mühür]
                    </div>
                  </div>
                </div>

                <div className="text-center text-[10px] font-mono text-slate-500 print:text-slate-600 mt-6">
                  Bu belge KONSÜL Tahkim Heyeti tarafından dijital olarak tanzim edilmiş olup, 5070 sayılı Elektronik İmza Kanunu uyarınca güvenli imza ile teyit edilmiştir.
                </div>
              </div>
            </div>
          ) : activeTab === "cards" && sections.length >= 2 ? (
            <div className="space-y-3">
              {sections.map((sec, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border p-4 shadow-sm"
                  style={{
                    borderColor: `${sec.color}40`,
                    background: `linear-gradient(180deg, ${sec.color}10, rgba(22, 27, 34, 0.75))`,
                  }}
                >
                  <div
                    className="mb-2 flex items-center gap-2 border-b pb-2 font-disp text-xs font-bold uppercase tracking-wider"
                    style={{ color: sec.color, borderColor: `${sec.color}25` }}
                  >
                    <span>{sec.title}</span>
                  </div>
                  <MarkdownView content={sec.body} />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[#222a35] bg-[#111722] p-4">
              <MarkdownView content={reportText} streaming={running} />
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
