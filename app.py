# -*- coding: utf-8 -*-
"""
════════════════════════════════════════════════════════════════════════
  KONSÜL AI — Çoklu Model "Konsey & Kör Jüri" İstasyonu
  Tek dosya FastAPI backend  ·  python app.py  ·  http://127.0.0.1:8888
════════════════════════════════════════════════════════════════════════
  Gereksinimler (tek satır):
      pip install fastapi uvicorn httpx

  Çalıştırma:
      python app.py            (tarayıcıyı kendisi açar)
      KONSUL_HOST=0.0.0.0 KONSUL_PORT=9000 python app.py

  Güvenlik (v1.2):
      • /api/chat, /api/ping vb. uç noktaları yalnızca http(s) kabul eder.
      • Yerel (loopback/özel ağ) hedefler KONSUL_LOCAL_PORTS listesindeki
        portlarla sınırlıdır (varsayılan: 11434,1234,20128). Böylece proxy
        iç servisleri ya da bulut metadata uçlarını hedefleyemez (SSRF kilidi).
      • Genişletme:  KONSUL_LOCAL_PORTS="11434,1234,20128,8080"
      • Acil durum:  KONSUL_ALLOW_ALL_LOCAL=1  (yalnızca tam güvenilir ağlar)
      • S2 (Faz 6): API anahtarları tarayıcıda localStorage'da KALMAZ —
        koltuk anahtarları sunucu tarafı kâsada (api_credentials tablosu);
        istekler koltuk anahtarıyla (seat) çözülür. GET /api/credentials
        yalnızca maskelenmiş ipucu (…son4) döndürür.

  Uyumlu uçlar (Evrensel OpenAI standardı):
      • 9Router   → http://127.0.0.1:20128/v1
      • Ollama    → http://127.0.0.1:11434/v1
      • LM Studio → http://127.0.0.1:1234/v1
      • OpenAI / DeepSeek / Groq (bulut)
════════════════════════════════════════════════════════════════════════
"""

import asyncio
import ipaddress
import json
import os
import re
import threading
import webbrowser
from contextlib import asynccontextmanager, nullcontext
from pathlib import Path
from urllib.parse import urlparse

import httpx
import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# Yerel motor: karakter kütüphanesi, hafıza, araştırma, itiraz hakemi
import engine
import neuro_bridge

# ── Sabitler ────────────────────────────────────────────────────────────
HOST = os.environ.get("KONSUL_HOST", "127.0.0.1")
# Deploy (Senaryo A): KONSUL_PORT > standart PORT (PaaS) > 8888
PORT = int(os.environ.get("KONSUL_PORT") or os.environ.get("PORT") or "8888")
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
CLIENT_TIMEOUT = httpx.Timeout(300.0, connect=8.0)

# SSRF kilidi: yerel hedeflere yalnızca bu portlarda izin (OpenAI-uyumlu yerel uçlar)
_LOCAL_PORTS = {
    int(p)
    for p in os.environ.get("KONSUL_LOCAL_PORTS", "11434,1234,20128").split(",")
    if p.strip().lstrip("-").isdigit()
}
_ALLOW_ALL_LOCAL = os.environ.get("KONSUL_ALLOW_ALL_LOCAL", "0") == "1"


# ── Paylaşımlı HTTP istemcisi (bağlantı havuzu — her istekte yeniden kurulum yok) ──
_HTTP: httpx.AsyncClient | None = None


def _get_http() -> httpx.AsyncClient:
    global _HTTP
    if _HTTP is None:
        _HTTP = httpx.AsyncClient(timeout=CLIENT_TIMEOUT)
    return _HTTP


@asynccontextmanager
async def lifespan(_app: FastAPI):
    _get_http()
    yield
    global _HTTP
    if _HTTP is not None:
        await _HTTP.aclose()
        _HTTP = None


app = FastAPI(
    title="KONSÜL AI", version="1.3.0",
    docs_url=None, redoc_url=None, lifespan=lifespan,
)

