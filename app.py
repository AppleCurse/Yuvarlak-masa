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
import uuid
import webbrowser
from contextlib import asynccontextmanager, nullcontext
from datetime import datetime, timezone
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
CLIENT_TIMEOUT = httpx.Timeout(28.0, connect=8.0, read=25.0, write=10.0)

# SSRF kilidi: yerel hedeflere yalnızca bu portlarda izin (OpenAI-uyumlu yerel uçlar)
_LOCAL_PORTS = {
    int(p)
    for p in os.environ.get("KONSUL_LOCAL_PORTS", "11434,1234,20128").split(",")
    if p.strip().lstrip("-").isdigit()
}
_ALLOW_ALL_LOCAL = os.environ.get("KONSUL_ALLOW_ALL_LOCAL", "0") == "1"

# v1.4: hız sınırı — dış model çağrısı yapan uçlarda IP başına kayan pencere.
# KONSUL_RATE_LIMIT_PER_MIN=0 ile kapatılır. Not: işlem-içi (in-memory) sayaçtır;
# çok çalışanlı (multi-worker) dağıtımlarda sayaç çalışan başına ayrı tutulur.
try:
    _RATE_LIMIT_PER_MIN = max(0, int(os.environ.get("KONSUL_RATE_LIMIT_PER_MIN", "60")))
except ValueError:
    _RATE_LIMIT_PER_MIN = 60
_RATE_WINDOW_S = 60.0
_rate_hits: dict[str, list[float]] = {}

try:
    FREE_TRIAL_DAILY_SESSIONS = max(1, int(os.environ.get("FREE_TRIAL_DAILY_SESSIONS", "2")))
except ValueError:
    FREE_TRIAL_DAILY_SESSIONS = 2
# v2.6: Tam masa akışı (moderatör girişi + 6 koltuk turu + moderatör derinleştirme
# + karar özeti = 9 çağrı; zarf/open opsiyonlarıyla birlikte 20 çağrıya kadar çıkabiliyor.)
try:
    FREE_TRIAL_MAX_CALLS_PER_SESSION = max(5, int(os.environ.get("FREE_TRIAL_MAX_CALLS_PER_SESSION", "20")))
except ValueError:
    FREE_TRIAL_MAX_CALLS_PER_SESSION = 20

_TR_MONTHS = [
    "", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
]


def _client_ip(request: Request) -> str:
    cf_ip = (request.headers.get("cf-connecting-ip") or "").strip()
    if cf_ip:
        return cf_ip[:64]
    fwd = (request.headers.get("x-forwarded-for") or "").split(",")[0].strip()
    if fwd:
        return fwd[:64]
    return request.client.host if request.client else "unknown"


def _check_rate_limit(request: Request):
    """Sınır aşıldıysa 429 JSONResponse, yoksa None döner."""
    if _RATE_LIMIT_PER_MIN <= 0:
        return None
    import time as _time
    ip = _client_ip(request)
    now = _time.monotonic()
    hits = _rate_hits.get(ip)
    if hits is None:
        hits = _rate_hits[ip] = []
    cutoff = now - _RATE_WINDOW_S
    while hits and hits[0] <= cutoff:
        hits.pop(0)
    if len(hits) >= _RATE_LIMIT_PER_MIN:
        retry_after = max(1, int(hits[0] + _RATE_WINDOW_S - now) + 1)
        return JSONResponse(
            {"ok": False, "error": f"Hız sınırı aşıldı — dakikada en fazla {_RATE_LIMIT_PER_MIN} model çağrısı. {retry_after} sn sonra tekrar deneyin.",
             "retry_after": retry_after},
            status_code=429,
            headers={"Retry-After": str(retry_after)},
        )
    hits.append(now)
    return None


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


def _friendly_error(exc: Exception, is_pool: bool = False) -> str:
    if isinstance(exc, httpx.ConnectError):
        if is_pool:
            return "Ücretsiz deneme havuzuna şu an bağlanılamadı. Tekrar deneyebilir veya kendi ücretsiz API anahtarını bağlayabilirsin."
        return "Yapay zeka sunucusuna bağlanılamadı. Bağlantını veya seçili sağlayıcıyı kontrol et."
    if isinstance(exc, (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.TimeoutException, asyncio.TimeoutError)):
        if is_pool:
            return "Ücretsiz deneme havuzu yanıt süresini aştı. Birkaç saniye sonra tekrar dene ya da sağ üstten 10 saniyede kendi ücretsiz API anahtarını (Groq / Gemini / OpenRouter) bağla."
        return "Model yanıtı zaman aşımına uğradı (25 sn). Lütfen tekrar dene."
    if is_pool:
        return "Ücretsiz deneme havuzunda geçici bir bağlantı sorunu oluştu. Tekrar deneyebilir veya kendi ücretsiz API anahtarını bağlayabilirsin."
    return "Yapay zeka sunucusuyla geçici bir bağlantı sorunu oluştu. Lütfen tekrar dene."


def _is_pollinations(url: str) -> bool:
    return "pollinations.ai" in (url or "").lower()


