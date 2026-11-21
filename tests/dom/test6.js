/* Faz 6 runtime test — jsdom:
   - councilModelContext (kayan pencere) + budgetForModel
   - buildSynthUserPrompt (K5→sentez bağlama)
   - K6 süre kısıtı (gerçek councilTurn + abort + sistem damgası)
   - S2: saveSeats soygunu, loadSeats legacy soygunu, migrateLegacyCreds, mSave kâsa POST'u
   - hakemCfg → K düzeltmesi
   Çalıştırma: cd tests && node dom/test6.js  (jsdom: npm install --prefix tests) */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require(path.join(__dirname, "..", "node_modules", "jsdom"));

const REPO = path.join(__dirname, "..", "..");
const html = fs.readFileSync(path.join(REPO, "static", "index.html"), "utf-8");
let pass = 0, fail = 0;
function assert(cond, label){
  if(cond){ pass++; console.log("  ✅ " + label); }
  else { fail++; console.log("  ❌ " + label); }
}

const credentialPosts = [];
const dom = new JSDOM(html, {
  url: "http://localhost:8888/",
  runScripts: "dangerously",
  pretendToBeVisual: true,
  beforeParse(w){
    if(!w.crypto.subtle){
      const { webcrypto } = require("crypto");
      Object.defineProperty(w, "crypto", { value: webcrypto });
    }
    // v1.3: jsdom sürümlerinde TextDecoder/TextEncoder eksik olabilir (test artefaktı)
    if(!w.TextDecoder){
      const { TextDecoder, TextEncoder } = require("util");
      w.TextDecoder = TextDecoder; w.TextEncoder = TextEncoder;
    }
    w.fetch = async (url, opts) => {
      const u = String(url);
      const json = (obj, st = 200) => ({ ok: st < 400, status: st, json: async () => obj, text: async () => JSON.stringify(obj) });
      if (u.includes("/api/credentials") && opts && opts.method === "POST") {
        const body = JSON.parse(opts.body);
        credentialPosts.push(body);
        return json({ ok: true, seat: body.seat, key_hint: "…" + (body.api_key || "").slice(-4) });
      }
      if (u.includes("/api/credentials")) return json({ ok: true, credentials: {} });
      if (u.includes("/api/health")) return json({ ok: true, service: "KONSÜL AI", mode: "canlı", version: "1.2.0" });
      if (u.includes("/api/characters")) return json({ ok: true, characters: [] });
      if (u.includes("/api/chat/stream")) {
        const signal = opts && opts.signal;
        return {
          ok: true, status: 200,
          body: {
            getReader: () => ({
              read: () => new Promise((res, rej) => {
                if (signal) {
                  signal.addEventListener("abort", () => {
                    const e = new Error("aborted"); e.name = "AbortError"; rej(e);
                  });
                }
                setTimeout(() => res({ done: true }), 60000);
              })
            })
          }
        };
      }
      if (u.includes("/api/persona/clean")) return json({ ok: true, cleaned: (JSON.parse(opts.body||"{}")).text || "", report: {} });
      if (u.includes("/api/chat")) return json({ ok: true, content: "" });
      if (u.includes("/api/memory/")) return json({ ok: true, text: "", memories: [] });
      if (u.includes("/api/sessions")) return json({ ok: true, sessions: [] });
      if (u.includes("/api/reports")) return json({ ok: true, reports: [] });
      return json({ ok: true });
    };
    w.scrollTo = () => {};
    w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener(){}, removeListener(){} }));
  }
});
const w = dom.window;
const doc = w.document;
const T = (e) => w.eval(e);

