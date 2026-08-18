/**
 * Page structure analysis (shared; pro-shaped, additive for light).
 */
async function analyzePageStructure(page) {
  return page.evaluate(() => {
    const structure = {
      title: document.title,
      url: window.location.href,
      language: document.documentElement.lang || 'en',
      charset: document.characterSet,
      viewport: document.querySelector('meta[name="viewport"]')?.content,
      headings: [],
      sections: [],
      landmarks: [],
      mainContent: null,
      metaTags: {},
      performance: {},
      depth: 0
    };

    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h, i) => {
      if (i < 40) {
        structure.headings.push({
          level: parseInt(h.tagName[1], 10),
          text: h.textContent?.trim()?.slice(0, 120) || '',
          id: h.id || null,
          isVisible: h.offsetParent !== null
        });
      }
    });

    document
      .querySelectorAll('[role], main, nav, header, footer, aside, section[aria-label], section[aria-labelledby]')
      .forEach((el, i) => {
        if (i < 30) {
          structure.landmarks.push({
            tag: el.tagName.toLowerCase(),
            role: el.getAttribute('role') || el.tagName.toLowerCase(),
            ariaLabel: el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'),
            id: el.id,
            hasContent: el.children.length > 0
          });
        }
      });

    const main = document.querySelector('main, [role="main"], #main, #content, .main-content, .content');
    if (main) {
      structure.mainContent = {
        tag: main.tagName.toLowerCase(),
        id: main.id,
        className: main.className?.toString?.()?.slice(0, 100),
        childCount: main.children.length
      };
    }

    [
      'meta[name="description"]',
      'meta[name="keywords"]',
      'meta[property="og:title"]',
      'meta[property="og:description"]',
      'meta[property="og:image"]',
      'meta[name="robots"]'
    ].forEach((sel) => {
      const meta = document.querySelector(sel);
      if (meta) {
        const key = meta.getAttribute('name') || meta.getAttribute('property');
        structure.metaTags[key] = meta.content?.slice(0, 200);
      }
    });

    if (window.performance) {
      const timing = performance.timing;
      if (timing.loadEventEnd) {
        structure.performance = {
          domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
          loadComplete: timing.loadEventEnd - timing.navigationStart,
          domInteractive: timing.domInteractive - timing.navigationStart
        };
      }
    }

    document.querySelectorAll('section, [class*="section"], main > div').forEach((sec, i) => {
      if (i < 20) {
        const heading = sec.querySelector('h1, h2, h3');
        structure.sections.push({
          id: sec.id,
          className: sec.className?.toString?.()?.slice(0, 80),
          heading: heading?.textContent?.trim()?.slice(0, 60) || null,
          childCount: sec.children.length,
          hasImages: sec.querySelectorAll('img').length > 0,
          hasVideos: sec.querySelectorAll('video, iframe').length > 0
        });
      }
    });

    function getMaxDepth(el, depth = 0) {
      if (!el.children.length) return depth;
      return Math.max(...Array.from(el.children).map((c) => getMaxDepth(c, depth + 1)));
    }
    structure.depth = getMaxDepth(document.body);

    return structure;
  });
}

module.exports = { analyzePageStructure };
