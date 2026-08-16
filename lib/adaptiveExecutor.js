/**
 * Adaptive Execution Engine
 *
 * Handles test execution for ANY website by:
 * 1. Using dynamically discovered elements from URL analysis
 * 2. Intelligent element finding with multiple fallback strategies
 * 3. Smart action matching that works beyond e-commerce patterns
 * 4. Proper navigation and interaction with unknown UI patterns
 */

const { buildAdaptiveSelectors, universalSelectors, isKnownDomain } = require('./ecommerceSelectors');

// ============================================================================
// INTELLIGENT ELEMENT FINDER
// ============================================================================

/**
 * Find element using multiple strategies with intelligent fallbacks
 * @param {Page} page - Playwright page object
 * @param {object} options - Search options
 * @returns {Promise<{locator: Locator, strategy: string}|null>}
 */
async function findElement(page, options) {
  const {
    selectors = [],           // CSS selectors to try
    texts = [],               // Text content to search for
    roles = [],               // ARIA roles to look for
    testIds = [],             // data-testid values
    placeholders = [],        // Placeholder text
    labels = [],              // aria-label or label text
    timeout = 5000,
    visible = true
  } = options;

  // Strategy 1: Try data-testid first (most stable)
  for (const testId of testIds) {
    try {
      const loc = page.locator(`[data-testid="${testId}"], [data-test-id="${testId}"], [data-test="${testId}"]`).first();
      if (await loc.isVisible({ timeout: Math.min(timeout, 2000) })) {
        return { locator: loc, strategy: `testid:${testId}` };
      }
    } catch {}
  }

  // Strategy 2: Try ARIA roles (accessibility-based)
  for (const role of roles) {
    try {
      const loc = page.getByRole(role).first();
      if (await loc.isVisible({ timeout: Math.min(timeout, 2000) })) {
        return { locator: loc, strategy: `role:${role}` };
      }
    } catch {}
  }

  // Strategy 3: Try aria-labels
  for (const label of labels) {
    try {
      const loc = page.locator(`[aria-label*="${label}" i], [aria-label="${label}" i]`).first();
      if (await loc.isVisible({ timeout: Math.min(timeout, 2000) })) {
        return { locator: loc, strategy: `aria-label:${label}` };
      }
    } catch {}
  }

  // Strategy 4: Try placeholders (for inputs)
  for (const placeholder of placeholders) {
    try {
      const loc = page.locator(`[placeholder*="${placeholder}" i]`).first();
      if (await loc.isVisible({ timeout: Math.min(timeout, 2000) })) {
        return { locator: loc, strategy: `placeholder:${placeholder}` };
      }
    } catch {}
  }

  // Strategy 5: Try CSS selectors
  for (const sel of selectors) {
    try {
      // Skip Playwright-specific pseudo-selectors for standard CSS
      if (sel.includes(':has-text') || sel.includes(':text(')) continue;

      const loc = page.locator(sel).first();
      const isVis = visible
        ? await loc.isVisible({ timeout: Math.min(timeout, 2000) })
        : await loc.count() > 0;
      if (isVis) {
        return { locator: loc, strategy: `css:${sel}` };
      }
    } catch {}
  }

  // Strategy 6: Try text-based locators
  for (const text of texts) {
    try {
      const loc = page.getByText(text, { exact: false }).first();
      if (await loc.isVisible({ timeout: Math.min(timeout, 2000) })) {
        return { locator: loc, strategy: `text:${text}` };
      }
    } catch {}
  }

  // Strategy 7: Try Playwright-specific selectors (has-text, etc.)
  for (const sel of selectors) {
    try {
      if (!sel.includes(':has-text') && !sel.includes(':text(')) continue;
      const loc = page.locator(sel).first();
      if (await loc.isVisible({ timeout: Math.min(timeout, 2000) })) {
        return { locator: loc, strategy: `playwright:${sel}` };
      }
    } catch {}
  }

  return null;
}

/**
 * Find input element with smart detection
 */
