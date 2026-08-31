import { Awaiting, JsonToggle, Section, stableKey, VitalCard } from './shared';

export default function PerformanceTab({ run }) {
  const data = run.artifacts?.performanceReport;
  if (!data) return <Awaiting msg="Performance Agent not enabled or awaiting…" />;
  const summary = data.summary || {};
  const scoreClass = summary.score >= 80 ? 'good' : summary.score >= 50 ? 'moderate' : 'poor';

  return (
    <div className="agent-report">
      <div className="agent-score-row">
        <span className={`score-badge ${scoreClass}`}>{summary.score ?? '—'}<small>/100</small></span>
        <div>
          <div className="agent-verdict">{summary.verdict || '—'}</div>
          <div className="agent-counts">
            Load: <strong>{summary.loadTime}</strong> · Resources: {summary.resourceCount} · Size: {summary.totalSize}
          </div>
        </div>
      </div>
      {data.coreWebVitals && (
        <Section title="Core Web Vitals">
          <div className="vitals-grid">
            <VitalCard label="FCP" value={data.coreWebVitals.fcp} />
            <VitalCard label="DCL" value={data.coreWebVitals.domContentLoaded} />
            <VitalCard label="Load" value={data.coreWebVitals.loadComplete} />
          </div>
        </Section>
      )}
      {data.metrics?.length > 0 && (
        <Section title="Metrics">
          <table className="data-table">
            <thead><tr><th>Metric</th><th>Value</th><th>Score</th></tr></thead>
            <tbody>
              {data.metrics.map((metric) => (
                <tr key={metric.id || metric.name || stableKey(metric, 'metric')}>
                  <td>{metric.name}</td><td>{metric.value}</td><td>{metric.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
      {data.recommendations?.length > 0 && (
        <Section title="Recommendations">
          <ol className="reco-list">
            {data.recommendations.map((item) => <li key={stableKey(item, 'recommendation')}>{item}</li>)}
          </ol>
        </Section>
      )}
      <JsonToggle data={data} />
    </div>
  );
}
