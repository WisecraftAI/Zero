import { describe, expect, it } from 'vitest';
import {
  buildAutomationSummary,
  describeGeneration,
  describeSelector,
  humanizeElementKey,
  parsePlaywrightTests,
} from '../src/views/runDetail/automationSummary';

const playwrightScript = `import { test, expect } from '@playwright/test';

const OTT_URL = "https://shop.example.com/";

async function clickFirstAvailable(page, selectors) {
  return false;
}

test("channel flow regression", async ({ page }) => {
  await page.goto(OTT_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();
  await clickFirstAvailable(page, ["button:has-text('Login')","a:has-text('Sign in')"]);
  await page.waitForTimeout(800);
  await expectFirstAvailable(page, ["[aria-label*='Pause']"]);
});
`;

const bundle = {
  metadata: {
    scriptingLanguage: 'Java',
    framework: 'Selenium (Java); Playwright (runtime)',
    profile: 'E-commerce Platform',
    llm: { used: false, fallbackReason: 'invalid_api_key', fallbackDetail: 'Incorrect API key provided: sk-live-123' },
  },
  selectorCandidates: {
    loginCta: ["button:has-text('Login')", "a:has-text('Sign in')"],
    addToCart: ["button:has-text('Add to Cart')"],
  },
  mappedManualCaseIds: ['TC-1', 'TC-2'],
  generatedScriptSnippet: ['await page.goto(ottUrl)', 'await clickFirstAvailable(loginCta)'],
  generatedPlaywrightScript: playwrightScript,
  generatedSeleniumJava: 'public class ShopTest {}',
};

describe('humanizeElementKey', () => {
  it.each([
    ['loginCta', 'Login button'],
    ['addToCart', 'Add-to-cart button'],
    ['heroBannerCta', 'Hero banner button'],
    ['', 'Element'],
  ])('turns %s into a readable name', (key, expected) => {
    expect(humanizeElementKey(key)).toBe(expected);
  });
});

describe('describeSelector', () => {
  it.each([
    ["button:has-text('Add to Cart')", 'Button showing the text “Add to Cart”'],
    ['[data-testid="cart-btn"]', 'Element the site tags as “cart-btn” for testing'],
    ["a[href*='cart']", 'Link pointing at “cart”'],
    ["input[placeholder*='search' i]", 'Input box with the placeholder “search”'],
    ["[class*='product']", 'Element whose style class contains “product”'],
    ['nav', 'Navigation bar — any <nav> on the page'],
  ])('explains %s in plain language', (selector, expected) => {
    expect(describeSelector(selector)).toBe(expected);
  });

  it('describes a descendant selector as the inner element', () => {
    expect(describeSelector("[data-testid*='card'] a"))
      .toBe('Element the site tags as “card” for testing — specifically the link inside it');
  });

  it('falls back to a neutral phrase for unknown rules', () => {
    expect(describeSelector(':nth-child(3)')).toBe('Element matching a site-specific CSS rule');
    expect(describeSelector('main > :nth-child(3)'))
      .toBe('Main content area — specifically the element matching a site-specific CSS rule inside it');
  });
});

describe('parsePlaywrightTests', () => {
  it('keeps only statements inside test blocks', () => {
    const [test] = parsePlaywrightTests(playwrightScript);

    expect(test.title).toBe('channel flow regression');
    expect(test.statements).toHaveLength(5);
    expect(test.statements[0]).toContain('page.goto');
  });

  it('returns nothing for a script with no test block', () => {
    expect(parsePlaywrightTests('const a = 1;')).toEqual([]);
  });
});

describe('describeGeneration', () => {
  it('names the provider when the model was used', () => {
    expect(describeGeneration({ used: true, provider: 'openai', model: 'gpt-4o-mini' }))
      .toMatchObject({ mode: 'ai', label: 'AI-assisted (openai · gpt-4o-mini)' });
  });

  it('explains a fallback without leaking the provider error detail', () => {
    const generation = describeGeneration({
      used: false,
      fallbackReason: 'invalid_api_key',
      fallbackDetail: 'Incorrect API key provided: sk-live-123',
    });

    expect(generation.mode).toBe('template');
    expect(generation.note).toBe('The saved AI provider key was rejected, so ZER0 used its built-in templates.');
    expect(JSON.stringify(generation)).not.toContain('sk-live-123');
  });
});

describe('buildAutomationSummary', () => {
  it('explains the executed script step by step', () => {
    const { flows, stats } = buildAutomationSummary(bundle);

    expect(stats).toMatchObject({ caseCount: 2, elementCount: 2, locatorCount: 3, stepCount: 5 });
    expect(flows[0].steps.map((step) => step.text)).toEqual([
      'Open https://shop.example.com/',
      'Check that the page rendered',
      'Click the Login button',
      'Pause for 0.8 seconds',
      'Check that the element labeled “Pause” for screen readers is visible',
    ]);
  });

  it('names the element behind a step and lists its locators in order', () => {
    const [, , click] = buildAutomationSummary(bundle).flows[0].steps;

    expect(click.locators).toEqual([
      { value: "button:has-text('Login')", meaning: 'Button showing the text “Login”' },
      { value: "a:has-text('Sign in')", meaning: 'Link showing the text “Sign in”' },
    ]);
    expect(click.detail).toContain('first one visible');
  });

  it('falls back to the outline snippet when no script was generated', () => {
    const { flows } = buildAutomationSummary({ ...bundle, generatedPlaywrightScript: '' });

    expect(flows).toHaveLength(1);
    expect(flows[0].steps.map((step) => step.text)).toEqual([
      'Open the target website',
      'Click the Login button',
    ]);
  });

  it('lists generated scripts with guidance and skips empty ones', () => {
    const { scripts } = buildAutomationSummary({ ...bundle, generatedSeleniumJava: '   ' });

    expect(scripts.map((script) => script.id)).toEqual(['generatedPlaywrightScript']);
    expect(scripts[0].purpose).toContain('Playwright project');
  });

  it('returns an empty model for a missing bundle', () => {
    const summary = buildAutomationSummary(undefined);

    expect(summary.flows).toEqual([]);
    expect(summary.elements).toEqual([]);
    expect(summary.stats).toMatchObject({ caseCount: 0, elementCount: 0, stepCount: 0 });
  });
});
