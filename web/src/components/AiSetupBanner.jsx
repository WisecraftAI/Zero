import './AiSetupBanner.css';

const PROVIDER_LABELS = {
  gemini: 'Google Gemini',
  openai: 'OpenAI',
  claude: 'Anthropic Claude',
};

/**
 * Onboarding callout when AI agents are not fully wired.
 * variant: 'dashboard' | 'agents' | 'compact'
 */
export default function AiSetupBanner({
  variant = 'dashboard',
  configuredProvider,
  geminiConfigured,
  activeCount,
  totalAgents = 4,
  onGoApiKeys,
  onGoAgents,
  onEnableAi,
  onEnableGemini,
  enabling,
}) {
  const allActive = activeCount >= totalAgents;
  const provider = configuredProvider || (geminiConfigured ? 'gemini' : null);
  const enable = onEnableAi || onEnableGemini;

  if (allActive) return null;

  if (!provider) {
    return (
      <div className={`ai-banner ai-banner--${variant}`}>
        <div className="ai-banner-icon" aria-hidden>✦</div>
        <div className="ai-banner-body">
          <div className="ai-banner-title">Power the AI agent pipeline</div>
          <p className="ai-banner-text">
            ZERO runs BA → Manual QA → Automation → Manager with LLM enrichment when a provider key
            is connected. Add an OpenAI, Gemini, or Claude key, then enable it on the agents.
          </p>
        </div>
        <div className="ai-banner-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={onGoApiKeys}>
            Add API key →
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

  const label = PROVIDER_LABELS[provider] || provider;

  return (
    <div className={`ai-banner ai-banner--${variant} ai-banner--ready`}>
      <div className="ai-banner-icon" aria-hidden>✦</div>
      <div className="ai-banner-body">
        <div className="ai-banner-title">{label} connected — activate AI agents</div>
        <p className="ai-banner-text">
          {activeCount}/{totalAgents} agents are fully configured. Enable {label} on all agents
          for AI-enriched requirements, test cases, and manager reports on every run.
        </p>
      </div>
      <div className="ai-banner-actions">
        {enable && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={enabling}
            onClick={enable}
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
