# -*- coding: utf-8 -*-
"""Yerel mock OpenAI-uyumlu upstream — yalnızca görsel/e2e doğrulama içindir.

Gerçek bir model değildir; cevaplar önceden yazılmış metinlerdir.
Kullanım:  python3 tests/browser/mock_upstream.py <port>
Sunucuyu KONSUL_LOCAL_PORTS=<port> + BYOK (base_url=http://127.0.0.1:<port>/v1)
ile uygulamaya bağlayın.
"""
import json
import re
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

REPLIES = {
    "moderator": (
        "Gündem net: konu tek cümlede şu — mevcut düzen içinde kalmak mı, yeni bir hayat kurmak mı? "
        "Kurallar: her söz önceki söze yanıt verecek, kanıtsız kesin hüküm olmayacak. İlk söz sırasını açıyorum."
    ),
    "hesap_uzmani": (
        "Mali Müşavir olarak önce rakamlara bakıyorum: 3 aylık nakit, 3 aylık sözleşme demek gelir "
        "sürekliliğinin kanıtsız olması demektir. Düzeni bozmak yerine önce geliri 3 ay garantiye almak "
        "gerekir; burada taksit/gelir oranı kritik."
    ),
    "risk_kriz": (
        "Mali Müşavir'in tampon tezine katılıyorum ama eksik var: 3 ay sonra gelir düşerse kim tamponu "
        "finanse edecek? Kör nokta iş sözleşmesinin yenilenme riski; benim önerim 2 aylık nakit yastığını "
        "bozmadan yan gelir testi."
    ),
    "firsat_stratejist": (
        "Risk Uzmanı'nın sözleşme riski doğru ama fırsat maliyetini unutuyoruz: düzende kalmak da bir "
        "karardır ve her yıl yetenek primi eriyor. 3 aylık nakit ile küçük bir pilot yapmak, beklemekten "
        "daha yüksek getiri sunabilir."
    ),
    "sokak_gercekcisi": (
        "Fırsat Stratejisti güzel konuşuyor ama kiracı gerçekliği farklı: 3 aylık nakit, İstanbul'da 2 ay "
        "zar zor eder. Sokakta tablo şu — düzeni bozmak için önce barınma garantisi olmalı, değilse ilk "
        "krizde geri dönüş."
    ),
    "norodinamik_ajan": (
        "Sokaktaki Gerçekçi'nin barınma şartını doğrulanabilir buluyorum; buna karşı kanıt yok. Ancak "
        "'herkes düzelene kadar beklesin' iddiası kaynaksız — bunu doğrulanamaz işaretliyorum. Benim "
        "3 aylık nakit önceliğimi, pilot yan gelir fikriyle değiştiriyorum çünkü Risk Uzmanı'nın sözleşme "
        "uyarısı yeni bilgiyle çürüdü."
    ),
    "moderator_deepen": (
        "İki çelişki görünür: (1) taraflar aynı varsayımı paylaşıyor ama sayısal karşılıklar masaya gelmedi; "
        "(2) derin soru hiçbir tarafça cevaplanmadı. Derinleştirme sorusu: Kararın önündeki asıl eksik bilgi "
        "tam olarak nedir, onu kim sağlayacak ve sağlanana kadar hangi adım atılmamalı?"
    ),
    "karar_hakemi": (
        "## ÖNE ÇIKAN ARGÜMANLAR\n"
        "- Gelir sürekliliği 3 aylık sözleşmeyle kanıtsız\n"
        "- Barınma garantisi bozucu kararın ön şartı\n"
        "- Yan gelir pilotu beklemeye göre daha yüksek getirili\n"
        "## UZLAŞILAN NOKTALAR\n"
        "- Hazırlıksız bozuculuk riskli\n"
        "- Gider tablosu olmadan kesin hüküm verilemez\n"
        "## GÖRÜŞ AYRILIKLARI\n"
        "- Tampon mu, pilot mu: masada uzlaşma yok\n"
        "## DOĞRULANMAMIŞ İDDİALAR\n"
        "- 'Düzeni bozanlar batıyor' — kaynak yok\n"
        "## RİSKLER\n"
        "- Sözleşme yenilenmezse nakit 3 ayda erir\n"
        "## EKSİK BİLGİLER\n"
        "- Aylık gider tablosu ve barınma maliyeti\n"
        "## OLASI KARAR YOLLARI\n"
        "- A: 3 ay yan gelir pilotu, sonra karar\n"
        "- B: Barınma garantisi kur, düzeni boz\n"
        "- Bu bilgiyle kesin karar verilemez; gider tablosu gelmeden taraf olunmaz."
    ),
}


class Up(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_POST(self):
        ln = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(ln) or b"{}")
        if not self.path.endswith("/chat/completions"):
            self.send_response(404)
            self.end_headers()
            return
        # Kimlik tespiti: yalnızca SİSTEM mesajı benzersizdir (tutanak diğer
        # konuşmacıların adlarını da içerdiğinden tüm gövdeye bakılamaz).
        sys0 = ""
        for m in body.get("messages", []):
            if m.get("role") == "system":
                sys0 = m.get("content", "") or ""
                break
        checks = [
            ("Karar Hakemisin", "karar_hakemi"),
            ("Moderatörüsün", "moderator"),
            ("Nörodinamik Ajansın", "norodinamik_ajan"),
            ("Mali Müşavir", "hesap_uzmani"),
            ("Risk ve Kriz Uzmanısın", "risk_kriz"),
            ("Fırsat ve Yatırım Stratejistisin", "firsat_stratejist"),
            ("Sokak Gerçekçisisin", "sokak_gercekcisi"),
        ]
        who = "hesap_uzmani"
        for needle, key in checks:
            if needle in sys0:
                who = key
                break
        if who == "moderator":
            user_txt = " ".join(
                m.get("content", "") for m in body.get("messages", [])
                if m.get("role") == "user"
            )
            if "derinleştir" in user_txt:
                who = "moderator_deepen"
        text = REPLIES.get(who, REPLIES["hesap_uzmani"])
        if body.get("stream"):
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.end_headers()
            step = max(40, len(text) // 6)
            for i in range(0, len(text), step):
                chunk = {"choices": [{"delta": {"content": text[i:i + step]}}]}
                self.wfile.write(b"data: " + json.dumps(chunk, ensure_ascii=False).encode() + b"\n\n")
            self.wfile.write(b"data: [DONE]\n\n")
        else:
            out = json.dumps({"choices": [{"message": {"content": text}}]}, ensure_ascii=False).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(out)))
            self.end_headers()
            self.wfile.write(out)


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", int(sys.argv[1])), Up).serve_forever()
