import { useEffect, useRef, useState } from "react";
import type { ExportedMaterial, Seat, SeatKey } from "../lib/types";
import { streamChat, type ChatMessage } from "../lib/client";
import Markdown from "./Markdown";
import { BTN_DANGER, BTN_PRIMARY, INPUT, Panel, seatSigil } from "./ui";
import { cn } from "../utils/cn";

type ColState = "idle" | "run" | "done" | "err";
type ColKey = "A" | "B" | "C";
const COLS: ColKey[] = ["A", "B", "C"];

export default function JuryRoom({
  seats,
  forceDemo,
  exportRef,
}: {
  seats: Record<SeatKey, Seat>;
  forceDemo: boolean;
  exportRef: React.MutableRefObject<(() => ExportedMaterial | null) | null>;
}) {
  const [prompt, setPrompt] = useState("");
  const [promptSet, setPromptSet] = useState("");
  const [cols, setCols] = useState<Record<ColKey, { text: string; state: ColState }>>({
    A: { text: "", state: "idle" },
    B: { text: "", state: "idle" },
    C: { text: "", state: "idle" },
  });
  const colsRef = useRef(cols);
  const aborts = useRef<Partial<Record<ColKey, AbortController>>>({});

  const patch = (k: ColKey, p: Partial<{ text: string; state: ColState }>) => {
    colsRef.current = { ...colsRef.current, [k]: { ...colsRef.current[k], ...p } };
    setCols(colsRef.current);
  };

  useEffect(() => {
    exportRef.current = () => {
      const ready = COLS.filter((k) => colsRef.current[k].text);
      if (!ready.length || !promptSet) return null;
      let out = "SORU: " + promptSet + "\n\n";
      COLS.forEach((k) => {
        const s = seats[k];
        out += `=== ${s.name} — ${s.role} (bağımsız yanıt) ===\n${colsRef.current[k].text || "(yanıt yok)"}\n\n`;
      });
      return { text: out, meta: `${ready.length}/3 YANIT HAZIR` };
    };
  });

  const runCol = (k: ColKey, p: string) => {
    const seat = seats[k];
    patch(k, { text: "", state: "run" });
    const ac = new AbortController();
    aborts.current[k] = ac;
    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          seat.system +
          "\n\nKURALLAR: Bir kör jüri masasındasın. Aynı soru iki modele daha soruldu ama sen onların cevaplarını ASLA göremezsin. Tamamen bağımsız, eksiksiz ve kendine güvenen bir yanıt ver. Markdown kullan.",
      },
      { role: "user", content: "SORU: " + p },
    ];
    streamChat(
      seat,
      messages,
      ac.signal,
      {
        onDelta: (t) => patch(k, { text: t }),
        onError: () => patch(k, { state: "err" }),
        onDone: (stopped) => patch(k, { state: stopped ? "err" : "done" }),
      },
      forceDemo,
    );
  };

  const start = () => {
    const p = prompt.trim();
    if (!p) return;
    setPromptSet(p);
    COLS.forEach((k) => runCol(k, p));
  };

  const stopAll = () => COLS.forEach((k) => aborts.current[k]?.abort());
  const anyRun = COLS.some((k) => cols[k].state === "run");

  const stateChip = (st: ColState, hex: string) =>
    st === "run" ? (
      <span className="led-live rounded-[2px] border px-2 py-0.5 font-mono text-[8.5px] tracking-[.16em]" style={{ color: hex, borderColor: `color-mix(in srgb, ${hex} 55%, transparent)` }}>
        ÜRETİYOR
      </span>
    ) : st === "done" ? (
      <span className="rounded-[2px] border border-oliva/40 px-2 py-0.5 font-mono text-[8.5px] tracking-[.16em] text-oliva">TAMAMLANDI</span>
    ) : st === "err" ? (
      <span className="rounded-[2px] border border-alarm/40 px-2 py-0.5 font-mono text-[8.5px] tracking-[.16em] text-alarm">HATA / KESİLDİ</span>
    ) : (
      <span className="rounded-[2px] border border-edge2 px-2 py-0.5 font-mono text-[8.5px] tracking-[.16em] text-fnt">BEKLEMEDE</span>
    );

  return (
    <>
      <div className="flex items-end gap-4 border-b border-edge bg-[linear-gradient(180deg,rgba(22,27,34,.7),transparent)] px-6 pb-3.5 pt-5">
        <div>
          <div className="font-mono text-[9.5px] uppercase tracking-[.3em] text-neon">Masa 02 · Sıfır Grup Düşüncesi</div>
          <h1 className="mt-0.5 font-disp text-[26px] font-bold leading-tight tracking-wide">KÖR JÜRİ ODASI</h1>
        </div>
        <p className="ml-auto max-w-[520px] text-right text-[12.5px] leading-relaxed text-mut">
          Üç model birbirini ne görür ne duyar. Aynı soru, üç bağımsız kanal, paralel üretim — kimin doğru bildiği
          yan yana ortaya çıkar.
        </p>
      </div>

      <div className="flex items-center gap-2.5 px-5 py-3.5">
        <input
          className={INPUT + " flex-1"}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !anyRun && start()}
          placeholder="Jüriye sunulacak soruyu yazın — üç modele aynı anda sorulur…"
        />
        <button className={BTN_PRIMARY} onClick={start} disabled={anyRun}>
          ⚡ Bağımsız Yanıtları Başlat
        </button>
        <button className={BTN_DANGER} onClick={stopAll} disabled={!anyRun}>
          ■ Tümünü Durdur
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-3 gap-3.5 px-5 pb-4 max-xl:grid-cols-1 max-xl:overflow-y-auto">
        {COLS.map((k) => {
          const s = seats[k];
          const c = cols[k];
          return (
            <Panel key={k} className="flex min-h-[300px] flex-col overflow-hidden max-xl:min-h-[380px]">
              <span
                className="absolute right-0 top-[52px] z-[2] border-l border-edge bg-deep/50 px-1 py-2.5 font-mono text-[8px] tracking-[.3em] text-fnt"
                style={{ writingMode: "vertical-rl" }}
              >
                KÖR KANAL · İZOLE
              </span>
              <div className="flex items-center gap-2.5 border-b border-edge bg-deep/45 px-3.5 py-2.5">
                {seatSigil(s, 30)}
                <div className="min-w-0">
                  <div className="font-disp text-[13px] font-semibold" style={{ color: s.hex }}>
                    {s.name}
                  </div>
                  <div className="truncate font-mono text-[9px] tracking-wide text-fnt">
                    {s.model} · {s.role}
                  </div>
                </div>
                <span className="ml-auto">{stateChip(c.state, s.hex)}</span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-[13px] leading-[1.64]">
                {c.state === "idle" ? (
                  <div className="flex h-full items-center justify-center py-10 text-center">
                    <p className="text-[12px] leading-relaxed text-fnt">
                      Bağımsız kanal açık.
                      <br />
                      Yanıt diğer iki modelden <b style={{ color: s.hex }}>tamamen izole</b> üretilir.
                    </p>
                  </div>
                ) : (
                  <>
                    <Markdown text={c.text} streaming={c.state === "run"} />
                    {c.state === "err" && !c.text && (
                      <div className="rounded-[3px] border border-alarm/25 bg-alarm/10 px-3 py-2 font-mono text-[12px] text-alarm">
                        ⚠ Bu kanal yanıt üretemedi. Sandalye ayarlarından ucu kontrol edin.
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 border-t border-edge px-3 py-2">
                <span className="font-mono text-[9px] tracking-[.14em] text-fnt">{c.text.length} KARAKTER</span>
                <button
                  className={cn(BTN_DANGER, "ml-auto !px-2.5 !py-1 !text-[11px]")}
                  disabled={c.state !== "run"}
                  onClick={() => aborts.current[k]?.abort()}
                >
                  ■ DURDUR
                </button>
              </div>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
