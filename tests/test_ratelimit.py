# -*- coding: utf-8 -*-
"""v1.4: hız sınırı — gerçek uvicorn, düşük limitli env.
   - KONSUL_RATE_LIMIT_PER_MIN=5 iken hızlı 8 çağrının bir kısmı 429 döner
   - 429 gövdesi Türkçe mesaj + retry_after taşır, Retry-After başlığı var
   - /api/health rate_limit_per_min alanını dürüst bildirir
   Çalıştırma: .venv/bin/python tests/test_ratelimit.py"""
import json, os, socket, subprocess, sys, tempfile, time, urllib.request, urllib.error

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p

PORT_APP = free_port()
BASE = f"http://127.0.0.1:{PORT_APP}"

def req(method, path, payload=None):
    data = json.dumps(payload or {}).encode()
    r = urllib.request.Request(BASE + path, data=data, method=method,
                               headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(r, timeout=20) as resp:
            return resp.status, dict(resp.headers), json.loads(resp.read() or b"{}")
    except urllib.error.HTTPError as e:
        try: body = json.loads(e.read() or b"{}")
        except Exception: body = {}
        return e.code, dict(e.headers), body

def main():
    os.chdir(REPO)
    venv = os.path.join(REPO, ".venv", "bin", "python")
    PY = venv if os.path.exists(venv) else sys.executable
    tmpdir = tempfile.mkdtemp(prefix="konsul_rl_")
    env = dict(os.environ)
    env["KONSUL_DB_PATH"] = os.path.join(tmpdir, "konsul_rl.db")
    env["KONSUL_RATE_LIMIT_PER_MIN"] = "5"
    p = subprocess.Popen([PY, "-c",
        "import uvicorn, app; uvicorn.run(app.app, host='127.0.0.1', port=%d, log_level='warning')" % PORT_APP],
        cwd=REPO, env=env)
    try:
        for _ in range(60):
            try:
                s, _, _ = req("GET", "/api/health")
                if s == 200: break
            except Exception:
                time.sleep(0.5)
        else:
            print("SERVER BAŞLAMIYORDU"); sys.exit(1)

        ok = True
        def check(label, cond, extra=""):
            global_ok = cond
            print(("  ✅ " if cond else "  ❌ ") + label + ((" — " + str(extra)) if extra and not cond else ""))
            if not cond:
                globals()["_failed"] = True
        globals()["_failed"] = False

        s, h, j = req("GET", "/api/health")
        check("health rate_limit_per_min=5 bildirir", j.get("rate_limit_per_min") == 5, j)

        codes = []
        bodies = []
        headers = []
        for _ in range(8):
            s, h, j = req("POST", "/api/chat", {"messages": [{"role": "user", "content": "x"}]})
            codes.append(s); bodies.append(j); headers.append(h)
        n429 = sum(1 for c in codes if c == 429)
        check("hızlı 8 çağrıda 429 dönüyor", n429 >= 1, codes)
        first429 = next(i for i, c in enumerate(codes) if c == 429)
        check("429 gövdesi Türkçe + retry_after", "Hız sınırı" in str(bodies[first429].get("error", "")) and "retry_after" in bodies[first429], bodies[first429])
        ra = headers[first429].get("Retry-After") or headers[first429].get("retry-after")
        check("Retry-After başlığı var", ra is not None, headers[first429])
        check("sınır öncesi çağrılar 429 değil", all(c != 429 for c in codes[:5]), codes)

        print("SONUÇ: " + ("TÜMÜ YEŞİL ✅" if not globals()["_failed"] else "HATA VAR ❌"))
        sys.exit(1 if globals()["_failed"] else 0)
    finally:
        p.terminate()

if __name__ == "__main__":
    main()
