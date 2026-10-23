import { AspectRatio, ImageAsset, ImageModel, Message, ProbeResult, Provider, Seat, SessionTopic } from "../types";

export interface StreamChatParams {
  provider: Provider;
  seat?: Seat;
  model: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  onToken: (token: string, full: string) => void;
  signal?: AbortSignal;
}

export interface StreamChatResult {
  content: string;
  tokens: number;
  latencyMs: number;
  stopped: boolean;
  error?: string;
}

export async function streamChat(params: StreamChatParams): Promise<StreamChatResult> {
  const started = Date.now();
  let full = "";
  let tokens = 0;
  let latencyMs = 0;
  let error: string | undefined;

  try {
    const res = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: params.signal,
      body: JSON.stringify({
        provider: params.provider,
        seat: params.seat,
        model: params.model,
        messages: params.messages,
        temperature: params.temperature ?? 0.7,
      }),
    });

    if (!res.ok || !res.body) {
      const errTxt = await res.text().catch(() => "");
      return {
        content: "",
        tokens: 0,
        latencyMs: Date.now() - started,
        stopped: false,
        error: `Sunucu hatası: HTTP ${res.status} ${errTxt.slice(0, 100)}`,
      };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() || "";

      for (const frame of frames) {
        let event = "message";
        const dataLines: string[] = [];

        for (const line of frame.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
        }

        if (!dataLines.length) continue;
        let payload: any = {};
        try {
          payload = JSON.parse(dataLines.join("\n"));
        } catch {
          payload = {};
        }

        if (event === "token" && payload.t) {
          full += payload.t;
          params.onToken(payload.t, full);
        } else if (event === "done") {
          tokens = Number(payload.tokens) || Math.max(1, Math.round(full.length / 4));
          latencyMs = Number(payload.latencyMs) || Date.now() - started;
        } else if (event === "error") {
          error = payload.message || "Model hatası";
        }
      }
    }
  } catch (err: any) {
    if (params.signal?.aborted) {
      return {
        content: full,
        tokens: tokens || Math.round(full.length / 4),
        latencyMs: Date.now() - started,
        stopped: true,
      };
    }
    error = err?.message || "Bağlantı koptu";
  }

  return {
    content: full,
    tokens: tokens || Math.max(1, Math.round(full.length / 4)),
    latencyMs: latencyMs || Date.now() - started,
    stopped: Boolean(params.signal?.aborted),
    error,
  };
}

export async function generateAiImage(params: {
  prompt: string;
  aspectRatio: AspectRatio;
  model: ImageModel;
  style?: string;
  sourceTopic?: string;
}): Promise<{ ok: boolean; asset?: ImageAsset; error?: string; note?: string }> {
  try {
    const res = await fetch("/api/image/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }

    return { ok: true, asset: data.asset, note: data.note };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Görsel servisine erişilemedi." };
  }
}

export async function probeEndpoint(baseUrl: string, apiKey = ""): Promise<ProbeResult> {
  try {
    const res = await fetch("/api/providers/probe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseUrl, apiKey }),
    });

    const data = await res.json();
    return {
      ok: Boolean(data?.ok),
      label: data?.label || "Bilinmiyor",
      models: Array.isArray(data?.models) ? data.models : [],
      latencyMs: Number(data?.latencyMs) || 0,
    };
  } catch (err: any) {
    return {
      ok: false,
      label: err?.message || "Bağlantı yok",
      models: [],
      latencyMs: 0,
    };
  }
}

export async function fetchSessions(): Promise<SessionTopic[]> {
  try {
    const res = await fetch("/api/sessions");
    const data = await res.json();
    return Array.isArray(data?.sessions) ? data.sessions : [];
  } catch {
    return [];
  }
}

export async function createSession(topic: Partial<SessionTopic>): Promise<SessionTopic | null> {
  try {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(topic),
    });
    const data = await res.json();
    return data?.session || null;
  } catch {
    return null;
  }
}

export async function updateSession(id: string, patch: Partial<SessionTopic>): Promise<boolean> {
  try {
    const res = await fetch(`/api/sessions/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteSession(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/sessions/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchImages(): Promise<ImageAsset[]> {
  try {
    const res = await fetch("/api/images");
    const data = await res.json();
    return Array.isArray(data?.images) ? data.images : [];
  } catch {
    return [];
  }
}
