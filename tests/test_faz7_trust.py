"""Faz 7 — Güven olgunluğu: kalite ölçümü + veri kontrol paneli.

Kanıtlananlar:
1. /api/quality/report yalnızca sayı döndürür; içerik/oturum metni sızdırılmaz.
2. Ölçütler doğru sayar (bölümlü karar, ilk adım etiketi, tamamlanma oranı).
3. /api/data/overview yalnızca BU sahibin oturumlarını sayar.
4. DELETE /api/data/my yalnızca bu sahibin verilerini siler; başkasının kaydı sağ kalır.
5. Sahiplik olmadan silme/özet başka sahibin verisine erişemez (token'sız → yalnızca kilitsiz).
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

OWNER = "benim-anahtarim-77"
OTHER = "baskasinin-anahtari-99"

VERDICT_FULL = "\n".join(
    f"## {h}\n- madde" for h in [
        "ÖNE ÇIKAN ARGÜMANLAR", "UZLAŞILAN NOKTALAR", "GÖRÜŞ AYRILIKLARI",
        "DOĞRULANMAMIŞ İDDİALAR", "RİSKLER", "EKSİK BİLGİLER",
        "OLASI KARAR YOLLARI", "ÖNERİLEN İLK ADIM", "BAŞARI GÖSTERGESİ",
    ]
)


class Faz7Trust(unittest.TestCase):
    def setUp(self):
        engine.init_database()
        self.client = TestClient(app.app)
        with engine.get_db() as conn:
            conn.execute("DELETE FROM sessions")
            conn.execute("DELETE FROM messages")
            conn.execute("DELETE FROM decision_reports")

    def test_quality_report_counts_without_content(self):
        """FAZ7-1/2: kalite raporu sayılarla ölçer, içerik içermez."""
        engine.create_session("ses_q_a", "BENIM Gizli Konum A", owner_token=OWNER)
        engine.close_session("ses_q_a", VERDICT_FULL)
        engine.create_session("ses_q_b", "Kısa karar", owner_token=OWNER)
        engine.close_session("ses_q_b", "Kısa.")
        r = self.client.get("/api/quality/report")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertTrue(data["ok"])
        self.assertEqual(data["sessions_total"], 2)
        self.assertEqual(data["sessions_with_verdict"], 2)
        self.assertEqual(data["verdicts_count"], 2)
        self.assertEqual(data["verdicts_with_first_step"], 1)
        self.assertEqual(data["verdicts_with_success_metric"], 1)
        self.assertEqual(data["verdicts_with_7plus_sections"], 1)
        # İçerik sızmasın: konu başlıkları ve karar metni yanıtta yok
        raw = r.text
        self.assertNotIn("BENIM Gizli Konum", raw)
        self.assertNotIn("ÖNE ÇIKAN ARGÜMANLAR", raw)

    def test_overview_scoped_to_owner(self):
        """FAZ7-3: özet yalnızca bu sahibin oturumlarını sayar."""
        engine.create_session("ses_mine", "Benim konum", owner_token=OWNER)
        engine.record_message("ses_mine", "A", "x", "seat", "benim sözüm", "", "")
        engine.create_session("ses_other", "Başkasının konusu", owner_token=OTHER)
        engine.record_message("ses_other", "A", "x", "seat", "başkasının sözü", "", "")
        r = self.client.get("/api/data/overview", headers={"X-Owner-Token": OWNER})
        data = r.json()
        self.assertTrue(data["ok"])
        self.assertEqual(data["sessions"], 1)
        self.assertEqual(data["messages"], 1)
        # Token'sız istek erişemez (Faz 7 güvenlik yaması)
        r2 = self.client.get("/api/data/overview")
        self.assertEqual(r2.status_code, 403)
        self.assertFalse(r2.json()["ok"])

    def test_delete_my_data_spares_others(self):
        """FAZ7-4: silme yalnızca benimkini siler, başkasının kaydı sağ kalır."""
        engine.create_session("ses_mine2", "Benim 2", owner_token=OWNER)
        engine.record_message("ses_mine2", "A", "x", "seat", "silinecek söz", "", "")
        engine.create_session("ses_other2", "Başkası 2", owner_token=OTHER)
        engine.record_message("ses_other2", "A", "x", "seat", "sağ kalan söz", "", "")
        r = self.client.request("DELETE", "/api/data/my", headers={"X-Owner-Token": OWNER})
        data = r.json()
        self.assertTrue(data["ok"])
        self.assertGreaterEqual(data["deleted"].get("sessions", 0), 1)
        self.assertGreaterEqual(data["deleted"].get("messages", 0), 1)
        with engine.get_db() as conn:
            left = [row[0] for row in conn.execute("SELECT id FROM sessions").fetchall()]
            msgs = [row[0] for row in conn.execute("SELECT content FROM messages").fetchall()]
        self.assertIn("ses_other2", left)
        self.assertNotIn("ses_mine2", left)
        self.assertIn("sağ kalan söz", msgs)
        self.assertNotIn("silinecek söz", msgs)

    def test_delete_without_owner_is_403_and_touches_nothing(self):
        """FAZ7-5 (+güvenlik yaması): token'sız silme 403; kilitli VE kilitsiz
        hiçbir kayda dokunulmaz — anahtarsız toplu silme açık kapatıldı."""
        engine.create_session("ses_lock", "Kilitli", owner_token=OWNER)
        engine.record_message("ses_lock", "A", "x", "seat", "kilitli söz", "", "")
        engine.create_session("ses_legacy", "Eski kilitsiz kayıt")  # owner_token yok
        engine.record_message("ses_legacy", "A", "x", "seat", "eski söz", "", "")
        r = self.client.request("DELETE", "/api/data/my")
        self.assertEqual(r.status_code, 403)
        self.assertFalse(r.json()["ok"])
        with engine.get_db() as conn:
            left = sorted(row[0] for row in conn.execute("SELECT id FROM sessions").fetchall())
        self.assertEqual(left, ["ses_legacy", "ses_lock"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
