import { useMemo } from 'react';
import { SubTabs, type SubTabDef } from '@/components/layout/SubTabs';
import { Card, CardGrid } from '@/components/ui/Card';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { Diagram } from '@/components/ui/Diagram';
import { FlawItem } from '@/components/ui/FlawItem';
import { Note } from '@/components/ui/Note';
import { Pipeline, PipelineStage } from '@/components/ui/PipelineStage';
import { ProvidersTable } from '@/components/ui/ProvidersTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useHashTab } from '@/hooks/useHashTab';
import { ACCEPTANCE, GAPS, NEXT_MILESTONE, PHASES, TAXONOMY, WIRING } from '@/data/nextMilestone';

const NEXT_TABS = [
  { id: 'next-ms-gap', label: 'The gap', tag: 'why now' },
  { id: 'next-ms-taxonomy', label: 'Taxonomy', tag: '14 → 60+' },
  { id: 'next-ms-design', label: 'Design', tag: 'contract + gate' },
  { id: 'next-ms-plan', label: 'Delivery', tag: '6 phases' },
  { id: 'next-ms-wiring', label: 'Acceptance', tag: 'verify + wiring' },
] as const satisfies readonly SubTabDef[];

function Gap() {
  return (
    <>
      <h3>The gap · what a URL buys you today</h3>
      <p className="sub">
        Q1–Q4 taught ZER0 to crawl a site, guess what kind of site it is, and generate cases without
        a human. The guess is one word wide. Everything below that word is a constant, so two sites
        that share a domain get the same test plan no matter how different their funnels are.
      </p>

      <Diagram ariaLabel="how classification flows today">
        {`executor  ─ crawl 8 pages ─ detectWebsiteType ─ generateMajorFunctionalCases ─┐
                    (rich JSON)      landing text only      cases are FINAL here      │
                                     one flat type                                    │
                                                                                      │
orchestrator ─────────────────────── domainInference (LLM, low confidence only) ──────┴──▶ BA
                                     writes inferred* onto baInsights
                                     nothing downstream reads them`}
      </Diagram>

      <p className="prose">
        Two things are wrong with that picture, and they compound. The classifier is too coarse to
        say anything useful, and the one component that could refine it runs after the only consumer
        that mattered.
      </p>

      {GAPS.map((g) => (
        <FlawItem key={g.tag} severity={g.severity} tag={g.tag} title={g.title}>
          {g.detail}
        </FlawItem>
      ))}

      <Note tone="info">
        None of these are bugs against the Q1–Q4 specs — each milestone did what it promised. They
        are the seam that appears once all four are in place and you point the pipeline at a long
        tail of real sites.
      </Note>
    </>
  );
}

