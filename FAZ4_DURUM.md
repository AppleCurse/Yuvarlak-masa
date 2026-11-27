# Faz 4 Durum Raporu — Özgün zekâ (ölçülebilirlik + dürüst öğrenme)

> Faz 4 · 2026-11-27 · Kod tamamlandı, 6/6 yeni test + tam paket yeşil.
> **Kapsam:** (1) öğrenmenin **beğeniye bağlı olmadığının kanıtı**, (2) nörodinamik
> davranışın **ölçülebilir farkı**, (3) tahminlerin **geriye değerlendirilmesi**
> (backtest). Deneysel canlı karşılaştırma raporu §4'te açıkça "canlı tur bekliyor".

## 1. İncelenen dosyalar

| Dosya | Neden incelendi |
|---|---|
| `neuro_bridge.py` (`step_character`, `enqueue_feedback`, `SeatCognitiveAgent.step`) | Öğrenme yolları: kanıt tablosu (`neuro_evidence_estimates_v1`) vs beğeni tablosu (`neuro_subjective_ratings`) |
| `app.py` (`/api/neuro/feedback`, `/api/neuro/state`, `_prepare_cognitive_messages`) | Uç noktaların `learning` bayrağı, direktif enjeksiyon noktaları (835/920) |
| `neurodynamic_agent/prediction.py` | `PredictionCore.observe/state/export_observations` — beklenti, gözlem sayısı |
| `tests/test_neuro_integration.py` | Mevcut kapsam (yalan/itiraz metni ödül olmaz, izolasyon) — Faz 4 bunu uç ve backtest seviyesine taşıyor |

## 2. Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `neuro_bridge.py` | **Yeni:** `record_outcome()` — açık gerçek sonuç (0..1, kanıt) gelir; **önce** o tavrın beklentisi saklanır, sonra `predictor.observe` ile kanıt tablosu eğitilir, `neuro_backtest_v1` satırı yazılır. **Yeni:** `evaluate_backtest()` — count, MAE, naive `0.5` başlangıcına göre `skill_vs_baseline`, tavara göre dağılım, son kayıtlar. Beğeni yolu (`enqueue_feedback`) değişmedi — hâlâ tabloya yazar, eğitmez. |
| `app.py` | **Yeni uçlar:** `POST /api/neuro/outcome` (learning:true, source:explicit_outcome; geçersiz değer 400), `GET /api/neuro/backtest?character_id=&limit=`. |
| `tests/test_faz4_backtest.py` | **Yeni (6 test, FAZ4-1…7):** beğeni ne kanıt ne backtest'e dokunur; sohbet adımı eğitmez; açık sonuç eğitir + beklenti öncesi saklanır; metrikler; uç seviyesi ayrım (`learning:false/true`, 400); kaynak ayrımı (`inspect`); durumlar adım adım ölçülebilir değişir. |
| `tests/run_all.sh` | Yeni suite kaydı: `faz4: beğeni/kanıt ayrımı + tahmin geriye değerlendirmesi`. |
| `FAZ0_DURUM_RAPORU.md`, `README.md` | Faz 4 satırları güncellendi. |

## 3. Test komutları ve sonuçları

| Komut | Sonuç |
|---|---|
| `cd tests && ../.venv/bin/python test_faz4_backtest.py` | **✅ 6/6 OK** |
| `bash tests/run_all.sh` | **✅ TÜM PAKET YEŞİL** (yeni suite dahil) |
| `.venv/bin/python -m py_compile neuro_bridge.py app.py` | ✅ |

## 4. Canlı doğrulama durumu — deneysel karşılaştırma raporu

**Sandbox'ta canlı LLM yok; bu bölüm simülasyon/uydurma DEĞİLDİR — henüz yapılmamıştır.**
Canlı turda yapılacaklar (sırasıyla):

1. **Ölçülebilir fark:** masa sırasında `GET /api/neuro/state` — `step_count`, `stance`
   değişimi, `energy/fatigue/epistemic_uncertainty` değerlerinin tur boyunca değiştiğini gör.
   (Kod tarafı test FAZ4-7 ile kanıtlı: değerler adım adım değişiyor.)
2. **Beğeni ayrımı canlı:** `POST /api/neuro/feedback` → yanıtta `learning:false`;
   ardından `GET /api/neuro/backtest` → `count` artmaz.
3. **Backtest canlı:** karar uygulanınca `POST /api/neuro/outcome` (`outcome: 0..1`) →
   `GET /api/neuro/backtest` → `count` artar, `mae`/`skill_vs_baseline` hesaplanır.
4. **Yanıt kalitesi A/B (gerçek deneysel rapor):** aynı soruyla koltuk sohbeti
   (direktifli) vs nörodinamiksiz çıktı karşılaştırması — ancak canlı LLM anahtarıyla
   yapılabilir; sonuç bu rapora **tarih + komut** ile eklenecek.

## 5. Tamamlanan / Kısmen / Açık

- **Tamamlandı:** beğeni-kanıt kaynak ayrımı kanıtı (davranış + kaynak incelemesi),
  açık-sonuç öğrenme kanalı + uçları, backtest metrikleri, ölçülebilir durum değişimi
  testi, paket kaydı, dokümanlar.
- **Kısmen:** deneysel canlı karşılaştırma raporu (§4 madde 4 — canlı LLM gerekiyor).
- **Açık:** backtest sonuçlarının kullanıcı arayüzünde gösterimi (şu an API + rapor);
  outcome bildirim akışının tartışma arayüzüne düğme olarak bağlanması.

## 6. Sonraki faz koşulu (Faz 5 — Karar çıktısı ve süreklilik)

Faz 4'ün §4 maddelerinin canlıda bir kez doğrulanması (özellikle 1-3). Faz 5'in kod
tarafı (ilk adım + başarı göstergesi, paylaşım bağlantısı, 48 saat hatırlatma) beklemez;
canlı doğrulama olmadan "canlıda çalışıyor" iddia edilmeyecek.