def _clean_upstream_error(status_code: int, raw_detail: str = "", is_pool: bool = False) -> tuple[str, str]:
    """Ham HTTP/JSON hatalarını kullanıcıya asla sızdırmadan anlaşılır Türkçe mesaja çevirir.
    (mesaj, hata_kodu) döndürür."""
    low = (raw_detail or "").lower()
    if status_code in (429, 402) or "rate_limited" in low or "free_limit" in low or "still running" in low:
        if is_pool:
            return (
                "Ücretsiz deneme havuzu şu an bekleme/yoğunluk sınırında (ortak havuz arka arkaya hızlı istekleri kısıtlıyor). "
                "Sağ üstteki 'Ücretsiz API Bağla' düğmesinden 10 saniyede kendi ücretsiz Groq, Google Gemini veya OpenRouter anahtarını bağlayarak 4 uzmanı kesintisiz konuşturabilirsin.",
                "pool_rate_limit",
            )
        if status_code == 402:
            return (
                "Bağlı API hesabının ücretsiz kullanım kotası dolmuş görünüyor. Sağlayıcı ayarlarından başka bir ücretsiz servis seçebilirsin.",
                "quota_exceeded",
            )
        return (
            "Bağlı API anahtarının anlık hız sınırına ulaşıldı. Birkaç saniye bekleyip tekrar dene.",
            "rate_limit",
        )
    if status_code in (401, 403):
        return (
            "API anahtarı geçersiz veya yetkisiz görünüyor. Sağ üstteki 'Ücretsiz API Bağla' ekranından anahtarını kontrol et.",
            "auth_error",
        )
    if status_code == 404:
        return (
            "Seçili yapay zeka modeli şu an kullanılamıyor. Sağlayıcı ayarlarından farklı bir model seçebilirsin.",
            "model_not_found",
        )
    if is_pool:
        return (
            "Ücretsiz deneme havuzu şu an geçici olarak yanıt veremedi. Tekrar deneyebilir ya da kendi ücretsiz API anahtarını bağlayabilirsin.",
            "pool_unavailable",
        )
    return (
        "Yapay zeka sunucusu şu an geçici olarak yanıt veremedi. Birkaç saniye sonra tekrar dene.",
        "upstream_error",
    )


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


# ── v2.0: 5 Ücretsiz Sağlayıcı Havuzu + Çoklu Sağlayıcı Kataloğu ────────
# Ziyaretçiye geliştirici detayı göstermeden her koltuğa farklı bir yapay zeka
# sağlayıcısı atar. Railway ortam değişkenleri (GROQ_API_KEY, GEMINI_API_KEY,
# OPENROUTER_API_KEY, NVIDIA_API_KEY, MISTRAL_API_KEY, ARENA_API_KEY) tanımlıysa
# sunucu tarafında güvenle kullanılır (tarayıcıya ASLA sızmaz).
PROVIDER_CATALOG = [
    {
        "id": "groq",
        "name": "Groq",
        "badge": "Ücretsiz · Çok Hızlı",
        "free": True,
        "multi_model": False,
        "base_url": "https://api.groq.com/openai/v1",
        "env_key": "GROQ_API_KEY",
        "key_url": "https://console.groq.com/keys",
        "note": "Kredi kartı istemez. Çok hızlı Qwen ve GPT-OSS modelleri sunar.",
        "default_model": "qwen/qwen3.8-27b",
        "models": [
            "qwen/qwen3.8-27b",
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b",
        ],
    },
    {
        "id": "gemini",
        "name": "Google Gemini",
        "badge": "Ücretsiz · Güçlü Türkçe",
        "free": True,
        "multi_model": False,
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai",
        "env_key": "GEMINI_API_KEY",
        "key_url": "https://aistudio.google.com/apikey",
        "note": "Google hesabıyla 10 saniyede ücretsiz anahtar alınır. Türkçesi çok güçlüdür.",
        "default_model": "gemini-2.5-flash",
        "models": [
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite",
            "gemini-2.0-flash",
        ],
    },
    {
        "id": "openrouter",
        "name": "OpenRouter",
        "badge": "Ücretsiz + Çoklu Model",
        "free": True,
        "multi_model": True,
        "base_url": "https://openrouter.ai/api/v1",
        "env_key": "OPENROUTER_API_KEY",
        "key_url": "https://openrouter.ai/keys",
        "note": "Tek anahtarla onlarca ücretsiz (:free) ve farklı marka modele erişim.",
        "default_model": "meta-llama/llama-3.3-70b-instruct:free",
        "models": [
            "meta-llama/llama-3.3-70b-instruct:free",
            "deepseek/deepseek-r1-0528:free",
            "qwen/qwen3-235b-a22b:free",
            "google/gemma-3-27b-it:free",
            "mistralai/mistral-small-3.1-24b-instruct:free",
        ],
    },
    {
        "id": "nvidia",
        "name": "NVIDIA NIM",
        "badge": "Ücretsiz · Açık Modeller",
        "free": True,
        "multi_model": True,
        "base_url": "https://integrate.api.nvidia.com/v1",
        "env_key": "NVIDIA_API_KEY",
        "key_url": "https://build.nvidia.com/explore/discover",
        "note": "NVIDIA geliştirici hesabıyla ücretsiz. Nemotron, DeepSeek, Qwen ve Llama sunar.",
        "default_model": "meta/llama-3.3-70b-instruct",
        "models": [
            "meta/llama-3.3-70b-instruct",
            "nvidia/llama-3.1-nemotron-70b-instruct",
            "deepseek-ai/deepseek-r1",
            "qwen/qwen2.5-72b-instruct",
        ],
    },
    {
        "id": "mistral",
        "name": "Mistral AI",
        "badge": "Ücretsiz · Avrupa Ekolü",
        "free": True,
        "multi_model": False,
        "base_url": "https://api.mistral.ai/v1",
        "env_key": "MISTRAL_API_KEY",
        "key_url": "https://console.mistral.ai/api-keys",
        "note": "Ücretsiz deneme katmanı. Farklı üslubuyla masaya denge katar.",
        "default_model": "mistral-small-latest",
        "models": [
            "mistral-small-latest",
            "mistral-medium-latest",
            "open-mistral-nemo",
        ],
    },
    {
        "id": "arena",
        "name": "Arena API",
        "badge": "Çoklu Model · 20 Model",
        "free": False,
        "multi_model": True,
        "base_url": "https://api.arena.ai/v1",
        "env_key": "ARENA_API_KEY",
        "key_url": "https://platform.arena.ai/dashboard/keys",
        "note": "Tek anahtarla Claude, GPT, Gemini, Grok, Qwen ve MiniMax modellerine erişim.",
        "default_model": "claude-haiku-5-5",
        "models": [
            "claude-haiku-5-5",
            "gpt-6-luna",
            "gemini-3.8-flash",
            "minimax-m3p1-flash",
            "grok-4.7",
            "claude-sonnet-5",
            "qwen3p8-max",
        ],
    },
]