function Taxonomy() {
  return (
    <>
      <h3>Taxonomy · a second level under the 14 domains</h3>
      <p className="sub">
        Domains stay exactly as they are — the same <code>WEBSITE_TYPES</code> keys, the same
        detection, the same confidence. Each one gains a <code>subTypes</code> map that carries its
        own indicators and its own test priorities. The third column is the payoff: it is what the
        generated cases should say and currently cannot.
      </p>

      <ProvidersTable
        caption="Proposed sub-domains per domain. Names are keys, not display strings — the LLM enum is built from them."
        headers={[
          'Domain',
          'Proposed sub-domains',
          'What the split changes in the generated tests',
        ]}
        rows={TAXONOMY.map((t) => [
          <>
            <code>{t.domain}</code>
            <br />
            {t.domainName}
          </>,
          <code key="sub">{t.subDomains}</code>,
          t.delta,
        ])}
      />

      <h3>Shape of a sub-type entry</h3>
      <p className="prose">
        A sub-type is the same object as a domain, one level down, so scoring code is shared rather
        than duplicated. <code>pathPatterns</code> is the one new field — sub-domains separate on
        URL paths (<code>/grocery</code>, <code>/live</code>, <code>/careers</code>) far more
        sharply than domains separate on hostnames.
      </p>
      <CodeBlock lang="js" label="packages/analyzer/lib/constants.js">
        {`ECOMMERCE: {
  name: 'E-commerce Platform',
  indicators: [...],            // unchanged
  urlPatterns: [...],           // unchanged
  testPriorities: [...],        // unchanged — now the fallback, not the answer
  criticalFlows: [...],
  subTypes: {                   // new
    grocery: {
      name: 'Online Grocery',
      indicators: ['fresh', 'pincode', 'delivery slot', 'substitute'],
      urlPatterns: ['bigbasket', 'instacart'],
      pathPatterns: ['/grocery', '/fresh', '/sm/'],
      testPriorities: ['Pincode serviceability', 'Delivery slot booking', 'Item substitution'],
      criticalFlows: ['Set pincode → add perishable → pick slot → checkout'],
    },
    fashion: { /* size + colour variant, size chart, returns window */ },
  },
}`}
      </CodeBlock>

      <Note tone="warn">
        <strong>Sub-domain means the taxonomy level, not DNS.</strong> It is the second half of{' '}
        <code>ECOMMERCE / grocery</code>, not the <code>shop</code> in <code>shop.example.com</code>
        . Hostname labels are a detection signal like any other; Q5 never routes or branches on
        them.
      </Note>
    </>
  );
}

function Design() {
  return (
    <>
      <h3>Design · one typed object, one gate</h3>
      <p className="sub">
        The whole milestone hangs on refusing to overwrite an enum with prose. Rules produce a typed
        pair, the LLM refines the unresolved half of that pair, and case generation reads the
        resolved result — in that order.
      </p>

      <h3>The contract</h3>
      <CodeBlock lang="js" label="webAnalysis.classification">
        {`{
  domain:            'ECOMMERCE',            // always a WEBSITE_TYPES key
  domainName:        'E-commerce Platform',
  domainConfidence:  0.9,
  subDomain:         'grocery',              // key within subTypes, or null
  subDomainName:     'Online Grocery',
  subConfidence:     0.62,
  source:            'rules',                // rules | llm | hybrid | cache
  signals:           ['urlPattern:bigbasket', 'nav:Fruits & Vegetables', 'form:pincode'],
  runnerUp:          { domain: 'RETAIL_STORE', domainConfidence: 0.41 },
  testPriorities:    [...],                  // sub-domain first, domain as fallback
  criticalFlows:     [...],
}`}
      </CodeBlock>
      <p className="prose">
        <code>websiteType</code> and <code>websiteTypeConfidence</code> keep today values and today
        meaning, so nothing that reads them has to change in the same commit. <code>signals</code>{' '}
        exists so a wrong answer is debuggable from <code>run.json</code> alone, and{' '}
        <code>runnerUp</code> is what a UI override menu offers first.
      </p>

      <h3>When the LLM is allowed to run</h3>
      <ProvidersTable
        caption="Today only the third row triggers a call. The second row is the new one, and it is the common case on real sites."
        headers={['Rule outcome', 'Sub-domain outcome', 'Action']}
        rows={[
          ['domainConfidence ≥ 0.5', 'subConfidence ≥ 0.5', 'No call. Rules win outright.'],
          [
            'domainConfidence ≥ 0.5',
            'subConfidence < 0.5 or null',
            'One call, sub-domain only, enum restricted to that domain subTypes. The domain is passed as fixed context, not as a question.',
          ],
          [
            'domainConfidence < 0.5, or GENERIC',
            'unknown',
            'One call for the pair. This is the Q4 gate, widened to return two fields instead of one.',
          ],
          [
            'any',
            'cache hit for this host within TTL',
            'No call. Reuse the stored classification and stamp source: cache.',
          ],
          [
            'any',
            'ZERO_LLM=off, no provider key, or the cap is hit',
            'No call. Rules stand, subDomain may stay null, and the run completes exactly as it does today.',
          ],
        ]}
      />

      <h3>Prompt v2</h3>
      <CodeBlock lang="js" label="services/orchestrator/llm/index.js · PROMPT_VERSIONS">
        {`domainSubdomain: {
  version: 'domainSubdomain.v2',
  system:
    'You classify a website from crawl JSON only. Choose values from the supplied enums. ' +
    'Reply with JSON only: {"domain":"<enum>","subDomain":"<enum|null>","subDomainLabel":"...",' +
    '"confidence":0.0,"subConfidence":0.0,"testPriorities":["..."],"criticalFlows":["..."],' +
    '"summary":"..."}. No markdown.',
}`}
      </CodeBlock>
      <p className="prose">
        The context adds <code>allowedDomains</code> and <code>allowedSubDomains</code> so the model
        cannot invent a key, and keeps the existing ~6k character cap. <code>subDomainLabel</code>{' '}
        is the free-text escape hatch for a site that genuinely fits no sub-type — it is recorded
        for taxonomy review and never assigned to <code>subDomain</code>. Any value outside the enum
        is dropped, not coerced.
      </p>

      <h3>After</h3>
      <Diagram ariaLabel="classification flow after Q5">
        {`executor  ─ crawl 8 pages ─ classify ─┬─ domain     (enum, scored on crawl corpus)
                                             └─ subDomain  (enum | null)
                                                    │
orchestrator ─ gate ─ [LLM only when unresolved] ─ classification ─ cache write
                                                    │
                                       resolvePriorities(subDomain → domain)
                                                    │
                                       top-up majorFunctionalCases ──▶ BA ──▶ manualQa`}
      </Diagram>
    </>
  );
}