# Faz 5 (denetim S-borca): CORS artık '*' değil. Arayüz aynı kökten (FastAPI
# statik) servis edildiği için varsayılan same-origin yeterli. Gerekirse
# KONSUL_CORS_ORIGINS="https://a.example,https://b.example" ile beyan edilir.
_cors_origins = [o.strip() for o in os.getenv("KONSUL_CORS_ORIGINS", "").split(",") if o.strip()]
if _cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins,
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


def _validate_base_url(url: str) -> str | None:
    """Base URL'yi SSRF kilidinden geçirir; sorun varsa hata metni, yoksa None döner."""
    base = _clean_base(url)
    if not base:
        return "Base URL boş."
    p = urlparse(base)
    if p.scheme not in ("http", "https"):
        return "Yalnızca http/https uçları desteklenir."
    if not p.hostname:
        return "Base URL geçersiz (host eksik)."
    try:
        port = p.port or (443 if p.scheme == "https" else 80)
    except ValueError:
        return "Base URL geçersiz (port hatalı)."

    host = p.hostname.lower().strip(".")
    if host in ("localhost", "localhost.localdomain"):
        host = "127.0.0.1"
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        ip = None  # adlı host (bulut uçları) — doğrudan IP engeli uygulanmaz

    if ip is not None:
        if ip.is_loopback:
            reason = "loopback"
        elif ip.is_private:
            reason = "özel ağ (RFC1918)"
        elif ip.is_link_local:
            reason = "link-local (metadata/yerel servis)"
        elif ip.is_multicast or ip.is_reserved or ip.is_unspecified:
            reason = "özel kullanım aralığı"
        else:
            reason = None  # herkese açık IP
        if reason and not _ALLOW_ALL_LOCAL and port not in _LOCAL_PORTS:
            return (
                f"Yerel hedef ({reason}:{port}) izin listesinde yok. "
                f"İzinli yerel portlar: {', '.join(str(x) for x in sorted(_LOCAL_PORTS))}. "
                "Genişletmek için KONSUL_LOCAL_PORTS ortam değişkenini kullanın."
            )
    return None


# ── Faz 6 (S2): koltuk bazlı kimlik çözümleme ──────────────────────────
# Tarayıcı anahtarı localStorage'da tutmaz; çağrı yalnızca koltuk anahtarını
# (seat) gönderir, anahtar + base_url sunucu tarafı kâsadan (api_credentials)
# çözülür. Gövdede açık anahtar da geçerse (geliştirme) öncelik gövdededir.
def _resolve_endpoint(base_url: str, api_key: str, model: str, seat: str):
    """(base_url, api_key, model, error) döndürür."""
    b = (base_url or "").strip()
    k = (api_key or "").strip()
    m = (model or "").strip()
    s = (seat or "").strip().upper()
    if s in engine.VALID_CRED_SEATS:
        cred = engine.get_api_credential(s)
        if cred:
            b = b or (cred.get("base_url") or "")
            k = k or (cred.get("api_key") or "")
            m = m or (cred.get("model") or "")
    if not b:
        return None, None, None, "base_url eksik — koltuk yapılandırmasından (veya sunucu kâsasından) çözülemedi."
    return b, k, m, None


_POLLINATIONS_LOCK = asyncio.Lock()


def _extract_retry_seconds(status_code: int, body_text: str) -> int:
    """HTTP 402/429 yanıtındaki 'Retry after Xs' bilgisinden güvenli bekleme süresini çıkarır."""
    m = re.search(r"Retry after\s+(\d+)\s*s", body_text or "", re.IGNORECASE)
    if m:
        return min(50, int(m.group(1)) + 2)
    return 20 if status_code == 402 else 3


def _pollinations_guard(base_url: str):
    """Pollinations tek-IP eşzamanlılık sınırını aşmamak için istekleri sıraya koyar."""
    if "pollinations.ai" in (base_url or "").lower():
        return _POLLINATIONS_LOCK
    return nullcontext()


