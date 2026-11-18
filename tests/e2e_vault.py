# -*- coding: utf-8 -*-
"""Faz 6/7 e2e: API kâsası (S2) — gerçek uvicorn + mock OpenAI upstream.
   - POST/GET/DELETE /api/credentials (maskelenme, SSRF kilidi)
   - /api/chat yalnızca seat ile → anahtar+uç kâsadan çözülür (upstream Bearer'ı görür)
   - geri uyum: gövdede açık anahtar hâlâ çalışır
   - sürüm 1.2.0
   Çalıştırma: .venv/bin/python tests/e2e_vault.py  (veya sistemin python'u)"""
import json, os, shutil, socket, subprocess, sys, tempfile, threading, time, urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p

PORT_APP = free_port()
PORT_UP = free_port()
BASE = f"http://127.0.0.1:{PORT_APP}"
UPSTREAM_AUTH = {}

class Up(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_POST(self):
        ln = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(ln) or b"{}")
        if self.path.endswith("/chat/completions"):
            UPSTREAM_AUTH["auth"] = self.headers.get("Authorization", "")
            UPSTREAM_AUTH["model"] = body.get("model")
            if body.get("stream"):
                self.send_response(200)
                self.send_header("Content-Type", "text/event-stream")
                self.end_headers()
                chunk = {"choices": [{"delta": {"content": "KASA-DENEME"}}]}
                self.wfile.write(b'data: ' + json.dumps(chunk).encode() + b'\n\n')
                self.wfile.write(b'data: [DONE]\n\n')
            else:
                out = json.dumps({"choices": [{"message": {"content": "KASA-DENEME"}}]}).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(out)))
                self.end_headers()
                self.wfile.write(out)
        else:
            self.send_response(404); self.end_headers()

def req(method, path, payload=None, raw=False):
    url = BASE + path
    data = json.dumps(payload).encode() if payload is not None else None
    r = urllib.request.Request(url, data=data, method=method,
                               headers={"Content-Type": "application/json"} if data else {})
    try:
        with urllib.request.urlopen(r, timeout=20) as resp:
            b = resp.read()
            if raw: return resp.status, b.decode(errors="replace")
            try: return resp.status, json.loads(b)
            except Exception: return resp.status, b.decode(errors="replace")
    except urllib.error.HTTPError as e:
        b = e.read()
        if raw: return e.code, b.decode(errors="replace")
        try: return e.code, json.loads(b)
        except Exception: return e.code, b.decode(errors="replace")

