import type { Seat } from "./types";
import { demoStream } from "./demo";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamHooks {
  onDelta: (accumulated: string) => void;
  onDone: (stopped: boolean) => void;
  onError: (message: string) => void;
}

let backendOk: boolean | null = null;

/** app.py proxy'si ayakta mı? (önizleme ortamında düşer → demo moda geçilir) */
export async function checkBackend(): Promise<boolean> {
  try {
    const c = new AbortController();
    const t = window.setTimeout(() => c.abort(), 2500);
    const r = await fetch("/api/health", { signal: c.signal });
    window.clearTimeout(t);
    const j = (await r.json()) as { ok?: boolean };
    backendOk = !!j.ok;
  } catch {
    backendOk = false;
  }
  return backendOk;
}

export function isBackendLive(): boolean {
  return backendOk === true;
}

export async function pingBaseUrl(url: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const r = await fetch("/api/ping?url=" + encodeURIComponent(url));
    const j = (await r.json()) as { ok: boolean; error?: string; models?: string[] };
    if (j.ok) {
      const n = j.models?.length ?? 0;
      const sample = (j.models ?? []).slice(0, 2).join(", ");
      return { ok: true, detail: `ERİŞİLDİ · ${n} model görünüyor${sample ? ` (${sample})` : ""}` };
    }
    return { ok: false, detail: j.error ?? "Bilinmeyen hata" };
  } catch {
    return { ok: false, detail: "Proxy'ye ulaşılamadı (python app.py çalışmıyor — demo mod)" };
  }
}

/**
 * Evrensel OpenAI-uyumlu üretim çağrısı.
 * Canlı modda /api/chat/stream (SSE) → app.py → 9Router / Ollama / LM Studio / bulut.
 * Demo modda yerel simülasyon akışı.
 */
export function streamChat(
  seat: Seat,
  messages: ChatMessage[],
  signal: AbortSignal,
  hooks: StreamHooks,
  forceDemo = false,
): void {
  if (forceDemo || !isBackendLive()) {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    demoStream(seat, lastUser?.content ?? "", signal, hooks.onDelta, hooks.onDone);
    return;
  }

  (async () => {
    let acc = "";
    try {
      const resp = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
          base_url: seat.baseUrl,
          api_key: seat.apiKey,
          model: seat.model,
          messages,
          temperature: 0.7,
        }),
      });
      if (!resp.ok || !resp.body) {
        hooks.onError(`Proxy HTTP ${resp.status} döndürdü.`);
        return;
      }
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") {
            hooks.onDone(false);
            return;
          }
          try {
            const obj = JSON.parse(data) as { delta?: string; error?: string };
            if (obj.error) {
              hooks.onError(obj.error);
              return;
            }
            if (obj.delta) {
              acc += obj.delta;
              hooks.onDelta(acc);
            }
          } catch {
            /* parçalı JSON satırı — yoksay */
          }
        }
      }
      hooks.onDone(false);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") hooks.onDone(true);
      else hooks.onError("Bağlantı koptu: " + (err as Error).message);
    }
  })();
}
