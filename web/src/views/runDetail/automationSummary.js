// Translates the Automation QA bundle into something a non-engineer can read:
// human element names, plain-English selector meanings, and a step-by-step
// account of the script the executor ran. The generated code stays available,
// but nobody should have to read it to understand what was automated.

const ELEMENT_LABELS = {
  aboutSection: 'About section',
  accountInfo: 'Account details',
  addToCart: 'Add-to-cart button',
  adverseEvent: 'Adverse event link',
  articleCard: 'Article card',
  bookNow: 'Book-now button',
  branchList: 'Branch list',
  careersSection: 'Careers section',
  cartCta: 'Cart button',
  cartIcon: 'Cart icon',
  categoryList: 'Category list',
  contactForm: 'Contact form',
  contactInfo: 'Contact details',
  contentCard: 'Content card',
  continueCta: 'Continue button',
  courseCard: 'Course card',
  custom: 'Site-specific elements',
  enrollButton: 'Enroll button',
  flightCard: 'Flight card',
  footer: 'Page footer',
  hotelCard: 'Hotel card',
  loginCta: 'Login button',
  loginForm: 'Login form',
  loginPasswordField: 'Password field',
  loginSubmit: 'Login submit button',
  loginUserField: 'Username field',
  menuItem: 'Menu item',
  pauseCta: 'Pause button',
  playCta: 'Play button',
  primaryNav: 'Main navigation',
  productCard: 'Product card',
  productList: 'Product list',
  restaurantCard: 'Restaurant card',
  searchBox: 'Search box',
  searchForm: 'Search form',
  searchSubmit: 'Search button',
  seekBar: 'Playback seek bar',
  videoPlayer: 'Video player',
};

const WORD_ALIASES = { btn: 'button', cta: 'button', nav: 'navigation', url: 'URL' };

const TAG_PHRASES = {
  a: 'Link',
  article: 'Article block',
  button: 'Button',
  footer: 'Page footer',
  form: 'Form',
  h1: 'Main heading',
  header: 'Page header',
  img: 'Image',
  input: 'Input box',
  li: 'List item',
  main: 'Main content area',
  nav: 'Navigation bar',
  section: 'Page section',
  select: 'Dropdown',
  textarea: 'Text area',
};

const CAMEL_BOUNDARY = /([a-z0-9])([A-Z])/g;
const WORD_SEPARATOR = /[\s_-]+/;
const LEADING_TAG = /^([a-zA-Z][a-zA-Z0-9]*)/;

