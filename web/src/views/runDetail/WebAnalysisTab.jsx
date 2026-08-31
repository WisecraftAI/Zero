import { Awaiting, JsonToggle, Section, stableKey } from './shared';

function formatConfidence(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? `${Math.round(number * 100)}% confidence` : null;
}

export default function WebAnalysisTab({ run }) {
  const data = run.artifacts?.webAnalysis;
  if (!data) {
    return <Awaiting msg="Web Analyzer runs automatically when no test document is provided." />;
  }

  const classification = data.domainClassification || {};
  const domain = classification.domain || data.metadata?.domainName || data.siteOverview?.type;
  const subDomain = classification.subDomain || data.metadata?.subDomain;
  const domainConfidence = formatConfidence(
    classification.domainConfidence ?? data.metadata?.websiteTypeConfidence,
  );
  const subDomainConfidence = formatConfidence(
    classification.subDomainConfidence ?? data.metadata?.subDomainConfidence,
  );
  const failed = Boolean(data.analysisFailed || data.error);
  const focusAreas = data.subDomainTestPriorities || [];
  const focusFlows = data.subDomainCriticalFlows || [];

  return (
    <div className="agent-report">
      {failed && (
        <Section title="Analysis Failed">
          <ul className="issue-list">
            <li className="issue issue--error">{data.error || 'Web analysis could not load the target URL.'}</li>
          </ul>
          <p className="signoff-text">
            No site data was collected. Confirm the URL is reachable from the executor, then re-run.
          </p>
        </Section>
      )}
      <Section title="Site Overview">
        <div className="site-overview">
          <p><strong>Title:</strong> {data.siteOverview?.title || '—'}</p>
          <p><strong>URL:</strong> {data.siteOverview?.url || data.metadata?.url || '—'}</p>
        </div>
        <div className="vitals-grid">
          <div className="vital-card">
            <div className="vital-label">Domain</div>
            <div className="vital-value">{domain || 'Not determined'}</div>
            {domainConfidence && <div className="agent-counts">{domainConfidence}</div>}
          </div>
          <div className="vital-card">
            <div className="vital-label">Sub-domain</div>
            <div className="vital-value">{subDomain || 'Not determined'}</div>
            {subDomainConfidence && <div className="agent-counts">{subDomainConfidence}</div>}
          </div>
          <div className="vital-card">
            <div className="vital-label">Pages Discovered</div>
            <div className="vital-value">{data.siteOverview?.pagesDiscovered || 0}</div>
          </div>
        </div>
      </Section>
      {data.warnings?.length > 0 && (
        <Section title="Analyzer Warnings">
          <ul className="issue-list">
            {data.warnings.slice(0, 8).map((warning) => (
              <li key={stableKey(warning, 'warning')} className="issue issue--warning">{warning}</li>
            ))}
          </ul>
        </Section>
      )}
      {(focusAreas.length > 0 || focusFlows.length > 0) && (
        <Section title="Sub-domain Test Focus">
          {focusAreas.length > 0 && (
            <>
              <h4>Priority Areas</h4>
              <ul className="feature-list">
                {focusAreas.map((item) => <li key={stableKey(item, 'focus-area')}>{item}</li>)}
              </ul>
            </>
          )}
          {focusFlows.length > 0 && (
            <>
              <h4>Critical Flows</h4>
              <ul className="critical-list">
                {focusFlows.map((item) => <li key={stableKey(item, 'focus-flow')}>{item}</li>)}
              </ul>
            </>
          )}
        </Section>
      )}
      {data.baInsights && (
        <Section title="BA Insights">
          <p className="insight-summary">{data.baInsights.summary}</p>
          {data.baInsights.keyFunctionalities?.length > 0 && (
            <ul className="feature-list">
              {data.baInsights.keyFunctionalities.map((item) => (
                <li key={item.id || item.name || stableKey(item, 'functionality')}>
                  <strong>{item.name}</strong> — {item.priority || 'Unprioritized'}
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
      {data.features?.length > 0 && (
        <Section title="Discovered Features">
          <table className="data-table">
            <thead><tr><th>Feature</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              {data.features.map((feature) => (
                <tr key={feature.id || feature.name || stableKey(feature, 'feature')}>
                  <td>{feature.name}</td><td>{feature.type}</td><td>{feature.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
      {data.discoveredPages?.length > 0 && (
        <Section title="Discovered Pages">
          <ul className="page-list">
            {data.discoveredPages.map((page) => (
              <li key={page.id || page.url}>
                <strong>{page.linkText}</strong>: {page.title}{' '}
                <a href={page.url} target="_blank" rel="noreferrer">→</a>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {data.suggestedRequirements?.length > 0 && (
        <Section title="Auto-Generated Requirements">
          <ul className="req-list">
            {data.suggestedRequirements.map((item) => (
              <li key={stableKey(item, 'suggested-requirement')}>{item}</li>
            ))}
          </ul>
        </Section>
      )}
      <JsonToggle data={data} />
    </div>
  );
}
