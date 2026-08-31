import { useEffect, useRef, useState } from 'react';
import { buildAutomationSummary } from './automationSummary';
import { Awaiting, JsonToggle, Section, stableKey } from './shared';
import './AutomationTab.scss';

const FLOW_DISPLAY_LIMIT = 10;

function CopyButton({ code, label }) {
  const [state, setState] = useState('idle');
  const resetTimer = useRef(null);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const handleCopy = async () => {
    clearTimeout(resetTimer.current);
    try {
      await navigator.clipboard.writeText(code);
      setState('copied');
    } catch {
      setState('error');
    }
    resetTimer.current = setTimeout(() => setState('idle'), 2500);
  };

  return (
    <span className="auto-copy" role="status">
      <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopy}>
        {state === 'copied' ? 'Copied' : state === 'error' ? 'Copy failed — select the code instead' : `Copy ${label}`}
      </button>
    </span>
  );
}

function LocatorList({ locators }) {
  return (
    <ul className="auto-locators">
      {locators.map((locator) => (
        <li key={locator.value}>
          <span className="auto-locators__meaning">{locator.meaning}</span>
          <code className="auto-locators__value">{locator.value}</code>
        </li>
      ))}
    </ul>
  );
}

function FlowSteps({ steps }) {
  return (
    <ol className="auto-steps">
      {steps.map((step, index) => (
        <li key={stableKey(`${index}-${step.code}`, 'step')} className="auto-step">
          <span className="auto-step__index">{index + 1}</span>
          <div className="auto-step__body">
            <p className="auto-step__text">{step.text || 'Runs this line from the generated script'}</p>
            {step.detail ? <p className="auto-step__detail">{step.detail}</p> : null}
            {step.locators.length > 0 && (
              <details className="auto-step__locators">
                <summary>
                  {step.locators.length === 1
                    ? 'How it finds this element'
                    : `How it finds this element (${step.locators.length} attempts, in order)`}
                </summary>
                <LocatorList locators={step.locators} />
              </details>
            )}
            <code className="auto-step__code">{step.code}</code>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function AutomationTab({ run }) {
  const data = run.artifacts?.automationBundle;
  if (!data) return <Awaiting />;

  const summary = buildAutomationSummary(data, { targetUrl: run.input?.ottUrl });
  const { generation, stats } = summary;
  const visibleFlows = summary.flows.slice(0, FLOW_DISPLAY_LIMIT);

  return (
    <div className="automation-panel">
      <div className="auto-intro">
        <p className="auto-intro__lede">
          The Automation QA agent built a browser script for this site
          {stats.caseCount > 0
            ? ` from ${stats.caseCount} manual test case${stats.caseCount === 1 ? '' : 's'}`
            : ''}
          , and worked out how to find {stats.elementCount} kind{stats.elementCount === 1 ? '' : 's'} of element on
          the page. Everything below explains that script in plain language — the code itself is at the bottom, for
          whoever has to run or extend it.
        </p>
        <div className="automation-meta">
          <span className="lang-tag">{summary.language}</span>
          <span className="framework-tag">{summary.framework}</span>
          {summary.profile ? <span className="framework-tag">{summary.profile}</span> : null}
        </div>
        <div className="vitals-grid">
          <div className="vital-card">
            <div className="vital-label">Test cases automated</div>
            <div className="vital-value">{stats.caseCount}</div>
          </div>
          <div className="vital-card">
            <div className="vital-label">Steps in the flow</div>
            <div className="vital-value">{stats.stepCount}</div>
          </div>
          <div className="vital-card">
            <div className="vital-label">Elements located</div>
            <div className="vital-value">{stats.elementCount}</div>
            <div className="agent-counts">{stats.locatorCount} locators with backups</div>
          </div>
          <div className="vital-card">
            <div className="vital-label">Built by</div>
            <div className="vital-value">{generation.label}</div>
          </div>
        </div>
        <p className={`auto-note auto-note--${generation.mode}`}>{generation.note}</p>
      </div>

      {summary.flows.length > 0 && (
        <Section title="What the script does, step by step">
          <p className="auto-section-summary">
            Read top to bottom — this is the journey ZER0 drove through the site.
            {summary.flows.length > FLOW_DISPLAY_LIMIT
              ? ` Showing the first ${FLOW_DISPLAY_LIMIT} of ${summary.flows.length} test blocks.`
              : ''}
          </p>
          {visibleFlows.length === 1
            ? <FlowSteps steps={visibleFlows[0].steps} />
            : visibleFlows.map((flow, index) => (
              <details className="auto-flow" key={stableKey(flow.title, 'flow')} open={index === 0}>
                <summary>
                  <span className="auto-flow__title">{flow.title}</span>
                  <span className="auto-flow__count">{flow.steps.length} steps</span>
                </summary>
                <FlowSteps steps={flow.steps} />
              </details>
            ))}
        </Section>
      )}

      {summary.elements.length > 0 && (
        <Section title="How ZER0 finds each element on the page">
          <p className="auto-section-summary">
            A locator is the address of an element on the page. ZER0 keeps several per element and uses the first one
            that exists, so a small design change does not break the run.
          </p>
          <ul className="auto-element-grid">
            {summary.elements.map((element) => (
              <li className="auto-element" key={element.key}>
                <div className="auto-element__head">
                  <span className="auto-element__name">{element.label}</span>
                  <span className="auto-element__count">
                    {element.locators.length} locator{element.locators.length === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="auto-element__plain">{element.locators[0].meaning}</p>
                <code className="auto-element__selector">{element.locators[0].value}</code>
                {element.locators.length > 1 && (
                  <details className="auto-element__more">
                    <summary>{element.locators.length - 1} backup locator{element.locators.length === 2 ? '' : 's'}</summary>
                    <LocatorList locators={element.locators.slice(1)} />
                  </details>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {summary.hints.length > 0 && (
        <Section title="AI locator hints">
          <ul className="auto-hints">
            {summary.hints.map((hint) => <li key={stableKey(hint, 'hint')}><code>{hint}</code></li>)}
          </ul>
        </Section>
      )}

      {summary.caseIds.length > 0 && (
        <Section title="Manual test cases carried into automation">
          <p className="auto-section-summary">
            These {summary.caseIds.length} cases from the Manual TC tab are covered by this bundle.
          </p>
          <ul className="auto-case-chips">
            {summary.caseIds.map((id) => <li key={id} className="tc-id-small">{id}</li>)}
          </ul>
        </Section>
      )}

      {summary.scripts.length > 0 && (
        <Section title="Generated code">
          <p className="auto-section-summary">
            You do not need to read these to trust the run — they exist so a developer can reproduce or extend it.
          </p>
          {summary.scripts.map((script) => (
            <details className="auto-script" key={script.id}>
              <summary>
                <span className="auto-script__title">{script.title}</span>
                <span className="lang-tag">{script.language}</span>
              </summary>
              <p className="auto-script__purpose">{script.purpose}</p>
              <CopyButton code={script.code} label={`${script.language} code`} />
              <pre className="code-block">{script.code}</pre>
            </details>
          ))}
        </Section>
      )}

      <JsonToggle data={data} />
    </div>
  );
}
