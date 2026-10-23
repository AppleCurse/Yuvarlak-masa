import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]+`)|(\*\*[^*]+?\*\*)|(\*[^*]+?\*)|(\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("`")) {
      parts.push(
        <code key={key++} className="rounded border border-[#303a48] bg-[#161b22] px-1 py-0.5 font-mono text-[11px] text-[#38bdf8]">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**")) {
      parts.push(<strong key={key++} className="font-semibold text-white">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      parts.push(<em key={key++} className="italic text-[#cbd5e1]">{token.slice(1, -1)}</em>);
    } else if (token.startsWith("[")) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        parts.push(
          <a
            key={key++}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className="text-[#38bdf8] underline underline-offset-2 hover:text-[#7dd3fc]"
          >
            {linkMatch[1]}
          </a>
        );
      }
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="relative my-2.5 overflow-hidden rounded-xl border border-[#222a35] bg-[#0b0f16]">
      <div className="flex items-center justify-between border-b border-[#222a35] bg-[#111722] px-3 py-1.5 font-mono text-[10px] text-slate-400">
        <span className="uppercase">{lang || "KOD"}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1 rounded border border-[#303a48] px-2 py-0.5 text-[10px] hover:border-[#38bdf8] hover:text-[#38bdf8]"
        >
          {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          <span>{copied ? "Kopyalandı" : "Kopyala"}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-[#d7dee8]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function MarkdownView({
  content = "",
  streaming = false,
  className,
}: {
  content?: string;
  streaming?: boolean;
  className?: string;
}) {
  const lines = (content || "").replace(/\r\n/g, "\n").split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      nodes.push(<CodeBlock key={key++} code={codeLines.join("\n")} lang={lang} />);
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    if (line.startsWith("# ")) {
      nodes.push(
        <h1 key={key++} className="mt-3 mb-1 font-disp text-base font-bold text-white">
          {renderInline(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      nodes.push(
        <h2 key={key++} className="mt-3 mb-1 border-b border-[#222a35] pb-1 font-disp text-sm font-semibold text-white">
          {renderInline(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }

    if (line.startsWith("### ")) {
      nodes.push(
        <h3 key={key++} className="mt-2 mb-1 font-disp text-xs font-semibold text-[#38bdf8]">
          {renderInline(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }

    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <blockquote
          key={key++}
          className="my-2 rounded-r-lg border-l-2 border-[#c084fc] bg-[#c084fc]/10 px-3 py-1.5 text-xs italic text-[#cbd5e1]"
        >
          {quoteLines.map((q, qi) => (
            <p key={qi}>{renderInline(q)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      nodes.push(
        <ul key={key++} className="my-1.5 list-disc pl-5 text-xs text-[#cbd5e1] space-y-1">
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      nodes.push(
        <ol key={key++} className="my-1.5 list-decimal pl-5 text-xs text-[#cbd5e1] space-y-1">
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraph
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("```") &&
      !lines[i].startsWith("> ") &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }

    nodes.push(
      <p key={key++} className="my-1.5 text-xs leading-relaxed text-[#d7dee8]">
        {renderInline(para.join(" "))}
      </p>
    );
  }

  return (
    <div className={className}>
      {nodes}
      {streaming && <span className="caret text-[#38bdf8]" />}
    </div>
  );
}
