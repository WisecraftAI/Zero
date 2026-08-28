const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const svg = (n) => fs.readFileSync(`.tmp-trace/preview-${n}.svg`, 'utf8')
  .replace(/<rect width="100%" height="100%" fill="[^"]*"\/>/, '');

const row = (label, name, png, sizes) => `
  <div class="row">
    <div class="label">${label}</div>
    ${sizes.map((s) => `
      <figure>
        <div class="pair">
          <div><img src="${png}" style="width:${s}px"><figcaption>png</figcaption></div>
          <div><span class="svgbox" style="width:${s}px">${svg(name)}</span><figcaption>svg</figcaption></div>
        </div>
        <figcaption>${s}px</figcaption>
      </figure>`).join('')}
  </div>`;

const html = `<!doctype html><meta charset="utf-8"><style>
  body { margin:0; padding:24px; background:#EEF2F8; font:12px -apple-system,sans-serif; color:#333; }
  .row { display:flex; align-items:flex-end; gap:28px; margin-bottom:28px; }
  .label { width:80px; font-weight:600; }
  .pair { display:flex; gap:14px; align-items:flex-end; }
  .svgbox svg { width:100%; height:auto; display:block; }
  figcaption { text-align:center; color:#777; margin-top:4px; }
</style>
${row('mark', 'mark', 'file://' + path.resolve('web/public/zero-mark.png'), [32, 48, 96])}
${row('icon', 'icon', 'file://' + path.resolve('web/public/zero-icon.png'), [64, 128])}
${row('wordmark', 'wordmark', 'file://' + path.resolve('web/public/zero-wordmark.png'), [140, 300])}
`;

fs.writeFileSync('.tmp-trace/compare.html', html);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('file://' + path.resolve('.tmp-trace/compare.html'));
  await page.screenshot({ path: '.tmp-trace/compare.png', fullPage: true });
  await browser.close();
})();
