/**
 * Q5 — the first product milestone after Q1–Q4 closed.
 *
 * Open in the registry (`progress.json` current, `PRODUCT_ORDER`, `checks.Q5()`) but not
 * started: no runtime code behind it yet, so the probe is expected to fail on all signals.
 */
export const NEXT_MILESTONE = {
  id: 'Q5',
  track: 'product',
  name: 'Domain + sub-domain classification',
  spec: 'milestones/Q5-domain-subdomain.md',
  status: 'not-done',
  dependsOn: 'Q1 (rich crawl JSON) · Q2 (case generation) · Q4 (LLM gate) · M6 (LLM wiring)',
} as const;

export interface TaxonomyRow {
  /** `WEBSITE_TYPES` key in packages/analyzer/lib/constants.js. */
  domain: string;
  domainName: string;
  subDomains: string;
  /** Why one shared test plan per domain is not good enough. */
  delta: string;
}

/**
 * Proposed second level. Domains are today's 14 `WEBSITE_TYPES` keys, unchanged;
 * each gains a `subTypes` map with its own indicators, testPriorities, and criticalFlows.
 */
export const TAXONOMY: readonly TaxonomyRow[] = [
  {
    domain: 'ECOMMERCE',
    domainName: 'E-commerce Platform',
    subDomains: 'fashion · grocery · electronics · subscription-box · d2c-brand',
    delta:
      'Grocery needs delivery-slot selection and item substitution; fashion needs size and colour variants before add-to-cart. Both get the identical search / cart / checkout triple today.',
  },
  {
    domain: 'RETAIL_STORE',
    domainName: 'Retail Store Website',
    subDomains: 'supermarket-chain · department-store · specialty-store · store-locator-only',
    delta:
      'A store-locator site has no cart at all yet still inherits checkout cases. Chains need branch or pincode selection before any price on the page is real.',
  },
  {
    domain: 'HEALTHCARE_PHARMA',
    domainName: 'Healthcare/Pharmaceutical',
    subDomains:
      'provider-portal · online-pharmacy · telehealth · diagnostics-lab · pharma-corporate',
    delta:
      'Online pharmacy is a cart flow gated on prescription upload; telehealth is appointment booking plus video consent. Same domain, disjoint critical flows.',
  },
  {
    domain: 'BANKING_FINANCE',
    domainName: 'Banking/Finance Portal',
    subDomains: 'retail-banking · trading-brokerage · insurance · lending · crypto-exchange',
    delta:
      'Insurance leads with quote and premium calculator, trading with watchlist and order ticket. Both currently receive the same generic login / fund-transfer priorities.',
  },
  {
    domain: 'OTT_STREAMING',
    domainName: 'OTT/Streaming Platform',
    subDomains: 'svod · avod · live-sports · mvpd-tv-everywhere · music-audio',
    delta:
      'AVOD must assert ad-break behaviour, live sports needs concurrency limits and DVR seek, SVOD needs entitlement and profile switching. One playback case covers none of them properly.',
  },
  {
    domain: 'CORPORATE',
    domainName: 'Corporate Website',
    subDomains: 'brochure · careers-recruiting · investor-relations · support-knowledge-base',
    delta:
      'A careers site has an apply-and-upload funnel worth real coverage; a brochure site does not. Today both get navigation plus contact form.',
  },
  {
    domain: 'FOOD_DELIVERY',
    domainName: 'Food Delivery Platform',
    subDomains: 'restaurant-aggregator · single-restaurant · grocery-delivery · cloud-kitchen',
    delta:
      'Aggregators need address, then restaurant list, then menu. A single-restaurant site skips discovery entirely and starts at the menu, so the first two steps always fail.',
  },
  {
    domain: 'TRAVEL_BOOKING',
    domainName: 'Travel Booking Platform',
    subDomains: 'airline · hotel · ota · car-rental · rail-bus',
    delta:
      'Airline search is origin, destination, date, passengers, fare family. Hotel search is location, date range, occupancy, room type. The form models are not interchangeable.',
  },
  {
    domain: 'EDUCATION',
    domainName: 'Education Platform',
    subDomains: 'lms · mooc-marketplace · k12-school · test-prep · university',
    delta:
      'An LMS needs enrolled-course progress and assignment submission. A university site is closer to corporate plus an admissions enquiry funnel.',
  },
  {
    domain: 'NEWS_MEDIA',
    domainName: 'News/Media Website',
    subDomains: 'general-news · trade-niche · blog-publisher · paywalled-subscription',
    delta:
      'Paywalled titles need metering, the sign-in wall, and the subscribe flow as first-class cases. Free titles need feed, article, and search.',
  },
  {
    domain: 'SOCIAL_MEDIA',
    domainName: 'Social Media Platform',
    subDomains: 'social-network · forum-community · ugc-video · messaging',
    delta:
      'Forums centre on thread create, reply, and moderate. UGC video centres on upload, playback, and feed ranking.',
  },
  {
    domain: 'SAAS',
    domainName: 'SaaS Platform',
    subDomains: 'b2b-dashboard · developer-tools · crm · collaboration · analytics',
    delta:
      'Developer tools need API keys, docs, and a sandbox. A CRM needs record CRUD and pipeline stages. Sign-up plus dashboard covers neither.',
  },
  {
    domain: 'MARKETPLACE',
    domainName: 'Marketplace Platform',
    subDomains: 'c2c-classifieds · b2b-wholesale · services-marketplace · rentals',
    delta:
      'C2C needs a list-an-item seller flow alongside buying. Services need availability and booking rather than a cart.',
  },
  {
    domain: 'GENERIC',
    domainName: 'Website',
    subDomains: 'resolved by LLM, or left null',
    delta:
      'Stays the escape hatch. Q5 changes what the LLM may return: a pair drawn from the enums where one fits, instead of a free-form string that overwrites the taxonomy key.',
  },
];

