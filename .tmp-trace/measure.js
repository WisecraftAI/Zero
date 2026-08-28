const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve('dist/web');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.map': 'application/json' };
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  let file = path.join(ROOT, url === '/' ? 'index.html' : url);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(ROOT, 'index.html');
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});

(async () => {
  await new Promise((r) => server.listen(4713, r));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('console', (m) => console.log('console', m.type(), m.text()));
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.goto('http://localhost:4713/', { waitUntil: 'networkidle' });
  console.log('body starts:', await page.evaluate(() => document.body.innerHTML.slice(0, 400)));

  const boxes = await page.evaluate(() => {
    const sel = ['.marketing-brand-stage', '.zero-lockup', '.zero-lockup-stack', '.zero-lockup-icon',
      '.zero-lockup-wordmark', '.zero-lockup-tagline', '.marketing-pass', '.marketing-proof'];
    const out = {};
    for (const s of sel) {
      const el = document.querySelector(s);
      if (!el) { out[s] = null; continue; }
      const r = el.getBoundingClientRect();
      out[s] = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    }
    const cs = getComputedStyle(document.documentElement);
    out.tokens = ['--logo-ink', '--logo-ink-lift', '--logo-plate', '--logo-eye', '--logo-accent', '--logo-accent-soft']
      .reduce((a, k) => (a[k] = cs.getPropertyValue(k).trim(), a), {});
    return out;
  });
  console.log(JSON.stringify(boxes, null, 2));

  await browser.close();
  server.close();
})();
