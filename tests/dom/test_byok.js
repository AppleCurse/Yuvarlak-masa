/* v1.4 BYOK + hız sınırı testi — jsdom:
   - sağlayıcı presetleri + anahtar sayfası bağlantıları
   - anahtarlı bağlantı testi, tüm sandalyelere kopyalama
   - rehberden hızlı anahtar kurulumu, 429 mesajı
   Çalıştırma: cd tests && node dom/test_byok.js */
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
const sleep = (ms)=>new Promise(r=>setTimeout(r, ms));

const credPosts = [];
const pingUrls = [];
let streamMode = "ok";
const dom = new JSDOM(html, {
  url: "http://localhost:8888/",
  runScripts: "dangerously",
  pretendToBeVisual: true,
  beforeParse(w){
    if(!w.crypto.subtle){
      const { webcrypto } = require("crypto");
      Object.defineProperty(w, "crypto", { value: webcrypto });
    }
    if(!w.TextDecoder){
      const { TextDecoder, TextEncoder } = require("util");
      w.TextDecoder = TextDecoder; w.TextEncoder = TextEncoder;
    }
    w.fetch = async (u, opts) => {
      const s = String(u);
      const json = (obj, st = 200) => ({ ok: st < 400, status: st, json: async () => obj, text: async () => JSON.stringify(obj) });
      if(s.includes("/api/health")) return json({ ok:true, version:"1.3.0", ai:"upstream",
        simulation_in_backend:false, auth:"none", key_storage:"plaintext-sqlite", exposed:false, rate_limit_per_min:60 });
      if(s.includes("/api/credentials") && opts && opts.method === "POST"){
        credPosts.push(JSON.parse(opts.body));
        return json({ ok:true, key_hint:"…test" });
      }
      if(s.includes("/api/credentials")) return json({ ok:true, credentials:{} });
      if(s.includes("/api/ping")){ pingUrls.push(s); return json({ ok:true, models:["m1","m2"] }); }
      if(s.includes("/api/characters")) return json({ ok:true, characters:[] });
      if(s.includes("/api/chat/stream")){
        if(streamMode === "429") return { ok:false, status:429, json: async ()=>({ ok:false, error:"Hız sınırı aşıldı — dakikada en fazla 60 model çağrısı. 12 sn sonra tekrar deneyin." }) };
        return { ok:true, status:200, body:{ getReader:()=>{
          let n = 0;
          return { read: async ()=>{
            n++;
            if(n === 1) return { done:false, value:new w.TextEncoder().encode("data: " + JSON.stringify({delta:"X"}) + "\n\n") };
            if(n === 2) return { done:false, value:new w.TextEncoder().encode("data: [DONE]\n\n") };
            return { done:true };
          }};
        }}};
      }
      if(s.includes("/api/chat")) return json({ ok:true, content:"X" });
      if(s.includes("/api/persona/clean")) return json({ ok:true, cleaned:"", report:{} });
      if(s.includes("/api/memory/")) return json({ ok:true, text:"" });
      if(s.includes("/api/sessions")) return json({ ok:true, sessions:[] });
      if(s.includes("/api/reports")) return json({ ok:true, reports:[] });
      return json({ ok:true });
    };
    w.scrollTo = ()=>{};
    w.matchMedia = w.matchMedia || (()=>({ matches:false, addListener(){}, removeListener(){} }));
  }
});