_PROVIDER_BY_ID = {p["id"]: p for p in PROVIDER_CATALOG}
_SEAT_DEFAULT_PROVIDER = {
    "A": "groq",
    "B": "gemini",
    "C": "openrouter",
    "D": "nvidia",
    "K": "mistral",
    "E": "arena",
    "F": "groq",
    "G": "gemini",
    "H": "openrouter",
}
_POLLINATIONS_FALLBACK = ("https://text.pollinations.ai/openai", "", "openai", "Hazır Ücretsiz Havuz")


def _strip_think_tags(text: str) -> str:
    return re.sub(r"<think>[\s\S]*?</think>\s*", "", text or "", flags=re.IGNORECASE).strip()


def _provider_label_for_url(base_url: str) -> str:
    low = (base_url or "").lower()
    for p in PROVIDER_CATALOG:
        if p["id"] in low or urlparse(p["base_url"]).hostname in low:
            return p["name"]
    if "pollinations.ai" in low:
        return "Hazır Ücretsiz Havuz"
    if "127.0.0.1" in low or "localhost" in low:
        return "Yerel Model"
    return "Özel Sağlayıcı"


def _configured_server_providers() -> list[dict]:
    """Ortam değişkeninde anahtarı tanımlı sunucu sağlayıcılarını döndürür."""
    ready = []
    for p in PROVIDER_CATALOG:
        val = (os.environ.get(p["env_key"]) or "").strip()
        if val:
            ready.append({
                "id": p["id"],
                "name": p["name"],
                "base_url": p["base_url"],
                "api_key": val,
                "model": os.environ.get(f"{p['id'].upper()}_MODEL", "").strip() or p["default_model"],
            })
    return ready


def _server_pool_for_seat(seat: str):
    """Koltuk için sunucu ortam havuzundan (base_url, api_key, model, label) seçer."""
    ready = _configured_server_providers()
    if not ready:
        return None
    preferred = _SEAT_DEFAULT_PROVIDER.get(seat.upper(), "groq")
    for p in ready:
        if p["id"] == preferred:
            return p["base_url"], p["api_key"], p["model"], p["name"]
    idx = list(engine.VALID_CRED_SEATS).index(seat.upper()) % len(ready) if seat.upper() in engine.VALID_CRED_SEATS else 0
    pick = ready[idx]
    return pick["base_url"], pick["api_key"], pick["model"], pick["name"]


def _fallback_candidates(seat: str, primary_base: str) -> list[tuple[str, str, str, str]]:
    """Birincil sağlayıcı başarısız olursa sırayla denenecek yedek sağlayıcılar."""
    cands: list[tuple[str, str, str, str]] = []
    seen = {_clean_base(primary_base)}
    for p in _configured_server_providers():
        b = _clean_base(p["base_url"])
        if b not in seen:
            seen.add(b)
            cands.append((b, p["api_key"], p["model"], p["name"]))
    if _clean_base(_POLLINATIONS_FALLBACK[0]) not in seen:
        cands.append(_POLLINATIONS_FALLBACK)
    return cands


# ── Faz 6 (S2): koltuk bazlı kimlik çözümleme ──────────────────────────
# Tarayıcı anahtarı localStorage'da tutmaz; çağrı yalnızca koltuk anahtarını
# (seat) gönderir, anahtar + base_url sunucu tarafı kâsadan (api_credentials)
# veya sunucu ortam havuzundan çözülür.
def _resolve_endpoint(base_url: str, api_key: str, model: str, seat: str, use_pool: bool = False):
    """(base_url, api_key, model, error) döndürür.
    use_pool=True (halka açık v2 arayüz): her ziyaretçi kendi anahtarını gövdede gönderir;
    ortak sunucu kasası (api_credentials) paylaşılmaz. Anahtar gönderilmemişse yalnız
    anahtarsız ücretsiz havuz (Pollinations) veya isteğe bağlı ortam havuzu kullanılır."""
    b = (base_url or "").strip()
    k = (api_key or "").strip()
    m = (model or "").strip()
    s = (seat or "").strip().upper()
    if not use_pool and s in engine.VALID_CRED_SEATS:
        cred = engine.get_api_credential(s)
        if cred:
            b = b or (cred.get("base_url") or "")
            k = k or (cred.get("api_key") or "")
            m = m or (cred.get("model") or "")
    if not b and use_pool and s in engine.VALID_CRED_SEATS:
        pool_pick = _server_pool_for_seat(s)
        if pool_pick:
            b, k_pool, m_pool, _ = pool_pick
            k = k or k_pool
            m = m or m_pool
        else:
            b, k, m, _ = _POLLINATIONS_FALLBACK
    if not b:
        return None, None, None, "base_url eksik — koltuk yapılandırmasından (veya sunucu kâsasından) çözülemedi."
    return b, k, m, None


_POLLINATIONS_LOCK = asyncio.Lock()


def _extract_retry_seconds(status_code: int, body_text: str) -> int:
    """HTTP 402/429 yanıtındaki 'Retry after Xs' bilgisinden güvenli bekleme süresini çıkarır."""
    m = re.search(r"Retry after\s+(\d+)\s*s", body_text or "", re.IGNORECASE)
    if m:
        return int(m.group(1))
    return 45 if status_code == 402 else 4


@asynccontextmanager
async def _pollinations_guard(base_url: str, max_wait: float = 10.0):
    """Pollinations tek-IP eşzamanlılık sınırını aşmamak için istekleri sınırlı bekleme ile sıraya koyar."""
    if not _is_pollinations(base_url):
        yield
        return
    await asyncio.wait_for(_POLLINATIONS_LOCK.acquire(), timeout=max_wait)
    try:
        yield
    finally:
        try:
            await asyncio.sleep(0.6)
        finally:
            _POLLINATIONS_LOCK.release()


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


def _inject_current_date_context(messages: list[dict]) -> list[dict]:
    """Modelin 2023/2024 verilerini 'bugün' sanmaması için sistem istemine güncel ay/yıl ekler."""
    if not messages:
        return messages
    for msg in messages:
        if msg.get("role") == "system" and "GÜNCEL TARİH:" in str(msg.get("content", "")):
            return messages
    now = datetime.now(timezone.utc)
    month_name = _TR_MONTHS[now.month] if 1 <= now.month <= 12 else ""
    note = (
        f"\n\nGÜNCEL TARİH: Bugün {month_name} {now.year} ({now.year} yılındayız). "
        "2023 veya 2024 gibi geçmiş yılları asla 'bugün/güncel' gibi anlatma."
    )
    out = [dict(m) for m in messages]
    for m in out:
        if m.get("role") == "system":
            m["content"] = str(m.get("content", "")) + note
            return out
    out.insert(0, {"role": "system", "content": note.strip()})
    return out


