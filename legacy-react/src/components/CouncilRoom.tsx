import { useEffect, useRef, useState } from "react";
import type { ExportedMaterial, Seat, SeatKey } from "../lib/types";
import { streamChat, type ChatMessage } from "../lib/client";
import Markdown from "./Markdown";
import { BTN, BTN_DANGER, BTN_GHOST, BTN_PRIMARY, INPUT, Panel, SectionTitle, seatSigil } from "./ui";
import { cn } from "../utils/cn";

interface CouncilMsg {
  id: string;
  kind: "model" | "op";
  seat?: SeatKey;
  text: string;
  time: string;
  round: number;
  streaming?: boolean;
  stopped?: boolean;
  error?: string;
}

const ORDER: SeatKey[] = ["A", "B", "C"];
const now = () => new Date().toLocaleTimeString("tr-TR", { hour12: false });
const uid = () => Math.random().toString(36).slice(2, 10);

function transcript(msgs: CouncilMsg[], topic: string, seats: Record<SeatKey, Seat>): string {
  const lines: string[] = ["KONU: " + topic, ""];
  msgs.forEach((m) => {
    if (m.kind === "op") lines.push("[OPERATÖR] İnsan müdahalesi:\n" + m.text);
    else {
      const s = seats[m.seat!];
      lines.push(`[${s.name} — ${s.role}]:\n` + m.text);
    }
    lines.push("");
  });
  return lines.join("\n");
}

function nextSpeaker(msgs: CouncilMsg[]): SeatKey {
  const last = [...msgs].reverse().find((m) => m.kind === "model");
  if (!last) return "A";
  return ORDER[(ORDER.indexOf(last.seat!) + 1) % 3];
}

