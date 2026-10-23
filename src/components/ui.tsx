import React, { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Panel({
  children,
  className,
  glowColor,
  style,
}: {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn("hud-card flex flex-col", className)}
      style={{
        ...(glowColor
          ? {
              boxShadow: `0 0 0 1px ${glowColor}25, 0 18px 45px -25px ${glowColor}30`,
            }
          : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  icon,
  right,
  accent,
}: {
  title: ReactNode;
  icon?: ReactNode;
  right?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#222a35] bg-[#11161d]/60 px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        {icon && (
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-sm"
            style={{
              color: accent || "#38bdf8",
              borderColor: `${accent || "#38bdf8"}40`,
              background: `${accent || "#38bdf8"}12`,
            }}
          >
            {icon}
          </span>
        )}
        <h2 className="truncate font-disp text-[13px] font-bold tracking-wide text-white">
          {title}
        </h2>
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  );
}

type ButtonVariant = "primary" | "outline" | "danger" | "ghost" | "gold" | "emerald";

export function Button({
  children,
  variant = "outline",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 active:translate-y-[1px] disabled:pointer-events-none disabled:opacity-40 cursor-pointer select-none font-disp tracking-wide";

  const sizes = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3.5 py-2 text-xs",
    lg: "px-5 py-2.5 text-sm",
  };

  const variants = {
    primary:
      "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white border border-indigo-400/40 shadow-lg shadow-indigo-950/40 font-semibold",
    emerald:
      "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/40 shadow-lg shadow-emerald-950/40 font-semibold",
    gold:
      "bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 border border-amber-300/40 shadow-lg shadow-amber-950/40 font-bold",
    danger:
      "bg-[#2a1215] text-[#ff9aa2] border border-[#ef4444]/45 hover:bg-[#3a161b] hover:text-[#ffc2c7]",
    outline:
      "bg-[#161b22] text-[#e6edf3] border border-[#303a48] hover:border-[#4a5568] hover:bg-[#1c2330]",
    ghost:
      "bg-transparent text-[#8b949e] border border-transparent hover:text-white hover:bg-white/5",
  };

  return (
    <button className={cn(base, sizes[size], variants[variant], className)} {...props}>
      {children}
    </button>
  );
}

export function Chip({
  children,
  color,
  className,
}: {
  children: ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[11px] leading-tight select-none",
        !color && "border-[#303a48] bg-[#161b22] text-[#8b949e]",
        className
      )}
      style={
        color
          ? {
              color,
              borderColor: `${color}40`,
              background: `${color}14`,
            }
          : undefined
      }
    >
      {children}
    </span>
  );
}

export function StatusDot({
  tone = "live",
  pulse = false,
}: {
  tone?: "live" | "demo" | "warn" | "err" | "off" | string;
  pulse?: boolean;
}) {
  const colorMap: Record<string, string> = {
    live: "#22c55e",
    demo: "#fbbf24",
    warn: "#fb923c",
    err: "#ef4444",
    off: "#57606a",
  };

  const c = colorMap[tone] || tone;

  return (
    <span className="relative inline-flex h-2 w-2 shrink-0">
      <span className="h-2 w-2 rounded-full" style={{ background: c }} />
      {pulse && (
        <span
          className="absolute inset-0 rounded-full opacity-70"
          style={{ background: c, animation: "pulseRing 1.6s ease-out infinite" }}
        />
      )}
    </span>
  );
}

export function Avatar({
  label,
  color,
  size = 32,
  ring = false,
}: {
  label: string;
  color: string;
  size?: number;
  ring?: boolean;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-xl border font-disp font-bold select-none",
        ring && "speaking-pulse"
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.44,
        color,
        borderColor: `${color}50`,
        background: `linear-gradient(145deg, ${color}25, ${color}08)`,
      }}
    >
      {label}
    </span>
  );
}

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-lg border border-[#303a48] bg-[#0b1017] px-3 py-2 text-xs text-[#e6edf3] placeholder-[#57606a] outline-none transition-colors focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/40",
        className
      )}
    />
  );
}

export function TextArea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-lg border border-[#303a48] bg-[#0b1017] px-3 py-2 text-xs text-[#e6edf3] placeholder-[#57606a] outline-none transition-colors focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/40 resize-y",
        className
      )}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full cursor-pointer rounded-lg border border-[#303a48] bg-[#0b1017] px-3 py-2 text-xs text-[#e6edf3] outline-none transition-colors focus:border-[#38bdf8]",
        className
      )}
    >
      {children}
    </select>
  );
}

export function Modal({
  open,
  onClose,
  title,
  icon,
  children,
  maxWidth = "max-w-3xl",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          "hud-card max-h-[90vh] w-full overflow-hidden flex flex-col border border-[#303a48] bg-[#111722] shadow-2xl",
          maxWidth
        )}
      >
        <div className="flex items-center justify-between border-b border-[#222a35] bg-[#161b22] px-5 py-3">
          <div className="flex items-center gap-2">
            {icon && <span className="text-[#38bdf8]">{icon}</span>}
            <h3 className="font-disp text-sm font-bold text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
