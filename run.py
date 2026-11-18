# -*- coding: utf-8 -*-
"""KONSÜL AI — deploy başlatıcı (Docker/PaaS/CLI).

app.py'nin __main__'indeki tarayıcı açma davranışından bağımsız,
headless dostu giriş noktası. Port önceliği: KONSUL_PORT > PORT (PaaS) > 8888.
"""
import os

import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("KONSUL_PORT") or os.environ.get("PORT") or "8888")
    uvicorn.run("app:app", host="0.0.0.0", port=port, log_level="info")
