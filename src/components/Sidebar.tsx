import {
  Archive,
  Bomb,
  Crown,
  Download,
  FileCode,
  Flame,
  Gavel,
  Hourglass,
  Image as ImageIcon,
  Landmark,
  Radar,
  Scale,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { Provider, RoomId, Seat } from "../types";
import { Avatar, Chip, StatusDot } from "./ui";

export function Sidebar({
  activeRoom,
  onSelectRoom,
  seats,
  providers,
  onEditSeat,
}: {
  activeRoom: RoomId;
  onSelectRoom: (room: RoomId) => void;
  seats: Seat[];
  providers: Provider[];
  onEditSeat: (seatId: string) => void;
}) {
  const NAV_ITEMS: {
    id: RoomId;
    num: string;
    title: string;
    sub: string;
    icon: any;
    accent: string;
    section?: string;
  }[] = [
    {
      id: "council",
      num: "01",
      title: "Açık Konsey",
      sub: "Sıralı Paslaşma & Tartışma",
      icon: Landmark,
      accent: "#c084fc",
    },
    {
      id: "jury",
      num: "02",
      title: "Kör Jüri",
      sub: "İzole Bağımsız 3 Yanıt",
      icon: Scale,
      accent: "#38bdf8",
    },
    {
      id: "synthesis",
      num: "03",
      title: "Sentez & Hakem",
      sub: "Konsensüs & Eylem Planı",
      icon: Gavel,
      accent: "#fbbf24",
    },
    {
      id: "autopsy",
      num: "04",
      title: "Kod Otopsisi",
      sub: "Dosya & Diff Ameliyatı",
      icon: FileCode,
      accent: "#22c55e",
    },
    {
      id: "images",
      num: "05",
      title: "Görsel Stüdyosu",
      sub: "8 En-Boy Oranı & Çizim",
      icon: ImageIcon,
      accent: "#ec4899",
    },
    {
      id: "records",
      num: "06",
      title: "Kayıtlar",
      sub: "Oturumlar & Tutanaklar",
      icon: Archive,
      accent: "#34d399",
    },
    {
      id: "settings",
      num: "07",
      title: "Uçlar & Ayarlar",
      sub: "9Router, Ollama, Gemini",
      icon: Settings,
      accent: "#fb7185",
    },
    {
      id: "street",
      num: "08",
      title: "Sokak Meclisi",
      sub: "7 İnsan Arketipi & Racon",
      icon: Users,
      accent: "#f97316",
    },
    {
      id: "devils_advocate",
      num: "09",
      title: "Şeytanın Avukatı",
      sub: "Kırmızı Takım & Siyah Kuğu",
      icon: Flame,
      accent: "#ef4444",
    },
    {
      id: "lie_detector",
      num: "10",
      title: "Maske Düşürme",
      sub: "Yalan Radarı & Adli Otopsi",
      icon: Radar,
      accent: "#06b6d4",
    },
    {
      id: "timeless",
      num: "11",
      title: "Zamansız Devler",
      sub: "5 Çağ & Felsefi Çatışma",
      icon: Crown,
      accent: "#eab308",
    },
    {
      id: "courtroom",
      num: "12",
      title: "Ağır Ceza Mahkemesi",
      sub: "Savcı, Müdafi & Hâkim Hükmü",
      icon: Gavel,
      accent: "#dc2626",
    },
  ];

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-[#222a35] bg-[#0d1117]/70 p-3 lg:flex overflow-y-auto">
      {/* Nav Section */}
      <div className="mb-2 px-2 font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#8b949e]">
        Çalışma Masaları
      </div>

      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeRoom === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSelectRoom(item.id)}
              className={`flex w-full items-center gap-2.5 rounded-xl border p-2 text-left transition-all ${
                isActive
                  ? "border-[#303a48] bg-[#161b22] text-white shadow-md shadow-black/40"
                  : "border-transparent text-[#8b949e] hover:border-[#222a35] hover:bg-[#111722] hover:text-[#e6edf3]"
              }`}
              style={
                isActive
                  ? { borderLeft: `3px solid ${item.accent}` }
                  : undefined
              }
            >
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm"
                style={{
                  color: isActive ? item.accent : "#8b949e",
                  background: isActive ? `${item.accent}15` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${isActive ? `${item.accent}30` : "#222a35"}`,
                }}
              >
                <Icon size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-disp text-xs font-semibold">
                  <span className="font-mono text-[10px] opacity-60">{item.num}</span>
                  <span className="truncate">{item.title}</span>
                </div>
                <div className="truncate font-mono text-[9.5px] text-[#8b949e]">
                  {item.sub}
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Sandalyeler Section */}
      <div className="mt-5 mb-2 flex items-center justify-between px-2 font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#8b949e]">
        <span>Sandalyeler</span>
        <span className="text-[9px] text-[#57606a]">{seats.length} Model</span>
      </div>

      <div className="space-y-1.5 overflow-y-auto pr-1">
        {seats.map((seat) => {
          const provider = providers.find((p) => p.id === seat.providerId);
          return (
            <button
              key={seat.id}
              onClick={() => onEditSeat(seat.id)}
              className="group flex w-full items-center gap-2 rounded-xl border border-[#222a35] bg-[#11161d] p-2 text-left transition-all hover:border-[#303a48] hover:bg-[#161b22]"
              style={{
                borderLeft: `2px solid ${seat.color}`,
              }}
            >
              <Avatar label={seat.avatar} color={seat.color} size={26} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 font-disp text-[11px] font-semibold text-white">
                  <span className="truncate">{seat.name}</span>
                  <span className="text-[10px] text-[#8b949e] font-normal truncate">
                    · {seat.roleTitle}
                  </span>
                </div>
                <div className="truncate font-mono text-[9px] text-[#8b949e]">
                  {provider?.name || "Sağlayıcı"} / {seat.model}
                </div>
              </div>
              <span className="font-mono text-[9px] text-[#57606a] opacity-0 transition-opacity group-hover:opacity-100">
                ⚙
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer Info & Desktop App Download */}
      <div className="mt-auto border-t border-[#222a35] pt-3">
        <div className="rounded-xl border border-[#222a35] bg-[#0b0f16] p-2.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-[#8b949e]">
            <span className="text-white font-semibold">Masaüstü Python</span>
            <Chip color="#22c55e">app.py</Chip>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-[#8b949e]">
            Yerel terminalde çalıştırmak için tek dosya FastAPI backend paketi.
          </p>
        </div>
      </div>
    </aside>
  );
}