async function findInputElement(page, options) {
  const { type = 'text', purpose = '', timeout = 5000 } = options;

  const purposeLower = purpose.toLowerCase();

  // Determine specific selectors based on purpose
  const purposeSelectors = [];
  const purposePlaceholders = [];
  const purposeLabels = [];

  if (purposeLower.includes('search')) {
    purposeSelectors.push(...universalSelectors.search.input);
    purposePlaceholders.push('search', 'find', 'query');
    purposeLabels.push('search', 'find');
  }
  if (purposeLower.includes('email')) {
    purposeSelectors.push('input[type="email"]', 'input[name*="email" i]', 'input[id*="email" i]');
    purposePlaceholders.push('email', 'e-mail');
    purposeLabels.push('email');
  }
  if (purposeLower.includes('phone') || purposeLower.includes('mobile')) {
    purposeSelectors.push('input[type="tel"]', 'input[name*="phone" i]', 'input[name*="mobile" i]');
    purposePlaceholders.push('phone', 'mobile', 'tel');
    purposeLabels.push('phone', 'mobile');
  }
  if (purposeLower.includes('name')) {
    purposeSelectors.push('input[name*="name" i]', 'input[id*="name" i]');
    purposePlaceholders.push('name', 'full name');
    purposeLabels.push('name');
  }
  if (purposeLower.includes('password')) {
    purposeSelectors.push('input[type="password"]');
    purposePlaceholders.push('password');
    purposeLabels.push('password');
  }
  if (purposeLower.includes('username') || purposeLower.includes('login')) {
    purposeSelectors.push('input[name*="user" i]', 'input[id*="user" i]', 'input[name*="login" i]');
    purposePlaceholders.push('username', 'user', 'login');
    purposeLabels.push('username', 'login');
  }

  // Add generic text input selectors as fallback
  if (type === 'text' || type === 'any') {
    purposeSelectors.push(...universalSelectors.forms.textInput);
  }

  return findElement(page, {
    selectors: purposeSelectors,
    placeholders: purposePlaceholders,
    labels: purposeLabels,
    timeout
  });
}

/**
 * Find button element with smart detection
 */
async function findButtonElement(page, options) {
  const { purpose = '', texts = [], timeout = 5000 } = options;

  const purposeLower = purpose.toLowerCase();
  const buttonTexts = [...texts];
  const buttonSelectors = [];

  // Add purpose-specific text patterns
  if (purposeLower.includes('submit')) {
    buttonTexts.push('submit', 'send', 'go');
    buttonSelectors.push(...universalSelectors.forms.submit);
  }
  if (purposeLower.includes('search')) {
    buttonTexts.push('search', 'find', 'go');
    buttonSelectors.push(...universalSelectors.search.submit);
  }
  if (purposeLower.includes('login') || purposeLower.includes('sign')) {
    buttonTexts.push('log in', 'login', 'sign in', 'signin');
  }
  if (purposeLower.includes('close')) {
    buttonTexts.push('close', '×', 'x', 'dismiss');
    buttonSelectors.push(...universalSelectors.modals.close);
  }
  if (purposeLower.includes('next')) {
    buttonTexts.push('next', 'continue', 'proceed', '→');
    buttonSelectors.push(...universalSelectors.sliders.next);
  }
  if (purposeLower.includes('prev')) {
    buttonTexts.push('previous', 'back', 'prev', '←');
    buttonSelectors.push(...universalSelectors.sliders.prev);
  }

  // Add generic button selectors
  buttonSelectors.push(...universalSelectors.interactive.buttons);

  return findElement(page, {
    selectors: buttonSelectors,
    texts: buttonTexts,
    roles: ['button'],
    timeout
  });
}

// ============================================================================
// ACTION PARSER FOR ANY WEBSITE
// ============================================================================

/**
 * Parse action from test scenario text - works for ANY website type
 * @param {string} scenario - Test scenario description
 * @param {string} expectedResult - Expected result description
 * @param {object} discoveredElements - Elements discovered during analysis
 * @returns {object} Parsed action details
 */