function Delivery() {
  return (
    <>
      <h3>Delivery · six phases, each one shippable</h3>
      <p className="sub">
        Ordered so the risky part is last and every phase before it is inert. Phases 1 to 3 cannot
        change a run output at all; phase 5 is the first one a user would notice.
      </p>

      <Pipeline>
        {PHASES.map((p) => (
          <PipelineStage key={p.id} id={p.id} title={p.title}>
            <code>{p.where}</code> · {p.skill}
            <br />
            {p.body}
          </PipelineStage>
        ))}
      </Pipeline>

      <CardGrid columns={2}>
        <Card title="Out of scope">
          <ul className="compact">
            <li>DNS subdomain routing or per-hostname run splitting</li>
            <li>Per-page classification — one answer per run, per host</li>
            <li>Vision or screenshot models for classification</li>
            <li>Replacing rule-based detection when both confidences clear 0.5</li>
            <li>Local models such as Ollama</li>
            <li>A user-editable taxonomy in the UI; the enum ships in code</li>
          </ul>
        </Card>
        <Card title="Risks worth naming">
          <ul className="compact">
            <li>
              Sub-type indicator lists are hand-written, so a thin one silently scores zero. Phase 2
              needs a fixture per sub-domain, not per domain.
            </li>
            <li>
              Topping up cases in the orchestrator means case generation lives in two places.
              Extract the generator to a shared call rather than copying it.
            </li>
            <li>
              A cached wrong answer is worse than a fresh wrong one. TTL plus a visible override in
              phase 6 is the mitigation, not an extra.
            </li>
          </ul>
        </Card>
      </CardGrid>
    </>
  );
}