def _prepare_cognitive_messages(messages: list[dict], seat: str, character_id: str = "", session_id: str = "") -> list[dict]:
    """Kimliği ve oturumu verilmiş model konuşmalarına bilişsel direktif ekler."""
    s = (seat or "").strip().upper()
    if not s or s == "OP" or not character_id or not session_id or not messages:
        return messages

    for msg in messages:
        if msg.get("role") == "system" and "İÇ SES PROTOKOLÜ" in str(msg.get("content", "")):
            return messages

    last_user_text = ""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            last_user_text = str(msg.get("content", ""))
            break

    # Subjective user ratings are not evidence and must not train the predictor.
    snap = neuro_bridge.step_character(s, character_id, session_id, last_user_text)
    directive = snap.get("directive", "")
    if not directive:
        return messages

    out = [dict(m) for m in messages]
    for m in out:
        if m.get("role") == "system":
            m["content"] = str(m.get("content", "")) + directive
            return out
    out.insert(0, {"role": "system", "content": directive.strip()})
    return out


# ── Paylaşımlı istem şeması (Pydantic) ─────────────────────────────────
class ChatPayload(BaseModel):
    base_url: str = ""
    api_key: str = ""
    model: str = ""
    seat: str = ""
    messages: list[dict] = Field(default_factory=list)
    cognitive_character_id: str = Field(default="", max_length=200)
    cognitive_session_id: str = Field(default="", max_length=200)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)


# ── Sağlık / teşhis rotaları ────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"ok": True, "service": "KONSÜL AI", "mode": "canlı", "version": "1.2.0"}


@app.get("/api/ping")
async def ping(url: str):
    """Verilen OpenAI-uyumlu Base URL'yi test eder, model listesini döndürür."""
    err = _validate_base_url(url)
    if err:
        return {"ok": False, "error": err}
    target = _clean_base(url) + "/models"
    try:
        resp = await _get_http().get(target, timeout=5.0)
        if resp.status_code != 200:
            return {"ok": False, "error": f"HTTP {resp.status_code}"}
        data = resp.json()
        models = [m.get("id", "?") for m in data.get("data", [])][:60]
        return {"ok": True, "models": models}
    except Exception as exc:  # noqa: BLE001 — kullanıcıya temiz metin dön
        return {"ok": False, "error": _friendly_error(exc)}


# ── Ana proxy: tek atış (non-stream) ────────────────────────────────────
# ── Faz 6 (S2): API kimlik kâsası uçları ───────────────────────────────
@app.post("/api/credentials")
async def credentials_save(payload: dict):
    """Koltuğun (base_url, api_key, model) üçlüsünü sunucu tarafında saklar."""
    seat = (payload.get("seat") or "").strip().upper()
    if seat not in engine.VALID_CRED_SEATS:
        return JSONResponse({"ok": False, "error": f"Geçersiz koltuk: {seat!r}"}, status_code=400)
    api_key = (payload.get("api_key") or "").strip()
    base_url = (payload.get("base_url") or "").strip()
    model = (payload.get("model") or "").strip()
    if not api_key and not base_url:
        return JSONResponse({"ok": False, "error": "Saklanacak anahtar veya uç adresi yok."}, status_code=400)
    if base_url:
        verr = _validate_base_url(base_url)
        if verr:
            return JSONResponse({"ok": False, "error": verr}, status_code=400)
    ok = engine.save_api_credential(seat, base_url, api_key, model)
    if not ok:
        return JSONResponse({"ok": False, "error": "Kasa yazımı başarısız."}, status_code=500)
    cred = engine.get_api_credential(seat)
    key = cred.get("api_key", "") if cred else ""
    return {
        "ok": True,
        "seat": seat,
        "key_hint": ("…" + key[-4:]) if key else "",
    }


@app.get("/api/credentials")
async def credentials_list():
    """Her koltuğun kâsa durumu (ham anahtar ASLA dönmez)."""
    return {"ok": True, "credentials": engine.list_api_credentials()}


