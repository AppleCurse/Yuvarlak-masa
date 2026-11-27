"""Faz 5 — Paylaşılabilir karar linki: sahiplik, salt paylaşımlı erişim, sızıntı yok.

Kanıtlananlar:
1. Paylaşım açmak oturum sahibini ister (tokensiz/yanlış anahtar → 403).
2. Paylaşıma AÇILMAMIŞ oturumun /paylas/ sayfası 404'tür.
3. Paylaşılan sayfa topic + karar özetini + og: kartlarını içerir.
4. Mesaj/tutanak metni asla paylaşılan sayfaya sızmaz.
5. Paylaşım tekrar çağrılabilir (idempotent).
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
import engine
from fastapi.testclient import TestClient

OWNER = "sirin-anahtar-123"


class Faz5Share(unittest.TestCase):
    def setUp(self):
        engine.init_database()
        self.client = TestClient(app.app)
        self.sid = "ses_faz5_paylas"
        with engine.get_db() as conn:
            conn.execute("DELETE FROM sessions WHERE id=?", (self.sid,))
            conn.execute("DELETE FROM messages WHERE session_id=?", (self.sid,))
            conn.execute("DELETE FROM decision_reports WHERE session_id=?", (self.sid,))
        engine.create_session(self.sid, "Ev mi kira mı?", owner_token=OWNER)
        engine.record_message(self.sid, "A", "hesap_uzmani", "seat",
                              "Gizli tavsiye metni: kredi çek, kesin kazanırsın.", "", "")

    def test_share_requires_owner(self):
        """FAZ5-1: sahipsiz/yanlış anahtarla paylaşım açılamaz."""
        r = self.client.post("/api/session/share", json={"session_id": self.sid})
        self.assertEqual(r.status_code, 403)
        r2 = self.client.post("/api/session/share", json={"session_id": self.sid},
                              headers={"X-Owner-Token": "yanlis-anahtar"})
        self.assertEqual(r2.status_code, 403)

    def test_unshared_page_is_404(self):
        """FAZ5-2: paylaşıma kapalı oturumun sayfası 404."""
        r = self.client.get(f"/paylas/{self.sid}")
        self.assertEqual(r.status_code, 404)
        self.assertIn("paylaşıma kapalı", r.text)

    def test_share_flow_topic_verdict_og_and_no_leak(self):
        """FAZ5-3/4: paylaşılan sayfa topic+verdict+og taşır, mesaj sızmaz."""
        engine.close_session(self.sid, "Kira'da kal; 12 aylık nakit tamponu koru.")
        h = {"X-Owner-Token": OWNER}
        r = self.client.post("/api/session/share", json={"session_id": self.sid}, headers=h)
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertTrue(body["ok"])
        self.assertEqual(body["share_url"], f"/paylas/{self.sid}")

        page = self.client.get(f"/paylas/{self.sid}")
        self.assertEqual(page.status_code, 200)
        html = page.text
        self.assertIn("Ev mi kira mı?", html)
        self.assertIn("12 aylık nakit tamponu", html)
        self.assertIn("og:title", html)
        self.assertIn("og:description", html)
        self.assertIn("twitter:card", html)
        self.assertNotIn("Gizli tavsiye metni", html)
        self.assertNotIn("kesin kazanırsın", html)

    def test_share_idempotent(self):
        """FAZ5-5: ikinci paylaşım çağrısı da başarılı (kilit bozulmaz)."""
        h = {"X-Owner-Token": OWNER}
        r1 = self.client.post("/api/session/share", json={"session_id": self.sid}, headers=h)
        r2 = self.client.post("/api/session/share", json={"session_id": self.sid}, headers=h)
        self.assertTrue(r1.json().get("ok"))
        self.assertTrue(r2.json().get("ok"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
