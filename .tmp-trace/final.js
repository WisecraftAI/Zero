const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve('dist/web');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  let file = path.join(ROOT, url === '/' ? 'index.html' : url);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(ROOT, 'index.html');
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});

const BASE = 'http://localhost:4714';

(async () => {
  await new Promise((r) => server.listen(4714, r));
  const browser = await chromium.launch();
  const problems = [];

  // Desktop dashboard (idle hero renders the full lockup)
  for (const theme of ['flame', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', (e) => problems.push(`${theme} dashboard pageerror: ${e.message}`));
    await page.addInitScript((t) => localStorage.setItem('zero-theme', t), theme);
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `.tmp-trace/dash-${theme}.png` });
    await page.close();
  }

  // Narrow viewport, marketing home
  for (const theme of ['flame']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    page.on('pageerror', (e) => problems.push(`${theme} mobile pageerror: ${e.message}`));
    await page.addInitScript((t) => localStorage.setItem('zero-theme', t), theme);
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `.tmp-trace/mobile-${theme}.png`, fullPage: true });

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 0) problems.push(`mobile horizontal overflow: ${overflow}px`);
    await page.close();
  }

  // Sidebar mark at its real 32px size, zoomed
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 4 });
  await page.addInitScript(() => localStorage.setItem('zero-theme', 'flame'));
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.locator('.sidebar-logo').screenshot({ path: '.tmp-trace/rail-mark.png' });
  await page.close();

  console.log(problems.length ? problems.join('\n') : 'no problems detected');
  await browser.close();
  server.close();
})();
