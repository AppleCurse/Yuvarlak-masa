import type { ReactNode } from "react";
import { cn } from "../utils/cn";
import type { Seat } from "../lib/types";

/* HUD köşe braketli panel — istasyonun imza görseli */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("hud", className)}>
      <span className="cr cr-tl" />
      <span className="cr cr-tr" />
      <span className="cr cr-bl" />
      <span className="cr cr-br" />
      {children}
    </div>
  );
}

/* Model mührü (avatar) */
export function Sigil({
  label,
  hex,
  size = 38,
  className,
}: {
  label: string;
  hex: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[4px] font-disp font-bold",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        color: hex,
        background: `color-mix(in srgb, ${hex} 12%, #1c2330)`,
        border: `1px solid color-mix(in srgb, ${hex} 45%, transparent)`,
        boxShadow: `0 0 14px color-mix(in srgb, ${hex} 18%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}

export function seatSigil(seat: Seat, size = 38) {
  return <Sigil label={seat.key} hex={seat.hex} size={size} />;
}

/* Durum LED'i */
export function Led({ tone, pulse = false }: { tone: "live" | "demo" | "err" | "off"; pulse?: boolean }) {
  const c =
    tone === "live"
      ? "bg-oliva shadow-[0_0_8px_#3ddc84]"
      : tone === "demo"
        ? "bg-hakem shadow-[0_0_8px_#e3b341]"
        : tone === "err"
          ? "bg-alarm shadow-[0_0_8px_#f85149]"
          : "bg-fnt";
  return <span className={cn("inline-block h-2 w-2 rounded-full", c, pulse && "led-live")} />;
}

export const BTN =
  "inline-flex items-center justify-center gap-2 rounded-[3px] border border-edge2 bg-panel2 px-3.5 py-2 text-[12.5px] font-semibold font-disp tracking-wide text-fog transition-all duration-150 hover:-translate-y-px hover:border-neon hover:shadow-[0_0_16px_rgba(57,197,207,.2)] disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap";
export const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-[3px] border border-neon/55 px-3.5 py-2 text-[12.5px] font-semibold font-disp tracking-wide text-[#bdf3f7] transition-all duration-150 hover:-translate-y-px hover:shadow-[0_0_20px_rgba(57,197,207,.35)] disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap bg-[linear-gradient(180deg,rgba(57,197,207,.22),rgba(57,197,207,.08))]";
export const BTN_DANGER =
  "inline-flex items-center justify-center gap-2 rounded-[3px] border border-alarm/55 px-3.5 py-2 text-[12.5px] font-semibold font-disp tracking-wide text-[#ffb4ae] transition-all duration-150 hover:-translate-y-px hover:border-alarm hover:shadow-[0_0_20px_rgba(248,81,73,.35)] disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap bg-[linear-gradient(180deg,rgba(248,81,73,.2),rgba(248,81,73,.06))]";
export const BTN_GHOST =
  "rounded-[3px] border border-edge2 bg-transparent px-3 py-1.5 font-mono text-[11px] tracking-[.08em] text-mut transition-all duration-150 hover:-translate-y-px hover:border-neon hover:text-fog hover:shadow-[0_0_12px_rgba(57,197,207,.18)]";

export const INPUT =
  "w-full rounded-[3px] border border-edge2 bg-[#0b0f15] px-3 py-2 text-[13px] text-fog outline-none transition-all duration-150 placeholder:text-fnt focus:border-neon focus:shadow-[0_0_0_1px_rgba(57,197,207,.3),0_0_16px_rgba(57,197,207,.12)]";

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[.24em] text-mut after:h-px after:flex-1 after:bg-edge">
      {children}
    </div>
  );
}

/* SVG ikonlar — buton ve başlıklar için */
export const IconCouncil = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <circle cx="12" cy="5" r="2.4" />
    <circle cx="5.5" cy="17.5" r="2.4" />
    <circle cx="18.5" cy="17.5" r="2.4" />
    <path d="M10.8 7.1 7 15.4M13.2 7.1 17 15.4M7.9 17.5h8.2" />
  </svg>
);
export const IconJury = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <rect x="3" y="4.5" width="4.6" height="15" rx="1" />
    <rect x="9.7" y="4.5" width="4.6" height="15" rx="1" />
    <rect x="16.4" y="4.5" width="4.6" height="15" rx="1" />
  </svg>
);
export const IconScale = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M12 3v18M5 7h14M5 7 2.8 12a3.2 3.2 0 0 0 4.4 0L5 7ZM19 7l-2.2 5a3.2 3.2 0 0 0 4.4 0L19 7ZM8.5 21h7" />
  </svg>
);
