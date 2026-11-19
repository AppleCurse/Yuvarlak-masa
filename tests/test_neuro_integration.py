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
            conn.execute('DELETE FROM neuro_estimates')

    def test_character_and_session_isolation_and_persistence(self):
        first = bridge.step_character('A', 'character:alice', 'session:1', 'Özel metin: merak ve soru?')
        other = bridge.step_character('A', 'character:bob', 'session:1', 'Farklı')
        moved = bridge.step_character('B', 'character:alice', 'session:1', 'Yeni soru?')
        self.assertEqual((first['step_count'], other['step_count'], moved['step_count']), (1, 1, 2))
        bridge.reset_all_seats()  # simulates process restart, DB survives
        new_session = bridge.step_character('C', 'character:alice', 'session:2', 'Tekrar?')
        self.assertEqual(new_session['step_count'], 1)
        with engine.get_db() as conn:
            rows = dict(conn.execute('SELECT character_id, estimates FROM neuro_estimates').fetchall())
        self.assertEqual(sum(v['count'] for v in json.loads(rows['character:alice']).values()), 3)
        self.assertEqual(sum(v['count'] for v in json.loads(rows['character:bob']).values()), 1)
        self.assertNotIn('Özel metin', str(rows))

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
