# -*- coding: utf-8 -*-
"""
════════════════════════════════════════════════════════════════════════
  KONSÜL AI — Çoklu Model "Konsey & Kör Jüri" İstasyonu
  Tek dosya FastAPI backend  ·  python app.py  ·  http://127.0.0.1:8888
════════════════════════════════════════════════════════════════════════
  Gereksinimler (tek satır):
      pip install fastapi uvicorn httpx

  Çalıştırma:
      python app.py

  Uyumlu uçlar (Evrensel OpenAI standardı):
      • 9Router   → http://127.0.0.1:20128/v1
      • Ollama    → http://127.0.0.1:11434/v1
      • LM Studio → http://127.0.0.1:1234/v1
      • OpenAI / DeepSeek / Groq (bulut)
════════════════════════════════════════════════════════════════════════
"""

import json
import threading
import webbrowser
from pathlib import Path

import httpx
import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

# ── Sabitler ────────────────────────────────────────────────────────────
HOST = "127.0.0.1"
PORT = 8888
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
CLIENT_TIMEOUT = httpx.Timeout(300.0, connect=8.0)

app = FastAPI(title="KONSÜL AI", version="1.0.0", docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Yardımcılar ─────────────────────────────────────────────────────────
def _clean_base(url: str) -> str:
    return (url or "").strip().rstrip("/")


def _auth_headers(api_key: str) -> dict:
    headers = {"Content-Type": "application/json"}
    if api_key and api_key.strip():
        headers["Authorization"] = f"Bearer {api_key.strip()}"
    return headers


def _friendly_error(exc: Exception) -> str:
    if isinstance(exc, httpx.ConnectError):
        return "Uç sunucuya bağlanılamadı. Model sunucusu (9Router / Ollama / LM Studio) çalışıyor mu?"
    if isinstance(exc, httpx.ConnectTimeout):
        return "Bağlantı zaman aşımına uğradı. Base URL adresini kontrol edin."
    if isinstance(exc, httpx.ReadTimeout):
        return "Model yanıtı çok geç geldi (zaman aşımı)."
    return f"Bağlantı hatası: {exc.__class__.__name__}"


# ── Sağlık / teşhis rotaları ────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"ok": True, "service": "KONSÜL AI", "mode": "canlı"}


@app.get("/api/ping")
async def ping(url: str):
    """Verilen OpenAI-uyumlu Base URL'yi test eder, model listesini döndürür."""
    target = _clean_base(url) + "/models"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(target)
            if resp.status_code != 200:
                return {"ok": False, "error": f"HTTP {resp.status_code}"}
            data = resp.json()
            models = [m.get("id", "?") for m in data.get("data", [])][:60]
            return {"ok": True, "models": models}
    except Exception as exc:  # noqa: BLE001 — kullanıcıya temiz metin dön
        return {"ok": False, "error": _friendly_error(exc)}


# ── Ana proxy: tek atış (non-stream) ────────────────────────────────────
@app.post("/api/chat")
async def chat(payload: dict):
    base = _clean_base(payload.get("base_url", ""))
    if not base:
        return JSONResponse({"ok": False, "error": "Base URL boş."}, status_code=400)
    body = {
        "model": payload.get("model", ""),
        "messages": payload.get("messages", []),
        "temperature": float(payload.get("temperature", 0.7)),
        "stream": False,
    }
    try:
        async with httpx.AsyncClient(timeout=CLIENT_TIMEOUT) as client:
            resp = await client.post(
                base + "/chat/completions",
                json=body,
                headers=_auth_headers(payload.get("api_key", "")),
            )
            if resp.status_code != 200:
                detail = resp.text[:300].replace("\n", " ")
                return JSONResponse(
                    {"ok": False, "error": f"Uç sunucu HTTP {resp.status_code} döndürdü: {detail}"},
                    status_code=502,
                )
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            return {"ok": True, "content": content}
    except KeyError:
        return JSONResponse({"ok": False, "error": "Uç sunucu beklenmeyen biçimde yanıt verdi."}, status_code=502)
    except Exception as exc:  # noqa: BLE001
        return JSONResponse({"ok": False, "error": _friendly_error(exc)}, status_code=502)


# ── Ana proxy: SSE streaming motoru ─────────────────────────────────────
@app.post("/api/chat/stream")
async def chat_stream(payload: dict, request: Request):
    base = _clean_base(payload.get("base_url", ""))
    if not base:
        return JSONResponse({"ok": False, "error": "Base URL boş."}, status_code=400)

    body = {
        "model": payload.get("model", ""),
        "messages": payload.get("messages", []),
        "temperature": float(payload.get("temperature", 0.7)),
        "stream": True,
    }
    headers = _auth_headers(payload.get("api_key", ""))

    async def event_generator():
        try:
            async with httpx.AsyncClient(timeout=CLIENT_TIMEOUT) as client:
                async with client.stream(
                    "POST", base + "/chat/completions", json=body, headers=headers
                ) as resp:
                    if resp.status_code != 200:
                        detail = (await resp.aread()).decode("utf-8", "ignore")[:300]
                        err = f"Uç sunucu HTTP {resp.status_code}: {detail}"
                        yield "data: " + json.dumps({"error": err}, ensure_ascii=False) + "\n\n"
                        return

                    ctype = resp.headers.get("content-type", "")

                    # Bazı uçlar stream bayrağını yok sayıp düz JSON döndürür → tek parça yayınla
                    if "application/json" in ctype:
                        raw = (await resp.aread()).decode("utf-8", "ignore")
                        try:
                            content = json.loads(raw)["choices"][0]["message"]["content"]
                            yield "data: " + json.dumps({"delta": content}, ensure_ascii=False) + "\n\n"
                        except Exception:  # noqa: BLE001
                            yield "data: " + json.dumps({"error": "Uç sunucu geçersiz JSON döndürdü."}, ensure_ascii=False) + "\n\n"
                        yield "data: [DONE]\n\n"
                        return

                    buffer = ""
                    async for chunk in resp.aiter_text():
                        if await request.is_disconnected():
                            return  # Operatör "Durdur"a bastı → upstream de kesilir
                        buffer += chunk
                        while "\n" in buffer:
                            line, buffer = buffer.split("\n", 1)
                            line = line.strip()
                            if not line.startswith("data:"):
                                continue
                            data = line[5:].strip()
                            if data == "[DONE]":
                                yield "data: [DONE]\n\n"
                                return
                            try:
                                obj = json.loads(data)
                            except json.JSONDecodeError:
                                continue
                            if obj.get("error"):
                                msg = obj["error"].get("message", str(obj["error"]))
                                yield "data: " + json.dumps({"error": msg}, ensure_ascii=False) + "\n\n"
                                return
                            try:
                                delta = obj["choices"][0]["delta"].get("content")
                            except (KeyError, IndexError, AttributeError):
                                delta = None
                            if delta:
                                yield "data: " + json.dumps({"delta": delta}, ensure_ascii=False) + "\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:  # noqa: BLE001 — terminal çöpü asla UI'a sızmasın
            yield "data: " + json.dumps({"error": _friendly_error(exc)}, ensure_ascii=False) + "\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Statik arayüz servisi ───────────────────────────────────────────────

# ── Karakter Kütüphanesi & Karakter Mimarı & Hafıza & Araştırma Motoru ──
import engine

engine.init_database()

@app.get("/api/characters")
async def get_characters():
    return {"ok": True, "characters": engine.get_all_characters()}

@app.get("/api/character/{char_id}")
async def get_character_detail(char_id: str):
    c = engine.get_character(char_id)
    if not c:
        return JSONResponse({"ok": False, "error": "Karakter bulunamadı."}, status_code=404)
    memories = engine.get_character_memory(char_id, limit=5)
    return {"ok": True, "character": c, "memories": memories}

@app.post("/api/characters/save")
async def save_character_endpoint(payload: dict):
    saved = engine.save_character(payload)
    return {"ok": True, "character": saved}

@app.post("/api/character/architect")
async def character_architect(payload: dict):
    prompt = payload.get("prompt", "").strip()
    if not prompt:
        return JSONResponse({"ok": False, "error": "Karakter tanımı boş olamaz."}, status_code=400)

    base = _clean_base(payload.get("base_url", "https://text.pollinations.ai/openai"))
    model = payload.get("model", "openai")
    api_key = payload.get("api_key", "")

    architect_sys = (
        "Sen uzman bir Zihinsel Karakter ve Psikoloji Mimarısın. "
        "Görevin, kullanıcının verdiği brief doğrultusunda sığ olmayan, sahte taklitlerden uzak, "
        "derin, tavizsiz ve tutarlı bir karakter profili inşa etmektir. "
        "Karakterin dünya görüşünü, neleri kutsal saydığını, neye öfkelendiğini, tartışma üslubunu "
        "ve karakterine %100 sadık kalmasını sağlayan sistem istemini hazırla. "
        "YANITIN SADECE VE SADECE GEÇERLİ BİR JSON NESNESİ OLMALIDIR. Başka hiçbir açıklama yazma."
    )

    schema_instruction = """
    Aşağıdaki JSON şablonunu eksiksiz doldur:
    {
      "id": "benzersiz_latin_kod",
      "name": "Karakterin Tam Adı",
      "title": "Kısa ve Vurucu Ünvanı / Konumu",
      "era": "Dönemi, Şehri veya Kökeni",
      "avatar": "2 harfli kısaltma",
      "color": "#hex_renk_kodu",
      "dogma": 1 ile 10 arasında inatçılık sayısı,
      "quote": "Karakterin en meşhur ya da felsefesini özetleyen çarpıcı sözü",
      "worldview": "Dünyayı nasıl görür? Hakikat nerededir? Temel inanç ve felsefesi nedir?",
      "irritants": "Hangi laflara veya tavırlara tahammülü yoktur, neye sinirlenir?",
      "argument_style": "Nasıl tartışır, hangi mantık ve taktiklerle saldırır veya savunur?",
      "vocabulary": "Sık kullandığı kavramlar, kelimeler ve konuşma tonu",
      "system_prompt": "Bu karaktere bürünen modele verilecek tavizsiz, yapay zeka kalıplarını yasaklayan tam sistem talimatı"
    }
    """

    user_msg = f"İNŞA EDİLECEK KARAKTER BRİEFİ:\n{prompt}\n\n{schema_instruction}"
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": architect_sys},
            {"role": "user", "content": user_msg}
        ],
        "temperature": 0.6,
        "stream": False
    }

    try:
        async with httpx.AsyncClient(timeout=CLIENT_TIMEOUT) as client:
            resp = await client.post(
                base + "/chat/completions",
                json=body,
                headers=_auth_headers(api_key),
            )
            if resp.status_code != 200:
                return JSONResponse(
                    {"ok": False, "error": f"Model sunucusu HTTP {resp.status_code} döndürdü: {resp.text[:200]}"},
                    status_code=502
                )
            data = resp.json()
            raw_text = data["choices"][0]["message"]["content"].strip()
            clean_json = raw_text
            if "```" in clean_json:
                import re
                m = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", clean_json)
                if m:
                    clean_json = m.group(1).strip()
            
            char_obj = json.loads(clean_json)
            saved = engine.save_character(char_obj)
            return {"ok": True, "character": saved}
    except json.JSONDecodeError:
        return JSONResponse({"ok": False, "error": "Model geçerli JSON üretemedi.", "raw": raw_text}, status_code=502)
    except Exception as exc:
        return JSONResponse({"ok": False, "error": _friendly_error(exc)}, status_code=502)

