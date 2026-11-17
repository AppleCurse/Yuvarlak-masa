# -*- coding: utf-8 -*-
"""
KONSÜL 2.1 — Persona Guard v2 (Karakter Bekçisi)
Yapay zeka sızıntılarını (meta-leak) YALNIZCA "kendini tanımlama" kalıplarıyla
yakalayan, metin yapısını (paragraf/markdown) KORUYAN güvenlik katmanı.

v2 değişiklikleri (denetim raporu §3.2):
  1. `clean()` artık satır satır çalışır; paragraf boşlukları, maddeler ve
     başlıkları bozmaz. Girdide sızıntı yoksa metin BİTENBİRE aynısı döner.
  2. Kırık metin üreten `sub()` fallback'i kaldırıldı; tam elenen metin için
     "[…karakter dışı ifade elendi…]" damgası verilir.
  3. "chatgpt / openai / sistem istemi / prompt" gibi KONUSAL kelime eşleşmeleri
     artık cümle silmez; yalnızca `validate()` raporu bilgi uyarısı (warning)
     olarak listeler. Masada AI tartışılırken meşru cümleler sansürlenmez.
  4. `validate()` çıktıları iki kademeli: violations (engelleyici) + warnings
     (bilgilendirici). `build_revision_instruction` yeniden üretim döngüsü
     için (Faz 2 entegrasyonu) mevcut.
"""

import re
from typing import Dict, List

# ── KENDİNİ TANIMLAMA kalıpları (engelleyici — bu cümle karakteri itiraf eder) ──
SELF_LEAK_PATTERNS = [
    # Türkçe
    r"\bbir yapay zek[aâ]\s*(?:olarak|modeli|programı|asistanı|olduğum)",
    r"\bgeniş\s+(?:kapsamlı\s+)?dil modeli\b",
    r"\bbir dil modeli\s*(?:olarak|olduğum için|olduğum)",
    r"\bben\s+bir\s+(?:ai|yapay zeka|dil modeli|asistan|bot|sanal asistan|chatbot)\b",
    r"\bbir (?:asistan|chatbot|sanal asistan)\s*(?:olarak|olduğum için)\b",
    r"\btarafsız\s+(?:bir\s+)?(?:yapay zeka|model|asistan|dil modeli)\b",
    r"\bprogramlandığım\s+(?:üzere|şekilde|gibi)",
    r"\byapılandırılmam\s+(?:üzere|şekilde|gibi)",
    r"\bbir insan\s+olmadığım\s+için",
    r"\bduygularım\s+(?:yoktur|olmadığı\s+için|yok\s+olduğu)",
    r"\bfiziksel\s+bir\s+bedenim\s+yok",
    r"\b(?:benim|bana)\s+verilen\s+(?:talimatlar|istem|istemim|prompt)\b",
    r"\bsistem istemi(?:m|me|mi|mu)\b",
    r"\byardımcı\s+olmaktan\s+memnuniyet",
    r"\bsizinle\s+güzel\s+bir\s+sohbet\s+ediyoruz",
    r"\bsize\s+nasıl\s+yardımcı\s+olabilirim",
    r"\bsize\s+yardımcı\s+olmak\s+için\s+buradayım",
    r"\bbir\s+yapay\s+zeka\s+olduğum\s+için",
    r"\bkuantum\s+superpozisyon\s+halindeyim",  # ironik kaçış kalıbı
    # İngilizce
    r"\bas\s+an?\s*ai\b",
    r"\bi\s+(?:am|'m)\s+(?:an?\s+)?(?:ai|language model)\b",
    r"\blarge\s+language\s+model\b",
    r"\bas\s+a\s+(?:language model|ai assistant)\b",
    r"\bi\s+was\s+(?:created|trained|developed)\s+by\b",
    r"\byour\s+trust\s+and\s+safety\b",
]

# ── KONUSAL kalıplar (BİLGİ UYARISI — silinmez, yalnız raporlanır) ──
TOPIC_PATTERNS = [
    r"\bchatgpt\b", r"\bopenai\b", r"\banthropic\b", r"\bdeepseek\b",
    r"\bclaude\b", r"\bgemini\b", r"\bllama\b", r"\bmistral\b",
    r"\bsistem istemi\b", r"\bprompt\b", r"\bmakine öğrenmesi\b",
    r"operatör\s+(?:paneli|müdahalesi|mesajı)",
]

