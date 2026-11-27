"""v2.7 gizlilik kilidi — oturum sahipliği (owner token) ve arşiv persist bayrağı.

Kapsar:
  * kilitsiz (eski/classic) oturumlar tokensiz tam erişimini korur (geriye dönük uyum),
  * owner_token ile kurulan oturumlar: tokensiz istekler 403, doğru token 200,
  * /api/sessions listesi: token sahibi yalnızca kendi oturumlarını görür,
  * ham token veritabanına yazılmaz (sha256 özeti saklanır),
  * /api/research/verify persist=false iken fact_checks'a yazmaz.
"""
import hashlib
import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
_tmp = tempfile.TemporaryDirectory()
os.environ['KONSUL_DB_PATH'] = str(Path(_tmp.name) / 'lock_test.db')

from fastapi.testclient import TestClient  # noqa: E402
import app  # noqa: E402
import engine  # noqa: E402

client = TestClient(app.app)

T1 = "owner_token_birinci_tarayici"
T2 = "owner_token_ikinci_tarayici"


def _start(topic, owner_token=None):
    body = {"topic": topic}
    if owner_token is not None:
        body["owner_token"] = owner_token
    r = client.post("/api/session/start", json=body)
    assert r.status_code == 200, r.text
    return r.json()["session_id"]


def _record(sid, content, token=None):
    headers = {"X-Owner-Token": token} if token else {}
    return client.post(
        "/api/session/record_message",
        json={"session_id": sid, "seat": "A", "character_id": "hesap_uzmani",
              "role": "seat", "speaker_name": "Mali Müşavir", "content": content},
        headers=headers,
    )


