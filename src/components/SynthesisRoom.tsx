import { useRef, useState } from "react";
import type { ExportedMaterial, Seat, SeatKey } from "../lib/types";
import { streamChat, type ChatMessage } from "../lib/client";
import Markdown from "./Markdown";
import { BTN_DANGER, BTN_PRIMARY, Panel, SectionTitle, Sigil } from "./ui";

export default function SynthesisRoom({
  seats,
  forceDemo,
  getCouncil,
  getJury,
  onEditSeat,
}: {
  seats: Record<SeatKey, Seat>;
  forceDemo: boolean;
  getCouncil: () => ExportedMaterial | null;
  getJury: () => ExportedMaterial | null;
  onEditSeat: (k: SeatKey) => void;
}) {
  const [material, setMaterial] = useState<ExportedMaterial | null>(null);
  const [report, setReport] = useState("");
  const [phase, setPhase] = useState<"idle" | "run" | "done" | "err" | "stopped">("idle");
  const [errText, setErrText] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const accRef = useRef("");

  const hakem = seats.H;

  const pull = (which: "council" | "jury") => {
    const m = which === "council" ? getCouncil() : getJury();
    if (m) setMaterial(m);
  };

  const generate = () => {
    if (!material) return;
    accRef.current = "";
    setReport("");
    setPhase("run");
    const ac = new AbortController();
    abortRef.current = ac;
    const messages: ChatMessage[] = [
      { role: "system", content: hakem.system },
      { role: "user", content: "Aşağıdaki kayıtları analiz et ve nihai raporu üret.\n\n" + material.text },
    ];
    streamChat(
      hakem,
      messages,
      ac.signal,
      {
        onDelta: (t) => {
          accRef.current = t;
          setReport(t);
        },
        onError: (e) => {
          setErrText(e);
          setPhase("err");
        },
        onDone: (stopped) => setPhase(stopped ? "stopped" : "done"),
      },
      forceDemo,
    );
  };

  const meta =
    phase === "run"
      ? "HAKEM YAZIYOR…"
      : phase === "done"
        ? "RAPOR TAMAM · " + new Date().toLocaleTimeString("tr-TR", { hour12: false })
        : phase === "stopped"
          ? "DURDURULDU"
          : phase === "err"
            ? "HATA"
            : material
              ? "KAYNAK: " + material.meta
              : "BEKLEMEDE";

  return (
    <>
      <div className="flex items-end gap-4 border-b border-edge bg-[linear-gradient(180deg,rgba(22,27,34,.7),transparent)] px-6 pb-3.5 pt-5">
        <div>
          <div className="font-mono text-[9.5px] uppercase tracking-[.3em] text-neon">Masa 03 · Başhakem Analizi</div>
          <h1 className="mt-0.5 font-disp text-[26px] font-bold leading-tight tracking-wide">SENTEZ &amp; HAKEM ODASI</h1>
        </div>
        <p className="ml-auto max-w-[520px] text-right text-[12.5px] leading-relaxed text-mut">
          Konsey tutanağını veya jüri yanıtlarını tek tıkla çekin; Hakem modeli konsensüsü, anlaşmazlıkları ve nihai
          eylem planını raporlasın.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[350px_1fr] gap-3.5 p-4 max-xl:grid-cols-1">
        {/* Sol: kaynak + hakem */}
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pb-1">
          <button
            onClick={() => pull("council")}
            className="flex w-full items-center gap-3 rounded-[4px] border border-edge bg-panel px-3.5 py-3 text-left transition-all duration-150 hover:-translate-y-px hover:border-clau hover:shadow-[0_0_18px_rgba(196,155,255,.2)]"
          >
            <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[4px] border border-clau/45 bg-clau/10 text-clau">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="12" cy="5" r="2.4" />
                <circle cx="5.5" cy="17.5" r="2.4" />
                <circle cx="18.5" cy="17.5" r="2.4" />
                <path d="M10.8 7.1 7 15.4M13.2 7.1 17 15.4M7.9 17.5h8.2" />
              </svg>
            </span>
            <span>
              <span className="block font-disp text-[13.5px] font-semibold">Metni Çek — Konsey Tutanağı</span>
              <span className="mt-0.5 block font-mono text-[9px] tracking-[.1em] text-mut">MASA 01 · {getCouncil() ? getCouncil()!.meta : "KAYIT YOK"}</span>
            </span>
          </button>

          <button
            onClick={() => pull("jury")}
            className="flex w-full items-center gap-3 rounded-[4px] border border-edge bg-panel px-3.5 py-3 text-left transition-all duration-150 hover:-translate-y-px hover:border-gem hover:shadow-[0_0_18px_rgba(88,166,255,.2)]"
          >
            <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[4px] border border-gem/45 bg-gem/10 text-gem">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <rect x="3" y="4.5" width="4.6" height="15" rx="1" />
                <rect x="9.7" y="4.5" width="4.6" height="15" rx="1" />
                <rect x="16.4" y="4.5" width="4.6" height="15" rx="1" />
              </svg>
            </span>
            <span>
              <span className="block font-disp text-[13.5px] font-semibold">Metni Çek — Jüri Yanıtları</span>
              <span className="mt-0.5 block font-mono text-[9px] tracking-[.1em] text-mut">MASA 02 · {getJury() ? getJury()!.meta : "KAYIT YOK"}</span>
            </span>
          </button>

          <Panel className="flex min-h-[140px] flex-1 flex-col">
            <div className="px-3.5 pt-3">
              <SectionTitle>Ham Malzeme</SectionTitle>
            </div>
            <div className="max-h-[260px] min-h-[90px] flex-1 overflow-y-auto whitespace-pre-wrap px-3.5 pb-3 font-mono text-[10.8px] leading-[1.7] text-mut">
              {material ? material.text : "Henüz malzeme çekilmedi. Yukarıdaki butonlarla Masa 01 veya Masa 02 kaydını bu odaya aktarın."}
            </div>
          </Panel>

          <Panel className="p-3.5">
            <SectionTitle>Başhakem</SectionTitle>
            <div className="mb-2.5 flex items-center gap-2.5 rounded-[3px] border border-edge bg-deep/35 px-2.5 py-2">
              <Sigil label="H" hex={hakem.hex} size={26} />
              <div className="min-w-0">
                <div className="font-disp text-[12px] font-semibold uppercase text-hakem">{hakem.role}</div>
                <div className="truncate font-mono text-[9.5px] text-mut">
                  {hakem.model} @ {hakem.baseUrl.replace("http://", "").replace("/v1", "")}
                </div>
              </div>
              <button className="ml-auto font-mono text-[9px] tracking-[.14em] text-fnt transition-colors hover:text-hakem" onClick={() => onEditSeat("H")}>
                AYAR ⚙
              </button>
            </div>
            <button className={BTN_PRIMARY + " w-full"} onClick={generate} disabled={!material || phase === "run"}>
              ◆ Sentez Raporu Üret
            </button>
            <button
              className={BTN_DANGER + " mt-2 w-full"}
              onClick={() => abortRef.current?.abort()}
              disabled={phase !== "run"}
            >
              ■ Durdur
            </button>
          </Panel>
        </div>

        {/* Sağ: nihai rapor */}
        <Panel className="flex min-h-[380px] flex-col overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-edge bg-deep/45 px-4 py-3">
            <span className="text-hakem">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M12 3v18M5 7h14M5 7 2.8 12a3.2 3.2 0 0 0 4.4 0L5 7ZM19 7l-2.2 5a3.2 3.2 0 0 0 4.4 0L19 7ZM8.5 21h7" />
              </svg>
            </span>
            <span className="font-disp text-[14px] font-semibold tracking-wide text-hakem">NİHAİ RAPOR</span>
            <span className="ml-auto font-mono text-[9px] tracking-[.16em] text-fnt">{meta}</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 text-[14px] leading-[1.7]">
            {phase === "idle" && !report && (
              <div className="flex min-h-[340px] flex-col items-center justify-center gap-3.5 text-center text-fnt">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#57606a" strokeWidth="1.3" className="opacity-60">
                  <path d="M12 3v18M5 7h14M5 7 2.8 12a3.2 3.2 0 0 0 4.4 0L5 7ZM19 7l-2.2 5a3.2 3.2 0 0 0 4.4 0L19 7ZM8.5 21h7" />
                </svg>
                <h3 className="font-disp text-[16px] tracking-wide text-mut">Hakem henüz kürsüye çıkmadı</h3>
                <p className="max-w-[400px] text-[12px] leading-relaxed">
                  Soldan malzemeyi çekin ve <b className="text-hakem">“Sentez Raporu Üret”</b> deyin. Rapor üç bölümde
                  gelir: Konsensüs · Anlaşmazlıklar · Eylem Planı.
                </p>
              </div>
            )}
            {phase === "err" && (
              <div className="rounded-[3px] border border-alarm/25 bg-alarm/10 px-3.5 py-2.5 font-mono text-[12.5px] text-alarm">
                ⚠ {errText}
              </div>
            )}
            {(report || phase === "run") && (
              <>
                <Markdown text={report} streaming={phase === "run"} />
                {phase === "stopped" && (
                  <div className="mt-3 border-t border-dashed border-hakem/30 pt-2 font-mono text-[11px] tracking-[.1em] text-hakem">
                    ■ OPERATÖR TARAFINDAN DURDURULDU
                  </div>
                )}
              </>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
