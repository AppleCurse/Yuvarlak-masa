# -*- coding: utf-8 -*-
"""
KONSÜL 2.0 — Persona Guard (Karakter Bekçisi)
Yapay zeka sızıntılarını (meta-leaks), robotik kalıpları ve rol dışı ifadeleri
fiziksel olarak yakalayan, temizleyen ve engelleyen güvenlik katmanı.
"""

import re
from typing import Dict, List, Tuple

# Meta-leak ve karakter dışı ifade kalıpları (Türkçe & İngilizce)
META_PATTERNS = [
    r"bir yapay zek[aâ]\s*(?:olarak|modeli|programı)?",
    r"(?:geniş\s*)?dil modeli\s*(?:olarak|olduğum için)?",
    r"ben bir (?:ai|yapay zeka|dil modeli|asistan|bot)",
    r"as an ai(?:\s+language model)?",
    r"size nasıl yardımcı olabilirim",
    r"size yardımcı olmak için buradayım",
    r"tarafsız (?:bir )?(?:yapay zeka|model|asistan)",
    r"bana verilen (?:talimatlar|istem|prompt)",
    r"sistem (?:istemi|promp?t[uı]?)",
    r"operatör (?:paneli|müdahalesi|mesajı)",
    r"programlandığım (?:üzere|şekilde|gibi)",
    r"chatgpt|openai|anthropic|deepseek|claude",
    r"etik (?:ilkelerim|kurallarım) gereği",
    r"bir insan olmadığım için",
    r"duygularım (?:yoktur|olmadığı için)",
    r"fiziksel bir bedenim yok",
]

_META_REGEX = re.compile("|".join(META_PATTERNS), re.IGNORECASE)

class PersonaGuard:
    """Karakter yanıtlarını denetleyen ve temizleyen bekçi sınıfı."""

    @staticmethod
    def validate(text: str) -> Dict[str, any]:
        """Metinde karakter dışı sızıntı olup olmadığını kontrol eder."""
        if not text or not text.strip():
            return {"pass": False, "violations": ["Boş metin üretildi"]}

        violations = []
        matches = _META_REGEX.findall(text)
        if matches:
            for m in set(matches):
                violations.append(f"Yapay zeka / meta kalıbı yakalandı: '{m}'")

        # Aşırı diplomatik arabulucu kalıpları denetle
        low = text.lower()
        if "iki tarafın da haklı olduğu noktalar var" in low or "orta yolu bulmak gerekirse" in low:
            violations.append("Karakter tavizsizliğini bozan sahte arabulucu kalıp yakalandı.")

        return {
            "pass": len(violations) == 0,
            "violations": violations
        }

    @staticmethod
    def clean(text: str) -> str:
        """Metindeki meta-leak ifadelerini temizler, yaşayan insan üslubuna kavuşturur."""
        if not text:
            return ""

        cleaned = text

        # Cümle bazında meta-leak temizliği
        sentences = re.split(r"(?<=[.!?])\s+", cleaned)
        clean_sentences = []

        for s in sentences:
            if _META_REGEX.search(s):
                # Bu cümle yapay zekalık itirafı içeriyor; cümleyi ayıkla
                continue
            clean_sentences.append(s)

        cleaned_text = " ".join(clean_sentences).strip()

        # Eğer tüm cümleler elendiyse, doğrudan kalıbı temizle
        if not cleaned_text and text:
            cleaned_text = _META_REGEX.sub("", text).strip()

        # Ekstra gereksiz boşlukları toparla
        cleaned_text = re.sub(r"\s{2,}", " ", cleaned_text)
        return cleaned_text

    @staticmethod
    def build_revision_instruction(violations: List[str], current_text: str) -> str:
        """Karakter kırılması olduğunda modele sert yeniden deneme emri oluşturur."""
        v_text = "; ".join(violations)
        return (
            f"DİKKAT: Ürettiğin yanıt karakter bütünlüğünü bozuyor ve yapay zeka sızıntısı içeriyor!\n"
            f"Tespit edilen hatalar: {v_text}\n"
            f"Kural: Kesinlikle model olduğunu itiraf etme, 'bir yapay zeka olarak' gibi laflar etme. "
            f"Sadece ve sadece kanlı canlı bir insan gibi, kendi inancın ve üslubunla konuş."
        )