export default function CouncilRoom({
  seats,
  forceDemo,
  exportRef,
}: {
  seats: Record<SeatKey, Seat>;
  forceDemo: boolean;
  exportRef: React.MutableRefObject<(() => ExportedMaterial | null) | null>;
}) {
  const [topicInput, setTopicInput] = useState("");
  const [topic, setTopic] = useState("");
  const [msgs, setMsgs] = useState<CouncilMsg[]>([]);
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<SeatKey | null>(null);
  const [autoOn, setAutoOn] = useState(false);
  const [autoRounds, setAutoRounds] = useState(2);
  const [shake, setShake] = useState(false);

  const msgsRef = useRef<CouncilMsg[]>([]);
  const topicRef = useRef("");
  const runningRef = useRef(false);
  const autoOnRef = useRef(false);
  const autoRoundsRef = useRef(2);
  const modelTurnsRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  autoOnRef.current = autoOn;
  autoRoundsRef.current = autoRounds;

  const updateMsgs = (fn: (ms: CouncilMsg[]) => CouncilMsg[]) => {
    msgsRef.current = fn(msgsRef.current);
    setMsgs(msgsRef.current);
  };
  const patchMsg = (id: string, patch: Partial<CouncilMsg>) =>
    updateMsgs((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs]);

  /* Sentez odası için dışa aktarım kaydı */
  useEffect(() => {
    exportRef.current = () => {
      if (!topicRef.current && msgsRef.current.length === 0) return null;
      const n = msgsRef.current.length;
      return {
        text: transcript(msgsRef.current, topicRef.current, seats),
        meta: `${n} KAYIT${topicRef.current ? " · " + topicRef.current.slice(0, 26).toLocaleUpperCase("tr") : ""}`,
      };
    };
  });

  const finish = () => {
    runningRef.current = false;
    setRunning(false);
    setCurrent(null);
    abortRef.current = null;
  };

  const turn = () => {
    if (runningRef.current) return;
    const key = nextSpeaker(msgsRef.current);
    const seat = seats[key];
    modelTurnsRef.current += 1;
    const round = Math.ceil(modelTurnsRef.current / 3);
    const transcriptBefore = transcript(msgsRef.current, topicRef.current, seats);
    const m: CouncilMsg = { id: uid(), kind: "model", seat: key, text: "", time: now(), round, streaming: true };
    updateMsgs((ms) => [...ms, m]);
    runningRef.current = true;
    setRunning(true);
    setCurrent(key);

    const ac = new AbortController();
    abortRef.current = ac;
    const sysExtra =
      "\n\nTARTIŞMA KURALLARI: Masada Model A (Stratejist), Model B (Tekniker), Model C (Eleştirmen) ve bir İnsan Operatör var. Sıradaki söz SENDE. Önceki sözlere adıyla atıf yap, somut katkı ver. 120–220 kelime arasında kal. Operatör mesajları bağlayıcıdır.";
    const messages: ChatMessage[] = [
      { role: "system", content: seat.system + sysExtra },
      {
        role: "user",
        content: transcriptBefore + `\nŞimdi söz sırası sende: ${seat.name} (${seat.role}).`,
      },
    ];

    streamChat(
      seat,
      messages,
      ac.signal,
      {
        onDelta: (t) => patchMsg(m.id, { text: t }),
        onError: (e) => {
          patchMsg(m.id, { streaming: false, error: e });
          finish();
        },
        onDone: (stopped) => {
          patchMsg(m.id, { streaming: false, ...(stopped ? { stopped: true } : {}) });
          finish();
          if (!stopped && autoOnRef.current && modelTurnsRef.current < autoRoundsRef.current * 3) {
            window.setTimeout(() => {
              if (autoOnRef.current && !runningRef.current) turn();
            }, 800);
          }
        },
      },
      forceDemo,
    );
  };

  const start = () => {
    const t = topicInput.trim();
    if (!t) {
      setShake(true);
      window.setTimeout(() => setShake(false), 900);
      return;
    }
    if (runningRef.current) abortRef.current?.abort();
    modelTurnsRef.current = 0;
    topicRef.current = t;
    setTopic(t);
    updateMsgs(() => [
      { id: uid(), kind: "op", text: "**Gündem masaya yatırıldı:** " + t, time: now(), round: 0 },
    ]);
    turn();
  };

  const opSend = () => {
    const v = topicInputOp.trim();
    if (!v) return;
    setTopicInputOp("");
    updateMsgs((ms) => [...ms, { id: uid(), kind: "op", text: v, time: now(), round: 0 }]);
  };
  const [topicInputOp, setTopicInputOp] = useState("");

  const stop = () => {
    setAutoOn(false);
    abortRef.current?.abort();
  };

  const clear = () => {
    if (runningRef.current) abortRef.current?.abort();
    modelTurnsRef.current = 0;
    topicRef.current = "";
    setTopic("");
    updateMsgs(() => []);
  };

  const speaking = running ? current : null;
  const roundNow = Math.ceil(modelTurnsRef.current / 3);

  return (
    <>
      <div className="flex items-end gap-4 border-b border-edge bg-[linear-gradient(180deg,rgba(22,27,34,.7),transparent)] px-6 pb-3.5 pt-5">
        <div>
          <div className="font-mono text-[9.5px] uppercase tracking-[.3em] text-neon">Masa 01 · Sıralı Argüman Zinciri</div>
          <h1 className="mt-0.5 font-disp text-[26px] font-bold leading-tight tracking-wide">AÇIK KONSEY ODASI</h1>
        </div>
        <p className="ml-auto max-w-[520px] text-right text-[12.5px] leading-relaxed text-mut">
          Üç model masada sırayla söz alır; her konuşmacı bir öncekinin argümanını okuyarak üzerine ekler, açığını
          yakalar. Operatör istediği an araya girer.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_300px] gap-3.5 p-4 max-lg:grid-cols-1">
        {/* Tutanak */}
        <Panel className="flex min-h-0 flex-col">
          <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-4 py-4">
            {msgs.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3.5 text-center text-fnt">
                <svg width="64" height="64" viewBox="0 0 40 40" fill="none" className="opacity-50">
                  <circle cx="20" cy="20" r="16.5" stroke="#30363d" strokeWidth="1.4" strokeDasharray="4 4" />
                  <circle cx="20" cy="8" r="3" fill="#c49bff" />
                  <circle cx="9.5" cy="27" r="3" fill="#3ddc84" />
                  <circle cx="30.5" cy="27" r="3" fill="#58a6ff" />
                  <circle cx="20" cy="20" r="3.4" stroke="#f2f6fa" strokeWidth="1.4" />
                </svg>
                <h3 className="font-disp text-[16px] tracking-wide text-mut">Masa boş — sandalyeler hazır</h3>
                <p className="max-w-[380px] text-[12px] leading-relaxed">
                  Sağdaki panelden bir konu girin ve <b className="text-neon">“Tartışmayı Başlat”</b> deyin. Konsey
                  Stratejist → Tekniker → Eleştirmen sırasıyla paslaşır.
                </p>
              </div>
            )}
            {msgs.map((m) => {
              const seat = m.kind === "model" ? seats[m.seat!] : null;
              const color = seat ? seat.hex : "#f2f6fa";
              return (
                <div key={m.id} className={cn("anim-msg flex gap-3", m.kind === "op" && "opacity-95")}>
                  <div className="flex w-10 shrink-0 flex-col items-center gap-1.5 pt-0.5">
                    {seat ? seatSigil(seat) : <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[4px] border border-fog/40 bg-fog/10 font-disp text-[13px] font-bold text-fog">OP</span>}
                  </div>
                  <div
                    className="min-w-0 flex-1 overflow-hidden rounded-[4px] border bg-panel"
                    style={{ borderColor: m.kind === "op" ? "rgba(242,246,250,.25)" : undefined }}
                  >
                    <div className="flex items-center gap-2.5 border-b border-edge bg-deep/40 px-3.5 py-2">
                      <span className="font-disp text-[13px] font-semibold" style={{ color }}>
                        {seat ? `${seat.name} — ${seat.role}` : "OPERATÖR"}
                      </span>
                      <span className="rounded-[2px] border border-edge2 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[.18em] text-mut">
                        {seat ? `TUR ${m.round}` : "İNSAN"}
                      </span>
                      {m.streaming && (
                        <span className="flex items-center gap-1.5 font-mono text-[9px] tracking-[.16em]" style={{ color }}>
                          <i className="led-live inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                          YAZIYOR
                        </span>
                      )}
                      <span className="ml-auto font-mono text-[9.5px] text-fnt">{m.time}</span>
                    </div>
                    <div className="px-4 py-3 text-[13.5px] leading-[1.66]">
                      <Markdown text={m.text} streaming={m.streaming} />
                    </div>
                    {m.error && (
                      <div className="border-t border-alarm/25 bg-alarm/10 px-3.5 py-2 font-mono text-[12.5px] text-alarm">
                        ⚠ {m.error}
                      </div>
                    )}
                    {m.stopped && (
                      <div className="border-t border-dashed border-hakem/30 px-3.5 py-1.5 font-mono text-[11px] tracking-[.1em] text-hakem">
                        ■ OPERATÖR TARAFINDAN DURDURULDU
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Operatör çubuğu */}
          <div className="flex gap-2.5 border-t border-edge bg-deep/50 px-3.5 py-3">
            <span className="self-center rounded-[2px] border border-fog/35 px-2 py-1 font-mono text-[9.5px] tracking-[.18em] text-fog">
              OPERATÖR
            </span>
            <input
              className={INPUT + " flex-1"}
              value={topicInputOp}
              onChange={(e) => setTopicInputOp(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && opSend()}
              placeholder="Tartışmaya yön vermek için araya girin… (Enter)"
            />
            <button className={BTN_PRIMARY} onClick={opSend}>
              Gönder
            </button>
          </div>
        </Panel>

        {/* Kontrol sütunu */}
        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto pb-1">
          <Panel className="p-3.5">
            <SectionTitle>Gündem</SectionTitle>
            <input
              className={cn(INPUT, shake && "border-alarm shadow-[0_0_0_1px_rgba(248,81,73,.4)]")}
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && start()}
              placeholder="Konseye atılacak konu / soru…"
            />
            <div className="mt-2.5 flex flex-col gap-2">
              <button className={BTN_PRIMARY + " w-full"} onClick={start} disabled={running}>
                ▸ Tartışmayı Başlat
              </button>
              <button className={BTN + " w-full"} onClick={turn} disabled={running || msgs.length === 0}>
                ◈ Sonraki Sözü Ver
              </button>
              <button className={BTN_DANGER + " w-full"} onClick={stop} disabled={!running}>
                ■ Durdur
              </button>
              <button className={BTN_GHOST + " w-full py-2"} onClick={clear}>
                Masayı Temizle
              </button>
            </div>
          </Panel>

          <Panel className="p-3.5">
            <SectionTitle>Otomasyon</SectionTitle>
            <div className="flex items-center justify-between gap-2.5">
              <span className="font-mono text-[11.5px] tracking-wide text-mut">Otomatik Paslaşma</span>
              <button
                onClick={() => setAutoOn((v) => !v)}
                className={cn(
                  "relative h-5 w-[38px] rounded-full border transition-colors",
                  autoOn ? "border-neon bg-neon/20" : "border-edge2 bg-[#0b0f15]",
                )}
                aria-label="Otomatik paslaşma"
              >
                <span
                  className={cn(
                    "absolute top-[2px] h-3.5 w-3.5 rounded-full transition-all",
                    autoOn ? "left-5 bg-neon shadow-[0_0_8px_#39c5cf]" : "left-[2px] bg-fnt",
                  )}
                />
              </button>
            </div>
            <div className="mt-2 flex gap-1.5">
              {[1, 2, 3, 5].map((r) => (
                <button
                  key={r}
                  onClick={() => setAutoRounds(r)}
                  className={cn(
                    "flex-1 rounded-[3px] border py-1.5 font-mono text-[11px] transition-all",
                    autoRounds === r
                      ? "border-neon text-neon shadow-[0_0_10px_rgba(57,197,207,.2)]"
                      : "border-edge2 bg-[#0b0f15] text-mut hover:text-fog",
                  )}
                >
                  {r} TUR
                </button>
              ))}
            </div>
            <p className="mt-2.5 font-mono text-[9.5px] leading-relaxed tracking-wide text-fnt">
              {autoOn
                ? `Otomatik mod: modeller ${autoRounds} tam tur kendi kendine paslaşır.`
                : "Manuel mod: her sözü siz verirsiniz."}
            </p>
          </Panel>

          <Panel className="p-3.5">
            <SectionTitle>Söz Sırası</SectionTitle>
            {ORDER.map((k) => {
              const s = seats[k];
              const isUp = speaking === k;
              const count = msgs.filter((m) => m.seat === k).length;
              return (
                <div
                  key={k}
                  className="mb-1.5 flex items-center gap-2.5 rounded-[3px] border bg-deep/35 px-2.5 py-2 transition-all duration-300"
                  style={{
                    borderColor: isUp ? `color-mix(in srgb, ${s.hex} 60%, transparent)` : undefined,
                    boxShadow: isUp ? `0 0 16px color-mix(in srgb, ${s.hex} 16%, transparent)` : undefined,
                  }}
                >
                  <span
                    className={cn("flex h-[26px] w-[26px] items-center justify-center rounded-[3px] border font-disp text-[12px] font-bold", isUp && "led-live")}
                    style={{
                      color: s.hex,
                      borderColor: `color-mix(in srgb, ${s.hex} 45%, transparent)`,
                      background: `color-mix(in srgb, ${s.hex} 10%, transparent)`,
                    }}
                  >
                    {k}
                  </span>
                  <span className="font-disp text-[12px] font-semibold">{s.role}</span>
                  <span className="ml-auto font-mono text-[8.5px] tracking-[.14em]" style={{ color: isUp ? s.hex : undefined }}>
                    {isUp ? "● SÖZDE" : `${count} SÖZ`}
                  </span>
                </div>
              );
            })}
          </Panel>

          <Panel className="p-3.5">
            <SectionTitle>Oturum Kaydı</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[3px] border border-edge bg-deep/35 px-3 py-2.5">
                <div className="font-disp text-[21px] font-bold text-neon">{msgs.length}</div>
                <div className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[.18em] text-fnt">Konuşma</div>
              </div>
              <div className="rounded-[3px] border border-edge bg-deep/35 px-3 py-2.5">
                <div className="font-disp text-[21px] font-bold text-neon">
                  {roundNow}/{autoRounds}
                </div>
                <div className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[.18em] text-fnt">Tur</div>
              </div>
            </div>
            {topic && (
              <p className="mt-2 truncate font-mono text-[9.5px] tracking-wide text-fnt">
                GÜNDEM: <span className="text-mut">{topic}</span>
              </p>
            )}
          </Panel>
        </aside>
      </div>
    </>
  );
}
