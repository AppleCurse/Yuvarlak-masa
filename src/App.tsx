import { useEffect, useRef, useState } from "react";
import { DEFAULT_SEATS, type ExportedMaterial, type RoomId, type Seat, type SeatKey } from "./lib/types";
import { checkBackend } from "./lib/client";
import CouncilRoom from "./components/CouncilRoom";
import JuryRoom from "./components/JuryRoom";
import SynthesisRoom from "./components/SynthesisRoom";
import SettingsModal from "./components/SettingsModal";
import { BTN_GHOST, Led } from "./components/ui";
import { cn } from "./utils/cn";

const SEAT_LS = "konsul_seats_v1";
const SEAT_KEYS: SeatKey[] = ["A", "B", "C", "H"];

function loadSeats(): Record<SeatKey, Seat> {
  try {
    const raw = localStorage.getItem(SEAT_LS);
    if (raw) return { ...DEFAULT_SEATS, ...(JSON.parse(raw) as Record<SeatKey, Seat>) };
  } catch {
    /* bozuk kayıt — varsayılana dön */
  }
  return JSON.parse(JSON.stringify(DEFAULT_SEATS));
}

const ROOMS: { id: RoomId; num: string; title: string; sub: string }[] = [
  { id: "council", num: "01", title: "Açık Konsey Odası", sub: "Tartışma · İş Birliği" },
  { id: "jury", num: "02", title: "Kör Jüri Odası", sub: "Bağımsız Yanıt Masası" },
  { id: "synth", num: "03", title: "Sentez & Hakem", sub: "Nihai Karar Odası" },
];

