import './PipelineStatus.css';

const BASE_STAGES = ['webAnalyzer', 'ba', 'manualQa', 'automationQa', 'execution'];
const OPTIONAL_STAGES = ['webAnalyzer', 'accessibility', 'performance', 'security'];
const FINAL_STAGES = ['manager'];

const STAGE_LABELS = {
  webAnalyzer: 'Web Analyzer Agent',
  ba: 'BA Agent',
  manualQa: 'Manual QA Agent',
  automationQa: 'Automation QA Agent',
  execution: 'Execution Service',
  accessibility: 'Accessibility Agent',
  performance: 'Performance Agent',
  security: 'Security Agent',
  manager: 'Manager Agent',
  delivery: 'Delivery Manager Agent'
};

export default function PipelineStatus({ run }) {
  // Determine which stages to show
  const getVisibleStages = () => {
    if (!run?.stages) {
      // Default view when no run started
      return [...BASE_STAGES, ...FINAL_STAGES];
    }
    // Show stages that exist in the run
    return Object.keys(run.stages).filter(key => key !== 'delivery');
  };

  const visibleStages = getVisibleStages();

  if (!run?.stages) {
    return (
      <div className="pipeline-grid">
        {visibleStages.map((key) => (
          <div key={key} className="stage">
            <h3>{STAGE_LABELS[key] || key}</h3>
            <span className="chip pending">PENDING</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="pipeline-grid">
      {visibleStages.map((key) => {
        const s = run.stages[key];
        if (!s) return null;
        const isOptional = OPTIONAL_STAGES.includes(key);
        return (
          <div key={key} className={`stage ${isOptional ? 'stage-optional' : ''}`}>
            <h3>
              {s.label || STAGE_LABELS[key]}
              {isOptional && <span className="optional-badge">optional</span>}
            </h3>
            <span className={`chip ${s.status}`}>{String(s.status || 'pending').toUpperCase()}</span>
          </div>
        );
      })}
    </div>
  );
}
