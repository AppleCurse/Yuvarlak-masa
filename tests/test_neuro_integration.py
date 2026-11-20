"""Character/session isolation and persistence of approximate cognitive estimates."""
import json
import os
import tempfile
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
_tmp = tempfile.TemporaryDirectory()
os.environ['KONSUL_DB_PATH'] = str(Path(_tmp.name) / 'test.db')
import app
import engine
import neuro_bridge as bridge


class CognitiveIntegration(unittest.TestCase):
    def setUp(self):
        bridge.reset_all_seats()
        with engine.get_db() as conn:
            conn.execute('CREATE TABLE IF NOT EXISTS neuro_estimates (character_id TEXT PRIMARY KEY, estimates TEXT NOT NULL)')
            conn.execute('CREATE TABLE IF NOT EXISTS neuro_evidence_estimates_v1 (character_id TEXT PRIMARY KEY, estimates TEXT NOT NULL)')
            conn.execute('CREATE TABLE IF NOT EXISTS neuro_subjective_ratings (feedback_id TEXT PRIMARY KEY, character_id TEXT NOT NULL, session_id TEXT NOT NULL, message_id TEXT NOT NULL, rating REAL NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)')
            conn.execute('DELETE FROM neuro_estimates')
            conn.execute('DELETE FROM neuro_evidence_estimates_v1')
            conn.execute('DELETE FROM neuro_subjective_ratings')

    def test_character_and_session_isolation_and_persistence(self):
        first = bridge.step_character('A', 'character:alice', 'session:1', 'Özel metin: merak ve soru?')
        other = bridge.step_character('A', 'character:bob', 'session:1', 'Farklı')
        moved = bridge.step_character('B', 'character:alice', 'session:1', 'Yeni soru?')
        self.assertEqual((first['step_count'], other['step_count'], moved['step_count']), (1, 1, 2))
        bridge.reset_all_seats()  # simulates process restart, DB survives
        new_session = bridge.step_character('C', 'character:alice', 'session:2', 'Tekrar?')
        self.assertEqual(new_session['step_count'], 1)
        with engine.get_db() as conn:
            rows = dict(conn.execute('SELECT character_id, estimates FROM neuro_evidence_estimates_v1').fetchall())
        self.assertEqual(sum(v['count'] for v in json.loads(rows['character:alice']).values()), 0)
        self.assertEqual(sum(v['count'] for v in json.loads(rows['character:bob']).values()), 0)
        self.assertNotIn('Özel metin', str(rows))


    def test_user_wording_never_becomes_reward(self):
        agent = bridge.SeatCognitiveAgent("A")
        agent.step("Haklısın, gerçekten doğru; katılıyorum.")
        after_agreement = agent.predictor.state("yalin_gercekci_cozumleme")
        agent.step("Yanlış, saçma; katılmıyorum. Bu bir kriz.")
        after_disagreement = agent.predictor.state("yalin_gercekci_cozumleme")
        self.assertEqual(after_agreement.observations, 0)
        self.assertEqual(after_disagreement.observations, 0)
        self.assertEqual(after_agreement.expected_reward, after_disagreement.expected_reward)

    def test_only_explicit_valid_feedback_trains_predictor(self):
        agent = bridge.SeatCognitiveAgent("A")
        agent.step("Bu çok uzun bir soru? Birden fazla ayrıntı var?")
        self.assertEqual(agent.predictor.state("yalin_gercekci_cozumleme").observations, 0)
        agent.step("Sonuç bildirildi.", observed_reward=0.9)
        self.assertEqual(agent.predictor.state("yalin_gercekci_cozumleme").observations, 1)
        self.assertAlmostEqual(
            agent.predictor.state("yalin_gercekci_cozumleme").expected_reward,
            0.55 + 0.25 * (0.9 - 0.55),
        )

    def test_invalid_explicit_feedback_is_rejected(self):
        agent = bridge.SeatCognitiveAgent("A")
        for value in (True, -0.01, 1.01, float("nan"), float("inf"), "0.8"):
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    agent.step("Metin", observed_reward=value)
        self.assertEqual(agent.predictor.state("yalin_gercekci_cozumleme").observations, 0)

    def test_legacy_estimates_are_preserved_but_not_used(self):
        legacy = json.dumps({"yalin_gercekci_cozumleme": {"expectation": 0.99, "count": 100}})
        with engine.get_db() as conn:
            conn.execute("INSERT INTO neuro_estimates VALUES (?, ?)", ("alice", legacy))
        bridge.step_character('A', 'alice', 's', 'Haklısın')
        with engine.get_db() as conn:
            old = conn.execute("SELECT estimates FROM neuro_estimates WHERE character_id='alice'").fetchone()[0]
            new = conn.execute("SELECT estimates FROM neuro_evidence_estimates_v1 WHERE character_id='alice'").fetchone()[0]
        self.assertEqual(old, legacy)
        self.assertEqual(json.loads(new), {})

    def test_feedback_is_idempotent_and_bound_to_submitted_message(self):
        self.assertTrue(bridge.enqueue_feedback("fb-1", "alice", "session-a", 1.0, "turn-1"))
        self.assertFalse(bridge.enqueue_feedback("fb-1", "alice", "session-a", 1.0, "turn-1"))
        with self.assertRaises(ValueError):
            bridge.enqueue_feedback("fb-1", "alice", "session-a", 0.0, "turn-1")
        with self.assertRaises(ValueError):
            bridge.enqueue_feedback("fb-1", "alice", "session-a", 1.0, "turn-2")
        with engine.get_db() as conn:
            row = conn.execute("SELECT character_id, session_id, message_id, rating FROM neuro_subjective_ratings").fetchone()
        self.assertEqual(tuple(row), ("alice", "session-a", "turn-1", 1.0))

    def test_feedback_api_records_but_does_not_train(self):
        from fastapi.testclient import TestClient
        payload = {"feedback_id": "api-fb-1", "character_id": "alice", "message_id": "turn-1",
                   "session_id": "api-session", "reward": 0.75}
        bridge.step_character('A', 'alice', 'api-session', 'Soru')
        with TestClient(app.app) as client:
            first = client.post("/api/neuro/feedback", json=payload)
            duplicate = client.post("/api/neuro/feedback", json=payload)
            invalid = client.post("/api/neuro/feedback", json={**payload, "reward": 1.5})
            malformed = client.post("/api/neuro/feedback", json={**payload, "reward": True})
            collision = client.post("/api/neuro/feedback", json={**payload, "character_id": "bob"})
        self.assertTrue(first.json()["accepted"])
        self.assertFalse(first.json()["learning"])
        self.assertIsNone(first.json()["applies_on"])
        self.assertTrue(duplicate.json()["duplicate"])
        self.assertEqual((invalid.status_code, malformed.status_code, collision.status_code), (400, 400, 400))
        for _ in range(3):
            bridge.step_character('A', 'alice', 'api-session', 'Katılıyorum')
        with engine.get_db() as conn:
            estimates = conn.execute("SELECT estimates FROM neuro_evidence_estimates_v1 WHERE character_id='alice'").fetchone()[0]
        self.assertEqual(json.loads(estimates), {})

    def test_legacy_queued_feedback_is_not_consumed(self):
        with engine.get_db() as conn:
            conn.execute("CREATE TABLE IF NOT EXISTS neuro_feedback_queue (feedback_id TEXT PRIMARY KEY, character_id TEXT, session_id TEXT, reward REAL, status TEXT)")
            conn.execute("DELETE FROM neuro_feedback_queue")
            conn.execute("INSERT INTO neuro_feedback_queue VALUES ('old', 'alice', 's', 1, 'pending')")
        bridge.step_character('A', 'alice', 's', 'Katılıyorum')
        with engine.get_db() as conn:
            row = conn.execute("SELECT status FROM neuro_feedback_queue WHERE feedback_id='old'").fetchone()
            estimates = conn.execute("SELECT estimates FROM neuro_evidence_estimates_v1 WHERE character_id='alice'").fetchone()
        self.assertEqual(row[0], 'pending')
        self.assertEqual(json.loads(estimates[0]), {})

    def test_prompt_injection_is_opt_in_and_does_not_mutate_input(self):
        messages = [{'role': 'system', 'content': 'Sistem'}, {'role': 'user', 'content': 'Soru?'}]
        original = [dict(m) for m in messages]
        self.assertEqual(app._prepare_cognitive_messages(messages, 'A'), original)
        out = app._prepare_cognitive_messages(messages, 'Z', 'character:new', 'session:new')
        self.assertIn('İNSANİ BİLİŞSEL DURUM', out[0]['content'])
        self.assertEqual(messages, original)
        self.assertEqual(app._prepare_cognitive_messages(messages, 'OP', 'x', 'y'), original)
        inner = [{'role':'system','content':'İÇ SES PROTOKOLÜ'}, {'role':'user','content':'x'}]
        self.assertEqual(app._prepare_cognitive_messages(inner, 'A', 'x', 'y'), inner)

    def test_chat_endpoint_sends_directive_to_upstream(self):
        from unittest.mock import patch
        from fastapi.testclient import TestClient

        captured = []
        class Response:
            status_code = 200
            def json(self):
                return {"choices": [{"message": {"content": "Yanıt"}}]}
        class Upstream:
            async def post(self, url, json, headers):
                captured.append(json)
                return Response()
        payload = {"base_url": "https://example.com/v1", "model": "test", "seat": "A",
                   "cognitive_character_id": "character:alice", "cognitive_session_id": "s1",
                   "messages": [{"role": "system", "content": "Temel"}, {"role": "user", "content": "Neden?"}]}
        with patch.object(app, "_get_http", return_value=Upstream()), TestClient(app.app) as client:
            response = client.post('/api/chat', json=payload)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertIn('İNSANİ BİLİŞSEL DURUM', captured[0]['messages'][0]['content'])

    def test_start_does_not_reset_other_session(self):
        import asyncio
        bridge.step_character('A', 'alice', 'existing', 'Merhaba')
        asyncio.run(app.session_start({'session_id': 'unrelated', 'topic': 'x'}))
        second = bridge.step_character('A', 'alice', 'existing', 'Tekrar')
        self.assertEqual(second['step_count'], 2)

if __name__ == '__main__':
    unittest.main()
