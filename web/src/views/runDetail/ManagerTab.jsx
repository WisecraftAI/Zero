import { Awaiting, JsonToggle, Section, stableKey } from './shared';

export default function ManagerTab({ run }) {
  const data = run.artifacts?.managerReport;
  if (!data) return <Awaiting />;
  const summary = data.executiveSummary || {};
  const verdictKey = summary.verdict?.toLowerCase() === 'go'
    ? 'go'
    : summary.verdict?.toLowerCase().includes('conditional')
      ? 'conditional'
      : 'hold';

  return (
    <div className="manager-panel">
      <div className="manager-verdict-row">
        {summary.verdict && <span className={`verdict ${verdictKey}`}>{summary.verdict}</span>}
        <div className="manager-stats">
          <span>Risk: <strong>{summary.riskLevel || '—'}</strong></span>
          <span>Pass rate: <strong>{summary.passRate || '0%'}</strong></span>
          <span>{summary.executed ?? 0}/{summary.totalTestCases ?? 0} executed</span>
          <span className="status-passed">{summary.passed ?? 0} passed</span>
          <span className="status-failed">{summary.failed ?? 0} failed</span>
        </div>
      </div>
      {data.traceabilityMatrix?.length > 0 && (
        <Section title="Traceability Matrix">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Error</th></tr></thead>
            <tbody>
              {data.traceabilityMatrix.slice(0, 30).map((item) => (
                <tr key={item.id}>
                  <td><span className="tc-id-small">{item.id}</span></td>
                  <td>{(item.title || '').slice(0, 55)}</td>
                  <td><span className={`status-${item.status}`}>{item.status}</span></td>
                  <td className="exec-error">{item.error ? String(item.error).slice(0, 60) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
      {data.analysis?.rootCauses?.length > 0 && (
        <Section title="Root Causes">
          <ul className="rca-list">
            {data.analysis.rootCauses.map((item) => <li key={stableKey(item, 'root-cause')}>{item}</li>)}
          </ul>
        </Section>
      )}
      {data.actionPlan?.length > 0 && (
        <Section title="Action Plan">
          <ol className="reco-list">
            {data.actionPlan.map((item) => <li key={stableKey(item, 'action')}>{item}</li>)}
          </ol>
        </Section>
      )}
      {data.signOff?.recommendation && (
        <Section title="Sign-off">
          <p className="signoff-text">{data.signOff.recommendation}</p>
        </Section>
      )}
      <JsonToggle data={data} />
    </div>
  );
}
