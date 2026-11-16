import { useState } from "react";
import { PRESETS, type Seat, type SeatKey } from "../lib/types";
import { pingBaseUrl } from "../lib/client";
import { BTN_GHOST, BTN_PRIMARY, INPUT, Led, Sigil } from "./ui";

export default function SettingsModal({
  seat,
  onClose,
  onSave,
}: {
  seat: Seat;
  onClose: () => void;
  onSave: (s: Seat) => void;
}) {
  const [form, setForm] = useState<Seat>({ ...seat });
  const [preset, setPreset] = useState<string>("9router");
  const [test, setTest] = useState<{ tone: "off" | "live" | "err" | "demo"; text: string }>({
    tone: "off",
    text: "Bağlantı testi bekleniyor",
  });

  const set = (patch: Partial<Seat>) => setForm((f) => ({ ...f, ...patch }));

  const runTest = async () => {
    setTest({ tone: "demo", text: "Test ediliyor…" });
    const r = await pingBaseUrl(form.baseUrl.trim());
    setTest(r.ok ? { tone: "live", text: r.detail } : { tone: "err", text: r.detail });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(4,7,11,.78)] backdrop-blur-[4px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="anim-room max-h-[90vh] w-[660px] max-w-[94vw] overflow-y-auto rounded-[5px] border border-edge2 bg-panel">
        <div className="flex items-center gap-3 border-b border-edge px-5 py-4">
          <Sigil label={seat.key} hex={seat.hex} size={34} />
          <div>
            <div className="font-disp text-[16px] font-bold">
              Sandalye {seat.key} — {seat.name}
            </div>
            <div className="font-mono text-[9.5px] tracking-[.2em] text-mut">
              OPENAI-UYUMLU UÇ YAPILANDIRMASI
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-[3px] border border-edge2 text-mut transition-colors hover:border-alarm hover:text-alarm"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3.5 px-5 py-4">
          <label className="block">
            <span className="mb-1.5 block font-mono text-[9.5px] uppercase tracking-[.2em] text-mut">Hazır Uç (Preset)</span>
            <select
              className={INPUT}
              value={preset}
              onChange={(e) => {
                setPreset(e.target.value);
                set({ baseUrl: PRESETS[e.target.value].url });
              }}
            >
              {Object.entries(PRESETS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block font-mono text-[9.5px] uppercase tracking-[.2em] text-mut">Base URL</span>
              <input className={INPUT} value={form.baseUrl} onChange={(e) => set({ baseUrl: e.target.value })} placeholder="http://127.0.0.1:20128/v1" />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-mono text-[9.5px] uppercase tracking-[.2em] text-mut">API Key (yerelde boş kalabilir)</span>
              <input className={INPUT} type="password" value={form.apiKey} onChange={(e) => set({ apiKey: e.target.value })} placeholder="sk-…" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block font-mono text-[9.5px] uppercase tracking-[.2em] text-mut">Model ID</span>
              <input className={INPUT} value={form.model} onChange={(e) => set({ model: e.target.value })} placeholder="pineal-general-reasoning" />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-mono text-[9.5px] uppercase tracking-[.2em] text-mut">Sandalye Rolü</span>
              <input className={INPUT} value={form.role} onChange={(e) => set({ role: e.target.value })} placeholder="Stratejist" />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block font-mono text-[9.5px] uppercase tracking-[.2em] text-mut">Sistem İstemi (Rol Kişiliği)</span>
            <textarea className={INPUT + " resize-y leading-relaxed"} rows={5} value={form.system} onChange={(e) => set({ system: e.target.value })} />
          </label>

          <div className="flex items-center gap-2.5 font-mono text-[10.5px] text-mut">
            <Led tone={test.tone === "demo" ? "demo" : test.tone} pulse={test.tone === "demo"} />
            <span className="min-w-0 flex-1 truncate">{test.text}</span>
            <button className={BTN_GHOST} onClick={runTest}>
              Bağlantıyı Test Et
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 border-t border-edge px-5 py-3.5">
          <button className={BTN_GHOST} onClick={onClose}>
            Vazgeç
          </button>
          <button
            className={BTN_PRIMARY}
            onClick={() => {
              onSave({ ...form, key: seat.key as SeatKey, name: seat.name, hex: seat.hex });
              onClose();
            }}
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
