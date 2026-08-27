import './AiSetupBanner.scss';

/**
 * Onboarding callout when AI agents are not fully wired.
 * variant: 'dashboard' | 'agents' | 'compact'
 */
export default function AiSetupBanner({
  variant = 'dashboard',
  geminiConfigured,
  activeCount,
  totalAgents = 4,
  onGoApiKeys,
  onGoAgents,
  onEnableGemini,
  enabling,
}) {
  const allActive = activeCount >= totalAgents;

  if (allActive) return null;

  if (!geminiConfigured) {
    return (
      <div className={`ai-banner ai-banner--${variant}`}>
        <div className="ai-banner-icon" aria-hidden>✦</div>
        <div className="ai-banner-body">
          <div className="ai-banner-title">Power the AI agent pipeline</div>
          <p className="ai-banner-text">
            ZERO runs BA → Manual QA → Automation → Manager with LLM enrichment when a provider key
            is connected. Add a free Google Gemini key to turn templates into AI-generated requirements,
            test cases, and reports.
          </p>
        </div>
        <div className="ai-banner-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={onGoApiKeys}>
            Add Gemini key →
          </button>
          {variant === 'dashboard' && onGoAgents && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={onGoAgents}>
              Agent settings
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`ai-banner ai-banner--${variant} ai-banner--ready`}>
      <div className="ai-banner-icon" aria-hidden>✦</div>
      <div className="ai-banner-body">
        <div className="ai-banner-title">Gemini connected — activate AI agents</div>
        <p className="ai-banner-text">
          {activeCount}/{totalAgents} agents are fully configured. Enable Gemini Flash on all agents
          for AI-enriched requirements, test cases, and manager reports on every run.
        </p>
      </div>
      <div className="ai-banner-actions">
        {onEnableGemini && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={enabling}
            onClick={onEnableGemini}
          >
            {enabling ? 'Enabling…' : 'Enable AI on all agents'}
          </button>
        )}
        {onGoAgents && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onGoAgents}>
            Configure individually
          </button>
        )}
      </div>
    </div>
  );
}
