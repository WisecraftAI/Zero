import { Awaiting, JsonToggle, Section, stableKey } from './shared';

export default function AccessibilityTab({ run }) {
  const data = run.artifacts?.accessibilityReport;
  if (!data) return <Awaiting msg="Accessibility Agent not enabled or awaiting…" />;
  const summary = data.summary || {};
  const scoreClass = summary.score >= 80 ? 'good' : summary.score >= 50 ? 'moderate' : 'poor';

  return (
    <div className="agent-report">
      <div className="agent-score-row">
        <span className={`score-badge ${scoreClass}`}>{summary.score ?? '—'}<small>/100</small></span>
        <div>
          <div className="agent-verdict">{summary.verdict || '—'}</div>
          <div className="agent-counts">
            {summary.checksRun} checks · {summary.passed} passed · {summary.errors} errors · {summary.warnings} warnings
          </div>
        </div>
      </div>
      {data.checks?.length > 0 && (
        <Section title="Checks">
          <table className="data-table">
            <thead><tr><th>Check</th><th>Status</th><th>Count</th></tr></thead>
            <tbody>
              {data.checks.map((check) => (
                <tr key={check.id || check.name || stableKey(check, 'a11y-check')}>
                  <td>{check.name}</td>
                  <td><span className={check.status === 'pass' ? 'status-passed' : check.status === 'fail' ? 'status-failed' : 'status-skipped'}>{check.status}</span></td>
                  <td>{check.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
      {data.issues?.length > 0 && (
        <Section title="Issues">
          <ul className="issue-list">
            {data.issues.map((issue) => (
              <li key={issue.id || issue.selector || stableKey(issue, 'a11y-issue')} className={`issue issue--${issue.type}`}>
                <strong>[{issue.category}]</strong> {issue.message}
              </li>
            ))}
          </ul>
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
