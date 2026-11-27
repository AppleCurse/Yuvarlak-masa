"""Faz 4 — Beğeni/kanıt ayrımı + tahminlerin geriye değerlendirilmesi.

Kanıtlananlar:
1. Beğeni (subjective rating) ne kanıt tablosuna ne backtest'e dokunur.
2. Sohbet adımları (step_character) tahmini eğitmez.
3. Açık sonuç (explicit outcome) kanıt olarak tahmini eğitir + backtest satırı yazar.
4. `/api/neuro/feedback` (learning:false) ile `/api/neuro/outcome` (learning:true) ayrımı uç seviyesinde doğrulanır.
5. Kaynak ayrımı: enqueue_feedback kanıt tablosunu, step_character beğeni tablosunu hiç anmaz.
6. Nörodinamik durumlar adım adım ölçülebilir biçimde değişir (enerji/yorgunluk/ adım sayısı).
"""
import inspect
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
from fastapi.testclient import TestClient

_BACKTEST_DDL = (
    'CREATE TABLE IF NOT EXISTS neuro_backtest_v1 ('
    'id INTEGER PRIMARY KEY AUTOINCREMENT, character_id TEXT NOT NULL, '
    'session_id TEXT NOT NULL, stance TEXT NOT NULL, expectation REAL NOT NULL, '
    'outcome REAL NOT NULL, note TEXT NOT NULL DEFAULT \'\', '
    'created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)'
)


class Faz4Backtest(unittest.TestCase):
    def setUp(self):
        bridge.reset_all_seats()
        with engine.get_db() as conn:
            conn.execute('CREATE TABLE IF NOT EXISTS neuro_evidence_estimates_v1 (character_id TEXT PRIMARY KEY, estimates TEXT NOT NULL)')
            conn.execute('CREATE TABLE IF NOT EXISTS neuro_subjective_ratings (feedback_id TEXT PRIMARY KEY, character_id TEXT NOT NULL, session_id TEXT NOT NULL, message_id TEXT NOT NULL, rating REAL NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)')
            conn.execute(_BACKTEST_DDL)
            conn.execute('DELETE FROM neuro_evidence_estimates_v1')
            conn.execute('DELETE FROM neuro_subjective_ratings')
            conn.execute('DELETE FROM neuro_backtest_v1')

    def _state(self, cid='character:alice'):
        with engine.get_db() as conn:
            est = conn.execute(
                'SELECT estimates FROM neuro_evidence_estimates_v1 WHERE character_id=?',
                (cid,),
            ).fetchone()
            bt = conn.execute('SELECT COUNT(*) FROM neuro_backtest_v1').fetchone()[0]
        return (json.loads(est[0]) if est else {}), bt

    def test_like_never_trains_or_writes_backtest(self):
        """FAZ4-1/2: beğeni ve sohbet adımı tahmini eğitmez, backtest'e yazmaz."""
        self.assertTrue(bridge.enqueue_feedback('fb-1', 'character:alice', 'session-x', 1.0, 'm1'))
        est, bt = self._state()
        self.assertEqual(est, {})
        self.assertEqual(bt, 0)
        bridge.step_character('A', 'character:alice', 'session-x', 'Bu bir soru, birkaç ayrıntı var?')
        est2, bt2 = self._state()
        self.assertEqual(sum(v.get('count', 0) for v in est2.values()), 0)
        self.assertEqual(bt2, 0)

    def test_outcome_trains_evidence_and_records_backtest(self):
        """FAZ4-3: açık sonuç kanıt sayılır — tahmin eğitilir, beklenti önceden saklanır."""
        res = bridge.record_outcome('character:alice', 'session-x', 1.0, None, 'Karar uygulandı')
        self.assertTrue(res['ok'])
        self.assertTrue(res['learning'])
        self.assertEqual(res['source'], 'explicit_outcome')
        self.assertEqual(res['observations_before'], 0)
        self.assertEqual(res['observations_after'], 1)
        self.assertAlmostEqual(res['expectation'], 0.55, places=6)  # prior, gözlemden ÖNCE
        est, bt = self._state()
        self.assertEqual(bt, 1)
        self.assertEqual(sum(v['count'] for v in est.values()), 1)

    def test_backtest_metrics(self):
        """FAZ4-4: geriye değerlendirme metrikleri (mae, naive başlangıca göre skill)."""
        bridge.record_outcome('character:alice', 'session-x', 1.0)
        bridge.record_outcome('character:alice', 'session-x', 0.0)
        rep = bridge.evaluate_backtest('character:alice')
        self.assertEqual(rep['count'], 2)
        self.assertIsNotNone(rep['mae'])
        self.assertIsNotNone(rep['baseline_mae'])
        self.assertIsNotNone(rep['skill_vs_baseline'])
        self.assertTrue(rep['by_stance'])
        self.assertEqual(len(rep['recent']), 2)

    def test_api_separation_and_backtest_endpoints(self):
        """FAZ4-5: uç seviyesinde ayrım — beğeni learning:false, sonuç learning:true."""
        client = TestClient(app.app)
        r = client.post('/api/neuro/feedback', json={
            'feedback_id': 'fb-api', 'character_id': 'character:alice',
            'session_id': 'session-x', 'reward': 1.0, 'message_id': 'm',
        })
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.json()['learning'])
        est, bt = self._state()
        self.assertEqual(bt, 0)
        self.assertEqual(est, {})

        r2 = client.post('/api/neuro/outcome', json={
            'character_id': 'character:alice', 'session_id': 'session-x',
            'outcome': 1.0, 'note': 'karar uygulandı',
        })
        self.assertEqual(r2.status_code, 200)
        body = r2.json()
        self.assertTrue(body.get('learning'))
        self.assertEqual(body.get('source'), 'explicit_outcome')

        r3 = client.get('/api/neuro/backtest', params={'character_id': 'character:alice'})
        self.assertEqual(r3.status_code, 200)
        self.assertEqual(r3.json()['count'], 1)

        r4 = client.post('/api/neuro/outcome', json={
            'character_id': 'character:alice', 'session_id': 'session-x', 'outcome': 5,
        })
        self.assertEqual(r4.status_code, 400)

    def test_source_separation(self):
        """FAZ4-6: kaynak düzeyi ayrım — yollar birbirine hiç dokunmuyor."""
        src_feedback = inspect.getsource(bridge.enqueue_feedback)
        self.assertNotIn('neuro_evidence_estimates', src_feedback)
        self.assertNotIn('predictor.observe', src_feedback)
        src_step = inspect.getsource(bridge.step_character)
        self.assertNotIn('neuro_subjective_ratings', src_step)
        src_outcome = inspect.getsource(bridge.record_outcome)
        self.assertNotIn('neuro_subjective_ratings', src_outcome)

    def test_states_evolve_measurably(self):
        """FAZ4-7: nörodinamik durumlar sohbet boyunca ölçülebilir değişir."""
        s1 = bridge.step_character('A', 'character:alice', 'session-y', 'İlk soru, birkaç ayrıntı var?')
        s2 = bridge.step_character('A', 'character:alice', 'session-y', 'Daha uzun bir soru. Birden fazla ayrıntı? Üç soru daha?')
        self.assertEqual(s2['step_count'], s1['step_count'] + 1)
        self.assertNotEqual((s1['energy'], s1['fatigue']), (s2['energy'], s2['fatigue']))
        self.assertIn('directive', s2)
        self.assertTrue(s2['directive'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
