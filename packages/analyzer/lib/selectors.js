/**
 * Reliable CSS / Playwright selector generation from element snapshots.
 */

function generateSmartSelector(elementInfo) {
  if (elementInfo.dataTestId) {
    return `[data-testid="${elementInfo.dataTestId}"]`;
  }

  if (elementInfo.id && !elementInfo.id.match(/^\d/) && !elementInfo.id.includes('random')) {
    return `#${elementInfo.id}`;
  }

  if (elementInfo.ariaLabel && elementInfo.ariaLabel.length < 60) {
    return `[aria-label="${elementInfo.ariaLabel.replace(/"/g, '\\"')}"]`;
  }

  if (elementInfo.name && ['input', 'select', 'textarea'].includes(elementInfo.tagName)) {
    return `${elementInfo.tagName}[name="${elementInfo.name}"]`;
  }

  if (elementInfo.ariaRole && elementInfo.innerText && elementInfo.innerText.length < 40) {
    return `[role="${elementInfo.ariaRole}"]:has-text("${elementInfo.innerText.slice(0, 30)}")`;
  }

  if (elementInfo.placeholder && elementInfo.placeholder.length < 50) {
    return `${elementInfo.tagName}[placeholder*="${elementInfo.placeholder.slice(0, 30)}"]`;
  }

  if (elementInfo.href && elementInfo.tagName === 'a') {
    try {
      const path = new URL(elementInfo.href, 'http://dummy').pathname;
      if (path && path !== '/' && path.length < 60) {
        return `a[href*="${path}"]`;
      }
    } catch (_) { /* ignore bad href */ }
  }

  if (elementInfo.className) {
    const meaningfulClasses = elementInfo.className
      .split(/\s+/)
      .filter((c) =>
        c.length > 3 &&
        !c.match(/^[a-z]{1,2}\d+$/) &&
        !c.match(/^\d/) &&
        !c.includes('active') &&
        !c.includes('hover') &&
        !c.includes('focus')
      )
      .slice(0, 2);

    if (meaningfulClasses.length) {
      return `${elementInfo.tagName}.${meaningfulClasses.join('.')}`;
    }
  }

  const text = elementInfo.innerText || elementInfo.text;
  if (text && text.length > 2 && text.length < 35) {
    return `${elementInfo.tagName}:has-text("${text.slice(0, 30)}")`;
  }

  return elementInfo.originalSelector || elementInfo.tagName;
}

/** Lighter legacy selector builder (preserves light-analyzer export behavior). */
function generateBestSelector(elementInfo) {
  if (elementInfo.dataTestId) {
    return `[data-testid="${elementInfo.dataTestId}"]`;
  }
  if (elementInfo.id) {
    return `#${elementInfo.id}`;
  }
  if (elementInfo.ariaLabel) {
    return `[aria-label="${elementInfo.ariaLabel.replace(/"/g, '\\"')}"]`;
  }
  if (elementInfo.name && elementInfo.tagName === 'input') {
    return `input[name="${elementInfo.name}"]`;
  }
  if (elementInfo.placeholder) {
    return `${elementInfo.tagName}[placeholder="${elementInfo.placeholder.replace(/"/g, '\\"').slice(0, 50)}"]`;
  }
  if (elementInfo.href && elementInfo.tagName === 'a') {
    const hrefPart = elementInfo.href.split('?')[0].split('#')[0];
    if (hrefPart.length < 80) {
      return `a[href="${hrefPart}"]`;
    }
  }
  if (elementInfo.className) {
    const classes = elementInfo.className
      .split(/\s+/)
      .filter((c) => c.length > 2 && !c.match(/^\d/))
      .slice(0, 2);
    if (classes.length) {
      return `${elementInfo.tagName}.${classes.join('.')}`;
    }
  }
  if (elementInfo.text && elementInfo.text.length > 2 && elementInfo.text.length < 30) {
    return `${elementInfo.tagName}:has-text("${elementInfo.text.slice(0, 30)}")`;
  }
  return elementInfo.tagName;
}

module.exports = {
  generateSmartSelector,
  generateBestSelector
};
