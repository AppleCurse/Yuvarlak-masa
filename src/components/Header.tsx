import React, { useEffect, useState } from "react";
import { OctagonX, Settings, Sparkles, Terminal } from "lucide-react";
import { RoomId } from "../types";
import { Button, Chip, StatusDot } from "./ui";

export function Header({
  activeRoom,
  onSelectRoom,
  busy,
  onStopAll,
  onOpenSettings,
}: {
  activeRoom: RoomId;
  onSelectRoom: (room: RoomId) => void;
  busy: boolean;
  onStopAll: () => void;
  onOpenSettings: () => void;
}) {
  const [clock, setClock] = useState("--:--:--");
  const [heartbeat, setHeartbeat] = useState<{ alive: boolean; latencyMs: number; label: string }>({
    alive: false,
    latencyMs: 0,
    label: "Yoklanıyor...",
  });

  useEffect(() => {
    const update = () =>
      setClock(new Date().toLocaleTimeString("tr-TR", { hour12: false }));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Periodic heartbeat poll to 9Router (20128)
  useEffect(() => {
    let mounted = true;
    const pollHeartbeat = async () => {
      try {
        const res = await fetch("/api/providers/heartbeat");
        const data = await res.json();
        if (mounted) {
          setHeartbeat({
            alive: Boolean(data?.alive),
            latencyMs: Number(data?.latencyMs) || 0,
            label: data?.label || (data?.alive ? "Canlı" : "Kapalı"),
          });
        }
      } catch {
        if (mounted) setHeartbeat({ alive: false, latencyMs: 0, label: "Erişilemiyor" });
      }
    };
    pollHeartbeat();
    const hInterval = setInterval(pollHeartbeat, 5000);
    return () => {
      mounted = false;
      clearInterval(hInterval);
    };
  }, []);

  const ROOMS: { id: RoomId; num: string; label: string; accent: string }[] = [
    { id: "council", num: "01", label: "Açık Konsey", accent: "#c084fc" },
    { id: "jury", num: "02", label: "Kör Jüri", accent: "#38bdf8" },
    { id: "synthesis", num: "03", label: "Sentez & Hakem", accent: "#fbbf24" },
    { id: "autopsy", num: "04", label: "Kod Otopsisi", accent: "#22c55e" },
    { id: "images", num: "05", label: "Görsel Stüdyosu", accent: "#ec4899" },
    { id: "records", num: "06", label: "Kayıtlar", accent: "#34d399" },
    { id: "settings", num: "07", label: "Uçlar & Ayarlar", accent: "#fb7185" },
    { id: "street", num: "08", label: "Sokak Meclisi", accent: "#f97316" },
    { id: "devils_advocate", num: "09", label: "Şeytanın Avukatı", accent: "#ef4444" },
    { id: "lie_detector", num: "10", label: "Maske Düşürme", accent: "#06b6d4" },
    { id: "timeless", num: "11", label: "Zamansız Devler", accent: "#eab308" },
  ];

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#222a35] bg-[#0d1117]/95 px-4 backdrop-blur-md">
      {/* Brand logo & title */}
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-xl border border-[#c084fc]/40 bg-gradient-to-br from-[#2a1b3d] to-[#101828] text-[#c084fc] shadow-md shadow-purple-950/40">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2.6 21 7.4v9.2L12 21.4 3 16.6V7.4z" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="2.5" />
            <path d="M12 5.6v3.8M12 14.6v3.8M6.4 8.9l3 1.7M14.6 13.4l3 1.7" strokeLinecap="round" />
          </svg>
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-disp text-sm font-bold tracking-wider text-white">
            <span>KONSÜL</span>
            <span className="text-[#38bdf8]">//</span>
            <span>AI</span>
          </div>
          <div className="hidden font-mono text-[9px] uppercase tracking-[0.2em] text-[#8b949e] sm:block">
            Konsey · Jüri · Hakem · Görsel
          </div>
        </div>
      </div>

      {/* Center Nav tabs */}
      <nav className="mx-auto flex items-center gap-1 overflow-x-auto rounded-xl border border-[#222a35] bg-[#0b1016] p-1">
        {ROOMS.map((r) => {
          const isActive = activeRoom === r.id;
          return (
            <button
              key={r.id}
              onClick={() => onSelectRoom(r.id)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-disp font-semibold transition-all ${
                isActive
                  ? "bg-[#1c2330] text-white shadow-sm shadow-black"
                  : "text-[#8b949e] hover:bg-white/5 hover:text-white"
              }`}
              style={
                isActive
                  ? { borderBottom: `2px solid ${r.accent}` }
                  : undefined
              }
            >
              <span className="font-mono text-[10px] opacity-60">{r.num}</span>
              <span>{r.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right control status */}
      <div className="flex items-center gap-2">
        {/* 9Router 20128 Live Heartbeat Badge */}
        <div
          className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 font-mono text-[10.5px] transition-colors ${
            heartbeat.alive
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : "border-[#303a48] bg-[#111722] text-[#8b949e]"
          }`}
          title={`Yerel 9Router (127.0.0.1:20128): ${heartbeat.label} ${heartbeat.latencyMs ? `(${heartbeat.latencyMs}ms)` : ""}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              heartbeat.alive ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" : "bg-[#57606a]"
            }`}
          />
          <span className="hidden xl:inline">9ROUTER (20128):</span>
          <span className="font-bold">{heartbeat.alive ? `${heartbeat.latencyMs}ms` : "KAPALI"}</span>
        </div>

        <div className="hidden font-mono text-xs text-[#8b949e] md:block">{clock}</div>

        <Chip color={busy ? "#38bdf8" : "#22c55e"}>
          <StatusDot tone={busy ? "#38bdf8" : "#22c55e"} pulse={busy} />
          <span>{busy ? "üretim aktif" : "hazır"}</span>
        </Chip>

        {busy && (
          <Button variant="danger" size="sm" onClick={onStopAll}>
            <OctagonX size={13} />
            <span>Durdur</span>
          </Button>
        )}

        <Button
          variant={activeRoom === "settings" ? "primary" : "outline"}
          size="sm"
          onClick={onOpenSettings}
          title="Ayarlar & Uçlar"
        >
          <Settings size={13} />
          <span className="hidden sm:inline">Uçlar</span>
        </Button>
      </div>
    </header>
  );
}
