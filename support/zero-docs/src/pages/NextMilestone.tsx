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
import {
  ACCEPTANCE,
  BASELINE,
  DEFINITION_OF_DONE,
  DELIVERABLES,
  NEXT_MILESTONE,
  OUT_OF_SCOPE,
  PRIORITY_DOMAINS,
  RELEASE_STEPS,
  SUCCESS_METRICS,
} from '@/data/nextMilestone';
import { UX_MILESTONE } from '@/data/uxMilestone';
import { useHashTab } from '@/hooks/useHashTab';

const NEXT_TABS = [
  { id: 'q5-outcome', label: 'Outcome', tag: 'measurable' },
  { id: 'q5-baseline', label: 'Baseline', tag: 'why reopened' },
  { id: 'q5-contract', label: 'Contract', tag: 'one answer' },
  { id: 'q5-delivery', label: 'Delivery', tag: '5 exits' },
  { id: 'q5-release', label: 'Release gate', tag: 'proof + DoD' },
] as const satisfies readonly SubTabDef[];

function Outcome() {
  return (
    <>
      <h3>Outcome · prove value before adding breadth</h3>
      <p className="sub">
        {NEXT_MILESTONE.objective} Q5 no longer closes because a taxonomy file exists. It closes
        when an offline benchmark and one pipeline test prove that classification is correct enough
        to improve the user&apos;s top test cases.
      </p>

      <ProvidersTable
        caption="Release targets. Fixtures are captured crawl artifacts, so the gate is deterministic and does not depend on the public internet."
        headers={['Measure', 'Target', 'Why it matters']}
        rows={SUCCESS_METRICS.map((item) => [item.metric, item.target, item.reason])}
      />

      <CardGrid columns={2}>
        <Card title="Supported in Q5">
          <p>Two sub-domains in each priority domain, plus ambiguous and generic fixtures:</p>
          <p>
            {PRIORITY_DOMAINS.map((domain) => (
              <code key={domain}>{domain} </code>
            ))}
          </p>
        </Card>
        <Card title="Fallback contract">
          <p>
            Every existing domain remains valid. Unsupported or uncertain sub-domains return{' '}
            <code>null</code> and use domain-level priorities. An honest fallback is a successful
            result, not a classification failure.
          </p>
        </Card>
      </CardGrid>

      <Note tone="info">
        <strong>Recovery milestone.</strong> The first Q5 implementation remains the baseline. Work
        starts with characterization tests, then repairs the contract in small, reversible slices.
      </Note>
    </>
  );
}

function Baseline() {
  return (
    <>
      <h3>Baseline · why Q5 was reopened</h3>
      <p className="sub">
        The first attempt shipped substantial code, but the milestone had no quality benchmark and
        its verifier did not exercise behaviour. “Implemented” and “trusted” became different
        states.
      </p>

      <Diagram ariaLabel="current classification ownership">
        {`analyzer ── websiteType + subDomain ──┐
                                               ├──▶ executor artifact
LLM ── free-form labels ──▶ baInsights ────────┤
                                               ├──▶ metadata / siteOverview
case generator ◀── whichever fields arrive ────┘

workflow:verify ── regex + file existence ──▶ status (behaviour not executed)`}
      </Diagram>

      {BASELINE.map((item) => (
        <FlawItem key={item.tag} severity={item.severity} tag={item.tag} title={item.title}>
          {item.detail}
        </FlawItem>
      ))}

      <Note tone="warn">
        Caching and a user override are deliberately removed from Q5. Persisting or exposing an
        unproven decision would amplify the current quality problem.
      </Note>
    </>
  );
}

function Contract() {
  return (
    <>
      <h3>Contract · one canonical answer</h3>
      <p className="sub">
        Keys drive code; names drive presentation. <code>classification</code> is mutable exactly
        once after optional inference. Every legacy field becomes a derived compatibility alias.
      </p>

      <CodeBlock lang="js" label="webAnalysis.classification">
        {`{
  domain: 'ECOMMERCE',                 // canonical WEBSITE_TYPES key
  domainName: 'E-commerce Platform',   // display only
  domainConfidence: 0.91,
  subDomain: 'GROCERY',                // canonical child key, or null
  subDomainName: 'Grocery and Daily Essentials',
  subDomainConfidence: 0.78,
  source: 'rules',                     // rules | llm | hybrid
  evidence: [
    { kind: 'nav', value: 'Fruits & Vegetables', weight: 0.18 },
    { kind: 'path', value: '/fresh', weight: 0.12 },
  ],
  runnerUp: { subDomain: 'D2C_BRAND', confidence: 0.31 },
}`}
      </CodeBlock>

      <ProvidersTable
        caption="Inference is an uncertainty handler, not a second unrestricted classifier."
        headers={['Rule result', 'Action', 'Guarantee']}
        rows={[
          [
            'Domain and sub-domain above calibrated thresholds',
            'Use rules',
            'No provider call; deterministic output.',
          ],
          [
            'Domain known, sub-domain unresolved',
            'Ask for one child key',
            'Domain is fixed and allowed child keys are supplied.',
          ],
          [
            'Domain unresolved or GENERIC',
            'Ask for the canonical pair',
            'Both values are enum-validated; invalid keys are discarded.',
          ],
          [
            'No provider, cap hit, or timeout',
            'Keep rules result',
            'Run completes; sub-domain may remain null.',
          ],
        ]}
      />

      <Diagram ariaLabel="target classification and case flow">
        {`captured crawl ──▶ calibrated rules ──▶ canonical classification
                                             │
                                  unresolved? ├── yes ─▶ constrained LLM ─┐
                                             │                           │
                                             └───────────────────────────┘
                                                                         │
                                       resolve priorities once ◀─────────┘
                                                 │
                                       major cases ─▶ Manual QA ─▶ execution`}
      </Diagram>
    </>
  );
}