def _check_free_trial_quota(payload: "ChatPayload", request: Request) -> tuple[str | None, str | None]:
    """Ziyaretçi kendi anahtarı olmadan sunucu yedek havuzunu kullanıyorsa
    IP başına günlük 2 tam oturum kotasını uygular."""
    has_user_creds = bool((payload.api_key or "").strip() or (payload.base_url or "").strip())
    if not payload.use_pool or has_user_creds or not _configured_server_providers():
        return None, None
    sid = (payload.cognitive_session_id or "").strip() or "anon"
    allowed, info = engine.consume_free_trial_call(
        _client_ip(request),
        sid,
        daily_sessions=FREE_TRIAL_DAILY_SESSIONS,
        max_calls_per_session=FREE_TRIAL_MAX_CALLS_PER_SESSION,
    )
    if allowed:
        return None, None
    if info.get("reason") == "session_call_limit":
        return (
            "Bu ücretsiz deneme oturumunda maksimum mesaj sınırına ulaşıldı. "
            "Kendi ücretsiz Groq veya Google Gemini anahtarını bağlayarak kesintisiz ve sınırsız devam edebilirsin.",
            "daily_trial_limit",
        )
    return (
        f"Bugünkü {FREE_TRIAL_DAILY_SESSIONS} ücretsiz tam oturum hakkını kullandın. Yarın hakkın yenilenir; "
        "hemen devam etmek için sağ üstteki 'Ücretsiz API Bağla' düğmesinden 10 saniyede kendi ücretsiz Groq veya Google Gemini anahtarını bağlayabilirsin.",
        "daily_trial_limit",
    )


# ── Paylaşımlı istem şeması (Pydantic) ─────────────────────────────────
class ChatPayload(BaseModel):
    base_url: str = ""
    api_key: str = ""
    model: str = ""
    seat: str = ""
    use_pool: bool = False
    messages: list[dict] = Field(default_factory=list)
    cognitive_character_id: str = Field(default="", max_length=200)
    cognitive_session_id: str = Field(default="", max_length=200)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=520, ge=0, le=2048)


@app.get("/api/providers")
async def providers_info(request: Request):
    """Sağlayıcı kataloğu (anahtar linkleri + sunucu hazır durumu + deneme kotası; ham anahtar ASLA dönmez)."""
    ready_ids = {p["id"] for p in _configured_server_providers()}
    vault = engine.list_api_credentials()
    catalog = []
    for p in PROVIDER_CATALOG:
        catalog.append({
            "id": p["id"],
            "name": p["name"],
            "badge": p["badge"],
            "free": p["free"],
            "multi_model": p["multi_model"],
            "base_url": p["base_url"],
            "key_url": p["key_url"],
            "note": p["note"],
            "default_model": p["default_model"],
            "models": p["models"],
            "server_ready": p["id"] in ready_ids,
        })
    seat_status = {}
    for seat in ("A", "B", "C", "D", "E", "F", "G", "H", "K"):
        vc = vault.get(seat)
        if vc and vc.get("base_url"):
            seat_status[seat] = {
                "source": "user_vault",
                "provider_label": _provider_label_for_url(vc.get("base_url", "")),
                "model": vc.get("model") or "otomatik",
                "has_key": bool(vc.get("has_key")),
                "key_hint": vc.get("key_hint") or "",
            }
        else:
            pool_pick = _server_pool_for_seat(seat)
            if pool_pick:
                _, _, p_model, p_label = pool_pick
                seat_status[seat] = {
                    "source": "server_pool",
                    "provider_label": p_label,
                    "model": p_model,
                    "has_key": True,
                    "key_hint": "sunucu",
                }
            else:
                seat_status[seat] = {
                    "source": "free_fallback",
                    "provider_label": "Hazır Ücretsiz Havuz",
                    "model": "otomatik",
                    "has_key": False,
                    "key_hint": "",
                }
    trial = engine.get_free_trial_status(_client_ip(request), daily_sessions=FREE_TRIAL_DAILY_SESSIONS)
    return {
        "ok": True,
        "providers": catalog,
        "server_pool_count": len(ready_ids),
        "seat_status": seat_status,
        "trial": trial,
        "current_year": datetime.now(timezone.utc).year,
    }


# ── Sağlık / teşhis rotaları ────────────────────────────────────────────
# v1.3: dürüst teşhis — arayüz "gerçek model mi, demo mu" sorusunu tahminle
# değil bu uçtan öğrenir. Backend'de simülasyon yoktur (demo yalnız tarayıcıdadır).
def _detect_commit() -> str:
    """Çalışan sürümün git commit'i — canlı ortamda tek curl ile doğrulama için.

    Öncelik: KONSUL_COMMIT / RAILWAY_GIT_COMMIT_SHA ortam değişkenleri →
    yerel depoda git → "unknown". (Docker imajında .git bulunmaz — .dockerignore.)"""
    env = (os.environ.get("KONSUL_COMMIT") or os.environ.get("RAILWAY_GIT_COMMIT_SHA") or "").strip()
    if env:
        return env[:40]
    try:
        import subprocess
        out = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True, text=True, timeout=2,
            cwd=str(Path(__file__).resolve().parent),
        )
        if out.returncode == 0:
            sha = out.stdout.strip()
            if sha:
                return sha[:40]
    except Exception:  # noqa: BLE001 — git yoksa "unknown" yeterli
        pass
    return "unknown"


_COMMIT = _detect_commit()

# Bu işaretler yalnızca v2.7+ kodunda bulunur: canlı /api/health yanıtında
# görünürlüğü, dağıtılan sürümün en az bu seviyede olduğunu kanıtlar.
_FEATURE_MARKERS = ["owner_lock", "archive_opt_out", "custom_seats", "commit_report"]


