import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import AutomationTab from '../src/views/runDetail/AutomationTab';

const script = `import { test, expect } from '@playwright/test';

const OTT_URL = "https://shop.example.com/";

test("channel flow regression", async ({ page }) => {
  await page.goto(OTT_URL, { waitUntil: 'domcontentloaded' });
  await clickFirstAvailable(page, ["button:has-text('Add to Cart')","[class*='add-to-cart']"]);
});
`;

function makeRun(overrides = {}) {
  return {
    input: { ottUrl: 'https://shop.example.com/' },
    artifacts: {
      automationBundle: {
        metadata: {
          scriptingLanguage: 'Java',
          framework: 'Selenium (Java); Playwright (runtime)',
          llm: { used: false, fallbackReason: 'no_key', fallbackDetail: 'Incorrect API key provided: sk-live-123' },
        },
        selectorCandidates: {
          addToCart: ["button:has-text('Add to Cart')", "[class*='add-to-cart']"],
        },
        mappedManualCaseIds: ['TC-MAJ-001'],
        generatedPlaywrightScript: script,
        generatedSeleniumJava: 'public class ShopTest {}',
        ...overrides,
      },
    },
  };
}

describe('AutomationTab', () => {
  it('explains the run in plain language before showing any code', () => {
    render(<AutomationTab run={makeRun()} />);

    expect(screen.getByText('Open https://shop.example.com/')).toBeInTheDocument();
    expect(screen.getByText('Click the Add-to-cart button')).toBeInTheDocument();
    expect(screen.getAllByText('Button showing the text “Add to Cart”').length).toBeGreaterThan(0);
  });

  it('explains a template fallback without echoing the provider error detail', () => {
    const { container } = render(<AutomationTab run={makeRun()} />);

    const note = container.querySelector('.auto-note');
    expect(note).toHaveTextContent('No AI provider key is configured, so ZER0 used its built-in templates.');
    expect(note.textContent).not.toContain('sk-live-123');
  });

  it('keeps generated code collapsed behind a labeled disclosure with a copy action', async () => {
    const user = userEvent.setup();
    render(<AutomationTab run={makeRun()} />);

    const java = screen.getByText('Java test class (Selenium)').closest('details');
    expect(java).not.toHaveAttribute('open');

    await user.click(java.querySelector('summary'));
    await user.click(within(java).getByRole('button', { name: /copy java code/i }));

    expect(await navigator.clipboard.readText()).toBe('public class ShopTest {}');
    expect(await within(java).findByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('waits for the agent when the bundle is missing', () => {
    render(<AutomationTab run={{ artifacts: {} }} />);

    expect(screen.getByText('Awaiting…')).toBeInTheDocument();
  });
});