(async ()=>{
  console.log("== v1.4 Test (BYOK + Hız Sınırı) ==");
  const w = dom.window, doc = w.document, T = (e)=>w.eval(e);
  try{
    await sleep(1200);
    T(`closeWizard(true)`);

    // ── 1-2) preset verisi ──
    assert(T(`!!PRESETS.openrouter && PRESETS.openrouter.keys === "https://openrouter.ai/keys"`), "1 openrouter anahtar sayfası kayıtlı");
    assert(T(`!!PRESETS.gemini && !!PRESETS.groq.keys && PRESETS.pollinations.keys === ""`), "2 gemini/groq/pollinations kayıtları doğru");
    assert(doc.querySelectorAll("#fPreset option").length === 9, "3 preset listesinde 9 sağlayıcı");

    // ── 4-6) anahtar rehberi ──
    T(`openSeatModal("A")`);
    T(`document.getElementById("fPreset").value = "groq"; document.getElementById("fPreset").dispatchEvent(new Event("change"))`);
    const guide = doc.getElementById("keyGuide").innerHTML;
    assert(guide.includes("console.groq.com/keys") && guide.includes("ANAHTAR AL"), "4 groq rehberi anahtar bağlantısı gösterir");
    assert(doc.querySelector('#keyGuide a[target="_blank"]') !== null, "5 bağlantı yeni sekmede açılır");
    T(`document.getElementById("fPreset").value = "pollinations"; document.getElementById("fPreset").dispatchEvent(new Event("change"))`);
    assert(doc.getElementById("keyGuide").textContent.includes("gerekmez"), "6 anahtarsız uçta rehber dürüst söyler");

    // ── 7) anahtarlı test ──
    pingUrls.length = 0;
    T(`document.getElementById("fKey").value = "gsk-test-123"`);
    T(`document.getElementById("mTest").click()`);
    await sleep(300);
    assert(pingUrls.length === 1 && pingUrls[0].includes("key=gsk-test-123"), "7 test, kutudaki anahtarla yapılır");
    assert(doc.getElementById("mTestTxt").textContent.includes("ERİŞİLDİ"), "8 anahtarlı test başarısı gösterilir");

    // ── 9) tümüne uygula ──
    credPosts.length = 0;
    T(`document.getElementById("fKeyAll").checked = true`);
    T(`document.getElementById("mSave").click()`);
    await sleep(500);
    const seats = credPosts.map(p=>p.seat);
    assert(seats.includes("A") && seats.includes("K") && credPosts.length >= 6, "9 tüm sandalyeler + hakem kâsaya yazılır (" + credPosts.length + ")");
    assert(T(`state.seats.B.keyHint === "…test"`), "10 diğer koltukların rozeti güncellenir");

    // ── 11-14) rehber hızlı kurulum ──
    assert(doc.querySelectorAll("#wizProvs .provchip").length === 4, "11 rehberde 4 sağlayıcı çipi");
    T(`openWizard(); wizShow(2); selectWizProv("groq")`);
    assert(doc.getElementById("wizKeyRow").style.display !== "none", "12 anahtarlı sağlayıcıda anahtar satırı açılır");
    assert(doc.getElementById("wizKeyMsg").innerHTML.includes("console.groq.com/keys"), "13 rehber anahtar sayfasına yönlendirir");
    T(`document.getElementById("wizKey").value = ""; document.getElementById("wizKeySave").click()`);
    await sleep(100);
    assert(doc.getElementById("wizKeyMsg").textContent.includes("boş"), "14 boş anahtar uyarılır");
    credPosts.length = 0; pingUrls.length = 0;
    T(`document.getElementById("wizKey").value = "gsk-rehber-1"; document.getElementById("wizKeySave").click()`);
    await sleep(600);
    assert(credPosts.length >= 6 && pingUrls.some(u=>u.includes("key=gsk-rehber-1")), "15 rehber anahtarı kaydedip test eder");
    assert(doc.getElementById("wizKeyMsg").textContent.includes("sandalyeye"), "16 başarı mesajı kaç sandalyeye yazıldığını söyler");
    assert(doc.getElementById("wizKey").value === "", "17 anahtar kutudan silinir (iz kalmaz)");
    T(`closeWizard(true)`);

    // ── 18-20) hız sınırı mesajı + sözlük ──
    streamMode = "429";
    const r429 = await T(`new Promise(res=>{ streamChat(state.seats.A, [{role:"user",content:"x"}], {
      signal: new AbortController().signal, onDelta(){}, onError(e){ res(e); }, onDone(){ res("DONE"); } }); })`);
    assert(String(r429).includes("Hız sınırı"), "18 429 yanıtı kullanıcıya aynen gösterilir");
    streamMode = "ok";
    assert(T(`GLOSSARY.some(g=>g.k === "API anahtarı")`), "19 sözlükte API anahtarı maddesi");
    assert(T(`GLOSSARY.some(g=>g.k === "hız sınırı")`), "20 sözlükte hız sınırı maddesi");

    dom.window.close();
  }catch(e){
    fail++;
    console.log("  ❌ test çöktü: " + (e && e.stack || e));
  }
  console.log(fail === 0 ? `SONUÇ: TÜMÜ YEŞİL ✅ (${pass}/${pass})` : `SONUÇ: ${fail} KIRMIZI (${pass} yeşil)`);
  process.exit(fail === 0 ? 0 : 1);
})();