@app.get("/api/health")
async def health():
    loopback = HOST in ("127.0.0.1", "localhost", "::1")
    return {
        "ok": True, "service": "KONSÜL AI", "mode": "canlı", "version": "1.3.0",
        "commit": _COMMIT,
        "features": _FEATURE_MARKERS,
        "ai": "upstream",
        "simulation_in_backend": False,
        "auth": "none",
        "key_storage": "plaintext-sqlite",
        "exposed": not loopback,
        "rate_limit_per_min": _RATE_LIMIT_PER_MIN,
    }


@app.get("/api/ping")
async def ping(url: str, key: str = "", request: Request = None):
    """Verilen OpenAI-uyumlu Base URL'yi test eder, model listesini döndürür.
    v1.4: BYOK akışında anahtarla test için isteğe bağlı `key` (yalnızca test
    isteğinde taşınır, saklanmaz)."""
    if request is not None:
        limited = _check_rate_limit(request)
        if limited is not None:
            return limited
    err = _validate_base_url(url)
    if err:
        return {"ok": False, "error": err}
    target = _clean_base(url) + "/models"
    try:
        headers = {"Authorization": f"Bearer {key.strip()}"} if key and key.strip() else {}
        resp = await _get_http().get(target, headers=headers, timeout=5.0)
        if resp.status_code == 401:
            return {"ok": False, "error": "HTTP 401 — anahtar geçersiz ya da bu uç anahtar istiyor. Anahtarı yapıştırıp tekrar deneyin."}
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
async def chat(payload: ChatPayload, request: Request):
    limited = _check_rate_limit(request)
    if limited is not None:
        return limited
    q_msg, q_code = _check_free_trial_quota(payload, request)
    if q_msg:
        return JSONResponse({"ok": False, "error": q_msg, "error_code": q_code}, status_code=429)
    base, api_key, model, rerr = _resolve_endpoint(
        payload.base_url, payload.api_key, payload.model, payload.seat, use_pool=payload.use_pool
    )
    if rerr:
        return JSONResponse({"ok": False, "error": rerr}, status_code=400)
    err = _validate_base_url(base)
    if err:
        return JSONResponse({"ok": False, "error": err}, status_code=400)
    prepared_messages = _inject_current_date_context(
        _prepare_cognitive_messages(payload.messages, payload.seat, payload.cognitive_character_id, payload.cognitive_session_id)
    )

    targets: list[tuple[str, str, str, str]] = [(_clean_base(base), api_key, model, _provider_label_for_url(base))]
    if payload.use_pool and not payload.base_url:
        targets.extend(_fallback_candidates(payload.seat, base))

    last_err = "Yapay zeka sunucusundan yanıt alınamadı."
    last_code = "upstream_error"
    for idx, (t_base, t_key, t_model, t_label) in enumerate(targets):
        if _validate_base_url(t_base):
            continue
        is_pool_target = _is_pollinations(t_base) or (payload.use_pool and not payload.base_url)
        body = {
            "model": t_model,
            "messages": prepared_messages,
            "temperature": payload.temperature,
            "stream": False,
        }
        if payload.max_tokens and payload.max_tokens > 0:
            body["max_tokens"] = payload.max_tokens
        req_timeout_s = 22.0 if _is_pollinations(t_base) else 28.0
        try:
            resp = None
            max_tries = 2
            async with _pollinations_guard(t_base, max_wait=10.0):
                for attempt in range(max_tries):
                    resp = await asyncio.wait_for(
                        _get_http().post(
                            _clean_base(t_base) + "/chat/completions",
                            json=body,
                            headers=_auth_headers(t_key),
                        ),
                        timeout=req_timeout_s,
                    )
                    if resp.status_code in (429, 402) and attempt < max_tries - 1:
                        retry_s = _extract_retry_seconds(resp.status_code, resp.text)
                        if retry_s <= 6:
                            await asyncio.sleep(retry_s)
                            continue
                    break
            if resp is None or resp.status_code != 200:
                code = resp.status_code if resp is not None else 502
                detail = resp.text[:400] if resp is not None else ""
                last_err, last_code = _clean_upstream_error(code, detail, is_pool=is_pool_target)
                if idx < len(targets) - 1:
                    continue
                return JSONResponse({"ok": False, "error": last_err, "error_code": last_code}, status_code=502)
            data = resp.json()
            raw_content = _strip_think_tags(data["choices"][0]["message"]["content"])
            content = neuro_bridge.clean_human_speech(engine.filter_persona_text(raw_content))
            return {"ok": True, "content": content, "provider_label": t_label, "model": t_model}
        except KeyError:
            last_err, last_code = "Yapay zeka sunucusu beklenmeyen biçimde yanıt verdi.", "invalid_response"
            if idx < len(targets) - 1:
                continue
            return JSONResponse({"ok": False, "error": last_err, "error_code": last_code}, status_code=502)
        except Exception as exc:  # noqa: BLE001
            last_err = _friendly_error(exc, is_pool=is_pool_target)
            last_code = "pool_timeout" if (is_pool_target and isinstance(exc, (httpx.TimeoutException, asyncio.TimeoutError))) else "connection_error"
            if idx < len(targets) - 1:
                continue
            return JSONResponse({"ok": False, "error": last_err, "error_code": last_code}, status_code=502)
    return JSONResponse({"ok": False, "error": last_err, "error_code": last_code}, status_code=502)