_SELF_REGEX = re.compile("|".join(self for self in SELF_LEAK_PATTERNS), re.IGNORECASE)
_TOPIC_REGEX = re.compile("|".join(TOPIC_PATTERNS), re.IGNORECASE)

_PLACEHOLDER = "[…karakter dışı ifade elendi…]"


class PersonaGuard:
    """Karakter yanıtlarını denetleyen ve temizleyen bekçi sınıfı (v2)."""

    @staticmethod
    def validate(text: str) -> Dict:
        """Metindeki karakter dışı ifadeleri iki kademede raporlar.

        Dönüş:
          pass        → engelleyici (kendini-tanımlama) sızıntı yoksa True
          violations  → engelleyici ihlaller (yeniden üretim gerek)
          warnings    → bilgilendirici konusal eşleşmeler (müdahale YOK)
        """
        if not text or not text.strip():
            return {"pass": False, "violations": ["Boş metin üretildi"], "warnings": []}

        violations: List[str] = []
        for m in {x.group(0) for x in _SELF_REGEX.finditer(text)}:
            violations.append(f"Kendini-tanımlama sızıntısı yakalandı: '{m}'")

        warnings: List[str] = []
        for m in {x.group(0) for x in _TOPIC_REGEX.finditer(text)}:
            warnings.append(f"Konusal ifade (müdahale edilmedi): '{m}'")

        # Aşırı diplomatik arabulucu kalıpları — karakter tavizsizliğini bozar
        low = text.lower()
        if "iki tarafın da haklı olduğu noktalar var" in low or "orta yolu bulmak gerekirse" in low:
            violations.append("Karakter tavizsizliğini bozan sahte arabulucu kalıp yakalandı.")

        return {"pass": len(violations) == 0, "violations": violations, "warnings": warnings}

    @staticmethod
    def clean(text: str) -> str:
        """Metindeki kendini-tanımlama sızıntılarını YAPIYI KORUYARAK eler.

        Kurallar:
          • Sızıntı yoksa metin biten bire aynısı döner.
          • Satır yapısı (paragraf, madde, başlık) korunur.
          • Bir satır içinde yalnızca kendini-tanımlayan CÜMLE elenir.
          • Satırının tamamı elenen blok, damgasız atılır; tüm metin elenirse
            [placeholder] damgası verilir — asla kırık cümle üretilmez.
        """
        if not text:
            return ""
        # Hızlı yol: sızıntı yoksa dokunma
        if not _SELF_REGEX.search(text):
            return text

        out_lines: List[str] = []
        for line in text.split("\n"):
            if not _SELF_REGEX.search(line):
                out_lines.append(line)
                continue
            # Satır içinde cümle bazında eleme (satır yapısı korunur)
            sentences = re.split(r"(?<=[.!?…])\s+", line)
            kept = [s for s in sentences if not _SELF_REGEX.search(s)]
            if kept:
                out_lines.append(" ".join(kept).strip())
            # kept boş → satır tamamen elendi

        cleaned = "\n".join(out_lines)
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()

        if not cleaned:
            return _PLACEHOLDER
        return cleaned

    @staticmethod
    def build_revision_instruction(violations: List[str], current_text: str = "") -> str:
        """Karakter kırılması olduğunda modele sert yeniden deneme emri oluşturur."""
        v_text = "; ".join(violations) if violations else "karakter dışı ifade"
        return (
            f"DİKKAT: Ürettiğin yanıt karakter bütünlüğünü bozuyor ve yapay zeka sızıntısı içeriyor!\n"
            f"Tespit edilen hatalar: {v_text}\n"
            "Kural: Kesinlikle model olduğunu itiraf etme, 'bir yapay zeka olarak' gibi laflar etme, "
            "'size yardımcı olmak için buradayım' kalıbına sığınma. "
            "Sadece ve sadece kanlı canlı bir insan gibi, kendi inancın ve üslubunla yeniden konuş. "
            "Konu yapay zeka olsa bile O'NUN KENDİNİ TANITMASI YASAKTIR."
        )