class ArchiveLock(unittest.TestCase):
    def test_legacy_session_stays_tokenless_for_classic(self):
        """classic.html hiçbir token göndermez; kilitsiz oturumda her şey çalışır."""
        sid = _start("klasik uyum oturumu")
        self.assertEqual(_record(sid, "klasik mesaj").status_code, 200)

        msgs = client.get(f"/api/session/{sid}/messages")
        self.assertEqual(msgs.status_code, 200)
        self.assertTrue(any(m["content"] == "klasik mesaj" for m in msgs.json()["messages"]))

        concl = client.post("/api/session/conclude",
                            json={"session_id": sid, "verdict": "karar", "topic": "t"})
        self.assertEqual(concl.status_code, 200)

        rep = client.post("/api/session/report",
                          json={"session_id": sid, "topic": "t", "report_md": "# karar"})
        self.assertEqual(rep.status_code, 200)
        got = client.get(f"/api/session/{sid}/report")
        self.assertEqual(got.status_code, 200)

        seal = client.post("/api/envelope/seal",
                           json={"session_id": sid, "seat": "A", "position": "EVET",
                                 "character_id": "hesap_uzmani", "word": "EVET"})
        self.assertEqual(seal.status_code, 200)
        status = client.get(f"/api/envelope/{sid}")
        self.assertEqual(status.status_code, 200)
        opened = client.post("/api/envelope/open", json={"session_id": sid})
        self.assertEqual(opened.status_code, 200)

        # kilitsiz oturum listede görünür (classic arşivi böyle çalışır)
        lst = client.get("/api/sessions").json()["sessions"]
        self.assertIn(sid, [s["id"] for s in lst])

    def test_locked_session_rejects_tokenless_access(self):
        sid = _start("kilitli oturum", owner_token=T1)

        # tokensiz: tüm okuma/yazma uçları 403
        self.assertEqual(_record(sid, "yetkisiz deneme").status_code, 403)
        self.assertEqual(client.get(f"/api/session/{sid}/messages").status_code, 403)
        self.assertEqual(client.post("/api/session/conclude",
                                     json={"session_id": sid, "verdict": "x"}).status_code, 403)
        self.assertEqual(client.post("/api/session/report",
                                     json={"session_id": sid, "topic": "t",
                                           "report_md": "x"}).status_code, 403)
        self.assertEqual(client.get(f"/api/session/{sid}/report").status_code, 403)
        self.assertEqual(client.post("/api/envelope/seal",
                                     json={"session_id": sid, "seat": "A",
                                           "position": "EVET"}).status_code, 403)
        self.assertEqual(client.get(f"/api/envelope/{sid}").status_code, 403)
        self.assertEqual(client.post("/api/envelope/open",
                                     json={"session_id": sid}).status_code, 403)
        self.assertEqual(client.post("/api/delta/compute",
                                     json={"session_id": sid, "transcript": "x"}).status_code, 403)

        # yanlış token: 403
        self.assertEqual(_record(sid, "yanlis anahtar", token="owner_token_baska").status_code, 403)

        # doğru token: 200 ve mesaj gerçekten yazılır
        ok = _record(sid, "sahibinin mesajı", token=T1)
        self.assertEqual(ok.status_code, 200)
        msgs = client.get(f"/api/session/{sid}/messages",
                          headers={"X-Owner-Token": T1})
        self.assertEqual(msgs.status_code, 200)
        self.assertTrue(any(m["content"] == "sahibinin mesajı" for m in msgs.json()["messages"]))

        seal = client.post("/api/envelope/seal",
                           json={"session_id": sid, "seat": "B", "position": "HAYIR"},
                           headers={"X-Owner-Token": T1})
        self.assertEqual(seal.status_code, 200)

    def test_session_list_filters_by_owner(self):
        a = _start("A masası", owner_token=T1)
        b = _start("B masası", owner_token=T2)
        classic = _start("classic masası")

        def ids(headers=None):
            r = client.get("/api/sessions", headers=headers or {})
            return [s["id"] for s in r.json()["sessions"]]

        anon = ids()
        self.assertIn(classic, anon)
        self.assertNotIn(a, anon)
        self.assertNotIn(b, anon)

        only_t1 = ids({"X-Owner-Token": T1})
        self.assertIn(a, only_t1)
        self.assertNotIn(b, only_t1)
        self.assertNotIn(classic, only_t1)

        only_t2 = ids({"X-Owner-Token": T2})
        self.assertIn(b, only_t2)
        self.assertNotIn(a, only_t2)

    def test_owner_hash_is_digest_not_raw_token(self):
        sid = _start("hash kontrolü", owner_token=T1)
        with engine.get_db() as conn:
            row = conn.execute("SELECT owner_hash FROM sessions WHERE id = ?", (sid,)).fetchone()
        self.assertIsNotNone(row)
        stored = row["owner_hash"]
        self.assertNotEqual(stored, T1)
        self.assertEqual(stored, hashlib.sha256(T1.encode("utf-8")).hexdigest())

    def test_research_verify_persist_flag(self):
        """persist=false → fact_checks'a tek satır bile yazılmaz (arşiv kapalıyken)."""
        captured = {}

        async def fake_fact_check(claim, base_url, api_key, model,
                                 session_id=None, persist=True):
            captured["persist"] = persist
            return {"ok": True, "verdict": "SAHTE DOĞRULAMA"}

        original = engine.research_fact_check
        engine.research_fact_check = fake_fact_check
        try:
            r1 = client.post("/api/research/verify",
                             json={"claim": "id dia bir", "persist": False})
            self.assertEqual(r1.status_code, 200)
            self.assertIs(captured["persist"], False)

            r2 = client.post("/api/research/verify", json={"claim": "id dia iki"})
            self.assertEqual(r2.status_code, 200)
            self.assertIs(captured["persist"], True)
        finally:
            engine.research_fact_check = original


    def test_report_list_filters_by_owner(self):
        """Kilitli oturumun konusu tokensiz /api/reports listesine sızmaz."""
        sid = _start("gizli konu: maaş zammı", owner_token=T1)
        save = client.post("/api/session/report",
                           json={"session_id": sid, "topic": "gizli konu: maaş zammı",
                                 "report_md": "# gizli rapor"},
                           headers={"X-Owner-Token": T1})
        self.assertEqual(save.status_code, 200)

        anon = client.get("/api/reports").json()["reports"]
        self.assertNotIn(sid, [r["session_id"] for r in anon])

        mine = client.get("/api/reports", headers={"X-Owner-Token": T1}).json()["reports"]
        self.assertIn(sid, [r["session_id"] for r in mine])


    def test_session_takeover_blocked(self):
        """Bilinen oturum numarasıyla tekrar açmak sahipliği devralamaz, kilidi silemez."""
        sid = _start("kilitli masaj", owner_token=T1)
        self.assertEqual(_record(sid, "sahibin sözü", token=T1).status_code, 200)

        # saldırgan aynı sid ile kendi token'ıyla açmayı dener
        client.post("/api/session/start",
                    json={"session_id": sid, "topic": "devralma denemesi",
                          "owner_token": T2})
        with engine.get_db() as conn:
            row = conn.execute("SELECT owner_hash FROM sessions WHERE id = ?", (sid,)).fetchone()
        self.assertEqual(row["owner_hash"], hashlib.sha256(T1.encode()).hexdigest(),
                         "sahiplik T1'de kalmalı (devralma yok)")

        # saldırgan token'sız denese de kilit silinmemeli
        client.post("/api/session/start", json={"session_id": sid, "topic": "silme denemesi"})
        self.assertEqual(_record(sid, "saldırgan mesajı", token=T2).status_code, 403)
        self.assertEqual(_record(sid, "saldırgan mesajı").status_code, 403)
        # gerçek sahip hâlâ yazabiliyor
        self.assertEqual(_record(sid, "sahip hâlâ burada", token=T1).status_code, 200)

    def test_nonexistent_session_rejected(self):
        """Veritabanında olmayan oturuma yazma/okuma 404 — 'kilitsiz kayıt' muamelesi yok."""
        ghost = "ses_bu_kayit_hic_yok"
        self.assertEqual(_record(ghost, "hayalet mesaj").status_code, 404)
        self.assertEqual(client.get(f"/api/session/{ghost}/messages").status_code, 404)
        self.assertEqual(client.post("/api/session/conclude",
                                     json={"session_id": ghost, "verdict": "x"}).status_code, 404)
        self.assertEqual(client.post("/api/session/report",
                                     json={"session_id": ghost, "topic": "t",
                                           "report_md": "x"}).status_code, 404)
        self.assertEqual(client.post("/api/envelope/seal",
                                     json={"session_id": ghost, "seat": "A",
                                           "position": "EVET"}).status_code, 404)
        self.assertEqual(client.get(f"/api/envelope/{ghost}").status_code, 404)
        # hayalet mesaj gerçekten yazılmamış olmalı
        with engine.get_db() as conn:
            n = conn.execute("SELECT COUNT(*) AS c FROM messages WHERE session_id = ?",
                             (ghost,)).fetchone()["c"]
        self.assertEqual(n, 0)

    def test_private_session_never_writes_shared_memory(self):
        """Kilitli oturumun konusu/kararı ortak karakter hafızasına sızmaz;
        kilitsiz (classic) oturum eskisi gibi damıtılır."""
        topic = "ÖZEL-GECE-KONU-7391"
        verdict = "ÖZEL-KARAR-7391"
        chars = [{"seat": "A", "character_id": "hesap_uzmani"}]

        priv = _start(topic, owner_token=T1)
        r = client.post("/api/session/conclude",
                        json={"session_id": priv, "verdict": verdict, "topic": topic,
                              "seated_characters": chars},
                        headers={"X-Owner-Token": T1})
        self.assertEqual(r.status_code, 200)

        c_topic = "KLASIK-HAFIZA-8402"
        c_verdict = "KLASIK-KARAR-8402"
        classic = _start(c_topic)
        r2 = client.post("/api/session/conclude",
                         json={"session_id": classic, "verdict": c_verdict,
                               "topic": c_topic, "seated_characters": chars})
        self.assertEqual(r2.status_code, 200)

        mem = client.get("/api/memory/hesap_uzmani").json()
        texts = " || ".join(m.get("entry", "") for m in mem.get("memories", []))
        self.assertNotIn(topic, texts, "özel oturumun konusu ortak hafızaya sızmamalı")
        self.assertNotIn(verdict, texts, "özel oturumun kararı ortak hafızaya sızmamalı")
        self.assertIn(c_topic, texts, "kilitsiz (classic) oturum hâlâ damıtılmalı")


    def test_health_reports_version_markers(self):
        """/api/health canlı sürümü tek curl ile doğrulanabilir kılar (commit + özellik işaretleri)."""
        j = client.get("/api/health").json()
        self.assertTrue(j.get("commit"), "commit alanı boş olamaz")
        for marker in ("owner_lock", "archive_opt_out", "custom_seats", "commit_report"):
            self.assertIn(marker, j.get("features", []), f"özellik işareti eksik: {marker}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
