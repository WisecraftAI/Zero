export const SITE_NAME = 'ZER0';

// Social scrapers reject images below 200x200, which rules out zero-mark.png
// (192px). Update the dimensions with the asset — Facebook and LinkedIn use
// them to reserve layout before the image itself has downloaded.
export const SEO_IMAGE_PATH = '/zero-icon.png';
export const SEO_IMAGE_SIZE = 256;

const PAGE_SEO = {
  home: {
    title: 'ZER0 · AI QA Orchestration',
    description:
      'Turn any public URL into requirements, manual test cases, Playwright and Selenium automation, execution evidence, and a release report.',
    public: true,
  },
  dashboard: {
    title: 'QA Dashboard · ZER0',
    description:
      'Monitor QA runs, pipeline health, pass rates, findings, and release readiness from the ZER0 operator dashboard.',
  },
  runs: {
    title: 'QA Runs · ZER0',
    description:
      'Review current and completed ZER0 QA runs, their execution status, evidence, generated automation, and release reports.',
  },
  'new-run': {
    title: 'Start a QA Run · ZER0',
    description:
      'Start an autonomous or guided QA run from a public URL, requirements notes, Figma designs, or uploaded test cases.',
  },
  locators: {
    title: 'Locator Intelligence · ZER0',
    description:
      'Inspect reusable, learned, and host-specific element locators used by ZER0 to generate and heal browser automation.',
  },
  apikeys: {
    title: 'AI Provider Keys · ZER0',
    description:
      'Configure encrypted OpenAI, Anthropic, and Gemini provider credentials used by ZER0 QA agents.',
  },
  agents: {
    title: 'QA Agents · ZER0',
    description:
      'Configure the business analyst, manual QA, automation QA, and manager agents that power the ZER0 pipeline.',
  },
  integrations: {
    title: 'Integrations · ZER0',
    description:
      'Connect and review the external services used by the ZER0 QA orchestration pipeline.',
  },
};

const RUN_TAB_SEO = {
  webAnalysis: ['Web Analysis', 'Review the crawled pages, detected product domain, structure, and functional insights for this QA run.'],
  requirements: ['Requirements', 'Review the consolidated business requirements and acceptance criteria produced for this QA run.'],
  manual: ['Manual Test Cases', 'Review the risk-based manual test cases, priorities, and expected results produced for this QA run.'],
  automation: ['Test Automation', 'Review generated Playwright and Java Selenium automation, locators, and coverage for this QA run.'],
  execution: ['Execution Results', 'Review browser execution results, retries, screenshots, failures, and pass rate for this QA run.'],
  accessibility: ['Accessibility Results', 'Review accessibility checks and findings captured for this QA run.'],
  performance: ['Performance Results', 'Review browser performance checks and findings captured for this QA run.'],
  security: ['Security Results', 'Review browser security checks and findings captured for this QA run.'],
  manager: ['Manager Report', 'Review release risk, quality signals, and the go or hold recommendation for this QA run.'],
  recording: ['Recording', 'Review the browser recording and captured interaction evidence attached to this QA run.'],
  'element-log': ['Element Log', 'Review observed page elements and locator evidence captured during this QA run.'],
  flow: ['Flow Diagram', 'Review the end-to-end QA pipeline stages, handoffs, and current status for this run.'],
};

const FALLBACK_SEO = {
  title: 'ZER0 · AI QA Orchestration',
  description: 'Run and review AI-assisted quality assurance workflows with ZER0.',
};

export function resolvePublicOrigin(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error(`VITE_PUBLIC_SITE_URL is not a valid URL: ${raw}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`VITE_PUBLIC_SITE_URL must be http or https, got: ${raw}`);
  }

  const hostnamePattern =
    /^(localhost|[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+)$/i;
  if (!hostnamePattern.test(url.hostname)) {
    throw new Error(`VITE_PUBLIC_SITE_URL has an invalid hostname: ${url.hostname}`);
  }
  return url.origin;
}

export function seoForRoute(route, allowIndexing = false) {
  if (route?.view === 'run-detail') {
    const [label, description] = RUN_TAB_SEO[route.tab] ?? [
      'Run Details',
      'Review pipeline progress, generated QA artifacts, execution evidence, findings, and reports for this ZER0 run.',
    ];
    return {
      title: `${label} · ZER0`,
      description,
      robots: 'noindex, nofollow',
    };
  }

  const page = PAGE_SEO[route?.view] ?? FALLBACK_SEO;
  return {
    title: page.title,
    description: page.description,
    robots: allowIndexing && page.public ? 'index, follow' : 'noindex, nofollow',
  };
}