# ── Oturum & Mesaj Kayıt Rotaları ───────────────────────────────────────
@app.post("/api/session/start")
async def session_start(payload: dict):
    sid = payload.get("session_id", "")
    topic = payload.get("topic", "")
    if not sid:
        return JSONResponse({"ok": False, "error": "session_id eksik"}, status_code=400)
    engine.create_session(sid, topic)
    return {"ok": True, "session_id": sid}

@app.post("/api/session/record_message")
async def session_record_message(payload: dict):
    sid = payload.get("session_id", "")
    seat = payload.get("seat", "")
    cid = payload.get("character_id", "")
    role = payload.get("role", "seat")
    content = payload.get("content", "")
    inner = payload.get("inner_thought", "")
    rebuttal_to = payload.get("rebuttal_target_id", "")
    if sid and content:
        engine.record_message(sid, seat, cid, role, content, inner, rebuttal_to)
        return {"ok": True}
    return JSONResponse({"ok": False, "error": "Geçersiz mesaj"}, status_code=400)

@app.post("/api/session/conclude")
async def session_conclude(payload: dict):
    sid = payload.get("session_id", "")
    verdict = payload.get("verdict", "")
    seated_characters = payload.get("seated_characters", [])
    topic = payload.get("topic", "")

    if sid:
        engine.close_session(sid, verdict)
        # Her katılımcı için damıtılmış kişisel hafıza girdisi üret ve kaydet
        for sc in seated_characters:
            cid = sc.get("character_id")
            cname = sc.get("name")
            if cid:
                mem_entry = f"'{topic}' konulu müzakereye katıldı. Nihai karar: {verdict[:100]}..."
                engine.add_character_memory(cid, sid, mem_entry, stance="Tutumunu savundu", rivalries="")
        return {"ok": True}
    return JSONResponse({"ok": False, "error": "session_id eksik"}, status_code=400)

