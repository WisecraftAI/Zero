import { artifactUrl } from '../../apiBase';
import { Awaiting, JsonToggle } from './shared';

export default function ExecutionTab({ run }) {
  const data = run.artifacts?.executionReport;
  if (!data) return <Awaiting />;
  const tests = data.tests || [];
  const totals = data.totals || {};
  const healed = data.metadata?.healing?.healed || 0;

  return (
    <div className="exec-panel">
      <div className="exec-summary">
        <span className="exec-stat"><strong>{totals.total ?? 0}</strong> run</span>
        <span className="exec-stat status-passed"><strong>{totals.passed ?? 0}</strong> passed</span>
        <span className="exec-stat status-failed"><strong>{totals.failed ?? 0}</strong> failed</span>
        {healed > 0 ? <span className="exec-stat status-healed"><strong>{healed}</strong> healed</span> : null}
        <span className="exec-stat">Pass rate: <strong>{totals.passRate ?? '0%'}</strong></span>
      </div>
      <table className="data-table exec-table">
        <thead>
          <tr><th>ID</th><th>Title</th><th>Status</th><th>Error</th><th>Evidence</th></tr>
        </thead>
        <tbody>
          {tests.map((test) => {
            const healedSteps = test.steps?.filter((step) => step.healing) || [];
            return (
              <tr key={test.id}>
                <td><span className="tc-id-small">{test.id}</span></td>
                <td className="exec-title">{(test.title || '').slice(0, 70)}{(test.title || '').length > 70 ? '…' : ''}</td>
                <td><span className={`status-${test.status}`}>{test.status}</span></td>
                <td className="exec-error">{test.error ? `${String(test.error).slice(0, 90)}${String(test.error).length > 90 ? '…' : ''}` : '—'}</td>
                <td>
                  <div className="exec-evidence">
                    {test.screenshot && <a href={artifactUrl(test.screenshot)} target="_blank" rel="noreferrer" className="screenshot-link">Screenshot ↗</a>}
                    {healedSteps.length > 0 && (
                      <span className="healed-badge" title={healedSteps.map((step) => step.healing.selector || step.healing.evidence).join(', ')}>
                        Locator healed
                      </span>
                    )}
                    {!test.screenshot && healedSteps.length === 0 ? '—' : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <JsonToggle data={data} />
    </div>
  );
}