@app.delete("/api/credentials/{seat}")
async def credentials_delete(seat: str):
    seat = seat.strip().upper()
    if seat not in engine.VALID_CRED_SEATS:
        return JSONResponse({"ok": False, "error": f"Geçersiz koltuk: {seat!r}"}, status_code=400)
    ok = engine.delete_api_credential(seat)
    return {"ok": ok, "seat": seat, "deleted": ok}


@app.post("/api/chat")
async def chat(payload: ChatPayload):
    base, api_key, model, rerr = _resolve_endpoint(
        payload.base_url, payload.api_key, payload.model, payload.seat
    )
    if rerr:
        return JSONResponse({"ok": False, "error": rerr}, status_code=400)
    err = _validate_base_url(base)
    if err:
        return JSONResponse({"ok": False, "error": err}, status_code=400)
    prepared_messages = _prepare_cognitive_messages(payload.messages, payload.seat, payload.cognitive_character_id, payload.cognitive_session_id)
    body = {
        "model": model,
        "messages": prepared_messages,
        "temperature": payload.temperature,
        "stream": False,
    }
    try:
        resp = None
        async with _pollinations_guard(base):
            for attempt in range(5):
                resp = await _get_http().post(
                    _clean_base(base) + "/chat/completions",
                    json=body,
                    headers=_auth_headers(api_key),
                )
                if resp.status_code in (429, 402) and attempt < 4:
                    wait_s = _extract_retry_seconds(resp.status_code, resp.text)
                    await asyncio.sleep(wait_s)
                    continue
                break
        if resp.status_code != 200:
            detail = resp.text[:300].replace("\n", " ")
            return JSONResponse(
                {"ok": False, "error": f"Uç sunucu HTTP {resp.status_code} döndürdü: {detail}"},
                status_code=502,
            )
        data = resp.json()
        raw_content = data["choices"][0]["message"]["content"]
        content = neuro_bridge.clean_human_speech(engine.filter_persona_text(raw_content))
        return {"ok": True, "content": content}
    except KeyError:
        return JSONResponse({"ok": False, "error": "Uç sunucu beklenmeyen biçimde yanıt verdi."}, status_code=502)
    except Exception as exc:  # noqa: BLE001
        return JSONResponse({"ok": False, "error": _friendly_error(exc)}, status_code=502)