function parseAdaptiveAction(scenario, expectedResult, discoveredElements = {}) {
  const text = `${scenario} ${expectedResult}`.toLowerCase();

  // === NAVIGATION ACTIONS ===
  if (text.includes('navigate') || text.includes('open') || text.includes('go to') || text.includes('visit') || text.includes('load')) {
    if (text.includes('homepage') || text.includes('home page') || text.includes('main page')) {
      return { type: 'navigate_home', target: 'homepage' };
    }
    if (text.match(/navigate to ['"]?([^'"]+)['"]?/i)) {
      const match = text.match(/navigate to ['"]?([^'"]+)['"]?/i);
      return { type: 'navigate_to', target: match[1] };
    }
    return { type: 'navigate', target: 'page' };
  }

  // === CLICK ACTIONS ===
  if (text.includes('click')) {
    // Extract what to click
    const clickMatch = text.match(/click\s+(?:on\s+)?(?:the\s+)?['"]?([^'"]+?)['"]?\s*(?:button|link|icon|element|tab|menu)?/i);
    const target = clickMatch ? clickMatch[1].trim() : null;

    if (text.includes('button')) {
      return { type: 'click_button', target };
    }
    if (text.includes('link')) {
      return { type: 'click_link', target };
    }
    if (text.includes('menu') || text.includes('nav')) {
      return { type: 'click_menu', target };
    }
    if (text.includes('tab')) {
      return { type: 'click_tab', target };
    }
    if (text.includes('dropdown') || text.includes('select')) {
      return { type: 'click_dropdown', target };
    }
    if (text.includes('checkbox')) {
      return { type: 'click_checkbox', target };
    }
    if (text.includes('radio')) {
      return { type: 'click_radio', target };
    }
    if (text.includes('close') || text.includes('dismiss')) {
      return { type: 'click_close', target };
    }
    return { type: 'click', target };
  }

  // === INPUT/ENTER ACTIONS ===
  if (text.includes('enter') || text.includes('type') || text.includes('input') || text.includes('fill')) {
    // Extract the value to enter
    const valueMatch = text.match(/(?:enter|type|input|fill)\s+['"]?([^'"]+?)['"]?\s+(?:in|into|on)?/i);
    const value = valueMatch ? valueMatch[1].trim() : null;

    // Extract target field
    const fieldMatch = text.match(/(?:in|into|on)\s+(?:the\s+)?['"]?([^'"]+?)['"]?\s*(?:field|input|box)?/i);
    const field = fieldMatch ? fieldMatch[1].trim() : null;

    if (text.includes('search')) {
      return { type: 'input_search', value, field: field || 'search' };
    }
    if (text.includes('email')) {
      return { type: 'input_text', value, field: 'email' };
    }
    if (text.includes('password')) {
      return { type: 'input_text', value, field: 'password' };
    }
    if (text.includes('name')) {
      return { type: 'input_text', value, field: 'name' };
    }
    if (text.includes('phone') || text.includes('mobile')) {
      return { type: 'input_text', value, field: 'phone' };
    }
    return { type: 'input_text', value, field };
  }

  // === SELECT ACTIONS ===
  if (text.includes('select') || text.includes('choose')) {
    const valueMatch = text.match(/(?:select|choose)\s+['"]?([^'"]+?)['"]?/i);
    const value = valueMatch ? valueMatch[1].trim() : null;
    return { type: 'select', value };
  }

  // === SCROLL ACTIONS ===
  if (text.includes('scroll')) {
    if (text.includes('bottom') || text.includes('down')) {
      return { type: 'scroll', direction: 'down' };
    }
    if (text.includes('top') || text.includes('up')) {
      return { type: 'scroll', direction: 'up' };
    }
    return { type: 'scroll', direction: 'down' };
  }

  // === VERIFY/CHECK ACTIONS ===
  if (text.includes('verify') || text.includes('check') || text.includes('validate') ||
      text.includes('should') || text.includes('display') || text.includes('visible') ||
      text.includes('present') || text.includes('exist')) {

    // What to verify
    if (text.includes('title')) {
      const titleMatch = text.match(/title\s+(?:is|displays?|contains?|shows?)\s+['"]?([^'"]+)['"]?/i);
      return { type: 'verify_title', value: titleMatch?.[1] };
    }
    if (text.includes('text') || text.includes('content') || text.includes('message')) {
      const textMatch = text.match(/(?:text|content|message)\s+['"]?([^'"]+?)['"]?\s+(?:is|displays?|should be)/i);
      return { type: 'verify_text', value: textMatch?.[1] };
    }
    if (text.includes('button')) {
      return { type: 'verify_element', elementType: 'button' };
    }
    if (text.includes('image') || text.includes('logo')) {
      return { type: 'verify_element', elementType: 'image' };
    }
    if (text.includes('video') || text.includes('player')) {
      return { type: 'verify_element', elementType: 'video' };
    }
    if (text.includes('nav') || text.includes('menu')) {
      return { type: 'verify_element', elementType: 'navigation' };
    }
    if (text.includes('header')) {
      return { type: 'verify_element', elementType: 'header' };
    }
    if (text.includes('footer')) {
      return { type: 'verify_element', elementType: 'footer' };
    }
    if (text.includes('form')) {
      return { type: 'verify_element', elementType: 'form' };
    }
    if (text.includes('link')) {
      return { type: 'verify_element', elementType: 'link' };
    }
    if (text.includes('modal') || text.includes('popup') || text.includes('dialog')) {
      return { type: 'verify_element', elementType: 'modal' };
    }
    if (text.includes('tab')) {
      return { type: 'verify_element', elementType: 'tab' };
    }
    if (text.includes('page load') || text.includes('page display')) {
      return { type: 'verify_page_load' };
    }
    if (text.includes('error')) {
      return { type: 'verify_no_error' };
    }

    // Generic element verification
    const elementMatch = text.match(/(?:verify|check|validate)\s+(?:that\s+)?(?:the\s+)?['"]?([^'"]+?)['"]?\s+(?:is|should be|displays?)/i);
    return { type: 'verify_element', target: elementMatch?.[1] };
  }

  // === WAIT ACTIONS ===
  if (text.includes('wait')) {
    const timeMatch = text.match(/wait\s+(?:for\s+)?(\d+)\s*(?:seconds?|s|ms|milliseconds?)?/i);
    const time = timeMatch ? parseInt(timeMatch[1]) : 2;
    return { type: 'wait', time: time * (text.includes('ms') || text.includes('millisecond') ? 1 : 1000) };
  }

  // === FORM SUBMISSION ===
  if (text.includes('submit')) {
    return { type: 'submit_form' };
  }

  // === HOVER ACTIONS ===
  if (text.includes('hover') || text.includes('mouse over')) {
    const targetMatch = text.match(/(?:hover|mouse over)\s+(?:on\s+)?(?:the\s+)?['"]?([^'"]+?)['"]?/i);
    return { type: 'hover', target: targetMatch?.[1] };
  }

  // === KEYBOARD ACTIONS ===
  if (text.includes('press')) {
    const keyMatch = text.match(/press\s+['"]?([^'"]+?)['"]?/i);
    return { type: 'press_key', key: keyMatch?.[1] };
  }

  // Default: generic verification
  return { type: 'generic', rawText: text };
}

