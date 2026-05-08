import './PipelineStatus.css';

const STAGES = ['ba', 'manualQa', 'automationQa', 'execution', 'manager'];

export default function PipelineStatus({ run }) {
  if (!run?.stages) {
    return (
      <div className="pipeline-grid">
        {STAGES.map((key, i) => (
          <div key={key} className="stage">
            <h3>{['BA Agent', 'Manual QA Agent', 'Automation QA Agent', 'Execution Service', 'Manager Agent'][i]}</h3>
            <span className="chip pending">PENDING</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="pipeline-grid">
      {STAGES.map((key) => {
        const s = run.stages[key];
        if (!s) return null;
        return (
          <div key={key} className="stage">
            <h3>{s.label}</h3>
            <span className={`chip ${s.status}`}>{String(s.status || 'pending').toUpperCase()}</span>
          </div>
        );
      })}
    </div>
  );
}