# ── Ana proxy: SSE streaming motoru ─────────────────────────────────────
@app.post("/api/chat/stream")
async def chat_stream(payload: ChatPayload, request: Request):
    limited = _check_rate_limit(request)
    if limited is not None:
        return limited
    q_msg, q_code = _check_free_trial_quota(payload, request)
    if q_msg:
        return JSONResponse({"ok": False, "error": q_msg, "error_code": q_code}, status_code=429)
    base, api_key, model, rerr = _resolve_endpoint(
        payload.base_url, payload.api_key, payload.model, payload.seat, use_pool=payload.use_pool
    )
    if rerr:
        return JSONResponse({"ok": False, "error": rerr}, status_code=400)
    err = _validate_base_url(base)
    if err:
        return JSONResponse({"ok": False, "error": err}, status_code=400)

    prepared_messages = _inject_current_date_context(
        _prepare_cognitive_messages(payload.messages, payload.seat, payload.cognitive_character_id, payload.cognitive_session_id)
    )
    targets: list[tuple[str, str, str, str]] = [(_clean_base(base), api_key, model, _provider_label_for_url(base))]
    if payload.use_pool and not payload.base_url:
        targets.extend(_fallback_candidates(payload.seat, base))

    async def event_generator():
        last_err = "Yanıt alınamadı."
        last_code = "upstream_error"
        for idx, (t_base, t_key, t_model, t_label) in enumerate(targets):
            if _validate_base_url(t_base):
                continue
            is_poll = _is_pollinations(t_base)
            is_pool_target = is_poll or (payload.use_pool and not payload.base_url)
            headers = _auth_headers(t_key)
            resp = None
            acc_chunks: list[str] = []
            try:
                # Pollinations Classic SSE sık sık takıldığı/koptuğu için tek parça hızlı istek + sıkı 22 sn zaman aşımı kullan
                if is_poll:
                    body = {
                        "model": t_model,
                        "messages": prepared_messages,
                        "temperature": payload.temperature,
                        "stream": False,
                    }
                    if payload.max_tokens and payload.max_tokens > 0:
                        body["max_tokens"] = payload.max_tokens
                    poll_timeout = httpx.Timeout(22.0, connect=6.0, read=22.0, write=10.0)
                    async with _pollinations_guard(t_base, max_wait=10.0):
                        for attempt in range(2):
                            if await request.is_disconnected():
                                return
                            resp = await _get_http().post(
                                t_base + "/chat/completions",
                                json=body,
                                headers=headers,
                                timeout=poll_timeout,
                            )
                            if resp.status_code in (429, 402) and attempt == 0:
                                retry_s = _extract_retry_seconds(resp.status_code, resp.text)
                                if retry_s <= 6:
                                    for _ in range(retry_s * 2):
                                        if await request.is_disconnected():
                                            return
                                        await asyncio.sleep(0.5)
                                    continue
                            break

                    if resp is None or resp.status_code != 200:
                        code = resp.status_code if resp is not None else 502
                        detail = resp.text[:400] if resp is not None else ""
                        last_err, last_code = _clean_upstream_error(code, detail, is_pool=True)
                        if idx < len(targets) - 1:
                            continue
                        yield "data: " + json.dumps({"error": last_err, "error_code": last_code}, ensure_ascii=False) + "\n\n"
                        return

                    yield "data: " + json.dumps({"meta": {"provider": t_label, "model": t_model}}, ensure_ascii=False) + "\n\n"
                    try:
                        raw_content = _strip_think_tags(resp.json()["choices"][0]["message"]["content"])
                        content = neuro_bridge.clean_human_speech(engine.filter_persona_text(raw_content))
                        if not content.strip():
                            raise ValueError("empty")
                        yield "data: " + json.dumps({"delta": content}, ensure_ascii=False) + "\n\n"
                        yield "data: [DONE]\n\n"
                        return
                    except Exception:  # noqa: BLE001
                        last_err, last_code = _clean_upstream_error(502, "", is_pool=True)
                        if idx < len(targets) - 1:
                            continue
                        yield "data: " + json.dumps({"error": last_err, "error_code": last_code}, ensure_ascii=False) + "\n\n"
                        return

                # Gerçek sağlayıcılar (Groq, Gemini, OpenRouter, NVIDIA, Mistral, Arena, yerel): gerçek SSE akışı
                body = {
                    "model": t_model,
                    "messages": prepared_messages,
                    "temperature": payload.temperature,
                    "stream": True,
                }
                if payload.max_tokens and payload.max_tokens > 0:
                    body["max_tokens"] = payload.max_tokens
                stream_timeout = httpx.Timeout(28.0, connect=8.0, read=25.0, write=10.0)
                for attempt in range(2):
                    if await request.is_disconnected():
                        return
                    req = _get_http().build_request(
                        "POST", t_base + "/chat/completions", json=body, headers=headers, timeout=stream_timeout
                    )
                    resp = await _get_http().send(req, stream=True)
                    if resp.status_code in (429, 402) and attempt == 0:
                        code = resp.status_code
                        err_text = (await resp.aread()).decode("utf-8", "ignore")
                        await resp.aclose()
                        resp = None
                        retry_s = _extract_retry_seconds(code, err_text)
                        if retry_s <= 6:
                            for _ in range(retry_s * 2):
                                if await request.is_disconnected():
                                    return
                                await asyncio.sleep(0.5)
                            continue
                        last_err, last_code = _clean_upstream_error(code, err_text, is_pool=is_pool_target)
                        break
                    break

                if resp is None or resp.status_code != 200:
                    if resp is not None:
                        code = resp.status_code
                        detail = (await resp.aread()).decode("utf-8", "ignore")[:400]
                        await resp.aclose()
                        resp = None
                        last_err, last_code = _clean_upstream_error(code, detail, is_pool=is_pool_target)
                    if idx < len(targets) - 1:
                        continue
                    yield "data: " + json.dumps({"error": last_err, "error_code": last_code}, ensure_ascii=False) + "\n\n"
                    return

                yield "data: " + json.dumps({"meta": {"provider": t_label, "model": t_model}}, ensure_ascii=False) + "\n\n"
                ctype = resp.headers.get("content-type", "")

                # Bazı uçlar stream bayrağını yok sayıp düz JSON döndürür → tek parça yayınla
                if "application/json" in ctype:
                    raw = (await resp.aread()).decode("utf-8", "ignore")
                    await resp.aclose()
                    resp = None
                    try:
                        raw_content = _strip_think_tags(json.loads(raw)["choices"][0]["message"]["content"])
                        content = neuro_bridge.clean_human_speech(engine.filter_persona_text(raw_content))
                        yield "data: " + json.dumps({"delta": content}, ensure_ascii=False) + "\n\n"
                    except Exception:  # noqa: BLE001
                        if idx < len(targets) - 1:
                            continue
                        yield "data: " + json.dumps({"error": "Yapay zeka sunucusu geçersiz yanıt döndürdü.", "error_code": "invalid_response"}, ensure_ascii=False) + "\n\n"
                    yield "data: [DONE]\n\n"
                    return

                buffer = ""
                done_seen = False
                stream_error = None
                async for chunk in resp.aiter_text():
                    if await request.is_disconnected():
                        await resp.aclose()
                        resp = None
                        return
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
                            raw_e = obj["error"].get("message", str(obj["error"])) if isinstance(obj["error"], dict) else str(obj["error"])
                            stream_error, last_code = _clean_upstream_error(502, raw_e, is_pool=is_pool_target)
                            break
                        try:
                            delta = obj["choices"][0]["delta"].get("content")
                        except (KeyError, IndexError, AttributeError):
                            delta = None
                        if delta:
                            acc_chunks.append(delta)
                            yield "data: " + json.dumps({"delta": delta}, ensure_ascii=False) + "\n\n"
                    if done_seen or stream_error:
                        break

                if resp is not None:
                    await resp.aclose()
                    resp = None

                if stream_error and not acc_chunks:
                    last_err = stream_error
                    if idx < len(targets) - 1:
                        continue
                    yield "data: " + json.dumps({"error": stream_error, "error_code": last_code}, ensure_ascii=False) + "\n\n"
                    return

                full_raw = "".join(acc_chunks)
                if full_raw:
                    cleaned = neuro_bridge.clean_human_speech(engine.filter_persona_text(_strip_think_tags(full_raw)))
                    if cleaned != full_raw:
                        yield "data: " + json.dumps({"replace": cleaned}, ensure_ascii=False) + "\n\n"
                yield "data: [DONE]\n\n"
                return
            except Exception as exc:  # noqa: BLE001
                if resp is not None:
                    try:
                        await resp.aclose()
                    except Exception:
                        pass
                last_err = _friendly_error(exc, is_pool=is_pool_target)
                last_code = "pool_timeout" if (is_pool_target and isinstance(exc, (httpx.TimeoutException, asyncio.TimeoutError))) else "connection_error"
                if not acc_chunks and idx < len(targets) - 1:
                    continue
                yield "data: " + json.dumps({"error": last_err, "error_code": last_code}, ensure_ascii=False) + "\n\n"
                return
        yield "data: " + json.dumps({"error": last_err, "error_code": last_code}, ensure_ascii=False) + "\n\n"

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
async def character_architect(payload: dict, request: Request):
    limited = _check_rate_limit(request)
    if limited is not None:
        return limited
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
        if payload.get("persist", True):
            saved = engine.save_character(char_obj)
        else:
            # v2.7: tanım yalnızca bu tarayıcıda kalsın — paylaşılan karakter kütüphanesine yazma
            if not char_obj.get("id"):
                char_obj["id"] = "custom_" + uuid.uuid4().hex[:8]
            saved = char_obj
        return {"ok": True, "character": saved}
    except json.JSONDecodeError:
        return JSONResponse({"ok": False, "error": "Model geçerli JSON üretemedi.", "raw": raw_text[:2000]}, status_code=502)
    except Exception as exc:  # noqa: BLE001
        return JSONResponse({"ok": False, "error": _friendly_error(exc)}, status_code=502)


