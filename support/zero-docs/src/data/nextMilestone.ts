export const NEXT_MILESTONE = {
  id: 'Q5',
  track: 'product',
  name: 'Trustworthy site understanding and test-plan quality',
  spec: 'milestones/Q5-domain-subdomain.md',
  status: 'not-done',
  state: 'reopened',
  dependsOn: 'Q1 crawl · Q2 cases · Q3 flows · Q4 inference · M6 provider wiring',
  objective:
    'A URL-only run produces one evidence-backed classification and a measurably relevant test plan.',
} as const;

export interface BaselineItem {
  severity: 'p0' | 'p1' | 'p2';
  tag: string;
  title: string;
  detail: string;
}

export const BASELINE: readonly BaselineItem[] = [
  {
    severity: 'p0',
    tag: 'contract',
    title: 'The same run can carry several answers',
    detail:
      'domainClassification, baInsights, metadata, and siteOverview can disagree. Inference can still place a free-form display label in websiteType, where downstream code expects a stable key.',
  },
  {
    severity: 'p0',
    tag: 'quality',
    title: 'Implementation exists; proof does not',
    detail:
      'The current tests cover isolated happy paths, but no offline benchmark measures accuracy, abstention, or whether generated cases stop contradicting the site.',
  },
  {
    severity: 'p0',
    tag: 'verification',
    title: 'The release gate inspects strings, not behaviour',
    detail:
      'workflow:verify checks file existence and regular expressions. It does not run the classifier, constrained LLM merge, case generation, or a pipeline artifact.',
  },
  {
    severity: 'p1',
    tag: 'ownership',
    title: 'Taxonomy has two sources of truth',
    detail:
      'WEBSITE_TYPES and domainTaxonomy.js use separate shapes and naming conventions. They can drift without a failing contract test.',
  },
  {
    severity: 'p1',
    tag: 'scope',
    title: 'The first plan shipped breadth before confidence',
    detail:
      'A broad catalog, caching, and UI override were planned together. Q5 now limits supported sub-domains and proves quality before persisting or exposing decisions.',
  },
];

export interface Metric {
  metric: string;
  target: string;
  reason: string;
}

export const SUCCESS_METRICS: readonly Metric[] = [
  {
    metric: 'Domain accuracy',
    target: '≥ 90% top-1',
    reason: 'Wrong parent domains poison every downstream test choice.',
  },
  {
    metric: 'Sub-domain quality',
    target: '≥ 85% precision · ≥ 75% coverage',
    reason: 'Prefer an honest null over a confident but irrelevant test plan.',
  },
  {
    metric: 'Case relevance',
    target: '0 forbidden areas in top 5',
    reason: 'A site-specific label is worthless if the proposed tests still contradict the funnel.',
  },
  {
    metric: 'Plan differentiation',
    target: '≥ 3 of top 5 modules differ',
    reason: 'Same-domain pairs such as grocery/fashion must produce visibly different value.',
  },
  {
    metric: 'Determinism',
    target: '100% for identical fixtures',
    reason: 'Rules-only decisions must be reproducible and debuggable.',
  },
];

export interface Deliverable {
  id: string;
  title: string;
  where: string;
  body: string;
  exit: string;
}

export const DELIVERABLES: readonly Deliverable[] = [
  {
    id: 'D1',
    title: 'Characterize and benchmark',
    where: 'test/fixtures/classification · test/domain-classification-benchmark.test.js',
    body: 'Capture offline crawl fixtures for two sub-domains in each priority domain plus ambiguous and generic sites. Record the first implementation baseline before tuning.',
    exit: 'A failing benchmark describes the quality gap with numbers.',
  },
  {
    id: 'D2',
    title: 'One taxonomy, one contract',
    where: 'packages/analyzer/lib/classify · @zero/domain contract',
    body: 'Normalize canonical keys, display names, confidence, source, evidence, and runner-up behind one API. Keep legacy websiteType fields as derived compatibility aliases.',
    exit: 'Every artifact has one resolved answer; labels never occupy key fields.',
  },
  {
    id: 'D3',
    title: 'Calibrated rules and constrained inference',
    where: '@zero/analyzer · @zero/orchestrator/llm',
    body: 'Reorder the analyzer to crawl first, classify the canonical pair from the full corpus second, and generate cases last. Calibrate abstention against fixtures and let the LLM fill only unresolved enum-constrained fields.',
    exit: 'Rules-only and mocked-LLM suites meet the accuracy thresholds.',
  },
  {
    id: 'D4',
    title: 'Relevant cases, generated once',
    where: 'majorFunctionalCases.js · orchestrator pipeline',
    body: 'Resolve priorities after classification is final and generate cases once. Confident sub-domains remove irrelevant fallbacks while retaining shared essentials.',
    exit: 'Same-domain fixture pairs produce distinct, relevant top-five modules.',
  },
  {
    id: 'D5',
    title: 'End-to-end proof and operability',
    where: 'pipeline integration test · run.json metadata · workflow verifier',
    body: 'Prove the decision reaches Manual QA and execution, stamp safe decision evidence, and make workflow:verify execute behavioural tests.',
    exit: 'One command exercises the promised behaviour and a wrong answer is reproducible from its artifact.',
  },
];

export const PRIORITY_DOMAINS = [
  'ECOMMERCE',
  'OTT_STREAMING',
  'BANKING_FINANCE',
  'HEALTHCARE_PHARMA',
  'TRAVEL_BOOKING',
  'SAAS',
] as const;

export const ACCEPTANCE: readonly string[] = [
  'A versioned offline fixture manifest records expected classification, capabilities, and forbidden case areas.',
  'All key fields are enum-validated; display labels are never accepted as keys.',
  'classification is the only mutable answer across analyzer, executor, and orchestrator boundaries.',
  'Legacy websiteType fields remain compatible and are derived from classification.',
  'Weak evidence abstains or triggers one constrained inference call.',
  'Domain and sub-domain classification run after the bounded crawl and consume its structural signals.',
  'Rules-only and mocked-LLM benchmarks meet the published success measures.',
  'Case generation runs once after final classification.',
  'Same-domain fixture pairs produce distinct, relevant top-five modules.',
  'An integration test proves classification reaches Manual QA and execution input.',
  'Q1–Q4 regression tests pass.',
  'workflow:verify runs behavioural tests; static probes alone cannot close Q5.',
];

export const RELEASE_STEPS: readonly string[] = [
  'Land fixtures and characterization tests without changing runtime output.',
  'Introduce the canonical contract with compatibility aliases.',
  'Switch analyzer and inference writers to the canonical contract.',
  'Switch case generation only after benchmark thresholds pass.',
  'Fall back to domain-level priorities if the quality gate regresses.',
];

export const OUT_OF_SCOPE: readonly string[] = [
  'Classification caching or a new classification table (host-scoped agent_memory already exists and must not store taxonomy keys)',
  'A user override or pipeline pause/resume UI',
  'A user-editable taxonomy',
  'DNS subdomain routing or per-page classification',
  'Vision models, local models, or unbounded crawling',
  'Exhaustive taxonomy expansion outside the six priority domains',
];

export const DEFINITION_OF_DONE: readonly string[] = [
  'Every acceptance item is green.',
  'Behavioural verification and Q1–Q4 regressions pass.',
  'The benchmark report is committed and meets all targets.',
  'progress.json changes to done only after verification.',
  'Architecture and Next Milestone docs show the same status.',
];