function Wiring() {
  return (
    <>
      <h3>Acceptance</h3>
      <p className="sub">
        Same checklist shape the Q1–Q4 specs use. Every line is mechanically checkable, which is
        what lets the probe below be honest rather than decorative.
      </p>
      <ul className="compact">
        {ACCEPTANCE.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>

      <h3>Verify</h3>
      <CodeBlock lang="bash" label="From the repo root">
        {`npm test -- test/domain-subdomain.test.js
npm run workflow:verify -- --milestone Q5
npm run workflow:status                      # Q5 should be the earliest unfinished`}
      </CodeBlock>

      <h3>The probe</h3>
      <p className="prose">
        <code>workflow:verify</code> runs static repo inspection, not Jest — it regexes source files
        for the signals a milestone claims. A Q5 probe in the same style as <code>checks.Q4()</code>
        :
      </p>
      <CodeBlock lang="js" label="support/agent-workflow/scripts/detect-milestone.js">
        {`Q5() {
  const constants = read('packages/analyzer/lib/constants.js');
  const detector  = read('packages/analyzer/lib/classify/subDomain.js');
  const llm       = read('services/orchestrator/llm/index.js');
  const cases     = read('packages/analyzer/lib/generate/majorFunctionalCases.js');

  const subTypeTaxonomy   = /subTypes\\s*:/.test(constants);
  const subDomainDetector = detector.length > 0 && /classification/.test(detector);
  const promptV2          = /domainSubdomain/.test(llm);
  const casesUseSubDomain = /subDomain/.test(cases);
  const subDomainTest     = read('test/domain-subdomain.test.js').length > 0;

  return {
    pass: subTypeTaxonomy && subDomainDetector && promptV2 && casesUseSubDomain && subDomainTest,
    details: { subTypeTaxonomy, subDomainDetector, promptV2, casesUseSubDomain, subDomainTest },
  };
},`}
      </CodeBlock>

      <h3>How Q5 was opened in the registry</h3>
      <p className="prose">
        The workflow refuses to invent milestones, so opening one is a deliberate five-file edit.
        All five are applied — <code>PRODUCT_ORDER</code> now runs to Q5 and{' '}
        <code>progress.json</code> carries <code>current: &quot;Q5&quot;</code>:
      </p>
      <ProvidersTable
        headers={['File', 'Change']}
        rows={WIRING.map((w) => [<code key="file">{w.file}</code>, w.change])}
      />

      <Note tone="warn">
        <strong>Open, not started.</strong> <code>npm run workflow:status</code> now reports Q5 as
        the earliest unfinished milestone and the probe fails on all five signals, which is the
        correct state for a milestone with no code behind it yet. Nothing in{' '}
        <code>packages/analyzer</code>, <code>services/orchestrator</code>, or{' '}
        <code>services/executor</code> has been touched — phase 1 is the first commit that changes
        runtime behaviour.
      </Note>
    </>
  );
}

export function NextMilestonePage() {
  const tabIds = useMemo(() => NEXT_TABS.map((t) => t.id), []);
  const [tab, setTab] = useHashTab(tabIds, 'next-ms-gap');

  return (
    <section className="section" id="next-ms-intro">
      <h2>
        Next milestone · {NEXT_MILESTONE.id} {NEXT_MILESTONE.name}{' '}
        <StatusBadge status={NEXT_MILESTONE.status} />
      </h2>
      <p className="sub">
        Capability M1–M7, packaging S0–S7, and product Q1–Q4 are closed. Q5 is the open one:{' '}
        <strong>the Web Analyzer resolves a domain and a sub-domain from the URL</strong>, and that
        pair is what decides which tests get written. Track <code>{NEXT_MILESTONE.track}</code> ·
        depends on {NEXT_MILESTONE.dependsOn} · spec at{' '}
        <code>support/agent-workflow/{NEXT_MILESTONE.spec}</code>.
      </p>

      <SubTabs tabs={NEXT_TABS} active={tab} onSelect={setTab} ariaLabel="Next milestone plan" />

      <div id={`subpanel-${tab}`} role="tabpanel" aria-labelledby={`subtab-${tab}`}>
        {tab === 'next-ms-gap' && <Gap />}
        {tab === 'next-ms-taxonomy' && <Taxonomy />}
        {tab === 'next-ms-design' && <Design />}
        {tab === 'next-ms-plan' && <Delivery />}
        {tab === 'next-ms-wiring' && <Wiring />}
      </div>
    </section>
  );
}
