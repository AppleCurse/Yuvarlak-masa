"""Faz 6 — Keşif sayfaları: konu sayfaları, sitemap, dürüst içerik.

Kanıtlananlar:
1. Dört konu sayfası 200 döner; başlık + lede + masaya götür CTA'sı vardır.
2. Sayfalarda garanti/kesin kazanç iddiası YOKTUR (dürüstlük kilidi).
3. Her sayfa ana sayfaya ve tavsiye değildir notuna bağlanır.
4. /sitemap.xml tüm sayfaları listeler.
5. Bilinmeyen tek segmentli yol 404'tür (yakalama rotası yoktur).
"""
import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
_tmp = tempfile.TemporaryDirectory()
os.environ['KONSUL_DB_PATH'] = str(Path(_tmp.name) / 'test.db')
import app
from fastapi.testclient import TestClient

SLUGS = ["/ev-mi-kira-mi", "/is-degisikligi", "/borc-kapatma", "/tasinma-sehir"]
FORBIDDEN = ["garantili", "kesin kazanç", "%100 kazanç", "kumar"]


class Faz6Topics(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app.app)

    def test_topic_pages_render_with_cta(self):
        """FAZ6-1/3: sayfalar 200 + başlık + CTA + geri dönüş + dürüst not."""
        for path in SLUGS:
            r = self.client.get(path)
            self.assertEqual(r.status_code, 200, path)
            html = r.text
            self.assertIn("<h1>", html)
            self.assertIn("/?soru=", html)
            self.assertIn('href="/"', html)
            self.assertIn("tavsiyesi değildir", html)
            self.assertIn("og:title", html)

    def test_no_guarantee_claims(self):
        """FAZ6-2: sayfalarda garanti/kesin kazanç dili yok."""
        for path in SLUGS:
            html = self.client.get(path).text.lower()
            for bad in FORBIDDEN:
                self.assertNotIn(bad, html, f"{path} içinde '{bad}'")

    def test_sitemap_lists_all(self):
        """FAZ6-4: sitemap ana sayfa + dört konuyu listeler."""
        r = self.client.get("/sitemap.xml")
        self.assertEqual(r.status_code, 200)
        self.assertIn("application/xml", r.headers.get("content-type", ""))
        for path in ["/"] + SLUGS:
            self.assertIn(f"yuvarlakmasa.com.tr{path}", r.text)

    def test_unknown_single_segment_404(self):
        """FAZ6-5: bilinmeyen yol 404 — her şeyi yutan rota yok."""
        r = self.client.get("/bilinmeyen-konu")
        self.assertEqual(r.status_code, 404)


if __name__ == "__main__":
    unittest.main(verbosity=2)
