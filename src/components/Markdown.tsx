import { useCallback } from "react";

/* Kompakt Markdown motoru — kod blokları renklendirilir, içerik önce escape edilir */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function highlightCode(code: string): string {
  let h = esc(code);
  h = h.replace(/(#.*)$/gm, '<span class="tok-c">$1</span>');
  h = h.replace(/("""[\s\S]*?"""|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '<span class="tok-s">$1</span>');
  h = h.replace(
    /\b(def|class|return|if|elif|else|for|while|import|from|as|try|except|raise|with|async|await|lambda|not|and|or|in|is|None|True|False|pass|yield|const|let|var|function|new|export|type|interface|public|private|void|int|float|str|bool)\b/g,
    '<span class="tok-k">$1</span>',
  );
  h = h.replace(/\b(\d+\.?\d*)\b/g, '<span class="tok-n">$1</span>');
  return h;
}

function inlineMd(s: string): string {
  let h = esc(s);
  h = h.replace(/`([^`]+)`/g, "<code>$1</code>");
  h = h.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  h = h.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return h;
}

export function mdToHtml(src: string, streaming = false): string {
  const lines = src.replace(/\r/g, "").split("\n");
  const out: string[] = [];
  let i = 0;
  let list: "ul" | "ol" | null = null;
  const closeList = () => {
    if (list) {
      out.push(list === "ul" ? "</ul>" : "</ol>");
      list = null;
    }
  };
  while (i < lines.length) {
    const ln = lines[i];
    const fence = ln.match(/^```(\w*)/);
    if (fence) {
      closeList();
      const lang = fence[1] || "code";
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      const id = "cb_" + Math.random().toString(36).slice(2, 9);
      out.push(
        `<pre><div class="phead"><span>${esc(lang)}</span><button type="button" data-copy="${id}">KOPYALA</button></div><code id="${id}">${highlightCode(buf.join("\n"))}</code></pre>`,
      );
      continue;
    }
    const h1 = ln.match(/^#\s+(.*)/);
    const h2 = ln.match(/^##\s+(.*)/);
    const h3 = ln.match(/^###\s+(.*)/);
    if (h1) {
      closeList();
      out.push(`<h1>${inlineMd(h1[1])}</h1>`);
      i++;
      continue;
    }
    if (h2) {
      closeList();
      const t = h2[1].toLocaleUpperCase("tr");
      const cls =
        t.includes("KONSENSÜS") || t.includes("ORTAK")
          ? "h-cons"
          : t.includes("ANLAŞMAZ") || t.includes("RİSK") || t.includes("RISK")
            ? "h-conf"
            : t.includes("EYLEM") || t.includes("KARAR")
              ? "h-act"
              : "";
      out.push(`<h2 class="${cls}">${inlineMd(h2[1])}</h2>`);
      i++;
      continue;
    }
    if (h3) {
      closeList();
      out.push(`<h3>${inlineMd(h3[1])}</h3>`);
      i++;
      continue;
    }
    if (/^\s*([-*_])\s*\1\s*\1[\s-*_]*$/.test(ln)) {
      closeList();
      out.push("<hr>");
      i++;
      continue;
    }
    const q = ln.match(/^>\s?(.*)/);
    if (q) {
      closeList();
      out.push(`<blockquote>${inlineMd(q[1])}</blockquote>`);
      i++;
      continue;
    }
    const ul = ln.match(/^\s*[-*]\s+(.*)/);
    const ol = ln.match(/^\s*\d+[.)]\s+(.*)/);
    if (ul) {
      if (list !== "ul") {
        closeList();
        out.push("<ul>");
        list = "ul";
      }
      out.push(`<li>${inlineMd(ul[1])}</li>`);
      i++;
      continue;
    }
    if (ol) {
      if (list !== "ol") {
        closeList();
        out.push("<ol>");
        list = "ol";
      }
      out.push(`<li>${inlineMd(ol[1])}</li>`);
      i++;
      continue;
    }
    if (ln.trim() === "") {
      closeList();
      i++;
      continue;
    }
    closeList();
    out.push(`<p>${inlineMd(ln)}</p>`);
    i++;
  }
  closeList();
  const caret = streaming
    ? '<span style="display:inline-block;width:8px;height:15px;background:var(--color-neon);vertical-align:-2px;animation:breathe .8s infinite"></span>'
    : "";
  return out.join("\n") + caret;
}

export default function Markdown({ text, streaming = false }: { text: string; streaming?: boolean }) {
  const onClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const btn = (e.target as HTMLElement).closest("[data-copy]") as HTMLButtonElement | null;
    if (!btn) return;
    const el = document.getElementById(btn.dataset.copy ?? "");
    if (!el) return;
    navigator.clipboard.writeText(el.innerText).then(() => {
      btn.textContent = "KOPYALANDI ✓";
      window.setTimeout(() => (btn.textContent = "KOPYALA"), 1400);
    });
  }, []);

  return (
    <div
      className="md"
      onClick={onClick}
      dangerouslySetInnerHTML={{ __html: mdToHtml(text, streaming) }}
    />
  );
}
