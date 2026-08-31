import { lazy, Suspense, useMemo, useState } from 'react';
import { artifactUrl } from '../../apiBase';
import { buildManagerResultView } from './managerReportResults';
import { Awaiting, JsonToggle, Section, stableKey } from './shared';
import './ManagerTab.scss';

// The donut pulls in recharts, so it stays out of the Run Detail bundle and
// loads only once an operator actually opens this tab.
const ManagerResultChart = lazy(() => import('./ManagerResultChart'));

const TEST_CASE_DISPLAY_LIMIT = 100;
const VISUAL_DISPLAY_LIMIT = 24;

export default function ManagerTab({ run }) {
  const data = run.artifacts?.managerReport;
  const executionTests = run.artifacts?.executionReport?.tests;
  const [selectedStatus, setSelectedStatus] = useState('all');
  const resultView = useMemo(
    () => buildManagerResultView({
      managerReport: data,
      executionTests,
      selectedStatus,
    }),
    [data, executionTests, selectedStatus],
  );

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
          <span>Pass rate: <strong>{summary.passRate ?? '0%'}</strong></span>
          <span>{summary.executed ?? 0}/{summary.totalTestCases ?? 0} executed</span>
          <span className="status-passed">{summary.passed ?? 0} passed</span>
          <span className="status-failed">{summary.failed ?? 0} failed</span>
          <span className="status-skipped">{summary.skipped ?? 0} skipped</span>
        </div>
      </div>

      {resultView.hasResults ? (
        <>
          <Suspense fallback={<div className="manager-results-loading">Loading test results chart…</div>}>
            <ManagerResultChart
              segments={resultView.segments}
              selectedStatus={resultView.selectedStatus}
              onStatusChange={setSelectedStatus}
            />
          </Suspense>

          <p className="manager-scope" role="status" aria-live="polite">
            {resultView.selectedStatus === 'all'
              ? `Showing all ${resultView.totalTestCases} test cases.`
              : `Showing ${resultView.selectedCount} ${resultView.selectedStatus} test case${resultView.selectedCount === 1 ? '' : 's'}.`}
            {' '}Chart totals always represent the complete run.
          </p>

          <Section title={`Traceability Matrix — ${resultView.selectedStatus === 'all' ? 'All results' : resultView.selectedStatus}`}>
            {resultView.filteredTestCases.length > 0 ? (
              <>
                <p className="manager-section-summary">
                  Showing {Math.min(resultView.filteredTestCases.length, TEST_CASE_DISPLAY_LIMIT)} of {resultView.filteredTestCases.length} matching test cases.
                </p>
                <div className="manager-table-wrap">
                  <table className="data-table">
                    <thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Error</th></tr></thead>
                    <tbody>
                      {resultView.filteredTestCases.slice(0, TEST_CASE_DISPLAY_LIMIT).map((item) => (
                        <tr key={item.id}>
                          <td><span className="tc-id-small">{item.id}</span></td>
                          <td>{(item.title || '').slice(0, 55)}</td>
                          <td><span className={`status-${item.status}`}>{item.status}</span></td>
                          <td className="exec-error">{item.error ? String(item.error).slice(0, 60) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="manager-empty">No test-case details match this result.</p>
            )}
          </Section>

          <Section title={`Visual Evidence — ${resultView.selectedStatus === 'all' ? 'All results' : resultView.selectedStatus}`}>
            {resultView.visuals.length > 0 ? (
              <>
                <p className="manager-section-summary">
                  Showing {Math.min(resultView.visuals.length, VISUAL_DISPLAY_LIMIT)} of {resultView.visuals.length} matching screenshots.
                </p>
                <div className="manager-evidence-grid">
                  {resultView.visuals.slice(0, VISUAL_DISPLAY_LIMIT).map((item) => (
                    <a
                      key={item.id}
                      className="manager-evidence-card"
                      href={artifactUrl(item.screenshot)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={artifactUrl(item.screenshot)}
                        alt={`${item.status} test evidence for ${item.title || item.id}`}
                        loading="lazy"
                      />
                      <span className="manager-evidence-card__caption">
                        <span className="tc-id-small">{item.id}</span>
                        <span className={`status-${item.status}`}>{item.status}</span>
                      </span>
                    </a>
                  ))}
                </div>
              </>
            ) : (
              <p className="manager-empty">No screenshots are available for the selected test results.</p>
            )}
          </Section>
        </>
      ) : (
        <div className="manager-results-empty" role="status">
          <strong>No test results available</strong>
          <span>The report completed without test-case outcome data.</span>
        </div>
      )}

      {data.analysis?.rootCauses?.length > 0 && (
        <Section title="Run-level Root Causes">
          <p className="manager-section-summary">This analysis applies to the complete run.</p>
          <ul className="rca-list">
            {data.analysis.rootCauses.map((item) => <li key={stableKey(item, 'root-cause')}>{item}</li>)}
          </ul>
        </Section>
      )}
      {data.actionPlan?.length > 0 && (
        <Section title="Run-level Action Plan">
          <p className="manager-section-summary">These recommendations apply to the complete run.</p>
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