setTimeout(async () => {
  console.log("== Faz 6 Runtime Test (Bağlam Bütçesi + K5 Sentez + K6 Süre + S2 Kasa) ==");
  try {
    // ── 1) councilModelContext: kısa tutanak eksiksiz ──
    T(`state.council.topic = "TEST KONUSU"; state.council.msgs = [];
       for(let i=1;i<=5;i++) state.council.msgs.push({ kind:"model", seat:"A", text:"söz "+i });`);
    let ctx = T("councilModelContext()");
    assert(ctx.includes("söz 1") && ctx.includes("söz 5"), "pencere: 5 kayıt ≤ 14 → hepsi gider");
    assert(!ctx.includes("bağlam penceresi dışında"), "pencere: kısa tutanağa kırpma notu YOK");

    // ── 2) councilModelContext: 20 kayıt → son 14 + not ──
    T(`state.council.msgs = [];
       for(let i=1;i<=20;i++) state.council.msgs.push({ kind:"model", seat:"A", text:"söz "+i });`);
    ctx = T("councilModelContext()");
    assert(ctx.includes("İlk 6 söz, bağlam penceresi dışında"), "pencere: 20 kayıt → 'İlk 6 söz' kırpma notu");
    assert(ctx.includes("söz 7") && ctx.includes("söz 20"), "pencere: son 14 kayıt (7..20) gider");
    assert(!ctx.includes("söz 1\n") && !/söz 6\n/.test(ctx), "pencere: ilk 6 kayıt gitmez");

    // ── 3) budgetForModel ──
    assert(T("budgetForModel('kısa', 16000)") === "kısa", "bütçe: kısa metin dokunulmaz");
    T("window._big = 'BAŞLANGIÇ ' + 'x'.repeat(20000) + ' SONKISIM'");
    const budgeted = T("budgetForModel(window._big, 16000)");
    assert(budgeted.includes("BAŞLANGIÇ") && budgeted.includes("SONKISIM"), "bütçe: baş ve kuyruk korunur");
    assert(budgeted.includes("bağlam bütçesi dışında"), "bütçe: orta kısım yerine marker var");
    assert(budgeted.length <= 16000, "bütçe: çıktı ≤ 16000 karakter (" + budgeted.length + ")");

    // ── 4) buildSynthUserPrompt: K5→sentez bağlama ──
    T(`state.synth.material = "MASA KAYITLARI…"; state.synth.source = "MASA 01 · KONSEY";
       state.council.claims = [
         { verdict: "DOĞRULANDI", speaker: "MODEL A", report: "KAYNAKLI RAPOR [1](https://x)" },
         { verdict: "KISMEN DOĞRULANDI", speaker: "MODEL B", report: "kısmi rapor" }
       ];`);
    let sp = T("buildSynthUserPrompt()");
    assert(sp.includes("KANIT DEFTERİ"), "sentez: İddia Defteri enjekte edilir");
    assert(sp.includes("1. [DOĞRULANDI] (MODEL A iddiası)") && sp.includes("2. [KISMEN DOĞRULANDI]"), "sentez: kayıtlar numaralandırılır");
    assert(sp.includes("SENTEZ KANITA BAĞLANIR") && sp.includes("kanıt boşluğu"), "sentez: bağlama kuralı + kanıt boşluğu uyarısı var");
    T("state.council.claims = [];");
    sp = T("buildSynthUserPrompt()");
    assert(!sp.includes("KANIT DEFTERİ"), "sentez: defter boşsa enjeksiyon YOK");

    // ── 5) S2: saveSeats anahtarı yazmaz ──
    T(`state.seats.A.apiKey = "sk-yerel-anahtar"; saveSeats();`);
    const persisted = JSON.parse(w.localStorage.getItem("konsul_seats_v4"));
    assert(!("apiKey" in persisted.A) || persisted.A.apiKey === "", "kasa: saveSeats apiKey'yi localStorage'a yazmaz");
    assert(!JSON.stringify(persisted).includes("sk-yerel-anahtar"), "kasa: ham anahtar localStorage JSON'unda YOK");
    T(`state.seats.A.apiKey = "";`);

    // ── 6) S2: loadSeats legacy anahtarı soyar + kâsaya taşıma kuyruğuna koyar ──
    const oldSeats = JSON.parse(w.localStorage.getItem("konsul_seats_v4"));
    oldSeats.B.apiKey = "sk-eski-legacy";
    w.localStorage.setItem("konsul_seats_v4", JSON.stringify(oldSeats));
    T("window._legacyCreds = {};");
    T("state.seats = loadSeats();");
    const legacy = T("window._legacyCreds");
    assert(legacy.B === "sk-eski-legacy", "kasa: eski localStorage anahtarı göç kuyruğuna alındı");
    assert(T("!(state.seats.B && state.seats.B.apiKey)"), "kasa: load sonrası state'te ham anahtar YOK");

    // ── 7) S2: migrateLegacyCreds → POST /api/credentials + keyHint ──
    T("state.backend = true;");
    await T("migrateLegacyCreds()");
    assert(credentialPosts.some(p => p.seat === "B" && p.api_key === "sk-eski-legacy"), "kasa: legacy anahtar sunucuya POST edildi");
    assert(String(T("state.seats.B.keyHint")).endsWith("gacy"), "kasa: keyHint oturuma işlendi (" + T("state.seats.B.keyHint") + ")");
    assert(T("Object.keys(window._legacyCreds).length") === 0, "kasa: göç sonrası kuyruk boş");
    const persisted2 = JSON.parse(w.localStorage.getItem("konsul_seats_v4"));
    assert(!JSON.stringify(persisted2).includes("sk-eski-legacy"), "kasa: göç sonrası localStorage'da ham anahtar YOK");

    // ── 8) S2: mSave akışı — yeni anahtar kâsaya, state'te iz kalmaz ──
    credentialPosts.length = 0;
    T("openSeatModal('C');");
    doc.getElementById("fKey").value = "sk-newkey-2026";
    await T(`new Promise(r => { $("#mSave").onclick().then(r); });`);
    const savePost = credentialPosts.find(p => p.seat === "C");
    assert(savePost && savePost.api_key === "sk-newkey-2026", "kasa: mSave yeni anahtarı POST etti");
    assert(savePost && savePost.base_url && savePost.model, "kasa: mSave üçlüyü (base_url+model) taşır");
    assert(T("state.seats.C.apiKey") === "", "kasa: mSave sonrası state'te apiKey boş");
    assert(String(T("state.seats.C.keyHint")).endsWith("2026"), "kasa: mSave sonrası keyHint güncel (" + T("state.seats.C.keyHint") + ")");
    const persisted3 = JSON.parse(w.localStorage.getItem("konsul_seats_v4"));
    assert(!JSON.stringify(persisted3).includes("sk-newkey-2026"), "kasa: mSave sonrası localStorage'da ham anahtar YOK");

    // ── 9) K6: süre kısıtı — 1 sn limiti, gerçek councilTurn + abort + sistem damgası ──
    T(`state.council.msgs = []; state.council.modelTurns = 0; state.council.topic = "SÜRE KISITI TESTI";
       state.council.sessionId = "ses_test6"; state.council.claims = [];
       state.council.speechLimit = 1;
       $("#autoChk").checked = false;`);
    T("councilTurn();");
    await new Promise(r => setTimeout(r, 2500));
    const lastMsg = T("state.council.msgs[state.council.msgs.length-1]");
    assert(lastMsg && lastMsg.timecut === true, "süre: 1 sn dolunca timecut=true");
    assert(lastMsg && lastMsg.stopped === true, "süre: mesaj stopped=true");
    assert(lastMsg && /süre kısıtında kesildi/i.test(lastMsg.text || ""), "süre: tutanağa sistem damgası düştü");
    assert(lastMsg && lastMsg.text.includes("1 sn"), "süre: damgada saniye değeri var");
    assert(T("state.council.speechTimer === null"), "süre: zamanlayıcı temizlendi");
    T("state.council.speechLimit = 0;");

    // ── 10) hakemCfg → K (Faz 4 bug düzeltmesi) ──
    T(`$("#hakemCfg").click();`);
    const mTitle = doc.getElementById("mTitle").textContent;
    assert(mTitle.includes("Sandalye K"), "bug: hakemCfg artık K sandalyesini açar (" + mTitle + ")");
    assert(!mTitle.includes("Sandalye H"), "bug: hakemCfg H'yi açmıyor");

    // ── 11) regresyon: applySeatCount ──
    T("applySeatCount(7, true);");
    assert(T("activeSeats().length") === 7, "regresyon: applySeatCount(7) → 7 koltuk");
    assert(T("jurySeats().length") === 5, "regresyon: jüri üst sınırı 5");
  } catch (e) {
    fail++;
    console.log("  ❌ TEST KRAÇ: " + e.message);
    console.log(e.stack.split("\n").slice(0, 5).join("\n"));
  }
  console.log("\nSONUÇ: " + (fail ? "HATA VAR ❌ (yeşil " + pass + " / kırmızı " + fail + ")" : "TÜMÜ YEŞİL ✅ (" + pass + "/" + pass + ")"));
  w.close();
  process.exit(fail ? 1 : 0);
}, 1500);
