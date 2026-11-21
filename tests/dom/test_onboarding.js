/* v1.3 ilk kullanım + demo/gerçek ayrımı testi — jsdom:
   - rehber otomatik açılış → hedef kartları → atla (konsul_onboarded)
   - sözlük (13 madde) + 7 odada ⓘ düğmeleri
   - ray: 3 adım görünür + ileri araçlar kapalı; odaya geçince açılır
   - demo: bant/rozete + 0 arşiv kaydı + sahte test yok + dürüst hata
   - gerçek: oturum+mesaj yazımı + model etiketi + işlem günlüğü
   - karar raporu arşiv hatası/başarısı dürüst raporu
   - sade dil etiketleri
   Çalıştırma: cd tests && node dom/test_onboarding.js */
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

const posts = [];   // arşiv/kasa yazımları burada toplanır
let reportMode = "ok";
function makeDom(url){
  return new JSDOM(html, {
    url: url || "http://localhost:8888/",
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
        const rec = (kind)=>{ try{ posts.push({ kind, url: s, body: opts && opts.body ? JSON.parse(opts.body) : null }); }catch(e){ posts.push({kind, url:s}); } };
        if(s.includes("/api/health")) return json({ ok:true, service:"KONSÜL AI", mode:"canlı", version:"1.3.0",
          ai:"upstream", simulation_in_backend:false, auth:"none", key_storage:"plaintext-sqlite", exposed:false });
        if(s.includes("/api/session/start")){ rec("start"); return json({ ok:true }); }
        if(s.includes("/api/session/record_message")){ rec("record"); return json({ ok:true }); }
        if(s.includes("/api/session/conclude")){ rec("conclude"); return json({ ok:true }); }
        if(s.includes("/api/session/report")){ rec("report");
          if(reportMode === "fail") return json({ ok:false, error:"disk dolu (test)" }, 500);
          return json({ ok:true }); }
        if(s.includes("/api/envelope/seal")){ rec("seal"); return json({ ok:true, envelope:{ seal_hash:"abc123" } }); }
        if(s.includes("/api/envelope/open")) return json({ ok:true, envelopes:[] });
        if(s.includes("/api/delta/compute")){ rec("delta"); return json({ ok:true, report:{} }); }
        if(s.includes("/api/memory/add")){ rec("memadd"); return json({ ok:true }); }
        if(s.includes("/api/memory/")) return json({ ok:true, text:"", memories:[] });
        if(s.includes("/api/credentials") && opts && opts.method === "POST"){ rec("cred"); return json({ ok:true, key_hint:"…test" }); }
        if(s.includes("/api/credentials")) return json({ ok:true, credentials:{} });
        if(s.includes("/api/characters")) return json({ ok:true, characters:[] });
        if(s.includes("/api/research/verify")) return json({ ok:true, report:"**Doğruluk Durumu:** olumlu\n\nKaynak gösterilmedi." });
        if(s.includes("/api/chat/stream")){
          return { ok:true, status:200, body:{ getReader:()=>{
            let n = 0;
            return { read: async ()=>{
              n++;
              if(n === 1){
                const chunk = { delta:"GERÇEK-MODEL-YANITI" };
                return { done:false, value:new w.TextEncoder().encode("data: " + JSON.stringify(chunk) + "\n\n") };
              }
              if(n === 2) return { done:false, value:new w.TextEncoder().encode("data: [DONE]\n\n") };
              return { done:true };
            }};
          }}};
        }
        if(s.includes("/api/chat")) return json({ ok:true, content:"GERÇEK-MODEL-YANITI" });
        if(s.includes("/api/persona/clean")) return json({ ok:true, cleaned:(JSON.parse(opts.body||"{}")).text || "", report:{} });
        if(s.includes("/api/ping")) return json({ ok:true, models:["m1"] });
        if(s.includes("/api/sessions")) return json({ ok:true, sessions:[] });
        if(s.includes("/api/reports")) return json({ ok:true, reports:[] });
        if(s.includes("/api/convergence")) return json({ ok:true, score:50, history:[] });
        if(s.includes("/api/debate/evaluate_rebuttal")) return json({ ok:true });
        if(s.includes("/api/neuro/feedback")) return json({ ok:true });
        if(s.includes("/api/session/") && s.includes("/messages")) return json({ ok:true, messages:[] });
        if(s.includes("/api/session/") && s.includes("/report")) return json({ ok:false });
        return json({ ok:true });
      };
      w.scrollTo = ()=>{};
      w.matchMedia = w.matchMedia || (()=>({ matches:false, addListener(){}, removeListener(){} }));
    }
  });
}