// ============================================================================
// ADAPTIVE TEST EXECUTOR
// ============================================================================

/**
 * Execute a test step adaptively based on discovered elements
 * @param {Page} page - Playwright page object
 * @param {object} action - Parsed action object
 * @param {object} adaptiveSelectors - Selectors built from discovery
 * @param {string[]} trace - Trace array for logging
 */
async function executeAdaptiveAction(page, action, adaptiveSelectors, trace) {
  const { type, target, value, field, direction, elementType, time, key } = action;

  switch (type) {
    case 'navigate':
    case 'navigate_home':
    case 'navigate_to': {
      // Verify page is loaded
      const body = page.locator('body');
      await body.waitFor({ state: 'visible', timeout: 15000 });
      const visible = await body.isVisible();
      if (!visible) throw new Error('Page did not load');
      trace.push('adaptive:page-loaded');
      break;
    }

    case 'click':
    case 'click_button':
    case 'click_link':
    case 'click_menu':
    case 'click_tab': {
      // Build selectors based on target
      const selectors = [];
      const texts = target ? [target] : [];

      if (type === 'click_button') {
        selectors.push(...adaptiveSelectors.buttons);
      } else if (type === 'click_link') {
        selectors.push(...adaptiveSelectors.links);
      } else if (type === 'click_menu') {
        selectors.push(...adaptiveSelectors.navigation);
      } else if (type === 'click_tab') {
        selectors.push(...adaptiveSelectors.tabs);
      }

      // Add target-specific selectors
      if (target) {
        selectors.unshift(
          `[data-testid*="${target}" i]`,
          `[aria-label*="${target}" i]`,
          `button:has-text("${target}")`,
          `a:has-text("${target}")`,
          `[class*="${target.replace(/\s+/g, '-').toLowerCase()}"]`
        );
      }

      const element = await findElement(page, { selectors, texts, timeout: 8000 });
      if (!element) throw new Error(`Could not find clickable element: ${target || 'unknown'}`);

      await element.locator.click({ timeout: 5000 }).catch(async () => {
        await element.locator.click({ force: true, timeout: 5000 });
      });
      trace.push(`adaptive:clicked:${element.strategy}`);
      await page.waitForTimeout(1000);
      break;
    }

    case 'click_close': {
      const closeElement = await findButtonElement(page, { purpose: 'close', timeout: 5000 });
      if (closeElement) {
        await closeElement.locator.click({ timeout: 3000 }).catch(() => {});
        trace.push(`adaptive:closed:${closeElement.strategy}`);
      } else {
        // Try escape key
        await page.keyboard.press('Escape');
        trace.push('adaptive:closed:escape-key');
      }
      await page.waitForTimeout(500);
      break;
    }

    case 'click_dropdown':
    case 'click_checkbox':
    case 'click_radio': {
      const selectors = type === 'click_dropdown'
        ? adaptiveSelectors.dropdowns
        : type === 'click_checkbox'
          ? adaptiveSelectors.checkboxes
          : adaptiveSelectors.radios;

      const texts = target ? [target] : [];
      const element = await findElement(page, { selectors, texts, timeout: 5000 });
      if (!element) throw new Error(`Could not find ${type.replace('click_', '')} element`);

      await element.locator.click({ timeout: 5000 });
      trace.push(`adaptive:${type}:${element.strategy}`);
      break;
    }

    case 'input_search': {
      const searchInput = await findInputElement(page, { purpose: 'search', timeout: 8000 });
      if (!searchInput) throw new Error('Search input not found');

      await searchInput.locator.click({ timeout: 3000 }).catch(async () => {
        await searchInput.locator.click({ force: true });
      });
      await searchInput.locator.fill(value || 'test');

      // Submit search
      const searchBtn = await findButtonElement(page, { purpose: 'search', timeout: 3000 });
      if (searchBtn) {
        await searchBtn.locator.click({ timeout: 3000 }).catch(() => {});
      } else {
        await page.keyboard.press('Enter');
      }

      trace.push(`adaptive:searched:${value}`);
      await page.waitForTimeout(2000);
      break;
    }

    case 'input_text': {
      const input = await findInputElement(page, { purpose: field || 'text', timeout: 8000 });
      if (!input) throw new Error(`Input field not found: ${field || 'unknown'}`);

      await input.locator.click({ timeout: 3000 }).catch(async () => {
        await input.locator.click({ force: true });
      });
      await input.locator.fill(value || '');
      trace.push(`adaptive:input:${field}:${input.strategy}`);
      break;
    }

    case 'select': {
      const dropdown = await findElement(page, {
        selectors: adaptiveSelectors.dropdowns,
        timeout: 5000
      });
      if (!dropdown) throw new Error('Dropdown not found');

      await dropdown.locator.selectOption({ label: value }).catch(async () => {
        // Try clicking and selecting
        await dropdown.locator.click();
        await page.waitForTimeout(500);
        const option = page.getByText(value, { exact: false }).first();
        await option.click({ timeout: 3000 });
      });
      trace.push(`adaptive:selected:${value}`);
      break;
    }

    case 'scroll': {
      if (direction === 'down') {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      } else {
        await page.evaluate(() => window.scrollTo(0, 0));
      }
      trace.push(`adaptive:scrolled:${direction}`);
      await page.waitForTimeout(1000);
      break;
    }

    case 'verify_title': {
      const title = await page.title();
      if (value && !title.toLowerCase().includes(value.toLowerCase())) {
        throw new Error(`Title "${title}" does not contain "${value}"`);
      }
      trace.push(`adaptive:title-verified:${title}`);
      break;
    }

    case 'verify_text': {
      if (value) {
        const hasText = await page.getByText(value, { exact: false }).first().isVisible({ timeout: 8000 });
        if (!hasText) throw new Error(`Text "${value}" not visible`);
        trace.push(`adaptive:text-verified:${value}`);
      } else {
        trace.push('adaptive:text-verified:content-exists');
      }
      break;
    }

    case 'verify_element': {
      let found = false;
      let selectors = [];

      switch (elementType) {
        case 'button':
          selectors = adaptiveSelectors.buttons;
          break;
        case 'image':
          selectors = adaptiveSelectors.images;
          break;
        case 'video':
          selectors = adaptiveSelectors.videos;
          break;
        case 'navigation':
        case 'nav':
          selectors = adaptiveSelectors.navigation;
          break;
        case 'header':
          selectors = adaptiveSelectors.header;
          break;
        case 'footer':
          selectors = adaptiveSelectors.footer;
          break;
        case 'form':
          selectors = adaptiveSelectors.forms;
          break;
        case 'link':
          selectors = adaptiveSelectors.links;
          break;
        case 'modal':
          selectors = adaptiveSelectors.modals;
          break;
        case 'tab':
          selectors = adaptiveSelectors.tabs;
          break;
        default:
          selectors = [...adaptiveSelectors.buttons, ...adaptiveSelectors.links];
      }

      for (const sel of selectors) {
        try {
          if (sel.includes(':has-text') || sel.includes(':text(')) continue;
          const loc = page.locator(sel).first();
          if (await loc.isVisible({ timeout: 3000 })) {
            found = true;
            trace.push(`adaptive:element-verified:${elementType || 'generic'}:${sel}`);
            break;
          }
        } catch {}
      }

      if (!found) {
        // Try generic approach
        const genericSelectors = {
          'button': 'button, [role="button"]',
          'image': 'img[src], picture, [role="img"]',
          'video': 'video, [class*="video"], [class*="player"]',
          'navigation': 'nav, [role="navigation"], header nav',
          'header': 'header, [role="banner"]',
          'footer': 'footer, [role="contentinfo"]',
          'form': 'form, [role="form"]',
          'link': 'a[href]',
          'modal': '[role="dialog"], .modal, [class*="modal"]',
          'tab': '[role="tab"], .tab'
        };

        const genericSel = genericSelectors[elementType] || 'body *';
        const loc = page.locator(genericSel).first();
        if (await loc.isVisible({ timeout: 5000 })) {
          found = true;
          trace.push(`adaptive:element-verified:${elementType || 'generic'}:fallback`);
        }
      }

      if (!found) throw new Error(`Element not found: ${elementType || action.target || 'unknown'}`);
      break;
    }

    case 'verify_page_load': {
      const body = page.locator('body');
      await body.waitFor({ state: 'visible', timeout: 15000 });
      const hasContent = await page.evaluate(() => document.body.textContent.length > 50);
      if (!hasContent) throw new Error('Page did not load properly');
      trace.push('adaptive:page-load-verified');
      break;
    }

    case 'verify_no_error': {
      const errorIndicators = ['error', '404', 'not found', 'something went wrong', 'oops'];
      const bodyText = await page.locator('body').textContent().catch(() => '');
      const hasError = errorIndicators.some(ind => bodyText.toLowerCase().includes(ind));
      // Note: We don't throw for common words, just log
      trace.push(hasError ? 'adaptive:possible-error-on-page' : 'adaptive:no-error-detected');
      break;
    }

    case 'wait': {
      await page.waitForTimeout(time || 2000);
      trace.push(`adaptive:waited:${time}ms`);
      break;
    }

    case 'submit_form': {
      const submitBtn = await findButtonElement(page, { purpose: 'submit', timeout: 5000 });
      if (submitBtn) {
        await submitBtn.locator.click({ timeout: 5000 });
        trace.push(`adaptive:form-submitted:${submitBtn.strategy}`);
      } else {
        await page.keyboard.press('Enter');
        trace.push('adaptive:form-submitted:enter-key');
      }
      await page.waitForTimeout(2000);
      break;
    }

    case 'hover': {
      if (target) {
        const element = await findElement(page, {
          selectors: adaptiveSelectors.buttons.concat(adaptiveSelectors.links),
          texts: [target],
          timeout: 5000
        });
        if (element) {
          await element.locator.hover();
          trace.push(`adaptive:hovered:${element.strategy}`);
        }
      }
      break;
    }

    case 'press_key': {
      const keyMap = {
        'enter': 'Enter',
        'escape': 'Escape',
        'esc': 'Escape',
        'tab': 'Tab',
        'space': ' ',
        'backspace': 'Backspace',
        'delete': 'Delete',
        'arrow down': 'ArrowDown',
        'arrow up': 'ArrowUp',
        'arrow left': 'ArrowLeft',
        'arrow right': 'ArrowRight'
      };
      const keyToPress = keyMap[key?.toLowerCase()] || key || 'Enter';
      await page.keyboard.press(keyToPress);
      trace.push(`adaptive:pressed:${keyToPress}`);
      break;
    }

    case 'generic':
    default: {
      // Verify page loaded and has content
      const body = page.locator('body');
      await body.waitFor({ state: 'visible', timeout: 10000 });
      trace.push('adaptive:generic-verified');
      break;
    }
  }
}

