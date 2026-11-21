// Requires playwright-core and a Chromium executable (CHROMIUM_PATH or @sparticuz/chromium).
// Run with a server: BASE_URL=http://127.0.0.1:8888 node tests/browser/responsive.cjs
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
(async () => {
  const executablePath = process.env.CHROMIUM_PATH || await require('@sparticuz/chromium').default.executablePath();
  const browser = await chromium.launch({executablePath, args:['--no-sandbox']});
  try {
    for (const viewport of [{width:1568,height:720}, {width:1000,height:700}, {width:390,height:844}, {width:320,height:568}]) {
      const page = await browser.newPage({viewport});
      // v1.3: geri dönen kullanıcı senaryosu — rehber modalı ölçümü bozmasın
      await page.addInitScript(() => { try{ localStorage.setItem('konsul_onboarded','1'); }catch(e){} });
      await page.goto((process.env.BASE_URL || 'http://127.0.0.1:8888') + '/static/index.html', {waitUntil:'domcontentloaded'});
      await page.waitForTimeout(600);
      const data = await page.evaluate(() => {
        const room = document.querySelector('#room-council');
        const deck = document.querySelector('#hologramTableDeck');
        const nav = document.querySelector('.rail');
        return {scrollHeight:room.scrollHeight, clientHeight:room.clientHeight,
          deckDisplay:getComputedStyle(deck).display, navDisplay:getComputedStyle(nav).display,
          viewport:innerWidth, roomWidth:room.clientWidth, roomScrollWidth:room.scrollWidth};
      });
      assert(data.scrollHeight > data.clientHeight, JSON.stringify(data));
      assert.notEqual(data.deckDisplay, 'none');
      assert.notEqual(data.navDisplay, 'none');
      assert(data.roomScrollWidth <= data.roomWidth + 1, JSON.stringify(data));
      const box = await page.locator('#room-council').boundingBox();
      await page.mouse.move(box.x + box.width - 15, box.y + 30);
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(150);
      assert(await page.locator('#room-council').evaluate(el => el.scrollTop > 0), 'wheel did not scroll room');
      for (const selector of ['#opInput', '#topicInput', '#btnStart']) {
        await page.locator(selector).scrollIntoViewIfNeeded();
        const visible = await page.locator(selector).evaluate(el => {
          const r=el.getBoundingClientRect(), room=document.querySelector('#room-council').getBoundingClientRect();
          return r.left >= -1 && r.right <= innerWidth + 1 && r.top >= room.top - 1 && r.bottom <= room.bottom + 1;
        });
        assert(visible, `${viewport.width}x${viewport.height} ${selector} inaccessible`);
      }
      if (viewport.width <= 1100) {
        await page.locator('[data-room="jury"]').click();
        assert(await page.locator('#room-jury').evaluate(el=>el.classList.contains('on')));
        await page.locator('[data-room="council"]').click();
        assert(await page.locator('#room-council').evaluate(el=>el.classList.contains('on')));
      }
      console.log(`OK ${viewport.width}x${viewport.height}`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(err => { console.error(err); process.exitCode=1; });
