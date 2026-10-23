import React, { useState } from "react";
import {
  Activity,
  Check,
  Download,
  Link,
  Plus,
  RefreshCw,
  Save,
  Sliders,
  Terminal,
  Trash2,
} from "lucide-react";
import { probeEndpoint } from "../lib/api";
import { Provider, Seat } from "../types";
import { Avatar, Button, Chip, Modal, Panel, PanelHeader, Select, StatusDot, TextArea, TextInput } from "./ui";

export function SettingsRoom({
  providers,
  onUpdateProvider,
  onAddProvider,
  onDeleteProvider,
  seats,
  onUpdateSeat,
  onBindAllSeatsToProvider,
}: {
  providers: Provider[];
  onUpdateProvider: (id: string, patch: Partial<Provider>) => void;
  onAddProvider: (p: Provider) => void;
  onDeleteProvider: (id: string) => void;
  seats: Seat[];
  onUpdateSeat: (id: string, patch: Partial<Seat>) => void;
  onBindAllSeatsToProvider: (providerId: string) => void;
}) {
  const [probeResults, setProbeResults] = useState<Record<string, { ok: boolean; label: string; latencyMs: number }>>({});
  const [probingId, setProbingId] = useState<string | null>(null);
  const [editingSeatId, setEditingSeatId] = useState<string | null>(null);

  const testProvider = async (p: Provider) => {
    setProbingId(p.id);
    const res = await probeEndpoint(p.baseUrl, p.apiKey);
    setProbeResults((prev) => ({
      ...prev,
      [p.id]: { ok: res.ok, label: res.label, latencyMs: res.latencyMs },
    }));

    if (res.ok && res.models.length > 0) {
      onUpdateProvider(p.id, { models: res.models });
    }
    setProbingId(null);
  };

  const editingSeat = seats.find((s) => s.id === editingSeatId);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
      {/* ══ INFORMATION BANNER ══ */}
      <div className="flex items-start gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3.5 text-xs text-emerald-200">
        <span className="text-xl">⚡</span>
        <div className="space-y-1">
          <div className="font-disp font-bold text-white">
            Dahili Türkçe Karakter Motoru Aktif — API Anahtarı Gerekmez!
          </div>
          <div className="leading-relaxed text-emerald-300/90 text-[11.5px]">
            İstasyondaki 4 yeni çatışma odası (Sokak Meclisi, Şeytanın Avukatı, Yalan Radarı, Zamanın Ötesindekiler) ve tüm jüri sistemleri hiçbir API anahtarı girmeden <strong>Dahili Türkçe Simülatör</strong> ile 1 saniyede doğrudan konuşur. Dilerseniz kendi OpenAI, Gemini veya DeepSeek anahtarınızı girerek gerçek modelleri de devreye alabilirsiniz.
          </div>
        </div>
      </div>

      {/* ══ PROVIDERS SECTION ══ */}
      <Panel glowColor="#fb7185">
        <PanelHeader
          accent="#fb7185"
          icon={<Activity size={15} />}
          title="MODEL SAĞLAYICILARI (OPENAI UYUMLU VE YEREL UÇLAR)"
          right={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const newId = `prov_${Date.now()}`;
                onAddProvider({
                  id: newId,
                  name: "Yeni Sağlayıcı",
                  kind: "openai",
                  baseUrl: "http://127.0.0.1:20128/v1",
                  apiKey: "",
                  color: "#38bdf8",
                  models: ["yeni-model-v1"],
                  enabled: true,
                  sortIndex: providers.length + 1,
                  note: "",
                });
              }}
            >
              <Plus size={13} />
              <span>Yeni Uç Ekle</span>
            </Button>
          }
        />
        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {providers.map((p) => {
            const probe = probeResults[p.id];
            const isProbing = probingId === p.id;
            return (
              <div
                key={p.id}
                className="flex flex-col justify-between rounded-xl border border-[#222a35] bg-[#111722] p-3.5 transition-all hover:border-[#303a48]"
                style={{ borderLeft: `3px solid ${p.color}` }}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <TextInput
                      value={p.name}
                      onChange={(e) => onUpdateProvider(p.id, { name: e.target.value })}
                      className="font-disp font-bold text-xs"
                    />
                    <Chip color={probe ? (probe.ok ? "#22c55e" : "#ef4444") : undefined}>
                      {isProbing ? "test..." : probe ? probe.label : p.kind === "demo" ? "simülatör" : "test edilmedi"}
                    </Chip>
                  </div>

                  <div className="mt-2 space-y-1.5">
                    <div>
                      <label className="font-mono text-[9px] uppercase tracking-wider text-[#8b949e]">
                        Base URL
                      </label>
                      <TextInput
                        value={p.baseUrl}
                        onChange={(e) => onUpdateProvider(p.id, { baseUrl: e.target.value })}
                        className="font-mono text-[11px]"
                        placeholder="http://127.0.0.1:20128/v1"
                      />
                    </div>

                    <div>
                      <label className="font-mono text-[9px] uppercase tracking-wider text-[#8b949e]">
                        API Key (Yerel uçlarda boş kalabilir)
                      </label>
                      <TextInput
                        type="password"
                        value={p.apiKey}
                        onChange={(e) => onUpdateProvider(p.id, { apiKey: e.target.value })}
                        className="font-mono text-[11px]"
                        placeholder="sk-..."
                      />
                    </div>

                    <div>
                      <label className="font-mono text-[9px] uppercase tracking-wider text-[#8b949e]">
                        Modeller ({p.models.length})
                      </label>
                      <TextInput
                        value={p.models.join(", ")}
                        onChange={(e) =>
                          onUpdateProvider(p.id, {
                            models: e.target.value
                              .split(",")
                              .map((m) => m.trim())
                              .filter(Boolean),
                          })
                        }
                        className="font-mono text-[10.5px]"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-[#222a35] pt-2.5">
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => testProvider(p)} disabled={isProbing}>
                      <Activity size={12} />
                      <span>{isProbing ? "Deneniyor..." : "Test Et"}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onBindAllSeatsToProvider(p.id)}
                      title="Masadaki tüm sandalyeleri bu uca bağla"
                    >
                      <Link size={12} />
                      <span>Koltukları Bağla</span>
                    </Button>
                  </div>

                  {p.kind !== "demo" && p.kind !== "gemini" && (
                    <button
                      onClick={() => onDeleteProvider(p.id)}
                      className="rounded p-1 text-[#8b949e] hover:text-[#ef4444]"
                      title="Ucu Sil"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* ══ SEATS CONFIGURATION SECTION ══ */}
      <Panel glowColor="#c084fc">
        <PanelHeader
          accent="#c084fc"
          icon={<Sliders size={15} />}
          title="SANDALYELER & ROL KİŞİLİKLERİ"
        />
        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          {seats.map((seat) => {
            const provider = providers.find((p) => p.id === seat.providerId);
            return (
              <div
                key={seat.id}
                className="flex flex-col justify-between rounded-xl border border-[#222a35] bg-[#111722] p-3.5 transition-all hover:border-[#303a48]"
                style={{ borderLeft: `3px solid ${seat.color}` }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Avatar label={seat.avatar} color={seat.color} size={30} />
                    <div className="min-w-0 flex-1">
                      <TextInput
                        value={seat.name}
                        onChange={(e) => onUpdateSeat(seat.id, { name: e.target.value })}
                        className="font-disp font-bold text-xs"
                      />
                    </div>
                    <Chip color={seat.color}>{seat.slot}</Chip>
                  </div>

                  <div className="mt-2.5 space-y-1.5">
                    <div>
                      <label className="font-mono text-[9px] uppercase tracking-wider text-[#8b949e]">
                        Rol Başlığı
                      </label>
                      <TextInput
                        value={seat.roleTitle}
                        onChange={(e) => onUpdateSeat(seat.id, { roleTitle: e.target.value })}
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <label className="font-mono text-[9px] uppercase tracking-wider text-[#8b949e]">
                        Bağlı Uç
                      </label>
                      <Select
                        value={seat.providerId}
                        onChange={(e) => {
                          const nextP = providers.find((p) => p.id === e.target.value);
                          onUpdateSeat(seat.id, {
                            providerId: e.target.value,
                            model: nextP?.models[0] || seat.model,
                          });
                        }}
                        className="text-xs"
                      >
                        {providers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <label className="font-mono text-[9px] uppercase tracking-wider text-[#8b949e]">
                        Model ID
                      </label>
                      <TextInput
                        value={seat.model}
                        onChange={(e) => onUpdateSeat(seat.id, { model: e.target.value })}
                        className="font-mono text-[11px]"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between font-mono text-[9px] uppercase tracking-wider text-[#8b949e]">
                        <span>Sıcaklık (Temp)</span>
                        <span className="text-white font-bold">{seat.temperature}</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.2"
                        step="0.05"
                        value={seat.temperature}
                        onChange={(e) => onUpdateSeat(seat.id, { temperature: parseFloat(e.target.value) })}
                        className="w-full accent-[#38bdf8] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 border-t border-[#222a35] pt-2.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setEditingSeatId(seat.id)}
                  >
                    <span>Sistem İstemini Düzenle ⚙</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* ══ PYTHON DESKTOP DOWNLOAD CALLOUT ══ */}
      <Panel glowColor="#34d399">
        <PanelHeader
          accent="#34d399"
          icon={<Terminal size={15} />}
          title="MASAÜSTÜ PYTHON TEK DOSYA BACKEND (STANDALONE RUNNER)"
        />
        <div className="flex flex-col items-start justify-between gap-3 p-4 md:flex-row md:items-center">
          <div className="max-w-xl text-xs text-[#8b949e] leading-relaxed">
            KONSÜL AI istasyonu, npm ya da Docker olmadan doğrudan yerel terminalinizde tek dosya FastAPI sunucusuyla çalışabilir.
            Aşağıdaki komutla çalıştırabilir ve 9Router / Ollama / LM Studio ile anında kullanabilirsiniz:
            <pre className="mt-2 rounded-lg border border-[#222a35] bg-[#0b0f16] p-2.5 font-mono text-emerald-400">
              pip install fastapi uvicorn httpx pydantic &amp;&amp; python app.py
            </pre>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="data:text/plain;charset=utf-8,echo%20off"
              download="Konsul_AI.bat"
              onClick={(e) => {
                e.preventDefault();
                const bat = `@echo off
title KONSUL AI - Coklu Model Konsey ve Kor Juri Istasyonu
color 0b
echo ===================================================
echo   KONSUL AI - Konsey ve Kor Juri Istasyonu
echo   Adres: http://127.0.0.1:8888
echo ===================================================
cd /d "%~dp0"
if exist venv\\Scripts\\activate.bat (
    call venv\\Scripts\\activate.bat
)
python app.py
pause
`;
                const blob = new Blob([bat], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "Konsul_AI.bat";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Button variant="gold">
                <Download size={14} />
                <span>Konsul_AI.bat İndir</span>
              </Button>
            </a>

            <a
              href="data:text/plain;charset=utf-8,import%20fastapi"
              download="app.py"
              onClick={(e) => {
                e.preventDefault();
                const script = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KONSÜL AI - Çoklu Model Konsey ve Kör Jüri İstasyonu
Gereksinimler: pip install fastapi uvicorn httpx pydantic
Çalıştırma: python app.py -> http://127.0.0.1:8888
"""
import json, webbrowser, threading
from pathlib import Path
import httpx, uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel

app = FastAPI(title="KONSÜL AI")
CLIENT_TIMEOUT = httpx.Timeout(180.0, connect=8.0)

class ChatPayload(BaseModel):
    baseUrl: str
    apiKey: str = ""
    model: str
    messages: list
    temperature: float = 0.7

@app.post("/api/chat/stream")
async def chat_stream(p: ChatPayload, req: Request):
    headers = {"Content-Type": "application/json"}
    # Otomatik 9Router kimlik doğrulama anahtarı (401 hatasını önler)
    api_key = p.apiKey or ("pineal-9router-local-key" if "20128" in p.baseUrl else "")
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    url = p.baseUrl.rstrip("/") + "/chat/completions"
    async def stream():
        async with httpx.AsyncClient(timeout=CLIENT_TIMEOUT) as c:
            async with c.stream("POST", url, json={"model": p.model, "messages": p.messages, "temperature": p.temperature, "stream": True}, headers=headers) as resp:
                async for line in resp.aiter_lines():
                    if await req.is_disconnected(): break
                    if line.startswith("data:"):
                        yield f"{line}\\n\\n"
    return StreamingResponse(stream(), media_type="text/event-stream")

@app.get("/api/health")
async def health(): return {"ok": True, "service": "KONSUL AI Standalone"}

if __name__ == "__main__":
    print("KONSUL AI Standalone Baslatiliyor: http://127.0.0.1:8888")
    uvicorn.run(app, host="127.0.0.1", port=8888)
`;
                const blob = new Blob([script], { type: "text/x-python;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "konsul_desktop_app.py";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Button variant="emerald">
                <Download size={14} />
                <span>konsul_desktop_app.py İndir</span>
              </Button>
            </a>
          </div>
        </div>
      </Panel>

      {/* Edit System Prompt Modal */}
      {editingSeat && (
        <Modal
          open={Boolean(editingSeat)}
          onClose={() => setEditingSeatId(null)}
          title={`Sandalye Düzenle: ${editingSeat.name} (${editingSeat.roleTitle})`}
          icon={<Sliders size={16} />}
        >
          <div className="space-y-3">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#8b949e]">
                Rol Tanımı / Sistem İstemi (System Prompt)
              </label>
              <TextArea
                rows={9}
                value={editingSeat.systemPrompt}
                onChange={(e) => onUpdateSeat(editingSeat.id, { systemPrompt: e.target.value })}
                className="mt-1 font-mono text-xs leading-relaxed"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-[#222a35] pt-3">
              <Button variant="primary" onClick={() => setEditingSeatId(null)}>
                <Check size={13} />
                <span>Kaydet &amp; Kapat</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