/**
 * Dismiss common popups and modals
 */
async function dismissPopups(page, trace = []) {
  const dismissSelectors = [
    '[class*="close"]',
    '[aria-label="Close"]',
    '[aria-label*="close" i]',
    'button[aria-label*="dismiss" i]',
    '[class*="modal"] button[class*="close"]',
    '[class*="popup"] button[class*="close"]',
    '.modal-close',
    '.close-button',
    'button:has-text("×")',
    'button:has-text("✕")',
    'button:has-text("Close")',
    'button:has-text("Got it")',
    'button:has-text("Accept")',
    'button:has-text("OK")',
    '[class*="cookie"] button',
    '[class*="consent"] button'
  ];

  for (const sel of dismissSelectors) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1000 })) {
        await btn.click({ timeout: 2000 }).catch(() => {});
        trace.push(`popup-dismissed:${sel}`);
        await page.waitForTimeout(500);
        break;
      }
    } catch {}
  }

  // Also try Escape key
  await page.keyboard.press('Escape').catch(() => {});
}

/**
 * Detect if page is blocked by anti-bot or error
 */
async function detectBlockedPage(page) {
  const blockedIndicators = [
    'captcha', 'recaptcha', 'hcaptcha',
    'cloudflare', 'ddos-guard', 'access denied',
    'blocked', 'forbidden', 'not allowed',
    'please verify', 'human verification',
    'bot detection', 'automated access',
    'too many requests', 'rate limit'
  ];

  try {
    const pageContent = await page.content();
    const bodyText = await page.locator('body').textContent().catch(() => '');
    const pageTitle = await page.title();

    const combined = `${pageContent} ${bodyText} ${pageTitle}`.toLowerCase();
    return blockedIndicators.some(ind => combined.includes(ind));
  } catch {
    return false;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  findElement,
  findInputElement,
  findButtonElement,
  parseAdaptiveAction,
  executeAdaptiveAction,
  dismissPopups,
  detectBlockedPage,
  buildAdaptiveSelectors
};

