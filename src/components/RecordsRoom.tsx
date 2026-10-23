import React, { useMemo, useState } from "react";
import {
  Archive,
  Download,
  ExternalLink,
  Gavel,
  Landmark,
  Pin,
  PinOff,
  Scale,
  Search,
  Trash2,
} from "lucide-react";
import { RoomId, SessionTopic } from "../types";
import { Button, Chip, Panel, PanelHeader, TextInput } from "./ui";

const ROOM_META: Record<string, { label: string; icon: any; color: string }> = {
  council: { label: "Açık Konsey", icon: Landmark, color: "#c084fc" },
  jury: { label: "Kör Jüri", icon: Scale, color: "#38bdf8" },
  synthesis: { label: "Sentez & Hakem", icon: Gavel, color: "#fbbf24" },
};

export function RecordsRoom({
  sessions,
  onOpenSession,
  onTogglePin,
  onDeleteSession,
}: {
  sessions: SessionTopic[];
  onOpenSession: (session: SessionTopic) => void;
  onTogglePin: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | RoomId>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions
      .filter((s) => (filter === "all" ? true : s.room === filter))
      .filter((s) => (q ? `${s.title} ${s.question}`.toLowerCase().includes(q) : true))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [sessions, filter, query]);

  const exportAllJson = () => {
    const blob = new Blob([JSON.stringify(sessions, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `konsul-arsiv-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      {/* Top Filter and Search Bar */}
      <Panel glowColor="#34d399">
        <PanelHeader
          accent="#34d399"
          icon={<Archive size={15} />}
          title="MASA 05 · KAYITLAR VE OTURUM ARŞİVİ"
          right={
            <Button size="sm" variant="outline" onClick={exportAllJson} disabled={!sessions.length}>
              <Download size={12} />
              <span>Tümünü Dışa Aktar (.json)</span>
            </Button>
          }
        />
        <div className="flex flex-wrap items-center gap-2 border-t border-[#222a35] p-3">
          <div className="relative min-w-[260px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e]" />
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tutanak başlığı ya da konu içeriğinde ara..."
              className="pl-8"
            />
          </div>

          <div className="flex gap-1">
            {(["all", "council", "jury", "synthesis"] as const).map((key) => {
              const active = filter === key;
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`rounded-lg border px-3 py-1.5 font-disp text-xs font-semibold transition-colors ${
                    active
                      ? "border-[#34d399] bg-[#34d399]/15 text-[#34d399]"
                      : "border-[#303a48] bg-[#111722] text-[#8b949e] hover:text-white"
                  }`}
                >
                  {key === "all" ? "Tümü" : ROOM_META[key]?.label || key}
                </button>
              );
            })}
          </div>
        </div>
      </Panel>

      {/* Sessions List */}
      <Panel className="min-h-0 flex-1 overflow-hidden" glowColor="#34d399">
        <div className="h-full overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-[#8b949e]">
              <div className="mb-3 grid h-16 w-16 place-items-center rounded-2xl border border-[#222a35] bg-[#111722] text-[#34d399]">
                <Archive size={32} />
              </div>
              <h3 className="font-disp text-base font-bold text-white">Arşiv Boş</h3>
              <p className="mt-1.5 max-w-md text-xs leading-relaxed text-[#8b949e]">
                Konsey, kör jüri ve sentez odalarında yürütülen tartışmalar tamamlandığında buraya kaydedilir.
                Buradan dilediğiniz oturumu tek tıkla geri açıp inceleyebilirsiniz.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((s) => {
                const meta = ROOM_META[s.room] || ROOM_META.council;
                const Icon = meta.icon;
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-xl border border-[#222a35] bg-[#111722] p-3 transition-all hover:border-[#303a48] hover:bg-[#161b22]"
                  >
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-sm"
                      style={{
                        color: meta.color,
                        borderColor: `${meta.color}45`,
                        background: `${meta.color}15`,
                      }}
                    >
                      <Icon size={16} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {s.pinned && <Pin size={12} className="text-[#fbbf24] shrink-0" />}
                        <h4 className="truncate font-disp text-xs font-bold text-white">
                          {s.title}
                        </h4>
                        <Chip color={meta.color}>{meta.label}</Chip>
                      </div>
                      <p className="mt-1 truncate font-mono text-[11px] text-[#8b949e]">
                        {s.question || "Açıklama yok"} · {s.messages?.length || 0} mesaj ·{" "}
                        {new Date(s.updatedAt).toLocaleDateString("tr-TR")}{" "}
                        {new Date(s.updatedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => onOpenSession(s)}>
                        <ExternalLink size={12} />
                        <span>Aç</span>
                      </Button>

                      <button
                        onClick={() => onTogglePin(s.id)}
                        className={`rounded-lg border p-1.5 transition-colors ${
                          s.pinned
                            ? "border-[#fbbf24]/50 text-[#fbbf24]"
                            : "border-[#303a48] text-[#8b949e] hover:text-white"
                        }`}
                        title={s.pinned ? "Sabitlemeyi Kaldır" : "Sabitle"}
                      >
                        {s.pinned ? <PinOff size={13} /> : <Pin size={13} />}
                      </button>

                      <button
                        onClick={() => onDeleteSession(s.id)}
                        className="rounded-lg border border-[#303a48] p-1.5 text-[#8b949e] hover:border-[#ef4444] hover:text-[#ef4444]"
                        title="Oturumu Sil"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
