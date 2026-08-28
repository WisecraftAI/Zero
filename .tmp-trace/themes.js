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

const THEMES = process.argv.slice(2);

(async () => {
  await new Promise((r) => server.listen(4712, r));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });

  page.on('console', (m) => { if (m.type() === 'error') console.log('console error:', m.text()); });
  page.on('pageerror', (e) => console.log('page error:', e.message));

  for (const theme of THEMES) {
    await page.goto('http://localhost:4712/', { waitUntil: 'networkidle' });
    await page.evaluate((t) => {
      localStorage.setItem('zero-theme', t);
      document.documentElement.setAttribute('data-theme', t);
    }, theme);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `.tmp-trace/theme-${theme}.png`, fullPage: false });
  }

  await browser.close();
  server.close();
})();
