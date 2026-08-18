const { generateSmartSelector, generateBestSelector } = require('../selectors');

/**
 * Deep element analyzer (pro) with intelligent selector generation.
 */
async function analyzeElements(page, category, selectors) {
  const elements = [];

  for (const selector of selectors) {
    try {
      const found = await page.$$(selector);

      for (let i = 0; i < Math.min(found.length, 25); i++) {
        try {
          const info = await found[i].evaluate((node) => {
            const rect = node.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(node);

            if (rect.width === 0 || rect.height === 0) return null;
            if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') return null;
            if (rect.top < -1000 || rect.left < -1000) return null;

            return {
              tagName: node.tagName.toLowerCase(),
              id: node.id || null,
              className: node.className?.toString?.()?.slice(0, 200) || '',
              text: node.textContent?.trim()?.slice(0, 150) || '',
              innerText: node.innerText?.trim()?.slice(0, 100) || '',
              placeholder: node.placeholder || null,
              name: node.name || null,
              type: node.type || null,
              href: node.href || null,
              src: node.src?.slice(0, 250) || null,
              alt: node.alt || null,
              ariaLabel: node.getAttribute('aria-label') || null,
              ariaRole: node.getAttribute('role') || null,
              dataTestId:
                node.getAttribute('data-testid') ||
                node.getAttribute('data-test-id') ||
                node.getAttribute('data-test') ||
                null,
              value: node.value?.slice(0, 100) || null,
              required: node.required || false,
              disabled: node.disabled || false,
              position: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              },
              isAboveFold: rect.top < window.innerHeight,
              childCount: node.children.length,
              hasClickHandler: node.onclick !== null || node.hasAttribute('onclick'),
              tabIndex: node.tabIndex
            };
          });

          if (info) {
            info.category = category;
            info.originalSelector = selector;
            info.selector = generateSmartSelector(info);
            elements.push(info);
          }
        } catch (_) { /* skip failed element */ }
      }
    } catch (_) { /* skip failed selector */ }
  }

  return elements.filter(
    (el, i, arr) =>
      arr.findIndex((e) => e.selector === el.selector || (e.id && e.id === el.id)) === i
  );
}

/**
 * Light element analyzer — preserves legacy visible/interactive filtering.
 */
async function analyzeElementLight(page, selector, category) {
  try {
    const elements = await page.$$(selector);
    const analyzed = [];

    for (let i = 0; i < Math.min(elements.length, 20); i++) {
      const el = elements[i];
      try {
        const info = await el.evaluate((node) => {
          const rect = node.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(node);

          return {
            tagName: node.tagName.toLowerCase(),
            id: node.id || null,
            className: node.className?.toString().slice(0, 150) || '',
            text: node.textContent?.trim().slice(0, 100) || '',
            placeholder: node.placeholder || null,
            name: node.name || null,
            type: node.type || null,
            href: node.href || null,
            src: node.src?.slice(0, 200) || null,
            alt: node.alt || null,
            ariaLabel: node.getAttribute('aria-label') || null,
            ariaRole: node.getAttribute('role') || null,
            dataTestId:
              node.getAttribute('data-testid') || node.getAttribute('data-test-id') || null,
            value: node.value?.slice(0, 50) || null,
            required: node.required || false,
            disabled: node.disabled || false,
            visible:
              rect.width > 0 &&
              rect.height > 0 &&
              computedStyle.display !== 'none' &&
              computedStyle.visibility !== 'hidden',
            position: {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            },
            isInteractive:
              ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(node.tagName) ||
              node.hasAttribute('onclick') ||
              node.hasAttribute('tabindex')
          };
        });

        if (info.visible || info.isInteractive) {
          info.selector = generateBestSelector(info);
          info.category = category;
          analyzed.push(info);
        }
      } catch (_) { /* skip failed element */ }
    }

    return analyzed;
  } catch (_) {
    return [];
  }
}

module.exports = {
  analyzeElements,
  analyzeElementLight
};