def main():
    up = HTTPServer(("127.0.0.1", PORT_UP), Up)
    threading.Thread(target=up.serve_forever, daemon=True).start()

    os.chdir(REPO)
    # venv kullan: repo içinde .venv varsa onu, yoksa yürüyen yorumlayıcıyı
    venv = os.path.join(REPO, ".venv", "bin", "python")
    PY = venv if os.path.exists(venv) else sys.executable
    # İzole DB: KONSUL_DB_PATH deploy özelliğini de test eder;
    #   çalışan başka bir sunucunun DB'sine KESİNLİKLE dokunma (WAL çakışması).
    tmpdir = tempfile.mkdtemp(prefix="konsul_e2e_")
    env = dict(os.environ)
    env["KONSUL_DB_PATH"] = os.path.join(tmpdir, "konsul_e2e.db")
    env["KONSUL_LOCAL_PORTS"] = "1234,11434,20128," + str(PORT_UP)
    p = subprocess.Popen([PY, "-c",
        "import uvicorn, app; uvicorn.run(app.app, host='127.0.0.1', port=%d, log_level='warning')" % PORT_APP],
        cwd=REPO, env=env)
    for _ in range(60):
        try:
            s, j = req("GET", "/api/health")
            if s == 200: break
        except Exception:
            time.sleep(0.5)
    else:
        p.terminate(); print("SERVER BAŞLAMIYORDU"); sys.exit(1)

    results = []
    def check(label, cond, extra=""):
        results.append((label, bool(cond), extra))
        print(("  ✅ " if cond else "  ❌ ") + label + ((" — " + str(extra)) if extra and not cond else ""))

    s, j = req("GET", "/api/health")
    check("sürüm 1.2.0", j.get("version") == "1.2.0", j)

    s, j = req("POST", "/api/credentials",
               {"seat": "A", "base_url": f"http://127.0.0.1:{PORT_UP}/v1",
                "api_key": "sekret-kasa-123", "model": "testm"})
    check("kasa yazımı ok", s == 200 and j.get("ok"), f"{s} {j}")
    check("kasa key_hint maskeli", j.get("key_hint") == "…-123", j)
    check("kasa yanıtta ham anahtar YOK", "sekret-kasa-123" not in json.dumps(j))

    s, j = req("POST", "/api/credentials",
               {"seat": "B", "base_url": "http://169.254.169.254/latest", "api_key": "x", "model": "y"})
    check("kasa: metadata IP reddedildi", s == 400, f"{s} {j}")

    s, j = req("POST", "/api/credentials", {"seat": "Z", "api_key": "x"})
    check("kasa: geçersiz koltuk 400", s == 400, f"{s} {j}")

    s, j = req("GET", "/api/credentials")
    body = json.dumps(j, ensure_ascii=False)
    check("kasa listesi ok", s == 200 and j.get("ok") and "A" in j.get("credentials", {}), body[:120])
    credA = j.get("credentials", {}).get("A", {})
    check("kasa listesi: has_key + key_hint", credA.get("has_key") and credA.get("key_hint") == "…-123", credA)
    check("kasa listesi: ham anahtar YOK", "sekret-kasa-123" not in body and "api_key" not in json.dumps(credA))

    s, j = req("POST", "/api/chat",
               {"seat": "A", "messages": [{"role": "user", "content": "merhaba"}]})
    check("chat(seat): kâsadan çözüldü, içerik döndü", s == 200 and j.get("ok") and j.get("content") == "KASA-DENEME", f"{s} {j}")
    check("upstream: Bearer kasa anahtarı GÖRDÜ", UPSTREAM_AUTH.get("auth") == "Bearer sekret-kasa-123", UPSTREAM_AUTH.get("auth"))
    check("upstream: model kâsadan", UPSTREAM_AUTH.get("model") == "testm", UPSTREAM_AUTH.get("model"))

    s, b = req("POST", "/api/chat/stream",
               {"seat": "A", "messages": [{"role": "user", "content": "merhaba"}]}, raw=True)
    check("chat/stream(seat): SSE akışı", s == 200 and "KASA-DENEME" in b, b[:120])

    UPSTREAM_AUTH.clear()
    s, j = req("POST", "/api/chat",
               {"base_url": f"http://127.0.0.1:{PORT_UP}/v1", "api_key": "dogrudan-999",
                "model": "dmodel", "messages": [{"role": "user", "content": "x"}]})
    check("chat(gövde anahtarı): geri uyum çalışır", s == 200 and j.get("ok"), f"{s} {j}")
    check("upstream: doğrudan anahtar GÖRDÜ", UPSTREAM_AUTH.get("auth") == "Bearer dogrudan-999", UPSTREAM_AUTH.get("auth"))

    s, j = req("DELETE", "/api/credentials/A")
    check("kasa silme ok", s == 200 and j.get("deleted"), f"{s} {j}")
    s, j = req("POST", "/api/chat", {"seat": "A", "messages": [{"role": "user", "content": "x"}]})
    check("chat(seat): silinen koltuk 400", s == 400, f"{s} {j}")

    p.terminate()
    try:
        p.wait(timeout=6)
    except Exception:
        p.kill(); p.wait(timeout=6)
    up.shutdown()
    shutil.rmtree(tmpdir, ignore_errors=True)

    red = [r for r in results if not r[1]]
    print(f"\nSONUÇ: {'HATA VAR ❌ (' + str(len(red)) + ' kırmızı)' if red else 'TÜMÜ YEŞİL ✅ (' + str(len(results)) + '/' + str(len(results)) + ')'}")
    sys.exit(1 if red else 0)

if __name__ == "__main__":
    main()
