/* v2.7 ana sayfa deneyimi testi — jsdom:
   - demo sahnesi: örnek akış oynar, DEMO/YZ/İNSAN etiketleri, arşive/servise 0 çağrı
   - 3 adım ilk kullanım rayı
   - canlı akış: Moderatör → katılımcılar → Nörodinamik Ajan → Moderatör → Karar Hakemi
   - GİZLİLİK: arşiv varsayılan KAPALI → 0 sunucu yazması; açılınca owner_token +
     X-Owner-Token başlığıyla yazılır
   - ÖZEL KATILIMCI: G/H koltuğu kurulur, akışa katılır, kartı görünür
   - başlıkta API butonu yok; yazım hataları yok; yasal uyarı metni ekranda
   Çalıştırma: cd tests && node dom/test_home_experience.js */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require(path.join(__dirname, "..", "node_modules", "jsdom"));

const REPO = path.join(__dirname, "..", "..");
const html = fs.readFileSync(path.join(REPO, "static", "index.html"), "utf-8");
let pass = 0, fail = 0;
function assert(cond, label) {
  if (cond) { pass++; console.log("  ✅ " + label); }
  else { fail++; console.log("  ❌ " + label); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

const posts = [];
function makeSSE(chunks) {
  const enc = new TextEncoder();
  return new ReadableStream({ start(c) { for (const x of chunks) c.enqueue(enc.encode(x)); c.close(); } });
}

function makeDom() {
  return new JSDOM(html, {
    url: "http://localhost:8888/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    beforeParse(w) {
      w.YM_DEMO_FAST = 1;
      w.tailwind = { config: {} };
      w.Element.prototype.scrollIntoView = function () {};
      if (!w.crypto.subtle) Object.defineProperty(w, "crypto", { value: require("crypto").webcrypto });
      w.TextDecoder = TextDecoder; w.TextEncoder = TextEncoder;
      w.fetch = async (u, opts = {}) => {
        const s = String(u);
        const json = (obj, st = 200) => ({ ok: st < 400, status: st, json: async () => obj, text: async () => JSON.stringify(obj) });
        try {
          posts.push({ url: s, body: opts.body ? JSON.parse(opts.body) : undefined, headers: opts.headers || {} });
        } catch (_) { posts.push({ url: s, headers: opts.headers || {} }); }
        if (s.includes("/api/characters")) return json({ ok: true, characters: [] });
        if (s.includes("/api/providers")) return json({ ok: true, providers: [{ id: "groq", name: "Groq", free: true, badge: "Ücretsiz", note: "test", base_url: "https://x", key_url: "https://x", models: [], default_model: "m", server_ready: false, multi_model: false }], server_pool_count: 0, seat_status: {} });
        if (s.includes("/api/neuro/state")) {
          // Oturum kimliği session/start yerine son akış çağrısından (arşiv kapalıyken start yok)
          const st = [...posts].reverse().find(p => p.url.includes("/api/chat/stream"));
          const sid = st && st.body ? st.body.cognitive_session_id : "none";
          return json({ ok: true, seats: { [`${sid}:norodinamik_ajan`]: { energy: 0.72, fatigue: 0.31, epistemic_uncertainty: 0.44, stance_label: "Derin Sorgulama", step_count: 3 } } });
        }
        if (s.includes("/api/chat/stream")) {
          const body = opts.body ? JSON.parse(opts.body) : {};
          const who = body.cognitive_character_id || body.seat;
          // SIRA KURALI satırındaki önceki konuşmacıyı yankıla → yanıt işareti test edilebilir
          const m = JSON.stringify(body.messages || []).match(/konuşan (.+?) \(/);
          const replyTo = m ? ` ${m[1]} iddiasına doğrudan yanıt veriyorum;` : "";
          let reply = `MOCK ${who}: Öncesindekini dikkate alıyorum.${replyTo} İddia kanıt durumuyla ele alınıyor.`;
          if (who === "karar_hakemi") {
            reply = "## ÖNE ÇIKAN ARGÜMANLAR\n- mock madde bir\n- mock madde iki\n## UZLAŞILAN NOKTALAR\n- mock uzlaşı\n## GÖRÜŞ AYRILIKLARI\n- mock ayrılık\n## DOĞRULANMAMIŞ İDDİALAR\n- mock doğrulanamaz\n## RİSKLER\n- mock risk\n## EKSİK BİLGİLER\n- mock eksik\n## OLASI KARAR YOLLARI\n- mock seçenek A";
          }
          return { ok: true, status: 200, body: makeSSE([`data: ${JSON.stringify({ delta: reply })}\n`, "data: [DONE]\n"]) };
        }
        if (s.includes("/api/character/architect")) {
          return json({ ok: true, character: { id: "arch_test", name: "Usta Çırak", title: "Pratik Zeka", system_prompt: "Sen sahada öğrenmiş bir usta çırağısın; her tezde 'pratikte nasıl uygulanır?' diye sorarsın." } });
        }
        if (s.includes("/api/chat")) return json({ ok: true, content: "MOCK quick", provider_label: "Mock" });
        return json({ ok: true });
      };
    }
  });
}

async function runDebate(d, w, question) {
  posts.length = 0;
  d.getElementById("questionInput").value = question;
  d.getElementById("questionForm").dispatchEvent(new w.Event("submit", { cancelable: true, bubbles: true }));
  await sleep(1600);
}

(async () => {
  console.log("== v2.7 Ana Sayfa Deneyimi ==");
  const dom = makeDom();
  const w = dom.window, d = w.document;

  // ── 1) DEMO SAHNESİ ──
  await sleep(400);
  const demoCalls = posts.filter(p => p.url.includes("/api/chat") || p.url.includes("/api/session"));
  assert(d.querySelectorAll("#demoTranscript .demo-turn").length === 8, "1 demo: 8 örnek söz oynar");
  assert(d.querySelectorAll("#demoSeatRail .rail-item").length === 6, "2 demo: 6 katılımcı rayda");
  assert(!d.getElementById("landingStage").classList.contains("hidden"), "3 demo: sahne görünür");
  assert(d.getElementById("landingStage").textContent.includes("önceden yazılmış bir demo"), "4 demo: dürüstlük notu ekranda");
  assert(d.querySelectorAll("#demoTranscript .chip-demo").length === 8, "5 demo: her sözde DEMO rozeti");
  assert(d.querySelectorAll("#demoTranscript .chip-yz").length >= 7, "6 demo: YZ karakter etiketleri var");
  assert(d.querySelectorAll("#demoTranscript .chip-human").length === 1, "7 demo: insan koltuğu İNSAN etiketli");
  assert(demoCalls.length === 0, "8 demo: servise/arşive 0 çağrı (sahte canlı akış yok)");
  assert(!d.getElementById("demoOutcome").classList.contains("hidden"), "9 demo: çıktı paneli açılır");
  assert(d.querySelectorAll("#demoOutcomeBody .outcome-sec").length >= 5, "10 demo: çıktı gerekçeli bölümlere ayrılmış");
  const railNames = [...d.querySelectorAll("#demoSeatRail .rail-name")].map(e => e.textContent);
  assert(new Set(railNames).size === 6, "11 demo: katılımcı isimleri benzersiz");
  const demoBodies = [...d.querySelectorAll("#demoTranscript .turn-body")].map(e => e.textContent);
  assert(demoBodies.some(t => t.includes("doğrulayamıyorum")), "12 demo: ajan doğrulayamadığını açıkça söyler");
  assert(demoBodies.some(t => t.includes("geri çekiyorum")), "13 demo: ajan fikrini gerekçeyle değiştirir");
  assert(d.querySelectorAll("#demoTranscript .reply-mark").length >= 4, "14 demo: sözler birbirine yanıt bağlantılarıyla bağlı");

  // ── 2) 3 ADIM RAYI ──
  const steps = d.querySelectorAll("#firstRunSteps .step-card");
  assert(steps.length === 3, "15 üç adım rayı: 3 kart");
  const stepText = d.getElementById("firstRunSteps").textContent;
  assert(stepText.includes("Konunu belirle") && stepText.includes("Masanı kur") && stepText.includes("Tartıştır"), "16 üç adım: konu → masa → tartıştır");

  // ── 3) YARDIMCI: yanıt işareti mantığı ──
  assert(w.detectReplyTarget("Moderatörün sorusuna katılıyorum ama bir ekleme var", { speaker: "Moderatör" }) === "Moderatör", "17 yanıt işareti: önceki konuşmacı anılırsa");
  assert(w.detectReplyTarget("tamamen alakasız bir cümle", { speaker: "Moderatör" }) === null, "18 yanıt işareti: anılmazsa işaret yok (uydurma ok yok)");

  // ── 4) CANLI AKIŞ (arşiv varsayılan KAPALI) ──
  assert(d.getElementById("optArchive") && !d.getElementById("optArchive").checked, "19 gizlilik: arşiv onay kutusu varsayılan kapalı");
  assert((d.getElementById("archiveHint").textContent || "").length > 20, "20 gizlilik: arşiv ipucu metni görünür");

  await runDebate(d, w, "İş değişikliği yapmalı mıyım?");

  assert(d.getElementById("landingStage").classList.contains("hidden"), "21 canlı: sahne gizlenir, tartışma alanı açılır");
  const streamCalls = posts.filter(p => p.url.includes("/api/chat/stream")).map(p => p.body.cognitive_character_id || p.body.seat);
  const expected = ["moderator", "hesap_uzmani", "risk_kriz", "firsat_stratejist", "sokak_gercekcisi", "norodinamik_ajan", "moderator", "karar_hakemi"];
  assert(JSON.stringify(streamCalls) === JSON.stringify(expected), "22 canlı sıra: Moderatör → 4 uzman → Ajan → Moderatör → Hakem");
  const offPosts = posts.filter(p => p.url.includes("/api/session/start") || p.url.includes("/api/session/record_message") || p.url.includes("/api/session/conclude") || p.url.includes("/api/envelope/seal"));
  assert(offPosts.length === 0, "23 gizlilik: arşiv kapalıyken sunucuya 0 yazma (start/record/conclude/seal yok)");
  const cards = d.querySelectorAll("#messagesContainer article");
  assert(cards.length === 7, "24 canlı: 7 konuşma kartı");
  const replyMarks = [...d.querySelectorAll(".reply-el")].map(e => e.textContent).filter(t => t.length);
  assert(replyMarks.length >= 4, "25 canlı: yanıt işaretleri gerçekten önceki söze bağlanıyor");
  const neuroChips = [...d.querySelectorAll(".neuro-chip")].map(e => e.textContent).filter(t => t.length);
  assert(neuroChips.length === 1 && neuroChips[0].includes("Enerji %72") && neuroChips[0].includes("Derin Sorgulama"), "26 canlı: nörodinamik çip sunucudaki gerçek veriyle doldu");
  assert(!d.getElementById("outcomeSections").classList.contains("hidden"), "27 canlı: çıktı bölümleri görünür");
  assert(d.querySelectorAll("#outcomeSections .outcome-sec").length === 7, "28 canlı: 7 gerekçeli bölüm ayrıştırıldı");
  assert(d.getElementById("debateStatusPill").textContent.includes("Karar özeti hazır"), "29 canlı: durum çipi hazır diyor");
  assert(d.getElementById("messagesContainer").textContent.includes("YZ KARAKTER"), "30 canlı: kartlarda YZ etiketi");

  // ── 5) AYARLAR: API butonu başlıkta YOK, sağlayıcı modalı ayarlardan açılır ──
  assert(!d.getElementById("openProvidersBtn"), "31 başlık: korkutucu API butonu başlıktan kaldırıldı");
  d.getElementById("openProvidersInlineBtn").click();
  await sleep(50);
  const modalText = d.getElementById("providersModal").textContent;
  assert(modalText.includes("Moderatör (Operatör)") && modalText.includes("Nörodinamik Ajan"), "32 sağlayıcılar: E/F koltukları yapılandırılabilir");
  assert(modalText.includes("Özel Katılımcı G"), "33 sağlayıcılar: G/H özel koltuk satırları var");
  d.getElementById("closeProvidersBtn").click();

  // ── 6) YAZIM HATALARI + YASAL UYARI ──
  const bodyText = d.body.textContent;
  assert(!bodyText.includes("ilk6"), "34 yazım: 'ilk6' hatası yok");
  assert(!bodyText.includes("Çeleştirel"), "35 yazım: 'Çeleştirel' hatası yok");
  assert(bodyText.includes("yatırım, hukuk veya psikoloji tavsiyesi değildir"), "36 yasal: tavsiye değildir uyarısı sayfada");
  assert(bodyText.includes("yalnızca bu tarayıcıda kalır") || bodyText.includes("sunucuya yazılmaz"), "37 gizlilik: dürüst arşiv notu sayfada");

  // ── 7) ÖZEL KATILIMCI KUR (G koltuğu) ──
  d.getElementById("addCustomSeatBtn").click();
  await sleep(30);
  assert(!d.getElementById("customSeatModal").classList.contains("hidden"), "38 özel koltuk: kurulum modalı açılır");
  // YZ ile doldur: mimar alanları doldurur (persist işaretsiz → yalnızca tarayıcı)
  assert(!d.getElementById("csPersist").checked, "38b özel koltuk: kütüphane kaydı varsayılan işaretsiz");
  d.getElementById("csArchitectBtn").click();
  await sleep(120);
  assert(d.getElementById("csName").value === "Usta Çırak", "38c özel koltuk: YZ mimarı adı alanına yazar");
  d.getElementById("csName").value = "Usta Çırak";
  d.getElementById("csRole").value = "Pratik Zeka";
  d.getElementById("csBrief").value = "Sahadaki uygulama sorusunu sorar; her tezde pratik karşılığını ister.";
  d.getElementById("customSeatForm").dispatchEvent(new w.Event("submit", { cancelable: true, bubbles: true }));
  await sleep(50);
  const gridText = d.getElementById("seatCardsGrid").textContent;
  assert(gridText.includes("Usta Çırak") && gridText.includes("SENİN"), "39 özel koltuk: kart masada görünür (SENİN rozeti)");
  assert(d.getElementById("customSeatModal").classList.contains("hidden"), "40 özel koltuk: eklemeden sonra modal kapanır");

  // ── 8) ARŞİV AÇ → owner_token ile yazma + özel koltuk akışta ──
  const optArchive = d.getElementById("optArchive");
  optArchive.checked = true;
  optArchive.dispatchEvent(new w.Event("change"));
  await sleep(30);

  await runDebate(d, w, "Kendi işimi kurmalı mıyım?");

  const startPosts = posts.filter(p => p.url.includes("/api/session/start"));
  assert(startPosts.length === 1, "41 arşiv açık: oturum sunucuda başlar");
  assert(startPosts[0].body && typeof startPosts[0].body.owner_token === "string" && startPosts[0].body.owner_token.length > 10, "42 arşiv açık: sahiplik anahtarı (owner_token) gönderilir");
  const recordPosts = posts.filter(p => p.url.includes("/api/session/record_message"));
  // arşiv açıkken ikinci tartışma: moderatör (2) + 5 tur katılımcısı (A–D, G, Ajan) = 8 kayıt
  assert(recordPosts.length === 8, `43 arşiv açık: 8 söz arşive yazılır (bulunan: ${recordPosts.length})`);
  assert(recordPosts.every(p => p.headers && p.headers["X-Owner-Token"]), "44 arşiv açık: her yazma sahiplik başlığı taşır");
  const concludePosts = posts.filter(p => p.url.includes("/api/session/conclude"));
  assert(concludePosts.length === 1 && concludePosts[0].headers["X-Owner-Token"], "45 arşiv açık: sonuç da sahiplik başlığıyla yazılır");

  const stream2 = posts.filter(p => p.url.includes("/api/chat/stream")).map(p => p.body.cognitive_character_id || p.body.seat);
  const expected2 = ["moderator", "hesap_uzmani", "risk_kriz", "firsat_stratejist", "sokak_gercekcisi", "custom_g_", "norodinamik_ajan", "moderator", "karar_hakemi"];
  const seqOk = stream2.length === expected2.length && expected2.every((e, i) => e === "custom_g_" ? String(stream2[i]).startsWith("custom_g_") : stream2[i] === e);
  assert(seqOk, "46 özel koltuk: akışa sırayla katılır (A–D → G → Ajan → Moderatör → Hakem)");

  // ── 9) GEÇMİŞ SEKMESİ DÜRÜST KOPYA ──
  d.querySelector('.nav-tab[data-tab="history"]').click();
  await sleep(50);
  const histText = d.getElementById("view-history").textContent;
  assert(histText.includes("yalnızca bu tarayıcıda saklanır"), "47 geçmiş: sekme başlığı arşiv gerçeğini söylüyor");

  // ── Faz 1 düzeltmeleri (canlı kalite denetimi bulguları) ──
  const judgePost = [...posts].reverse().find(p => p.url.includes("/api/chat/stream") && p.body && p.body.cognitive_character_id === "karar_hakemi");
  assert(judgePost && judgePost.body.max_tokens === 2048, "48 Faz1: hakem token sınırı 2048 (yarım cümle kesilmesi giderildi)");
  const expertPrompt = w.getExpertSystemPrompt({ id: "test_koltuk", name: "Test", role: "Rol" });
  assert(expertPrompt.includes("KANIT KURALI (Faz 1)") && expertPrompt.includes("DİL KURALI (Faz 1)"), "49 Faz1: tüm koltuklara kanıt + sade dil kuralı ekli");

  // ── Faz 2 — Soru derinliği (bağlam seçicileri + tek netleştirme) ──
  const qInp = d.getElementById("questionInput");
  const f2box = d.getElementById("questionContextBox");

  qInp.value = "3 milyon TL birikimim var, faizler yükselirken ev mi almalıyım?";
  qInp.dispatchEvent(new w.Event("input", { bubbles: true }));
  assert(!f2box.classList.contains("hidden"), "F2-1 bağlam: finans sorusunda seçiciler görünür");
  assert([...d.querySelectorAll("#contextChips .ctx-chip")].some(c => c.getAttribute("data-ctx") === "risk"), "F2-2 risk seçicisi var");
  assert(d.getElementById("clarifyBox").classList.contains("hidden"), "F2-3 uzun sorda netleştirme sorusu gizli");

  const pickChip = (key, val) => [...d.querySelectorAll("#contextChips .ctx-chip")].find(c => c.getAttribute("data-ctx") === key && (val == null || c.getAttribute("data-val") === val));
  pickChip("risk", "Kaybı neredeyse hiç göze alamam").click();
  const ctxTxt = w.buildQuestionContext();
  assert(ctxTxt.includes("KULLANICI BAĞLAMI") && ctxTxt.includes("Kaybı neredeyse hiç göze alamam"), "F2-4 seçim bağlam bloğuna giriyor");
  pickChip("risk", "Kaybı neredeyse hiç göze alamam").click();
  assert(w.buildQuestionContext() === "", "F2-5 seçim kaldırılınca bağlam boş");

  qInp.value = "Acelem var, hemen karar versem";
  qInp.dispatchEvent(new w.Event("input", { bubbles: true }));
  assert(!d.getElementById("clarifyBox").classList.contains("hidden"), "F2-6 kısa soruda tek netleştirme görünür");
  d.querySelector("#clarifyChips [data-clarify]").click();
  assert(d.getElementById("clarifyBox").classList.contains("hidden"), "F2-7 cevaptan sonra netleştirme kaybolur");
  assert([...d.querySelectorAll("#contextChips .ctx-chip.ctx-on")].some(c => c.getAttribute("data-ctx") === "time"), "F2-8 cevap zaman seçicisine işlendi");
  const timeOn = pickChip("time", null);
  if (timeOn) timeOn.click();
  qInp.value = "";
  qInp.dispatchEvent(new w.Event("input", { bubbles: true }));
  assert(f2box.classList.contains("hidden"), "F2-9 soru temizlenince kutu gizlenir");

  // F2-10/11: seçili bağlamla gerçek tartışma → prompta giriyor mu?
  qInp.value = "İş değişikliği yapmalı mıyım, acele karar vermeliyim?";
  qInp.dispatchEvent(new w.Event("input", { bubbles: true }));
  const tChip = pickChip("time", null);
  assert(!!tChip, "F2-10 zaman seçicisi görünür");
  tChip.click();
  posts.length = 0;
  d.getElementById("questionForm").dispatchEvent(new w.Event("submit", { cancelable: true, bubbles: true }));
  await sleep(1600);
  const ctxInPrompt = posts.some(p => p.url.includes("/api/chat/stream") && JSON.stringify(p.body.messages || []).includes("KULLANICI BAĞLAMI"));
  assert(ctxInPrompt, "F2-11 bağlam gerçekten model promptuna girdi");
  const tOn = pickChip("time", null);
  if (tOn) tOn.click();
  qInp.value = "";
  qInp.dispatchEvent(new w.Event("input", { bubbles: true }));

  console.log(`\nSONUÇ: ${pass} YEŞİL / ${fail} KIRMIZI`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("TEST ÇÖKTÜ:", e); process.exit(1); });
