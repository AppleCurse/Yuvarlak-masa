import type { Seat } from "./types";

/* DEMO MOD — model sunucusu yokken arayüzü canlı tutan simülasyon motoru */

interface DemoCtx {
  topic: string;
  prev: { name: string; excerpt: string } | null;
  turn: number;
}

const stratejist = (t: string, prev: DemoCtx["prev"]) =>
  (prev
    ? `> ${prev.name} — “${prev.excerpt}…” dedi. Teşhis doğru; ama öncelik sırası yeniden kurulmalı.\n\n`
    : "") +
  `Stratejik çerçeveyi üç katmanda kuruyorum — konu: **${t}**\n\n## 1 · Büyük Resim\nBu mesele tek hamlelik değil; asıl kaldıraç *zamanlama* ve *öncelik sırası*. Erken kazanım getirecek adımla temeli ayırmak şart.\n\n## 2 · Hamle Sırası\n1. **Keşif (1–2 gün):** Mevcut durumun envanteri, kısıtların netleşmesi.\n2. **Çekirdek hamle:** En yüksek etki / en düşük maliyet kesişimindeki adım.\n3. **Doğrulama:** Sonucu ölçecek tek ve net metrik tanımlanır.\n\n## 3 · Risk ve Kaldıraç\n- En büyük risk: kapsamın sessizce şişmesi.\n- Kaldıraç: ilk 48 saatte küçük ama görünür bir çıktı.\n\n> Özet: Önce daralt, sonra derinleştir. Geniş başlamak bu konunun doğal düşmanı.`;

const teknikci = (t: string, prev: DemoCtx["prev"]) =>
  (prev
    ? `${prev.name} noktasına teknik şerhim var — “${prev.excerpt}…” kulağa iyi geliyor, uygulanabilirlik başka mesele.\n\n`
    : "") +
  `İşi çalışan parçalara bölüyorum. Laf değil, adım:\n\n## Uygulama Planı\n1. **İskelet:** Minimal çalışan hat kurulur — süs yok, boru döşenir.\n2. **Veri akışı:** Girdi → işleme → çıktı zinciri tek noktadan izlenir.\n3. **Gözlem:** Her adımda kayıt; hata sessizce yutulmaz.\n\n\`\`\`python\n# Örnek iskelet — konu: ${t}\ndef karar_hatti(girdi):\n    ara = normalize(girdi)        # 1. temizle\n    sonuc = cekirdek_islem(ara)   # 2. asıl iş\n    if not dogrula(sonuc):\n        raise Hata('Doğrulama başarısız')\n    return sonuc                  # 3. sessiz hata yok\n\`\`\`\n\n## Teknik Açıklar\n- Strateji katmanındaki “hızlı çıktı” **test edilmeden** hızlı değil, kırılgandır.\n- Ölçek hesabı yapılmadan verilen söz teknik borç olarak geri döner.\n\nÖnce çalışan iskelet, sonra optimizasyon. Kod konuşur.`;

const elestirmen = (prev: DemoCtx["prev"]) =>
  (prev ? `Özellikle “${prev.excerpt}…” — tam da burası sorgulanmalı.\n\n` : "") +
  `Masadaki sözleri okudum; şimdi acı kısım.\n\n## Zayıf Noktalar\n- **Kanıt boşluğu:** “En yüksek etki” denildi ama etkiyi ölçecek metrik yok. Ölçülmeyen iddia temennidir.\n- **Gizli varsayım:** Kaynağın sınırsız olduğu varsayılıyor. Ya değilse?\n- **Tek nokta hatası:** Plan tek doğru karara yaslanıyor; B planı yok.\n\n## Cevaplanmadan İlerlenmemeli\n1. Başarısızlık kriteri ne — neyi görürsek vazgeçeriz?\n2. En kötü senaryonun maliyeti ne?\n3. Bu çözüm 6 ay sonra hâlâ geçerli mi?\n\n## Hüküm\nFikir sağlam, *gerekçe zinciri zayıf*. Çerçeve, iskeletle **test edilmeden** karar verilmesin: önce küçük deney, sonra taahhüt.`;