# ── Oturum Sahipliği (v2.7 gizlilik kilidi) ──────────────────────────────
def _owner_token(request: Request) -> str:
    return (request.headers.get("X-Owner-Token") or "").strip()


def _require_session_owner(session_id: str, request: Request):
    """Kilitli oturum sahiplik doğrulaması. None = sorun yok; dolu = 404/403 yanıtı."""
    state = engine.session_owner_state(session_id, _owner_token(request))
    if state == "missing":
        return JSONResponse({"ok": False, "error": "Oturum bulunamadı."}, status_code=404)
    if state == "forbidden":
        return JSONResponse(
            {"ok": False, "error": "Bu oturum başka bir tarayıcıya ait; erişim reddedildi."},
            status_code=403,
        )
    return None


# ── Oturum & Mesaj Kayıt Rotaları ───────────────────────────────────────
@app.post("/api/session/start")
async def session_start(payload: dict):
    sid = (payload.get("session_id") or "").strip() or ("ses_" + uuid.uuid4().hex[:10])
    topic = (payload.get("topic") or "").strip() or "Yeni Tartışma"
    # v2.7: tarayıcının sahiplik anahtarı özeti olarak saklanır (ham anahtar sunucuda kalmaz)
    engine.create_session(sid, topic, owner_token=(payload.get("owner_token") or ""))
    return {"ok": True, "session_id": sid}


@app.post("/api/session/record_message")
async def session_record_message(payload: dict, request: Request):
    sid = (payload.get("session_id") or "").strip()
    denied = _require_session_owner(sid, request)
    if denied is not None:
        return denied
    seat = (payload.get("seat") or "").strip()
    cid = (payload.get("character_id") or payload.get("speaker_name") or "").strip()
    role = (payload.get("role") or "seat").strip()
    content = (payload.get("content") or "").strip()
    inner = payload.get("inner_thought", "")
    rebuttal_to = payload.get("rebuttal_target_id", "")
    if sid and content:
        engine.record_message(sid, seat, cid, role, content, inner, rebuttal_to)
        return {"ok": True}
    return JSONResponse({"ok": False, "error": "Geçersiz mesaj"}, status_code=400)