export function humanizeElementKey(key) {
  const raw = String(key ?? '').trim();
  if (!raw) return 'Element';
  if (ELEMENT_LABELS[raw]) return ELEMENT_LABELS[raw];

  const words = raw
    .replace(CAMEL_BOUNDARY, '$1 $2')
    .split(WORD_SEPARATOR)
    .filter(Boolean)
    .map((word) => WORD_ALIASES[word.toLowerCase()] || word.toLowerCase());
  if (words.length === 0) return 'Element';

  const sentence = words.join(' ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

function tagPhrase(selector) {
  const tag = LEADING_TAG.exec(selector)?.[1]?.toLowerCase();
  return (tag && TAG_PHRASES[tag]) || 'Element';
}

const COMBINATOR = /^[>+~]$/;

// Splits `[data-testid='card'] a` into its descendant parts without breaking
// apart spaces that live inside an attribute value or `:has-text(...)`.
function splitDescendants(selector) {
  const parts = [];
  let current = '';
  let depth = 0;
  let quote = null;

  for (const char of selector) {
    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === '[' || char === '(') depth += 1;
    if (char === ']' || char === ')') depth -= 1;
    if (char === ' ' && depth === 0) {
      if (current) parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  if (current) parts.push(current);
  return parts.filter((part) => !COMBINATOR.test(part));
}

const SELECTOR_RULES = [
  [/^button\[type=['"]submit['"]\]$/i, () => 'The form’s submit button'],
  [/\[data-test-?id[^=\]]*=\s*['"]?([^'"\]]+)/i, (match) => `Element the site tags as “${match[1]}” for testing`],
  [/:has-text\(\s*['"]([^'"]+)['"]\s*\)/i, (match, part) => `${tagPhrase(part)} showing the text “${match[1]}”`],
  [/\[aria-label[^=\]]*=\s*['"]([^'"]+)['"]/i, (match, part) => `${tagPhrase(part)} labeled “${match[1]}” for screen readers`],
  [/\[placeholder[^=\]]*=\s*['"]([^'"]+)['"]/i, (match) => `Input box with the placeholder “${match[1]}”`],
  [/\[href[^=\]]*=\s*['"]([^'"]+)['"]/i, (match) => `Link pointing at “${match[1]}”`],
  [/\[name[^=\]]*=\s*['"]([^'"]+)['"]/i, (match) => `Form field named “${match[1]}”`],
  [/\[type=\s*['"]([^'"]+)['"]/i, (match, part) => `${tagPhrase(part)} of type “${match[1]}”`],
  [/\[role=\s*['"]([^'"]+)['"]/i, (match) => `Element with the accessibility role “${match[1]}”`],
  [/\[class[^=\]]*=\s*['"]([^'"]+)['"]/i, (match) => `Element whose style class contains “${match[1]}”`],
  [/\[data-([a-z0-9-]+)\]/i, (match) => `Element carrying the “data-${match[1]}” attribute`],
  [/^\.([\w-]+)$/, (match) => `Element with the style class “${match[1]}”`],
  [/^#([\w-]+)$/, (match) => `Element with the id “${match[1]}”`],
  [/^[a-zA-Z][a-zA-Z0-9]*$/, (_match, part) => `${tagPhrase(part)} — any <${part}> on the page`],
];

const BARE_TAG = /^[a-zA-Z][a-zA-Z0-9]*$/;

function describePart(part) {
  for (const [pattern, describe] of SELECTOR_RULES) {
    const match = pattern.exec(part);
    if (match) return describe(match, part);
  }
  return 'Element matching a site-specific CSS rule';
}

function lowerFirst(text) {
  return text ? `${text.charAt(0).toLowerCase()}${text.slice(1)}` : text;
}

export function describeSelector(selector) {
  const value = String(selector ?? '').trim();
  if (!value) return '';

  const parts = splitDescendants(value);
  if (parts.length === 0) return '';
  if (parts.length === 1) return describePart(parts[0]);

  // In a compound selector the parts read better as short phrases than as the
  // standalone "any <nav> on the page" wording.
  const outer = parts[0];
  const inner = parts[parts.length - 1];
  const outerPhrase = BARE_TAG.test(outer) ? tagPhrase(outer) : describePart(outer);
  const innerPhrase = BARE_TAG.test(inner) ? tagPhrase(inner).toLowerCase() : lowerFirst(describePart(inner));
  return `${outerPhrase} — specifically the ${innerPhrase} inside it`;
}

function selectorsOf(value) {
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((item) => (typeof item === 'string' ? item.trim() : item?.selectorValue?.trim() || ''))
    .filter(Boolean);
}

function buildElements(candidates) {
  return Object.entries(candidates)
    .map(([key, value]) => {
      const selectors = selectorsOf(value);
      return {
        key,
        label: humanizeElementKey(key),
        locators: selectors.map((item) => ({ value: item, meaning: describeSelector(item) })),
      };
    })
    .filter((element) => element.locators.length > 0)
    .sort((left, right) => left.label.localeCompare(right.label));
}

function formatSeconds(milliseconds) {
  const seconds = Number(milliseconds) / 1000;
  return `${Number.isInteger(seconds) ? seconds : seconds.toFixed(1)} second${seconds === 1 ? '' : 's'}`;
}

function joinLabels(labels) {
  if (labels.length === 0) return 'target element';
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(', ')} or ${labels[labels.length - 1]}`;
}

// A step target is written either as a JSON array of selectors (generated
// script) or as element key identifiers (the bundle's outline snippet).
function resolveTargets(argument, lookup) {
  const text = String(argument || '').trim();

  if (text.startsWith('[')) {
    let parsed = [];
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = [];
    }
    const selectors = selectorsOf(parsed);
    const key = selectors.map((selector) => lookup.keyBySelector.get(selector)).find(Boolean);
    return {
      labels: [key ? humanizeElementKey(key) : lowerFirst(describeSelector(selectors[0])) || 'target element'],
      locators: selectors.map((item) => ({ value: item, meaning: describeSelector(item) })),
    };
  }

  const keys = text
    .split(/\|\||,/)
    .map((token) => token.trim())
    .filter((token) => token && token !== 'page');
  const locators = keys.flatMap((key) => selectorsOf(lookup.candidates[key]))
    .map((item) => ({ value: item, meaning: describeSelector(item) }));
  return { labels: keys.map(humanizeElementKey), locators };
}

function clickStep(argument, lookup) {
  const { labels, locators } = resolveTargets(argument, lookup);
  return {
    text: `Click the ${joinLabels(labels)}`,
    detail: locators.length > 1
      ? `Tries ${locators.length} locators in order and clicks the first one visible. If none are on the page the run continues without failing.`
      : 'Clicks it when visible. If it never appears the run continues without failing.',
    locators,
  };
}

function verifyStep(argument, lookup) {
  const { labels, locators } = resolveTargets(argument, lookup);
  return {
    text: `Check that the ${joinLabels(labels)} is visible`,
    detail: 'This is the assertion: if none of these locators are visible the test fails.',
    locators,
  };
}

const STATEMENT_RULES = [
  [/page\.goto\(/, (_match, _statement, lookup) => ({
    text: lookup.targetUrl ? `Open ${lookup.targetUrl}` : 'Open the target website',
    detail: 'Waits until the page HTML has loaded before moving on.',
  })],
  [/waitForLoadState\(/, () => ({ text: 'Wait for the page to finish loading' })],
  [/waitForTimeout\(\s*(\d+)\s*\)/, (match) => ({
    text: `Pause for ${formatSeconds(match[1])}`,
    detail: 'Gives the page time to settle before the next action.',
  })],
  [/expect\(page\.locator\(\s*['"]([^'"]+)['"]\s*\)\)\.toBeVisible\(\)/, (match) => ({
    text: 'Check that the page rendered',
    detail: BARE_TAG.test(match[1])
      ? `Asserts that the <${match[1]}> element is on screen.`
      : `Asserts that ${lowerFirst(describeSelector(match[1]))} is visible.`,
  })],
  [/clickFirstAvailable\(\s*(?:page\s*,\s*)?([\s\S]+?)\s*\)\s*;?$/, (match, _statement, lookup) => clickStep(match[1], lookup)],
  [/expectFirstAvailable\(\s*(?:page\s*,\s*)?([\s\S]+?)\s*\)\s*;?$/, (match, _statement, lookup) => verifyStep(match[1], lookup)],
  [/expectVisible\(\s*page\s*,\s*([\s\S]+?)\s*\)\s*;?$/, (match, _statement, lookup) => verifyStep(match[1], lookup)],
  [/searchAndNavigate\(\s*page\s*,\s*["']([^"']*)["']/, (match) => ({
    text: `Search the site for “${match[1]}”`,
    detail: 'Types the term into the search box and submits it.',
  })],
  [/clickProduct\(/, () => ({ text: 'Open the first product in the results' })],
  [/addToCart\(/, () => ({ text: 'Add the product to the cart' })],
  [/openCart\(/, () => ({ text: 'Open the cart' })],
  [/keyboard\.press\(\s*['"]([^'"]+)['"]/, (match) => ({ text: `Press the ${match[1]} key` })],
  [/\.fill\(\s*['"]([^'"]*)['"]/, (match) => ({ text: `Type “${match[1]}” into the field` })],
];

export function describeStatement(statement, lookup) {
  const code = String(statement || '').trim().replace(/;$/, '');
  for (const [pattern, describe] of STATEMENT_RULES) {
    const match = pattern.exec(code);
    if (match) return { code, text: '', detail: '', locators: [], ...describe(match, code, lookup) };
  }
  return { code, text: '', detail: '', locators: [] };
}

const TEST_OPEN = /^test\(\s*("(?:[^"\\]|\\.)*")/;
const TEST_CLOSE = /^\}\)\s*;?$/;

// Reads the `test(...)` blocks out of a generated Playwright spec. Anything
// outside a test block (imports, shared helpers) is not part of the journey.
export function parsePlaywrightTests(script) {
  const tests = [];
  let current = null;

  for (const rawLine of String(script || '').split('\n')) {
    const line = rawLine.trim();
    if (!current) {
      const open = TEST_OPEN.exec(line);
      if (!open) continue;
      let title = open[1];
      try {
        title = JSON.parse(open[1]);
      } catch {
        title = open[1].replace(/^"|"$/g, '');
      }
      current = { title, statements: [] };
      continue;
    }
    if (TEST_CLOSE.test(line)) {
      tests.push(current);
      current = null;
      continue;
    }
    if (line) current.statements.push(line);
  }
  if (current) tests.push(current);
  return tests;
}

const FALLBACK_NOTES = {
  cost_cap: 'This run hit its AI spend cap, so ZER0 used its built-in templates.',
  disabled: 'AI assistance is switched off in this environment, so ZER0 used its built-in templates.',
  empty_response: 'The AI provider returned nothing usable, so ZER0 kept its built-in templates.',
  invalid_api_key: 'The saved AI provider key was rejected, so ZER0 used its built-in templates.',
  no_key: 'No AI provider key is configured, so ZER0 used its built-in templates.',
  rate_limit: 'The AI request hit the per-minute rate cap, so ZER0 used its built-in templates.',
  store_error: 'The saved AI provider key could not be read, so ZER0 used its built-in templates.',
  unparsable_response: 'The AI response could not be parsed, so ZER0 kept its built-in templates.',
};

// Deliberately never surfaces `fallbackDetail`: provider errors can echo back
// fragments of the submitted API key.
export function describeGeneration(llm) {
  if (llm?.used) {
    const model = [llm.provider, llm.model].filter(Boolean).join(' · ');
    return {
      mode: 'ai',
      label: model ? `AI-assisted (${model})` : 'AI-assisted',
      note: 'The model added locator hints on top of ZER0’s built-in templates.',
    };
  }
  return {
    mode: 'template',
    label: 'Built-in templates',
    note: FALLBACK_NOTES[llm?.fallbackReason]
      || 'ZER0 built this from its own templates and the locators found while crawling the site.',
  };
}

const SCRIPT_FIELDS = [
  {
    field: 'generatedSeleniumJava',
    title: 'Java test class (Selenium)',
    language: 'Java',
    purpose: 'For a Java team: drop this class into src/test/java in a Maven or Gradle project that has Selenium and ChromeDriver, then add assertions per test case.',
  },
  {
    field: 'generatedPlaywrightScript',
    title: 'Playwright spec — the script this run executed',
    language: 'JavaScript',
    purpose: 'Save this as a .spec.js inside a Playwright project and run `npx playwright test` to reproduce exactly what ZER0 did.',
  },
];

const SCRIPT_URL = /const\s+(?:OTT_URL|BASE_URL)\s*=\s*["']([^"']+)["']/;

export function buildAutomationSummary(bundle, { targetUrl = '' } = {}) {
  const metadata = bundle?.metadata || {};
  const candidates = bundle?.selectorCandidates && typeof bundle.selectorCandidates === 'object'
    ? bundle.selectorCandidates
    : {};
  const elements = buildElements(candidates);

  const keyBySelector = new Map();
  for (const element of elements) {
    for (const locator of element.locators) {
      if (!keyBySelector.has(locator.value)) keyBySelector.set(locator.value, element.key);
    }
  }
  const script = bundle?.generatedPlaywrightScript;
  const lookup = {
    candidates,
    keyBySelector,
    targetUrl: targetUrl || SCRIPT_URL.exec(String(script || ''))?.[1] || '',
  };

  const parsed = parsePlaywrightTests(script);
  const explained = parsed
    .map((test) => ({
      title: test.title,
      steps: test.statements.map((statement) => describeStatement(statement, lookup)),
    }))
    .filter((test) => test.steps.some((step) => step.text));

  const outline = (bundle?.generatedScriptSnippet || [])
    .map((line) => describeStatement(line, lookup))
    .filter((step) => step.text);

  const flows = explained.length > 0
    ? explained
    : outline.length > 0
      ? [{ title: 'Test flow', steps: outline }]
      : [];

  const scripts = SCRIPT_FIELDS
    .filter(({ field }) => typeof bundle?.[field] === 'string' && bundle[field].trim())
    .map((script) => ({ ...script, id: script.field, code: bundle[script.field].trim() }));

  const caseIds = (bundle?.mappedManualCaseIds || []).filter(Boolean);
  const locatorCount = elements.reduce((total, element) => total + element.locators.length, 0);

  return {
    generation: describeGeneration(metadata.llm),
    language: metadata.scriptingLanguage || 'Java',
    framework: metadata.framework || 'Selenium',
    profile: metadata.profile || '',
    caseIds,
    elements,
    flows,
    scripts,
    hints: bundle?.llmHints || [],
    stats: {
      caseCount: caseIds.length,
      elementCount: elements.length,
      locatorCount,
      stepCount: flows.reduce((total, flow) => total + flow.steps.length, 0),
      flowCount: flows.length,
    },
  };
}