const yanit = (seat: Seat, prev: DemoCtx["prev"]) => {
  const p = prev ? `“${prev.excerpt}…” itirazına yanıtım net: ` : "Son tur için pozisyonum net: ";
  const role = seat.role.toLocaleLowerCase("tr");
  if (role.includes("stratej"))
    return (
      p +
      `önceliği değişen koşula göre güncelliyorum. ${prev ? prev.name + " haklı olduğu noktayı aldım, kalanını budadım. " : ""}**Güncel hamle sırası:** 1) metriği kilitle, 2) dar kapsamla doğrula, 3) geçerse ölçekle. Konsey bu sıraya sadık kalırsa savrulmayız.`
    );
  if (role.includes("tekn"))
    return (
      p +
      `ölçmeden konuşmayı bırakalım. ${prev ? prev.name + " eleştirisindeki boşluk, tek bir doğrulama testiyle kapanır. " : ""}İskelet 48 saatte çıkar; maliyeti düşük, bilgi değeri yüksek. **Karar kapısı teste bağlansın**, tartışmaya değil.`
    );
  return (
    p +
    `hâlâ cevaplanmamış sorular masada. ${prev ? prev.name + " yakınlaşmayı abartıyor; " : ""}konsensüs hissi, kanıt yerine geçmez. Deney tasarımında **başarısızlık kriteri** yazılı değilse, ben bu karara şerh koyarım.`
  );
};

const HAKEM_RAPOR = `# Hakem Raporu

Tarafların kayıtları tarandı; çapraz doğrulama tamamlandı.

## KONSENSÜS — Ortaklaşılan Konular
- Sorun tek hamlede değil, **aşamalı** çözülür — üç sandalye de bunda hemfikir.
- Erken, küçük ve ölçülebilir çıktı ortak talep.
- Kapsam şişmesi ortak düşman olarak işaretlendi.

## ANLAŞMAZLIKLAR VE RİSKLER
- **Öncelik çatışması:** Stratejist zamanlamayı, Tekniker altyapıyı öncelemek istiyor.
- **Kanıt seviyesi:** Eleştirmen’in “metrik yok” itirazı hâlâ havada → kör uçuş riski.
- Hız ↔ teknik borç gerilimi çözülmeden büyük taahhüt risklidir.

## EYLEM PLANI VE NİHAİ KARAR
1. **48 saat:** Tek başarı metriği tanımla.
2. **1 hafta:** Minimal iskeleti kur, metrikle doğrula.
3. **Karar kapısı:** Doğrulama geçerse ölçekle; geçmezse kapsamı daralt.

**Nihai Karar:** Sentez “önce dar kapsamlı deney” diyor. Büyük vaat değil küçük kanıt üretin; kararı metrik yönetsin, sezgi değil.`;

export function demoTextFor(seat: Seat, lastUserContent: string): string {
  const role = seat.role.toLocaleLowerCase("tr");
  if (seat.key === "H" || role.includes("hakem")) return HAKEM_RAPOR;

  const topicM = lastUserContent.match(/(?:KONU|SORU):\s*(.+)/);
  const topic = topicM ? topicM[1].trim() : "masadaki gündem";

  let prev: DemoCtx["prev"] = null;
  const blocks = lastUserContent.match(/\[([^\]]+)\][^\n]*\n([^\n]+)/g);
  if (blocks && blocks.length) {
    const last = blocks[blocks.length - 1];
    const nm = last.match(/\[([^\]]+)\]/)?.[1] ?? "";
    if (!nm.includes("OPERATÖR")) {
      const body = last.replace(/\[[^\]]+\][^\n]*\n?/, "").trim();
      prev = { name: nm, excerpt: body.replace(/[*#>`_]/g, "").slice(0, 70) };
    }
  }
  const turn = (lastUserContent.match(/\[MODEL/g) || []).length;

  if (turn >= 3) return yanit(seat, prev);
  if (role.includes("stratej")) return stratejist(topic, prev);
  if (role.includes("tekn")) return teknikci(topic, prev);
  return elestirmen(prev);
}

/** Demo metni harf harf akar; AbortSignal ile kesilebilir. */
export function demoStream(
  seat: Seat,
  lastUserContent: string,
  signal: AbortSignal,
  onDelta: (t: string) => void,
  onDone: (stopped: boolean) => void,
): void {
  const full = demoTextFor(seat, lastUserContent);
  let i = 0;
  const timer = window.setInterval(() => {
    if (signal.aborted) {
      window.clearInterval(timer);
      onDone(true);
      return;
    }
    i += 2 + Math.floor(Math.random() * 4);
    if (i >= full.length) {
      window.clearInterval(timer);
      onDelta(full);
      onDone(false);
      return;
    }
    onDelta(full.slice(0, i));
  }, 24);
  signal.addEventListener("abort", () => {
    window.clearInterval(timer);
  });
}
