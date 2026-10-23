import React, { useMemo } from "react";
import { Message, RoomId } from "../types";

interface PersuasionGaugeProps {
  room: RoomId;
  messages: Message[];
  title?: string;
}

interface GaugeAnalysis {
  leftLabel: string;
  rightLabel: string;
  leftPercent: number;
  rightPercent: number;
  tensionLevel: "low" | "medium" | "high";
  tensionScore: number; // 0 to 100
  dominantSide: string;
  summaryText: string;
}

export function PersuasionGauge({ room, messages, title }: PersuasionGaugeProps) {
  const analysis = useMemo<GaugeAnalysis>(() => {
    const seatMessages = messages.filter(
      (m) => m.speaker === "seat" && m.content && m.content.trim().length > 0
    );

    let leftLabel = "Risk & Eleştiri";
    let rightLabel = "Savunma & Fırsat";

    if (room === "devils_advocate") {
      leftLabel = "Kırmızı Takım (Yıkım)";
      rightLabel = "Nihai Kalkan (Zırh)";
    } else if (room === "lie_detector") {
      leftLabel = "Kaçamak & Manipülasyon";
      rightLabel = "Şeffaflık & Karşı Mat";
    } else if (room === "timeless") {
      leftLabel = "Realpolitik & Üst-Akıl";
      rightLabel = "Stoacı & Mistik Erdem";
    } else if (room === "street") {
      leftLabel = "Kaldırım Realizmi (Çıkar)";
      rightLabel = "Ahlaki & Vicdani İlke";
    } else if (room === ("courtroom" as any)) {
      leftLabel = "İddia Makamı (Ceza)";
      rightLabel = "Savunma & Masumiyet";
    }

    if (seatMessages.length === 0) {
      return {
        leftLabel,
        rightLabel,
        leftPercent: 50,
        rightPercent: 50,
        tensionLevel: "low",
        tensionScore: 15,
        dominantSide: "Denge Bekleniyor",
        summaryText: "Müzakere başladığında modellerin sav şiddeti anlık olarak hesaplanır.",
      };
    }

    let leftWeight = 1;
    let rightWeight = 1;

    // Keyword & Character weight analysis
    seatMessages.forEach((msg) => {
      const txt = msg.content.toLowerCase();
      const id = (msg.seatId || msg.authorName || "").toLowerCase();

      // Left camp matches
      if (
        id.includes("rakip") ||
        id.includes("kugu") ||
        id.includes("manipulatör") ||
        id.includes("yalan") ||
        id.includes("machiavelli") ||
        id.includes("sentetik") ||
        id.includes("kadin") ||
        id.includes("girisimci") ||
        id.includes("savci")
      ) {
        leftWeight += 2.5;
      }

      // Right camp matches
      if (
        id.includes("kalkan") ||
        id.includes("hamle") ||
        id.includes("aurelius") ||
        id.includes("mevlana") ||
        id.includes("sanatci") ||
        id.includes("evsiz") ||
        id.includes("hakim") ||
        id.includes("avukat") ||
        id.includes("bilirkisi")
      ) {
        rightWeight += 2.5;
      }

      // Semantic polarity check
      const leftWords = ["risk", "yalan", "tehlike", "felaket", "batır", "ceza", "kriz", "zafiyet", "kaçamak", "güç", "çöker"];
      const rightWords = ["çözüm", "savunma", "kurtar", "hüküm", "hakikat", "vicdan", "fırsat", "şeffaf", "masum", "onur", "tedbir"];

      leftWords.forEach((w) => {
        if (txt.includes(w)) leftWeight += 0.3;
      });
      rightWords.forEach((w) => {
        if (txt.includes(w)) rightWeight += 0.3;
      });
    });

    const total = leftWeight + rightWeight;
    const leftPercent = Math.round((leftWeight / total) * 100);
    const rightPercent = 100 - leftPercent;

    // Tension is high when both sides are fierce and arguments are long
    const diff = Math.abs(leftPercent - rightPercent);
    const volumeBonus = Math.min(30, seatMessages.length * 7);
    const tensionScore = Math.min(100, Math.round(50 + volumeBonus - diff * 0.4));

    let tensionLevel: "low" | "medium" | "high" = "low";
    if (tensionScore > 75) tensionLevel = "high";
    else if (tensionScore > 45) tensionLevel = "medium";

    let dominantSide = "Bıçak Sırtı Denge";
    if (leftPercent > 56) dominantSide = `${leftLabel} Baskın (%${leftPercent})`;
    else if (rightPercent > 56) dominantSide = `${rightLabel} Baskın (%${rightPercent})`;

    let summaryText = "";
    if (tensionLevel === "high") {
      summaryText = "Masada sert bir kutuplaşma var; iki kutup da geri adım atmıyor.";
    } else if (tensionLevel === "medium") {
      summaryText = "Savlar karşılıklı test ediliyor; henüz mutlak uzlaşı sağlanmadı.";
    } else {
      summaryText = "Tartışma sakin seyrediyor; taraflar ön inceleme aşamasında.";
    }

    return {
      leftLabel,
      rightLabel,
      leftPercent,
      rightPercent,
      tensionLevel,
      tensionScore,
      dominantSide,
      summaryText,
    };
  }, [messages, room]);

  // Needle angle for SVG semicircle (-80deg to +80deg)
  const needleAngle = useMemo(() => {
    // left 100% -> -75 deg, right 100% -> +75 deg
    const ratio = (analysis.rightPercent - 50) / 50; // -1 to +1
    return ratio * 75;
  }, [analysis]);

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3.5 backdrop-blur-md shadow-lg mb-4">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-300">
            {title || "⚖️ Canlı İkna & Gerilim İbresi"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
              analysis.tensionLevel === "high"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                : analysis.tensionLevel === "medium"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
            }`}
          >
            {analysis.tensionLevel === "high"
              ? "⚡ YÜKSEK GERİLİM"
              : analysis.tensionLevel === "medium"
              ? "🔥 HARARETLİ MÜNAZARA"
              : "🟢 DENGELİ TARTIŞMA"}
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            Gerilim: %{analysis.tensionScore}
          </span>
        </div>
      </div>

      {/* Main Gauge Graphic & Split Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Left Side Label */}
        <div className="md:col-span-4 text-left">
          <div className="text-[11px] font-medium text-rose-400 truncate flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            {analysis.leftLabel}
          </div>
          <div className="text-lg font-black font-mono text-rose-300">
            %{analysis.leftPercent}
          </div>
        </div>

        {/* Center Speedometer / Gauge */}
        <div className="md:col-span-4 flex flex-col items-center justify-center">
          <div className="relative w-36 h-20 flex items-center justify-center overflow-hidden">
            <svg viewBox="0 0 100 55" className="w-full h-full">
              {/* Arc Gradient Background */}
              <defs>
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="50%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              {/* Background Track */}
              <path
                d="M 12 48 A 38 38 0 0 1 88 48"
                fill="none"
                stroke="#1e293b"
                strokeWidth="7"
                strokeLinecap="round"
              />
              {/* Colored Gradient Track */}
              <path
                d="M 12 48 A 38 38 0 0 1 88 48"
                fill="none"
                stroke="url(#gaugeGradient)"
                strokeWidth="5"
                strokeLinecap="round"
                opacity="0.85"
              />
              {/* Center Pivot */}
              <circle cx="50" cy="48" r="4" fill="#94a3b8" />
              {/* Needle */}
              <g
                style={{
                  transform: `rotate(${needleAngle}deg)`,
                  transformOrigin: "50px 48px",
                  transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                <line
                  x1="50"
                  y1="48"
                  x2="50"
                  y2="16"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <polygon points="50,12 47.5,18 52.5,18" fill="#ffffff" />
              </g>
            </svg>
          </div>
          <div className="text-[10px] font-medium text-slate-300 font-mono -mt-1 text-center">
            {analysis.dominantSide}
          </div>
        </div>

        {/* Right Side Label */}
        <div className="md:col-span-4 text-right">
          <div className="text-[11px] font-medium text-emerald-400 truncate flex items-center justify-end gap-1.5">
            {analysis.rightLabel}
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          </div>
          <div className="text-lg font-black font-mono text-emerald-300">
            %{analysis.rightPercent}
          </div>
        </div>
      </div>

      {/* Split progress bar */}
      <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2 flex overflow-hidden border border-slate-800">
        <div
          className="bg-rose-500 transition-all duration-500"
          style={{ width: `${analysis.leftPercent}%` }}
        />
        <div
          className="bg-emerald-500 transition-all duration-500"
          style={{ width: `${analysis.rightPercent}%` }}
        />
      </div>

      <p className="text-[11px] text-slate-400 italic text-center mt-2">
        {analysis.summaryText}
      </p>
    </div>
  );
}