export interface GapRow {
  severity: 'p0' | 'p1' | 'p2';
  tag: string;
  title: string;
  detail: string;
}

/** Why Q5 exists — each item is a specific behaviour in the code today, not a wish. */
export const GAPS: readonly GapRow[] = [
  {
    severity: 'p0',
    tag: 'taxonomy',
    title: 'One test plan per domain, for every site in it',
    detail:
      'WEBSITE_TYPES is flat: 14 entries, each with a fixed testPriorities and criticalFlows array. detectWebsiteType picks a winner and attaches that array verbatim, so a grocery chain and a fashion label classified ECOMMERCE receive byte-identical priorities.',
  },
  {
    severity: 'p0',
    tag: 'dead-end',
    title: 'The LLM answer is stored and never read',
    detail:
      'inferDomain.js writes inferredTestPriorities and inferredCriticalFlows onto baInsights. No other module reads either field. The one inference call a run pays for cannot change a single generated test case.',
  },
  {
    severity: 'p0',
    tag: 'ordering',
    title: 'Cases are generated before the site is understood',
    detail:
      'generateMajorFunctionalCases runs inside the executor webAnalyzer job. Domain inference runs afterwards in the orchestrator, between Web Analyzer and BA. By the time confidence is resolved the cases are already final.',
  },
  {
    severity: 'p1',
    tag: 'contract',
    title: 'Inference overwrites the enum with prose',
    detail:
      'On merge, baInsights.websiteType is replaced by the free-form domainLabel, so it stops being a WEBSITE_TYPES key. consolidateRequirements then recovers a profile by substring matching the prose — includes("retail"), includes("e-commerce"). A typed pair removes the guessing.',
  },
  {
    severity: 'p1',
    tag: 'signals',
    title: 'Crawl evidence is collected, then ignored by the classifier',
    detail:
      'Q1 already returns navLabels, path, formCount, and elementCounts for up to 8 pages, and forms carry purpose plus purposeConfidence. detectWebsiteType still reads only the landing page innerText, title, and meta description.',
  },
  {
    severity: 'p2',
    tag: 'hardcode',
    title: 'A single customer is pinned in the classifier',
    detail:
      'A hostname containing "saravana" is forced to RETAIL_STORE at 0.95 confidence. That branch is a sub-domain rule wearing a disguise — supermarket-chain urlPatterns is its general form.',
  },
  {
    severity: 'p2',
    tag: 'cache',
    title: 'Every run reclassifies the same host from scratch',
    detail:
      'Nothing persists the resolved type per host, even though element_locators already keys on host. A second run against the same site repeats the crawl scoring and, on low confidence, pays for the LLM call again.',
  },
];

export interface PhaseRow {
  id: string;
  title: string;
  where: string;
  skill: string;
  body: string;
}

