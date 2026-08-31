import { Awaiting, JsonToggle, Section, stableKey } from './shared';

export default function SecurityTab({ run }) {
  const data = run.artifacts?.securityReport;
  if (!data) return <Awaiting msg="Security Agent not enabled or awaiting…" />;
  const summary = data.summary || {};
  const scoreClass = summary.score >= 80 ? 'good' : summary.score >= 50 ? 'moderate' : 'poor';
  const headers = data.securityHeaders;

  return (
    <div className="agent-report">
      <div className="agent-score-row">
        <span className={`score-badge ${scoreClass}`}>{summary.score ?? '—'}<small>/100</small></span>
        <div>
          <div className="agent-verdict">{summary.verdict || '—'}</div>
          <div className="agent-counts">
            {summary.checksRun} checks · {summary.passed} passed · {summary.failed} failed · {summary.warnings} warnings
          </div>
        </div>
      </div>
      {headers && (
        <Section title="Security Headers">
          <table className="data-table">
            <thead><tr><th>Header</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td>Content-Security-Policy</td><td className={headers.contentSecurityPolicy ? 'status-passed' : 'status-failed'}>{headers.contentSecurityPolicy ? '✓ Present' : '✗ Missing'}</td></tr>
              <tr><td>X-Frame-Options</td><td className={headers.xFrameOptions ? 'status-passed' : 'status-failed'}>{headers.xFrameOptions || '✗ Missing'}</td></tr>
              <tr><td>X-Content-Type-Options</td><td className={headers.xContentTypeOptions ? 'status-passed' : 'status-failed'}>{headers.xContentTypeOptions || '✗ Missing'}</td></tr>
              <tr><td>Strict-Transport-Security</td><td className={headers.strictTransportSecurity ? 'status-passed' : 'status-failed'}>{headers.strictTransportSecurity ? '✓ Present' : '✗ Missing'}</td></tr>
            </tbody>
          </table>
        </Section>
      )}
      {data.checks?.length > 0 && (
        <Section title="Security Checks">
          <table className="data-table">
            <thead><tr><th>Check</th><th>Status</th><th>Severity</th><th>Description</th></tr></thead>
            <tbody>
              {data.checks.map((check) => (
                <tr key={check.id || check.name || stableKey(check, 'security-check')}>
                  <td>{check.name}</td>
                  <td><span className={check.status === 'pass' ? 'status-passed' : check.status === 'fail' ? 'status-failed' : 'status-skipped'}>{check.status}</span></td>
                  <td><span className={`severity-${check.severity}`}>{check.severity}</span></td>
                  <td>{check.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
      {data.vulnerabilities?.length > 0 && (
        <Section title="⚠️ Vulnerabilities Found">
          <ul className="issue-list">
            {data.vulnerabilities.map((item) => (
              <li key={item.id || item.name || stableKey(item, 'vulnerability')} className={`issue issue--${item.type}`}>
                <strong>[{item.type?.toUpperCase()}]</strong> {item.name}: {item.description}
              </li>
            ))}
          </ul>
        </Section>
      )}
      <JsonToggle data={data} />
    </div>
  );
}