function Delivery() {
  return (
    <>
      <h3>Delivery · five deliverables with explicit exits</h3>
      <p className="sub">
        The sequence isolates risk: first measure the existing result, then normalize the contract,
        then change decisions, and only then change generated tests.
      </p>

      <Pipeline>
        {DELIVERABLES.map((item) => (
          <PipelineStage key={item.id} id={item.id} title={item.title}>
            <code>{item.where}</code>
            <br />
            {item.body}
            <br />
            <strong>Exit:</strong> {item.exit}
          </PipelineStage>
        ))}
      </Pipeline>

      <CardGrid columns={2}>
        <Card title="Deploy order">
          <ol className="compact">
            {RELEASE_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </Card>
        <Card title="Rollback">
          <p>
            Keep domain-level priorities as the safe fallback. If benchmark quality regresses,
            disable the sub-domain consumer and retain canonical domain data; never serve a
            partially normalized artifact.
          </p>
        </Card>
      </CardGrid>
    </>
  );
}

function ReleaseGate() {
  return (
    <>
      <h3>Acceptance · behaviour, not file presence</h3>
      <ul className="compact">
        {ACCEPTANCE.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h3>Verify</h3>
      <CodeBlock lang="bash" label="From the repository root">
        {`npm test -- test/domain-subdomain.test.js
npm test -- test/domain-classification-benchmark.test.js
npm test -- test/domain-classification-pipeline.test.js
npm run workflow:verify -- --milestone Q5`}
      </CodeBlock>

      <Note tone="warn">
        Today <code>workflow:verify</code> is a static source probe. D5 must make the Q5 verifier
        run the targeted behavioural suites. Regex checks may remain diagnostic, but they cannot
        mark Q5 done.
      </Note>

      <CardGrid columns={2}>
        <Card title="Observability">
          <p>
            Each <code>run.json</code> records chosen keys, confidences, winning evidence, source,
            prompt version, fallback reason, and the taxonomy entry that supplied priorities. No
            provider key or prompt payload is logged.
          </p>
        </Card>
        <Card title="Out of scope">
          <ul className="compact">
            {OUT_OF_SCOPE.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      </CardGrid>

      <h3>Definition of done</h3>
      <ol className="compact">
        {DEFINITION_OF_DONE.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>

      <Note tone="info">
        <strong>Status remains not done.</strong> The existing implementation is input to D1, not
        evidence that Q5 has closed. Update <code>progress.json</code> only after every release gate
        above passes.
      </Note>
    </>
  );
}

export function NextMilestonePage() {
  const tabIds = useMemo(() => NEXT_TABS.map((tab) => tab.id), []);
  const [tab, setTab] = useHashTab(tabIds, 'q5-outcome');

  return (
    <section className="section" id="q5-intro">
      <h2>
        {NEXT_MILESTONE.id} · {NEXT_MILESTONE.name} <StatusBadge status={NEXT_MILESTONE.status} />
      </h2>
      <p className="sub">
        <strong>{NEXT_MILESTONE.state} after the first implementation attempt.</strong> Track{' '}
        <code>{NEXT_MILESTONE.track}</code> · depends on {NEXT_MILESTONE.dependsOn} · canonical spec{' '}
        <code>support/agent-workflow/{NEXT_MILESTONE.spec}</code>.
      </p>

      <SubTabs tabs={NEXT_TABS} active={tab} onSelect={setTab} ariaLabel="Q5 execution milestone" />

      <div id={`subpanel-${tab}`} role="tabpanel" aria-labelledby={`subtab-${tab}`}>
        {tab === 'q5-outcome' && <Outcome />}
        {tab === 'q5-baseline' && <Baseline />}
        {tab === 'q5-contract' && <Contract />}
        {tab === 'q5-delivery' && <Delivery />}
        {tab === 'q5-release' && <ReleaseGate />}
      </div>

      <Note tone="info">
        Queued in parallel: <code>{UX_MILESTONE.id}</code> {UX_MILESTONE.name}{' '}
        <StatusBadge status={UX_MILESTONE.status} /> — {UX_MILESTONE.objective} Spec{' '}
        <code>support/agent-workflow/{UX_MILESTONE.spec}</code>. DETECT still prefers Q5;
        implement U1/U2 via <code>/zero-web</code> when the work is UI/UX.
      </Note>
    </section>
  );
}