(async ()=>{
  console.log("== v1.3 Test (İlk Kullanım + Demo/Gerçek Ayrımı) ==");
  try{
    const dom = makeDom();
    const w = dom.window, doc = w.document, T = (e)=>w.eval(e);
    await sleep(1200); // boot + rehber zamanlayıcısı (700ms) + health

    // ── 1-6) rehber ──
    assert(doc.getElementById("wizardModal").classList.contains("on"), "1 rehber ilk açılışta kendiliğinden açılır");
    assert(doc.querySelectorAll("#wizardModal .goalcard").length === 4, "2 dört hedef kartı görünür");
    assert(doc.getElementById("wizPane1").style.display !== "none", "3 rehber 1. adımda açılır");
    T(`document.getElementById("wizSkip").click()`);
    assert(!doc.getElementById("wizardModal").classList.contains("on"), "4 rehberi atla kapatır");
    assert(w.localStorage.getItem("konsul_onboarded") === "1", "5 atlama kalıcı işaretlenir");
    T(`openWizard(); wizShow(2);`);
    await sleep(150);
    assert(doc.getElementById("wizHealth").textContent.includes("1.3.0"), "6 adım-2 bağlantı durumu sunucu sürümünü gösterir");
    T(`closeWizard(true)`);

    // ── 7-10) sözlük + ray ──
    T(`openGlossary("")`);
    assert(doc.getElementById("glossaryModal").classList.contains("on"), "7 sözlük açılır");
    assert(doc.querySelectorAll("#glossaryBody .glositem").length === 15, "8 sözlükte 15 madde");
    T(`document.getElementById("glosClose").click()`);
    assert(doc.querySelectorAll(".jargonbtn").length === 7, "9 yedi odada ⓘ düğmesi");
    assert(doc.querySelectorAll(".railstep").length === 3, "10 rayda 3 adım başlığı");

    // ── 11-14) ray gruplaması ──
    assert(doc.getElementById("advTools") && !doc.getElementById("advTools").open, "11 ileri araçlar kapalı gelir");
    assert(doc.querySelectorAll(".roomnav").length === 7, "12 yedi oda da durur (hiçbiri silinmedi)");
    assert(doc.querySelectorAll("#advTools .roomnav").length === 4, "13 dört ileri araç grupta");
    T(`switchRoom("archive")`);
    assert(doc.getElementById("advTools").open === true, "14 ileri odaya geçince grup açılır");
    T(`switchRoom("council")`);

    // ── 15-21) demo dürüstlüğü ──
    posts.length = 0;
    T(`if(!state.demo) document.getElementById("demoToggle").click()`);
    await sleep(50);
    assert(doc.getElementById("demoBanner").classList.contains("on"), "15 demo bandı görünür");
    assert(doc.getElementById("statusTxt").textContent.includes("DEMO"), "16 durum göstergesi DEMO der");
    T(`document.getElementById("topicInput").value = "demo konusu"; document.getElementById("btnStart").click()`);
    await sleep(2500); // demo akışı: 1 söz (interval 24ms) + iç ses
    assert(posts.filter(p=>["start","record","conclude","report","seal","memadd"].includes(p.kind)).length === 0, "17 demo arşive 0 kayıt yazar");
    assert(doc.querySelectorAll("#cScroll .demobadge").length >= 1, "18 demo sözlerinde DEMO rozeti");
    assert(doc.querySelector("#jobStrip").textContent.includes("arşive yazıl"), "19 işlem günlüğü arşiv durumunu söyler");
    T(`openSeatModal("A"); document.getElementById("mTest").click()`);
    await sleep(900);
    assert(!doc.getElementById("mTestTxt").textContent.includes("kabul edildi"), "20 demo'da sahte bağlantı başarısı yok");
    T(`document.getElementById("mClose").click()`);
    T(`document.getElementById("btnSynth").disabled = false; document.getElementById("btnSynth").click()`);
    await sleep(1200);
    assert(doc.getElementById("reportTitle").textContent.includes("DEMO"), "21 demo özeti DEMO başlıklı");
    T(`state.synth.ac && state.synth.ac.abort()`);

    // ── 22-26) gerçek mod ──
    T(`if(state.demo) document.getElementById("demoToggle").click()`);
    await sleep(100);
    assert(T("archivingOn()") === true, "22 gerçek modda arşiv kapısı açık");
    posts.length = 0;
    T(`document.getElementById("topicInput").value = "gerçek konu"; document.getElementById("btnStart").click()`);
    await sleep(2500);
    assert(posts.some(p=>p.kind === "start"), "23 gerçek koşu oturum açar");
    assert(posts.some(p=>p.kind === "record"), "24 gerçek sözler arşive yazılır");
    assert(doc.querySelectorAll("#cScroll .modeltag").length >= 1, "25 gerçek sözlerde model etiketi");
    assert(doc.getElementById("statusTxt").textContent.includes("GERÇEK MODEL"), "26 durum göstergesi GERÇEK MODEL der");

    // ── 27-28) karar raporu arşiv sonucu ──
    reportMode = "fail";
    T(`finalizeDecisionReport("# Rapor", [], "01.01.2026", "X", {model:"m"})`);
    await sleep(300);
    assert(doc.getElementById("decisionFoot").textContent.includes("YAZILAMADI"), "27 arşiv hatası dürüstçe yazılır");
    reportMode = "ok";
    T(`finalizeDecisionReport("# Rapor", [], "01.01.2026", "X", {model:"m"})`);
    await sleep(300);
    assert(doc.getElementById("decisionFoot").textContent.includes("arşive yazıldı"), "28 arşiv başarısı yazılır");

    // ── 29-30) sunucu yokken dürüst hata ──
    T(`state.backend = false; state.health = null; applyStatus()`);
    assert(doc.getElementById("statusTxt").textContent.includes("SUNUCU YOK"), "29 sunucu yoksa durum SUNUCU YOK");
    const err = T(`new Promise(res=>{ const ac = new AbortController();
      streamChat(state.seats.A, [{role:"user",content:"x"}], { signal: ac.signal,
        onDelta(){}, onError(e){ res("ERR:"+e); }, onDone(){ res("DONE"); } }); })`);
    const errVal = await err;
    assert(String(errVal).includes("SUNUCU YOK"), "30 sunucu yokken sahte yanıt yok, dürüst hata");

    // ── 31-32) sade dil ──
    const bodyTxt = doc.body.textContent;
    assert(bodyTxt.includes("KAÇ SANDALYE") && bodyTxt.includes("Özeti Oluştur") && bodyTxt.includes("KARAR ÖZETİ"), "31 sade dil etiketleri ekranda");
    assert(T("GLOSSARY.length") === 15, "32 sözlük verisi 15 maddelik");
    T(`state.backend = true`);

    // ── ?welcome=1 ayrı örnekte ──
    const dom2 = makeDom("http://localhost:8888/?welcome=1");
    const w2 = dom2.window;
    w2.localStorage.setItem("konsul_onboarded", "1");
    await sleep(1200);
    assert(w2.document.getElementById("wizardModal").classList.contains("on"), "33 ?welcome=1 rehberi zorla açar");
    dom2.window.close();
    dom.window.close();
  }catch(e){
    fail++;
    console.log("  ❌ test çöktü: " + (e && e.stack || e));
  }
  console.log(fail === 0 ? `SONUÇ: TÜMÜ YEŞİL ✅ (${pass}/${pass})` : `SONUÇ: ${fail} KIRMIZI (${pass} yeşil)`);
  process.exit(fail === 0 ? 0 : 1);
})();