# ── Ana proxy: SSE streaming motoru ─────────────────────────────────────
@app.post("/api/chat/stream")
async def chat_stream(payload: ChatPayload, request: Request):
    base, api_key, model, rerr = _resolve_endpoint(
        payload.base_url, payload.api_key, payload.model, payload.seat
    )
    if rerr:
        return JSONResponse({"ok": False, "error": rerr}, status_code=400)
    err = _validate_base_url(base)
    if err:
        return JSONResponse({"ok": False, "error": err}, status_code=400)

    prepared_messages = _prepare_cognitive_messages(payload.messages, payload.seat, payload.cognitive_character_id, payload.cognitive_session_id)
    body = {
        "model": model,
        "messages": prepared_messages,
        "temperature": payload.temperature,
        "stream": True,
    }
    base = _clean_base(base)
    headers = _auth_headers(api_key)

    async def event_generator():
        resp = None
        acc_chunks: list[str] = []
        try:
            async with _pollinations_guard(base):
                for attempt in range(5):
                    req = _get_http().build_request(
                        "POST", base + "/chat/completions", json=body, headers=headers, timeout=60.0
                    )
                    resp = await _get_http().send(req, stream=True)
                    if resp.status_code in (429, 402) and attempt < 4:
                        code = resp.status_code
                        err_text = (await resp.aread()).decode("utf-8", "ignore")
                        await resp.aclose()
                        resp = None
                        wait_s = _extract_retry_seconds(code, err_text)
                        for _ in range(wait_s):
                            if await request.is_disconnected():
                                return
                            await asyncio.sleep(1.0)
                        continue
                    break

                if resp is None or resp.status_code != 200:
                    code = resp.status_code if resp is not None else 502
                    detail = (await resp.aread()).decode("utf-8", "ignore")[:300] if resp is not None else "Yanıt alınamadı"
                    if resp is not None:
                        await resp.aclose()
                        resp = None
                    err_msg = f"Uç sunucu HTTP {code}: {detail}"
                    yield "data: " + json.dumps({"error": err_msg}, ensure_ascii=False) + "\n\n"
                    return

                ctype = resp.headers.get("content-type", "")

                # Bazı uçlar stream bayrağını yok sayıp düz JSON döndürür → tek parça yayınla
                if "application/json" in ctype:
                    raw = (await resp.aread()).decode("utf-8", "ignore")
                    await resp.aclose()
                    resp = None
                    try:
                        raw_content = json.loads(raw)["choices"][0]["message"]["content"]
                        content = neuro_bridge.clean_human_speech(engine.filter_persona_text(raw_content))
                        yield "data: " + json.dumps({"delta": content}, ensure_ascii=False) + "\n\n"
                    except Exception:  # noqa: BLE001
                        yield "data: " + json.dumps({"error": "Uç sunucu geçersiz JSON döndürdü."}, ensure_ascii=False) + "\n\n"
                    yield "data: [DONE]\n\n"
                    return

                buffer = ""
                done_seen = False
                async for chunk in resp.aiter_text():
                    if await request.is_disconnected():
                        await resp.aclose()
                        resp = None
                        return  # Operatör "Durdur"a bastı → upstream de kesilir
                    buffer += chunk
                    while "\n" in buffer:
                        line, buffer = buffer.split("\n", 1)
                        line = line.strip()
                        if not line.startswith("data:"):
                            continue
                        data = line[5:].strip()
                        if data == "[DONE]":
                            done_seen = True
                            break
                        try:
                            obj = json.loads(data)
                        except json.JSONDecodeError:
                            continue
                        if obj.get("error"):
                            msg = obj["error"].get("message", str(obj["error"]))
                            yield "data: " + json.dumps({"error": msg}, ensure_ascii=False) + "\n\n"
                            await resp.aclose()
                            resp = None
                            return
                        try:
                            delta = obj["choices"][0]["delta"].get("content")
                        except (KeyError, IndexError, AttributeError):
                            delta = None
                        if delta:
                            acc_chunks.append(delta)
                            yield "data: " + json.dumps({"delta": delta}, ensure_ascii=False) + "\n\n"
                    if done_seen:
                        break

                if resp is not None:
                    await resp.aclose()
                    resp = None

            full_raw = "".join(acc_chunks)
            if full_raw:
                cleaned = neuro_bridge.clean_human_speech(engine.filter_persona_text(full_raw))
                if cleaned != full_raw:
                    yield "data: " + json.dumps({"replace": cleaned}, ensure_ascii=False) + "\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:  # noqa: BLE001 — terminal çöpü asla UI'a sızmasın
            if resp is not None:
                try:
                    await resp.aclose()
                except Exception:
                    pass
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


