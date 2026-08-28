const { ANTI_BOT_INDICATORS } = require('../constants');

async function detectAntiBot(page, response = null) {
  const headers = response
    ? await Promise.resolve(
      typeof response.allHeaders === 'function'
        ? response.allHeaders()
        : (typeof response.headers === 'function' ? response.headers() : {})
    ).catch(() => ({}))
    : {};
  const wafAction = String(headers['x-amzn-waf-action'] || headers['x-waf-action'] || '').toLowerCase();
  if (wafAction === 'challenge' || wafAction === 'block') return true;

  const pageContent = await page.content();
  const bodyText = await page.locator('body').textContent().catch(() => '');
  const haystack = `${pageContent}${bodyText}`.toLowerCase();
  return ANTI_BOT_INDICATORS.some((ind) => haystack.includes(ind));
}

async function detectDynamicContent(page) {
  return page.evaluate(() => {
    return document.querySelectorAll(
      '[data-react-root], [ng-app], [data-v-], #__next, #root, [data-reactroot]'
    ).length > 0;
  });
}

module.exports = {
  detectAntiBot,
  detectDynamicContent
};