@app.post("/api/session/conclude")
async def session_conclude(payload: dict, request: Request):
    sid = (payload.get("session_id") or "").strip()
    denied = _require_session_owner(sid, request)
    if denied is not None:
        return denied
    verdict = (payload.get("verdict") or payload.get("synthesis") or "").strip()
    seated_characters = payload.get("seated_characters", [])
    topic = payload.get("topic", "")

    if sid:
        engine.close_session(sid, verdict)
        # v2.7.1: KİLİTLİ (özel) oturumlardan ortak karakter hafızasına bilgi sızmaz —
        # "yalnızca senin anahtarınla okunur" sözü episodik hafızayı da kapsar.
        # Kilitsiz (eski/classic) oturumlar eskisi gibi hafızaya damıtılır.
        if engine.get_session_owner_hash(sid) is None:
            for sc in seated_characters:
                cid = sc.get("character_id")
                if cid:
                    mem_entry = f"'{topic}' konulu müzakereye katıldı. Nihai karar: {verdict[:100]}..."
                    engine.add_character_memory(cid, sid, mem_entry, stance="Tutumunu savundu", rivalries="")
        return {"ok": True}
    return JSONResponse({"ok": False, "error": "session_id eksik"}, status_code=400)


# ── Arşiv & Tutanak Rotaları (okuma tarafı — denetim raporu §3.4) ───────
@app.get("/api/sessions")
async def list_sessions(request: Request, limit: int = 50):
    # v2.7: token'ı olan yalnızca kendi oturumlarını; tokensız istek yalnızca kilitsiz (eski) kayıtları görür
    return {"ok": True, "sessions": engine.list_sessions(limit=limit, owner_token=_owner_token(request))}


@app.get("/api/session/{sid}/messages")
async def session_messages(sid: str, request: Request):
    denied = _require_session_owner(sid, request)
    if denied is not None:
        return denied
    msgs = engine.get_session_messages(sid)
    if not msgs:
        return JSONResponse({"ok": False, "error": "Oturum veya kaydı bulunamadı."}, status_code=404)
    return {"ok": True, "session_id": sid, "messages": msgs}


# ── Hukuki Karar Protokolü (Faz 3): resmî rapor arşivi ────────────────────
@app.post("/api/session/report")
async def session_report_save(payload: dict, request: Request):
    sid = payload.get("session_id", "")
    denied = _require_session_owner(sid, request)
    if denied is not None:
        return denied
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
async def session_report_get(sid: str, request: Request):
    denied = _require_session_owner(sid, request)
    if denied is not None:
        return denied
    rep = engine.get_session_report(sid)
    if not rep:
        return JSONResponse({"ok": False, "error": "Bu oturum için karar raporu yok."}, status_code=404)
    return {"ok": True, "report": rep}


@app.get("/api/reports")
async def list_decision_reports(request: Request, limit: int = 100):
    return {"ok": True, "reports": engine.list_decision_reports(limit=limit, owner_token=_owner_token(request))}


# ── Mühürlü Zarf & İkna Deltası (Faz 2 — taç) ───────────────────────────
@app.post("/api/envelope/seal")
async def envelope_seal(payload: dict, request: Request):
    sid = payload.get("session_id", "")
    denied = _require_session_owner(sid, request)
    if denied is not None:
        return denied
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
async def envelope_status(sid: str, request: Request):
    denied = _require_session_owner(sid, request)
    if denied is not None:
        return denied
    envelopes = engine.get_envelopes(sid)
    return {
        "ok": True,
        "session_id": sid,
        "envelopes": envelopes,
        "sealed_count": len(envelopes),
        "opened": bool(envelopes) and all(e["opened_at"] for e in envelopes),
    }


@app.post("/api/envelope/open")
async def envelope_open(payload: dict, request: Request):
    sid = payload.get("session_id", "")
    denied = _require_session_owner(sid, request)
    if denied is not None:
        return denied
    if not sid:
        return JSONResponse({"ok": False, "error": "session_id eksik"}, status_code=400)
    envelopes = engine.open_envelopes(sid)
    if not envelopes:
        return JSONResponse({"ok": False, "error": "Bu oturumda mühürlü zarf yok."}, status_code=404)
    return {"ok": True, "envelopes": envelopes}


@app.post("/api/delta/compute")
async def delta_compute(payload: dict, request: Request):
    limited = _check_rate_limit(request)
    if limited is not None:
        return limited
    sid = payload.get("session_id", "")
    if not sid:
        return JSONResponse({"ok": False, "error": "session_id eksik"}, status_code=400)
    denied = _require_session_owner(sid, request)
    if denied is not None:
        return denied
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
async def research_verify(payload: dict, request: Request):
    limited = _check_rate_limit(request)
    if limited is not None:
        return limited
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
    # v2.7: arşivi kapalıysa iddia metni sunucuya yazılmaz (persist=false)
    persist = bool(payload.get("persist", True))
    async with _pollinations_guard(base):
        res = await engine.research_fact_check(
            claim, base, api_key, model or "openai", session_id=session_id, persist=persist
        )
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


_NO_CACHE_HEADERS = {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
}


@app.get("/")
async def index():
    return FileResponse(STATIC_DIR / "index.html", headers=_NO_CACHE_HEADERS)


@app.get("/classic")
async def classic_index():
    classic = STATIC_DIR / "classic.html"
    return FileResponse(classic if classic.exists() else STATIC_DIR / "index.html", headers=_NO_CACHE_HEADERS)


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# ── Giriş noktası ───────────────────────────────────────────────────────
def _open_browser():
    webbrowser.open(f"http://{HOST}:{PORT}")


if __name__ == "__main__":
    print("┌──────────────────────────────────────────────────────────┐")
    print("│  KONSÜL AI — Çoklu Model Konsey & Kör Jüri İstasyonu     │")
    print(f"│  Adres: http://{HOST}:{PORT}")
    if HOST not in ("127.0.0.1", "localhost", "::1"):
        # G3-fix: kâsa düz metin anahtar tutar ve API'de auth yok — dışa açık
        # çalıştırma, erişebilen herkesin kasadaki anahtarla model çağırabilmesi demektir.
        print("│  ⚠ GÜVENLİK: loopback dışına bağlanıyorsunuz. API'de kimlik")
        print("│  doğrulama YOK ve anahtarlar düz metin SQLite'ta. Güvenilmeyen")
        print("│  ağa açmayın; gerekiyorsa önüne auth'lu ters vekil koyun.")
    print("│  Kapatmak için: Ctrl+C                                   │")
    print("└──────────────────────────────────────────────────────────┘")
    threading.Timer(1.1, _open_browser).start()
    uvicorn.run(app, host=HOST, port=PORT, log_level="warning")
