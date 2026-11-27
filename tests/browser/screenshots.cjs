// Yuvarlak Masa — görsel doğrulama ekran görüntüleri
// Gereksinim: uygulama http://127.0.0.1:8888'de ve mock upstream
// tests/browser/mock_upstream.py 18923'te çalışıyor olmalı.
//   node tests/browser/screenshots.cjs
// Çıktı: screenshots/*.png
const path = require("node:path");
const fs = require("node:fs");
const { chromium } = require("playwright-core");

(async () => {
  const executablePath =
    process.env.CHROMIUM_PATH ||
    (await require("@sparticuz/chromium").default.executablePath());
  const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
  const BASE = process.env.BASE_URL || "http://127.0.0.1:8888";
  const OUT = path.join(__dirname, "..", "..", "screenshots");
  fs.mkdirSync(OUT, { recursive: true });

  const byok = {};
  for (const s of ["A", "B", "C", "D", "E", "F", "K"]) {
    byok[s] = {
      provider_id: "mock",
      provider_name: "Yerel Mock",
      base_url: "http://127.0.0.1:18923/v1",
      api_key: "test-key",
      model: "mock-model",
    };
  }
  const init = (b) => {
    localStorage.setItem("ym_theme", "dark");
    localStorage.setItem("ym_personal_seats_v2", JSON.stringify(b));
  };

  // ── 1) Ana sayfa (demo tamamlanmış) — masaüstü ──
  const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 940 } });
  await ctx1.addInitScript(init, byok);
  const p1 = await ctx1.newPage();
  await p1.goto(BASE + "/", { waitUntil: "networkidle" });
  await p1.waitForSelector("#demoOutcome:not(.hidden)", { timeout: 40000 });
  await p1.waitForTimeout(500);
  await p1.screenshot({ path: path.join(OUT, "01-ana-sayfa-demo.png") });
  console.log("✓ 01-ana-sayfa-demo.png");

  // ── 2) Ana sayfa — mobil ──
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx2.addInitScript(init, byok);
  const p2 = await ctx2.newPage();
  await p2.goto(BASE + "/", { waitUntil: "networkidle" });
  await p2.waitForSelector("#demoOutcome:not(.hidden)", { timeout: 40000 });
  await p2.waitForTimeout(400);
  await p2.screenshot({ path: path.join(OUT, "02-ana-sayfa-mobil.png"), fullPage: true });
  console.log("✓ 02-ana-sayfa-mobil.png");

  // ── 3) Canlı tartışma akışı (mock upstream BYOK) — nörodinamik çip dolunca ──
  await p1.fill("#questionInput", "İstanbul'da düzenimi bozup kendi işimi kurmalı mıyım?");
  await p1.click("#startDebateBtn");
  await p1.waitForFunction(() => {
    const el = [...document.querySelectorAll(".neuro-chip")].find(e => e.textContent.includes("Bilişsel durum"));
    return Boolean(el);
  }, null, { timeout: 60000 });
  await p1.waitForTimeout(300);
  const chip = await p1.waitForSelector(".neuro-chip:not(.hidden)", { timeout: 10000 });
  await chip.evaluate(el => (el.closest("article") || el).scrollIntoView({ block: "center" }));
  await p1.screenshot({ path: path.join(OUT, "03-tartisma-akisi.png") });
  console.log("✓ 03-tartisma-akisi.png");

  // ── 4) Gerekçeli çıktı paneli ──
  await p1.waitForSelector("#outcomeSections:not(.hidden)", { timeout: 60000 });
  await p1.waitForTimeout(400);
  await p1.evaluate(() => document.getElementById("verdictCard").scrollIntoView({ block: "start" }));
  await p1.waitForTimeout(200);
  await p1.screenshot({ path: path.join(OUT, "04-gerekceli-cikti.png") });
  console.log("✓ 04-gerekceli-cikti.png");

  await browser.close();
  console.log("Bitti →", OUT);
})().catch(e => { console.error(e); process.exit(1); });