# ── Karakter Kütüphanesi & Karakter Mimarı & Araştırma Motoru ───────────
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
    prompt = (payload.get("prompt") or "").strip()
    if not prompt:
        return JSONResponse({"ok": False, "error": "Karakter tanımı boş olamaz."}, status_code=400)

    base_url = (payload.get("base_url") or "https://text.pollinations.ai/openai").strip()
    model = payload.get("model", "")
    api_key = payload.get("api_key", "")
    base, api_key, model, rerr = _resolve_endpoint(base_url, api_key, model, payload.get("seat", ""))
    if rerr:
        return JSONResponse({"ok": False, "error": rerr}, status_code=400)
    err = _validate_base_url(base)
    if err:
        return JSONResponse({"ok": False, "error": err}, status_code=400)
    base = _clean_base(base)
    if not model:
        model = "openai"

    architect_sys = (
        "Sen uzman bir Zihinsel Karakter ve Psikoloji Mimarısın. "
        "Görevin, kullanıcının verdiği brief doğrultusunda sığ olmayan, sahte taklitlerden uzak, "
        "derin, tavizsiz ve tutarlı bir karakter profili inşa etmektir. "
        "Karakterin dünya görüşünü, neleri kutsal saydığını, neye öfkelendiğini, tartışma üslubunu "
        "ve karakterine %100 sadık kalmasını sağlayan sistem istemini hazırla. "
        "TARİHÎ OLARAK HASSAS ŞAHİSLER (totaliter liderler, katil, insanlık suçlusu figürler) "
        "İÇİN BİRİNCİ ŞAHIS BEDENLEME YAPMA: yerlerine tezi soyut bir arketip üzerinden savunan, "
        "şiddet/ırkçılık/ nefret söylemi üretmeyen, kişilere hakaret etmeyen 'analitik mesafe' "
        "karakteri inşa et. "
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
            {"role": "user", "content": user_msg},
        ],
        "temperature": 0.6,
        "stream": False,
    }

    raw_text = ""
    try:
        resp = None
        async with _pollinations_guard(base):
            for attempt in range(5):
                resp = await _get_http().post(
                    base + "/chat/completions",
                    json=body,
                    headers=_auth_headers(api_key),
                )
                if resp.status_code == 429 and attempt < 4:
                    await asyncio.sleep(3.0)
                    continue
                break
        if resp.status_code != 200:
            return JSONResponse(
                {"ok": False, "error": f"Model sunucusu HTTP {resp.status_code} döndürdü: {resp.text[:200]}"},
                status_code=502,
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
        return JSONResponse({"ok": False, "error": "Model geçerli JSON üretemedi.", "raw": raw_text[:2000]}, status_code=502)
    except Exception as exc:  # noqa: BLE001
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
            if cid:
                mem_entry = f"'{topic}' konulu müzakereye katıldı. Nihai karar: {verdict[:100]}..."
                engine.add_character_memory(cid, sid, mem_entry, stance="Tutumunu savundu", rivalries="")
        return {"ok": True}
    return JSONResponse({"ok": False, "error": "session_id eksik"}, status_code=400)


# ── Arşiv & Tutanak Rotaları (okuma tarafı — denetim raporu §3.4) ───────
@app.get("/api/sessions")
async def list_sessions(limit: int = 50):
    return {"ok": True, "sessions": engine.list_sessions(limit=limit)}


@app.get("/api/session/{sid}/messages")
async def session_messages(sid: str):
    msgs = engine.get_session_messages(sid)
    if not msgs:
        return JSONResponse({"ok": False, "error": "Oturum veya kaydı bulunamadı."}, status_code=404)
    return {"ok": True, "session_id": sid, "messages": msgs}


# ── Hukuki Karar Protokolü (Faz 3): resmî rapor arşivi ────────────────────
@app.post("/api/session/report")
async def session_report_save(payload: dict):
    sid = payload.get("session_id", "")
    report_md = payload.get("report_md", "")
    if not sid or not report_md:
        return JSONResponse({"ok": False, "error": "session_id ve report_md gerekli."}, status_code=400)
    rid = engine.save_decision_report(
        sid,
        payload.get("topic", ""),
        report_md,
        payload.get("fingerprint", ""),
        payload.get("dissent_seats", ""),
    )
    return {"ok": True, "report_id": rid}


@app.get("/api/session/{sid}/report")
async def session_report_get(sid: str):
    rep = engine.get_session_report(sid)
    if not rep:
        return JSONResponse({"ok": False, "error": "Bu oturum için karar raporu yok."}, status_code=404)
    return {"ok": True, "report": rep}


@app.get("/api/reports")
async def list_decision_reports(limit: int = 100):
    return {"ok": True, "reports": engine.list_decision_reports(limit=limit)}


# ── Mühürlü Zarf & İkna Deltası (Faz 2 — taç) ───────────────────────────
@app.post("/api/envelope/seal")
async def envelope_seal(payload: dict):
    sid = payload.get("session_id", "")
    seat = payload.get("seat", "")
    position = (payload.get("position") or "").strip()
    if not sid or not seat or not position:
        return JSONResponse({"ok": False, "error": "session_id, seat ve position zorunludur."}, status_code=400)
    env = engine.seal_envelope(
        sid, seat,
        payload.get("character_id", ""),
        (payload.get("word") or "").strip(),
        position,
    )
    return {"ok": True, "envelope": env}


@app.get("/api/envelope/{sid}")
async def envelope_status(sid: str):
    envelopes = engine.get_envelopes(sid)
    return {
        "ok": True,
        "session_id": sid,
        "envelopes": envelopes,
        "sealed_count": len(envelopes),
        "opened": bool(envelopes) and all(e["opened_at"] for e in envelopes),
    }


@app.post("/api/envelope/open")
async def envelope_open(payload: dict):
    sid = payload.get("session_id", "")
    if not sid:
        return JSONResponse({"ok": False, "error": "session_id eksik"}, status_code=400)
    envelopes = engine.open_envelopes(sid)
    if not envelopes:
        return JSONResponse({"ok": False, "error": "Bu oturumda mühürlü zarf yok."}, status_code=404)
    return {"ok": True, "envelopes": envelopes}


@app.post("/api/delta/compute")
async def delta_compute(payload: dict):
    sid = payload.get("session_id", "")
    if not sid:
        return JSONResponse({"ok": False, "error": "session_id eksik"}, status_code=400)
    base_url = (payload.get("base_url") or "https://text.pollinations.ai/openai").strip()
    base, api_key, model, rerr = _resolve_endpoint(
        base_url, payload.get("api_key", ""), payload.get("model", ""), payload.get("seat", "")
    )
    if rerr:
        return JSONResponse({"ok": False, "error": rerr}, status_code=400)
    err = _validate_base_url(base)
    if err:
        return JSONResponse({"ok": False, "error": err}, status_code=400)
    async with _pollinations_guard(base):
        res = await engine.compute_persuasion_delta(
            sid,
            base,
            api_key,
            model or "openai",
            (payload.get("transcript") or "").strip(),
            payload.get("final_positions", {}) or {},
        )
    return res


# ── Canlı Araştırma ve Doğrulama Ajanı (Fact-Checker) ───────────────────
# ── Yaşayan Hafıza (Faz 2 — K8): karakterin önceki oturumlardan kalıntısı ──
@app.get("/api/memory/{char_id}")
async def character_memory(char_id: str):
    rows = engine.get_character_memory(char_id, limit=12)
    text = engine.get_character_memory_text(char_id, limit=4)
    return {"ok": True, "character_id": char_id, "count": len(rows), "memories": rows, "text": text}


@app.post("/api/memory/add")
async def character_memory_add(payload: dict):
    """Faz 3b — rivalries: küskünlük/hesap girdileri episodik hafızaya damıtılır."""
    cid = payload.get("character_id", "")
    entry = payload.get("entry", "")
    if not cid or not entry:
        return JSONResponse({"ok": False, "error": "character_id ve entry gerekli."}, status_code=400)
    engine.add_character_memory(
        cid,
        payload.get("session_id", ""),
        entry,
        payload.get("stance", ""),
        payload.get("rivalries", ""),
    )
    return {"ok": True}


# ── Yakınsama Radarı (Faz 2 — K3): tur başı pozisyon yakınlığı ────────────
@app.post("/api/convergence")
async def convergence_route(payload: dict):
    positions = payload.get("positions") or {}
    if not positions:
        return JSONResponse({"ok": False, "error": "positions boş olamaz."}, status_code=400)
    base_url = (payload.get("base_url") or "https://text.pollinations.ai/openai").strip()
    base, api_key, model, rerr = _resolve_endpoint(
        base_url, payload.get("api_key", ""), payload.get("model", ""), payload.get("seat", "")
    )
    if rerr:
        return JSONResponse({"ok": False, "error": rerr}, status_code=400)
    err = _validate_base_url(base)
    if err:
        return JSONResponse({"ok": False, "error": err}, status_code=400)
    async with _pollinations_guard(base):
        res = await engine.compute_convergence(positions, base, api_key, model or "openai")
    return res


@app.post("/api/research/verify")
async def research_verify(payload: dict):
    claim = (payload.get("claim") or "").strip()
    if not claim:
        return JSONResponse({"ok": False, "error": "İncelenecek iddia boş olamaz."}, status_code=400)
    base_url = (payload.get("base_url") or "https://text.pollinations.ai/openai").strip()
    base, api_key, model, rerr = _resolve_endpoint(
        base_url, payload.get("api_key", ""), payload.get("model", ""), payload.get("seat", "")
    )
    if rerr:
        return JSONResponse({"ok": False, "error": rerr}, status_code=400)
    err = _validate_base_url(base)
    if err:
        return JSONResponse({"ok": False, "error": err}, status_code=400)
    session_id = payload.get("session_id", "")
    async with _pollinations_guard(base):
        res = await engine.research_fact_check(claim, base, api_key, model or "openai", session_id=session_id)
    return res


# ── İtiraz ve Araya Girme Değerlendirme ─────────────────────────────────
@app.post("/api/debate/evaluate_rebuttal")
async def evaluate_rebuttal_route(payload: dict):
    last_speaker = payload.get("last_speaker_name", "")
    last_text = payload.get("last_message_text", "")
    candidates = payload.get("candidates", [])
    base_url = (payload.get("base_url") or "https://text.pollinations.ai/openai").strip()
    base, api_key, model, rerr = _resolve_endpoint(
        base_url, payload.get("api_key", ""), payload.get("model", ""), payload.get("seat", "")
    )
    if rerr:
        return JSONResponse({"ok": False, "error": rerr}, status_code=400)
    err = _validate_base_url(base)
    if err:
        return JSONResponse({"ok": False, "error": err}, status_code=400)
    async with _pollinations_guard(base):
        res = await engine.evaluate_rebuttals(last_speaker, last_text, candidates, base, api_key, model or "openai")
    return res


# ── Nörodinamik Bilişsel Durum Uçları ───────────────────────────────────


@app.post("/api/neuro/feedback")
async def neuro_feedback(payload: dict):
    """Record a subjective rating without treating it as evidence or reward."""
    feedback_id = payload.get("feedback_id")
    character_id = payload.get("character_id")
    session_id = payload.get("session_id")
    reward = payload.get("reward")
    try:
        accepted = neuro_bridge.enqueue_feedback(
            feedback_id, character_id, session_id, reward, payload.get("message_id", "")
        )
    except (TypeError, ValueError) as exc:
        return JSONResponse({"ok": False, "error": str(exc)}, status_code=400)
    return {
        "ok": True,
        "accepted": accepted,
        "duplicate": not accepted,
        "applies_on": None,
        "learning": False,
        "note": "Öznel geri bildirim kaydedildi; kanıt olmadığı için öğrenmede kullanılmaz.",
    }

@app.get("/api/neuro/state")
async def neuro_state_endpoint():
    return {"ok": True, "seats": neuro_bridge.get_all_states()}


@app.post("/api/neuro/reset")
async def neuro_reset_endpoint():
    neuro_bridge.reset_all_seats()
    return {"ok": True, "seats": neuro_bridge.get_all_states()}


# ── Persona Guard Uç Noktası ───────────────────────────────────────────
@app.post("/api/persona/clean")
async def persona_clean_endpoint(payload: dict):
    raw_text = payload.get("text", "")
    speaker_name = payload.get("speaker_name", "")
    cleaned = neuro_bridge.clean_human_speech(
        engine.filter_persona_text(raw_text),
        speaker_name=speaker_name,
    )
    report = engine.check_persona_violations(raw_text)
    return {"ok": True, "cleaned": cleaned, "report": report}


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
    print(f"│  Adres: http://{HOST}:{PORT}")
    print("│  Kapatmak için: Ctrl+C                                   │")
    print("└──────────────────────────────────────────────────────────┘")
    threading.Timer(1.1, _open_browser).start()
    uvicorn.run(app, host=HOST, port=PORT, log_level="warning")