/** Ordered so that every phase is shippable and phase 5 is where output visibly changes. */
export const PHASES: readonly PhaseRow[] = [
  {
    id: '01',
    title: 'Two-level taxonomy',
    where: 'packages/analyzer/lib/constants.js',
    skill: '/zero-analyzer',
    body: 'Give each WEBSITE_TYPES entry a subTypes map: key to { name, indicators[], urlPatterns[], pathPatterns[], testPriorities[], criticalFlows[] }. Existing fields are untouched, nothing reads subTypes yet, so this phase cannot regress a run.',
  },
  {
    id: '02',
    title: 'Rule-based sub-domain detection',
    where: 'packages/analyzer/lib/classify/subDomain.js (new) + websiteType.js',
    skill: '/zero-analyzer',
    body: 'Score the winning domain subTypes over the whole crawl corpus — nav labels, path segments, form purposes, element category counts — not just landing-page text. Emit the classification object beside today websiteType. Retire the saravana branch into supermarket-chain urlPatterns.',
  },
  {
    id: '03',
    title: 'Carry the contract across the queue',
    where: 'services/executor/jobs.js',
    skill: '/zero-executor',
    body: 'Map classification onto webAnalysis.classification and through to run.input._webAnalysisInsights. websiteType and websiteTypeConfidence keep their current meaning for every existing consumer.',
  },
  {
    id: '04',
    title: 'Constrained LLM gate',
    where: 'services/orchestrator/inferDomain.js · llm/index.js',
    skill: '/zero-orchestrator',
    body: 'Add domainSubdomain.v2 with the allowed enums in the context, extend the gate to also fire when the domain is confident but the sub-domain is not, and merge into classification only. The LLM may refine, never overwrite, the enum domain.',
  },
  {
    id: '05',
    title: 'Make it change the generated tests',
    where: 'packages/analyzer/lib/generate/majorFunctionalCases.js · orchestrator/pipeline.js',
    skill: '/zero-analyzer · /zero-orchestrator',
    body: 'resolvePriorities() prefers sub-domain lists and falls back to domain. Top up major functional cases in the orchestrator after the gate so inferred priorities reach manualQa. consolidateRequirements maps classification.domain to profileKey by enum lookup instead of substring matching.',
  },
  {
    id: '06',
    title: 'Cache the answer, show the answer',
    where: 'packages/db · web/src/views',
    skill: '/zero-db · /zero-web',
    body: 'A site_classification table keyed on host (domain, sub_domain, confidences, source, updated_at) with TTL reuse, so repeat runs skip inference. The run view shows Domain to Sub-domain with confidence and source, and lets a user override before BA.',
  },
];

/** Mirrors the `## Acceptance` checklist style used by the Q1–Q4 specs. */
export const ACCEPTANCE: readonly string[] = [
  'Every WEBSITE_TYPES entry defines subTypes; GENERIC may define none',
  'detectWebsiteType returns classification with domain, subDomain, and separate confidences',
  'Sub-domain scoring reads crawledPages nav labels, paths, and form purposes — proven by a fixture with a misleading landing page',
  'websiteType and websiteTypeConfidence keep their present values and are never overwritten by the LLM',
  'PROMPT_VERSIONS.domainSubdomain exists and the prompt carries the allowed enum lists',
  'The gate fires on unresolved sub-domain, not only on low domain confidence or GENERIC',
  'majorFunctionalCases prefers sub-domain priorities, and a grocery fixture yields different cases than a fashion fixture',
  'Without a provider key the pipeline completes on rules alone, with subDomain null and no error',
  'A second run against the same host reuses the cached classification and makes no LLM call',
  'test/domain-subdomain.test.js passes with a mock LLM provider',
  'npm run workflow:verify -- --milestone Q5 exits 0',
];

export interface WiringRow {
  file: string;
  change: string;
}

/** The five edits that opened Q5 in the agent-workflow registry. All applied. */
export const WIRING: readonly WiringRow[] = [
  {
    file: 'support/agent-workflow/milestones/Q5-domain-subdomain.md',
    change:
      'New spec using the Q4 headings: North star, Depends on, Workspaces, Scope, Acceptance, Out of scope, Verify.',
  },
  {
    file: 'support/agent-workflow/scripts/detect-milestone.js',
    change: "Append 'Q5' to PRODUCT_ORDER and add a checks.Q5() probe.",
  },
  {
    file: 'support/agent-workflow/scripts/verify-milestone.js',
    change: "Add 'Q5' to the order array so out-of-order verification still warns correctly.",
  },
  {
    file: 'support/agent-workflow/progress.json',
    change:
      'Add product.Q5 with status not-done, then set current to Q5 and track to product. This is the switch that ends the all-green state.',
  },
  {
    file: 'support/zero-docs/src/data/migration.ts',
    change: 'Append Q5 to PRODUCT so the Architecture milestone score strip lists it.',
  },
];