# ── Canlı Araştırma ve Doğrulama Ajanı (Fact-Checker) ────────────────────
@app.post("/api/research/verify")
async def research_verify(payload: dict):
    claim = payload.get("claim", "").strip()
    if not claim:
        return JSONResponse({"ok": False, "error": "İncelenecek iddia boş olamaz."}, status_code=400)
    base = _clean_base(payload.get("base_url", "https://text.pollinations.ai/openai"))
    model = payload.get("model", "openai")
    api_key = payload.get("api_key", "")
    res = await engine.research_fact_check(claim, base, api_key, model)
    return res

# ── İtiraz ve Araya Girme Değerlendirme ─────────────────────────────────
@app.post("/api/debate/evaluate_rebuttal")
async def evaluate_rebuttal_route(payload: dict):
    last_speaker = payload.get("last_speaker_name", "")
    last_text = payload.get("last_message_text", "")
    candidates = payload.get("candidates", [])
    base = _clean_base(payload.get("base_url", "https://text.pollinations.ai/openai"))
    model = payload.get("model", "openai")
    api_key = payload.get("api_key", "")
    res = await engine.evaluate_rebuttals(last_speaker, last_text, candidates, base, api_key, model)
    return res

@app.get("/")
async def index():
    return FileResponse(STATIC_DIR / "index.html")


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# ── Giriş noktası ───────────────────────────────────────────────────────
def _open_browser():
    webbrowser.open(f"http://{HOST}:{PORT}")


if __name__ == "__main__":
    print("┌──────────────────────────────────────────────────────────┐")
    print("│  KONSÜL AI — Çoklu Model Konsey & Kör Jüri İstasyonu     │")
    print(f"│  Adres: http://{HOST}:{PORT}                              │")
    print("│  Kapatmak için: Ctrl+C                                   │")
    print("└──────────────────────────────────────────────────────────┘")
    threading.Timer(1.1, _open_browser).start()
    uvicorn.run(app, host=HOST, port=PORT, log_level="warning")