export default function App() {
  const [seats, setSeats] = useState<Record<SeatKey, Seat>>(loadSeats);
  const [room, setRoom] = useState<RoomId>("council");
  const [clock, setClock] = useState("--:--:--");
  const [mode, setMode] = useState<"checking" | "live" | "demo">("checking");
  const [demoForced, setDemoForced] = useState(false);
  const [editing, setEditing] = useState<SeatKey | null>(null);
  const [sessionKey, setSessionKey] = useState(0);

  const councilExport = useRef<(() => ExportedMaterial | null) | null>(null);
  const juryExport = useRef<(() => ExportedMaterial | null) | null>(null);

  useEffect(() => {
    checkBackend().then((ok) => setMode(ok ? "live" : "demo"));
    const t = window.setInterval(
      () => setClock(new Date().toLocaleTimeString("tr-TR", { hour12: false })),
      1000,
    );
    setClock(new Date().toLocaleTimeString("tr-TR", { hour12: false }));
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SEAT_LS, JSON.stringify(seats));
    } catch {
      /* depolama kapalı olabilir */
    }
  }, [seats]);

  const saveSeat = (s: Seat) => setSeats((prev) => ({ ...prev, [s.key]: s }));
  const forceDemo = demoForced || mode !== "live";

  const statusTone = mode === "checking" ? "off" : forceDemo ? "demo" : "live";
  const statusTxt =
    mode === "checking"
      ? "BAĞLANTI KONTROL…"
      : demoForced
        ? "DEMO SİMÜLASYONU (ZORUNLU)"
        : mode === "live"
          ? "PROXY CANLI · 127.0.0.1:8888"
          : "PROXY YOK · DEMO SİMÜLASYONU";

  return (
    <div className="ambient relative z-[1] flex h-screen flex-col">
      {/* ═══ ÜST KOMUTA ŞERİDİ ═══ */}
      <header className="flex h-[60px] shrink-0 items-center gap-4 border-b border-edge bg-abyss/90 px-5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <svg width="34" height="34" viewBox="0 0 40 40" fill="none" className="drop-shadow-[0_0_8px_rgba(57,197,207,.45)]">
            <path d="M20 3 35 11.5v17L20 37 5 28.5v-17L20 3Z" stroke="#39c5cf" strokeWidth="1.6" />
            <circle cx="20" cy="14" r="2.6" fill="#c49bff" />
            <circle cx="13" cy="25" r="2.6" fill="#3ddc84" />
            <circle cx="27" cy="25" r="2.6" fill="#58a6ff" />
            <path d="M20 16.6 14.5 23M20 16.6 25.5 23M15.6 25h11.8" stroke="#39c5cf" strokeWidth="1.1" opacity=".7" />
          </svg>
          <div>
            <div className="font-disp text-[19px] font-bold tracking-[.06em]">
              KONSÜL<span className="text-neon">//</span>AI
            </div>
            <div className="mt-px font-mono text-[9.5px] uppercase tracking-[.22em] text-mut">
              Çoklu Model Konsey · Kör Jüri · Sentez İstasyonu
            </div>
          </div>
        </div>
        <div className="flex-1" />
        <div className="hidden font-mono text-[12px] tracking-[.1em] text-mut md:block">{clock}</div>
        <div className="flex items-center gap-2 rounded-[3px] border border-edge2 bg-panel px-3 py-1.5 font-mono text-[10.5px] tracking-[.14em]">
          <Led tone={statusTone} pulse={statusTone !== "off"} />
          <span>{statusTxt}</span>
        </div>
        <button
          className={cn(BTN_GHOST, (demoForced || mode === "demo") && "border-hakem text-hakem")}
          title="Model sunucusu olmadan arayüzü simülasyonla dene"
          onClick={() => setDemoForced((v) => !v)}
        >
          DEMO MOD
        </button>
        <button className={BTN_GHOST} onClick={() => setSessionKey((k) => k + 1)}>
          YENİ OTURUM
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ═══ SOL RAY ═══ */}
        <nav className="flex w-[236px] shrink-0 flex-col gap-1.5 border-r border-edge bg-deep/60 px-3.5 py-4 max-lg:hidden">
          <div className="mb-1.5 px-2 font-mono text-[9px] uppercase tracking-[.26em] text-fnt">Çalışma Masaları</div>
          {ROOMS.map((r) => (
            <button
              key={r.id}
              onClick={() => setRoom(r.id)}
              className={cn(
                "relative flex w-full items-center gap-3 rounded-[3px] border border-transparent px-2.5 py-2.5 text-left text-mut transition-all duration-150 hover:bg-gem/5 hover:text-fog",
                room === r.id &&
                  "border-neon/35 bg-[linear-gradient(90deg,rgba(57,197,207,.10),transparent)] text-fog",
              )}
            >
              {room === r.id && (
                <span className="absolute -left-3.5 bottom-2 top-2 w-[3px] bg-neon shadow-[0_0_10px_#39c5cf]" />
              )}
              <span
                className={cn(
                  "w-[30px] font-disp text-[20px] font-bold text-fnt transition-colors",
                  room === r.id && "text-neon drop-shadow-[0_0_12px_rgba(57,197,207,.6)]",
                )}
              >
                {r.num}
              </span>
              <span>
                <span className="block font-disp text-[13px] font-semibold tracking-wide">{r.title}</span>
                <span className="mt-0.5 block font-mono text-[8.5px] uppercase tracking-[.16em] text-fnt">{r.sub}</span>
              </span>
            </button>
          ))}

          <div className="mb-1.5 mt-4 px-2 font-mono text-[9px] uppercase tracking-[.26em] text-fnt">Sandalyeler</div>
          {SEAT_KEYS.map((k) => {
            const s = seats[k];
            return (
              <button
                key={k}
                onClick={() => setEditing(k)}
                className="flex w-full items-center gap-2.5 rounded-[3px] border border-edge bg-panel px-2.5 py-2 text-left transition-all duration-150 hover:translate-x-0.5"
                style={{ ["--sc" as string]: s.hex }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = s.hex;
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 0 12px color-mix(in srgb, ${s.hex} 22%, transparent)`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "";
                  (e.currentTarget as HTMLElement).style.boxShadow = "";
                }}
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.hex, boxShadow: `0 0 7px ${s.hex}` }} />
                <span className="min-w-0">
                  <span className="block truncate font-disp text-[12px] font-semibold">
                    {k} · {s.role}
                  </span>
                  <span className="block truncate font-mono text-[9.5px] text-mut">{s.model}</span>
                </span>
                <span className="ml-auto font-mono text-[10px] text-fnt">⚙</span>
              </button>
            );
          })}

          <div className="mt-auto px-2 font-mono text-[9px] leading-[1.7] tracking-[.12em] text-fnt">
            KONSÜL AI v1.0
            <br />
            OpenAI-Uyumlu Evrensel Uç
            <br />
            9Router · Ollama · LM Studio
            {mode !== "live" && (
              <>
                <br />
                <span className="text-hakem">python app.py → canlı moda geçer</span>
              </>
            )}
          </div>
        </nav>

        {/* ═══ SAHNE ═══ */}
        <main className="relative flex min-w-0 flex-1 flex-col">
          <div key={"c" + sessionKey} className={cn("min-h-0 flex-1 flex-col", room === "council" ? "anim-room flex" : "hidden")}>
            <CouncilRoom seats={seats} forceDemo={forceDemo} exportRef={councilExport} />
          </div>
          <div key={"j" + sessionKey} className={cn("min-h-0 flex-1 flex-col", room === "jury" ? "anim-room flex" : "hidden")}>
            <JuryRoom seats={seats} forceDemo={forceDemo} exportRef={juryExport} />
          </div>
          <div key={"s" + sessionKey} className={cn("min-h-0 flex-1 flex-col", room === "synth" ? "anim-room flex" : "hidden")}>
            <SynthesisRoom
              seats={seats}
              forceDemo={forceDemo}
              getCouncil={() => councilExport.current?.() ?? null}
              getJury={() => juryExport.current?.() ?? null}
              onEditSeat={(k) => setEditing(k)}
            />
          </div>
        </main>
      </div>

      {/* ═══ SANDALYE AYAR MODALI ═══ */}
      {editing && (
        <SettingsModal
          key={editing}
          seat={seats[editing]}
          onClose={() => setEditing(null)}
          onSave={saveSeat}
        />
      )}
    </div>
  );
}

