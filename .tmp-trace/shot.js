const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  for (const [name, w, h] of [['mark', 192, 192], ['icon', 256, 256], ['wordmark', 620, 158]]) {
    const file = 'file://' + path.resolve(`.tmp-trace/preview-${name}.svg`);
    await page.setViewportSize({ width: w, height: h });
    await page.goto(file);
    await page.screenshot({ path: `.tmp-trace/shot-${name}.png` });
  }
  await browser.close();
})();
