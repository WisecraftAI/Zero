import { Awaiting, JsonBlock, JsonToggle, PriorityBadge, stableKey } from './shared';

export default function ManualTab({ run }) {
  const data = run.artifacts?.manualTestCases;
  if (!data) return <Awaiting />;
  const cases = data.testCases || data.cases || (Array.isArray(data) ? data : null);
  if (!cases) return <JsonBlock data={data} />;

  return (
    <div className="tc-list">
      {cases.map((testCase, index) => (
        <div key={testCase.id || stableKey(testCase, 'test-case')} className="tc-card">
          <div className="tc-header">
            <span className="tc-id">{testCase.id || `TC-${index + 1}`}</span>
            <span className="tc-feature">{testCase.feature || testCase.Feature || ''}</span>
            {testCase.priority && <PriorityBadge p={testCase.priority} />}
          </div>
          <div className="tc-scenario">
            {testCase.scenario || testCase.Scenario || testCase.title || ''}
          </div>
          {testCase.steps?.length > 0 && (
            <ol className="tc-steps">
              {testCase.steps.map((step) => (
                <li key={step.id || stableKey(step, 'step')}>
                  {typeof step === 'string' ? step : step.action || JSON.stringify(step)}
                </li>
              ))}
            </ol>
          )}
          {testCase.expectedResult && (
            <div className="tc-expected">
              <span className="tc-expected-label">Expected</span>
              {testCase.expectedResult}
            </div>
          )}
        </div>
      ))}
      <JsonToggle data={data} />
    </div>
  );
}
