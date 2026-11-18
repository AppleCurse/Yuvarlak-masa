/* Faz 7 (Kapanış) runtime test — jsdom:
   - Kâsa görünürlüğü: keyHint'li koltuk çipte 🔐 taşır, yoksa taşımaz
   - Regresyon: çip sayısı (aktif + OP + K), renderSeatChips güncelliği
   Çalıştırma: cd tests && node dom/test7.js */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require(path.join(__dirname, "..", "node_modules", "jsdom"));
const REPO = path.join(__dirname, "..", "..");
const html = fs.readFileSync(path.join(REPO, "static", "index.html"), "utf-8");
let pass = 0, fail = 0;
function assert(c, l){ if(c){pass++;console.log("  ✅ "+l);} else {fail++;console.log("  ❌ "+l);} }

const dom = new JSDOM(html, {
  url: "http://localhost:8888/", runScripts: "dangerously", pretendToBeVisual: true,
  beforeParse(w){
    if(!w.crypto.subtle){ const {webcrypto}=require("crypto"); Object.defineProperty(w,"crypto",{value:webcrypto}); }
    const json=(o,s=200)=>({ok:s<400,status:s,json:async()=>o,text:async()=>JSON.stringify(o)});
    w.fetch = async (u,opts)=>{
      const s=String(u);
      if(s.includes("/api/health")) return json({ok:true,service:"KONSÜL AI",mode:"canlı",version:"1.2.0"});
      if(s.includes("/api/credentials")) return json({ok:true,credentials:{}});
      if(s.includes("/api/characters")) return json({ok:true,characters:[]});
      if(s.includes("/api/chat/stream")) return {ok:true,status:200,body:{getReader:()=>({read:()=>new Promise(r=>setTimeout(()=>r({done:true}),60000))})}};
      if(s.includes("/api/persona/clean")) return json({ok:true,cleaned:((JSON.parse(opts.body||"{}")).text||""),report:{}});
      if(s.includes("/api/chat")) return json({ok:true,content:""});
      if(s.includes("/api/memory/")) return json({ok:true,text:"",memories:[]});
      if(s.includes("/api/sessions")) return json({ok:true,sessions:[]});
      if(s.includes("/api/reports")) return json({ok:true,reports:[]});
      return json({ok:true});
    };
    w.scrollTo=()=>{};
  }
});
const w = dom.window, doc = w.document, T = (e)=>w.eval(e);

setTimeout(async ()=>{
  console.log("== Faz 7 Runtime Test (Kâsa Görünürlüğü + Regresyon) ==");
  try{
    const chips = ()=>doc.getElementById("seatChips").innerHTML;

    // ── 1) varsayılan: hiçbir koltukta kâsa anahtarı yoksa 🔐 YOK ──
    T("renderSeatChips();");
    assert(!chips().includes("🔐"), "rozet: anahtarsız varsayılanda 🔐 YOK");

    // ── 2) tek koltuğa keyHint işlenince yalnız o çipte 🔐 ──
    T("state.seats.A.keyHint='…abcd'; renderSeatChips();");
    const c2 = chips();
    assert(c2.includes("🔐"), "rozet: keyHint'li koltuk 🔐 taşır");
    assert(c2.includes("…abcd"), "rozet: ipucu (…son4) title'a işlenir");
    const count = (c2.match(/🔐/g)||[]).length;
    assert(count === 1, "rozet: yalnız 1 koltukta rozet (" + count + ")");

    // ── 3) keyHint silinince rozet kalkar ──
    T("state.seats.A.keyHint=''; renderSeatChips();");
    assert(!chips().includes("🔐"), "rozet: keyHint silinince kalkar");

    // ── 4) birden çok koltuk ──
    T("state.seats.A.keyHint='…1111'; state.seats.K.keyHint='…2222'; renderSeatChips();");
    const c4 = chips();
    assert((c4.match(/🔐/g)||[]).length === 2, "rozet: 2 koltuk → 2 rozet");

    // ── 5) regresyon: çip sayısı = aktif + OP + K ──
    T("state.seats.A.keyHint=''; state.seats.K.keyHint=''; renderSeatChips();");
    const chipButtons = doc.querySelectorAll("#seatChips .seatchip").length;
    const expected = T("activeSeats().length") + 2; // +OP +K
    assert(chipButtons === expected, "regresyon: çip sayısı = aktif(" + T("activeSeats().length") + ") + OP + K = " + expected + " (bulunan " + chipButtons + ")");

    // ── 6) regresyon: ham anahtar hiçbir UI alanında dökülmez ──
    T("state.seats.B.keyHint='…zzzz'; renderSeatChips();");
    const chipHtml = doc.getElementById("seatChips").innerHTML;
    assert(!chipHtml.includes("sk-") && chipHtml.includes("…zzzz"), "güvenlik: çipte yalnız maskeli ipucu (title), ham anahtar YOK");
    T("state.seats.B.keyHint='';");
  }catch(e){
    fail++; console.log("  ❌ TEST KRAÇ: "+e.message);
    console.log(e.stack.split("\n").slice(0,4).join("\n"));
  }
  console.log("\nSONUÇ: "+(fail?"HATA VAR ❌ (yeşil "+pass+" / kırmızı "+fail+")":"TÜMÜ YEŞİL ✅ ("+pass+"/"+pass+")"));
  w.close(); process.exit(fail?1:0);
}, 1400);
