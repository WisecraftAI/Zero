/**
 * Copy and derivations for the Agents view.
 *
 * Only the four pipeline agents in `LLM_AGENT_IDS` are configurable: each one
 * always produces a deterministic template result, and a provider key + model
 * lets `@zero/orchestrator/llm` enrich that result. Execution and locator
 * healing are not model-driven, so they are described as a run phase rather
 * than as a configurable agent.
 */
import { LLM_AGENT_IDS, countActiveAgents } from '../../lib/aiSetup';

export const PIPELINE_AGENTS = [
  {
    id: 'ba',
    step: 1,
    name: 'BA Agent',
    role: 'Requirements & scope',
    reads: 'Crawl insights, BA notes, uploaded test-case files',
    produces: 'Testable requirements, assumptions, risks',
    aiAdds: 'Restates requirements in the site’s own domain language and names risks the template misses.',
    defaultPrompt:
      'You are a Business Analyst agent for web QA on any site type. Given a target URL, crawl insights, ' +
      'and optional notes, produce structured testable requirements, assumptions, and risks. Be specific and traceable.',
  },
  {
    id: 'manualQa',
    step: 2,
    name: 'Manual QA Agent',
    role: 'Test case design',
    reads: 'BA requirements, detected domain profile, uploaded cases',
    produces: 'Manual test cases with steps and expected results',
    aiAdds: 'Adds edge cases and domain-specific scenarios beyond the profile templates.',
    defaultPrompt:
      'You are a Manual QA agent. Given BA requirements and the site domain profile, generate granular test cases ' +
      'with id, feature, scenario, steps, and expected result. Cover navigation, forms, auth, content, and accessibility hints.',
  },
  {
    id: 'automationQa',
    step: 3,
    name: 'Automation QA Agent',
    role: 'Scripts & locators',
    reads: 'Manual cases, locator registry, host memory, crawl selectors',
    produces: 'Playwright and Java/Selenium scripts, locator candidates',
    aiAdds: 'Ranks and suggests steadier locators when the registry has no strong candidate.',
    defaultPrompt:
      'You are an Automation QA agent. Given manual test cases and selector candidates, suggest stable locators ' +
      'and automation hints. Prefer selectors from the locator registry when available.',
  },
  {
    id: 'manager',
    step: 4,
    name: 'Manager Agent',
    role: 'Verdict & action plan',
    reads: 'Execution report, screenshots, traceability data',
    produces: 'Executive summary, traceability matrix, action plan',
    aiAdds: 'Writes the narrative summary and root-cause reasoning around the measured numbers.',
    defaultPrompt:
      'You are a QA Manager agent. Given the execution report and artifacts, produce an executive summary ' +
      '(GO / CONDITIONAL GO / HOLD), traceability matrix, root causes, and an action plan.',
  },
];

/** Ordered phases of a run, with the configurable agents that drive each one. */
export const RUN_PHASES = [
  {
    id: 'plan',
    step: '01',
    name: 'Analyze & plan',
    agentIds: ['ba', 'manualQa'],
    desc: 'Web Analyzer crawls the target when no test-case file is uploaded. BA turns the crawl, notes, and uploads into requirements; Manual QA expands them into cases.',
    output: 'Requirements + manual test cases',
  },
  {
    id: 'author',
    step: '02',
    name: 'Author scripts',
    agentIds: ['automationQa'],
    desc: 'Locator candidates are merged from the channel profile, host memory, and the registry, then emitted as runnable scripts you can export.',
    output: 'Playwright + Java/Selenium scripts',
  },
  {
    id: 'execute',
    step: '03',
    name: 'Execute & self-heal',
    agentIds: [],
    desc: 'The Playwright executor runs the flows with retries and screenshots. When a target no longer matches, healing re-finds it by accessible intent and stores the stable selector for that host.',
    output: 'Evidence, screenshots, learned locators',
    note: 'Healing applies to URL-only discovered-flow runs and skips sensitive inputs.',
  },
  {
    id: 'review',
    step: '04',
    name: 'Review & report',
    agentIds: ['manager'],
    desc: 'Manager reads the execution evidence and writes the verdict and action plan. The release gate in the PDF is computed from the measured pass rate, not from the model.',
    output: 'Manager report + delivery PDF',
  },
];

export const PROVIDER_MODELS = {
  claude: [
    { id: 'claude-opus-4-7',   name: 'Claude Opus 4.7',   contextWindow: 1_000_000, label: '1M' },
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', contextWindow: 200_000,   label: '200k' },
    { id: 'claude-haiku-4-5',  name: 'Claude Haiku 4.5',  contextWindow: 200_000,   label: '200k' },
  ],
  openai: [
    { id: 'gpt-4o',      name: 'GPT-4o',      contextWindow: 128_000, label: '128k' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128_000, label: '128k' },
    { id: 'o1-mini',     name: 'o1-mini',     contextWindow: 128_000, label: '128k' },
  ],
  gemini: [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', contextWindow: 1_000_000, label: '1M', recommended: true },
    { id: 'gemini-1.5-pro',   name: 'Gemini 1.5 Pro',   contextWindow: 2_000_000, label: '2M' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', contextWindow: 1_000_000, label: '1M' },
  ],
};

export const PROVIDER_LABELS = {
  claude: 'Anthropic Claude',
  openai: 'OpenAI',
  gemini: 'Google Gemini',
};

export function findModel(provider, modelId) {
  return (PROVIDER_MODELS[provider] || []).find((model) => model.id === modelId) || null;
}

export function agentNames(agentIds) {
  return agentIds
    .map((id) => PIPELINE_AGENTS.find((agent) => agent.id === id)?.name)
    .filter(Boolean);
}

/**
 * Status of one agent row. `active` means the orchestrator can actually reach a
 * model; anything else means the stage falls back to its template output.
 */
export function agentStatus(cfg, hasKey) {
  if (cfg?.provider && cfg?.model && hasKey) return 'active';
  if (cfg?.provider || cfg?.model) return 'optimizing';
  return 'idle';
}

/** Status plus the one next step that would move this agent forward. */
export function agentGuidance(cfg, hasKey) {
  const status = agentStatus(cfg, hasKey);
  if (status === 'active') {
    return { status, label: 'AI ON', hint: 'Template output is enriched on every run.' };
  }
  if (status === 'idle') {
    return { status, label: 'TEMPLATE', hint: 'Deterministic output only — no model is called.' };
  }
  if (cfg?.provider && cfg?.model) {
    return { status, label: 'NO KEY', hint: `Add the ${PROVIDER_LABELS[cfg.provider] || cfg.provider} key under API Keys.` };
  }
  return { status, label: 'SETUP', hint: 'Choose both a provider and a model to activate.' };
}

/** One-line answer to "what will my next run do?". */
export function enrichmentSummary(settings, keysByProvider, agentIds = LLM_AGENT_IDS) {
  const activeCount = countActiveAgents(settings, keysByProvider, agentIds);
  const total = agentIds.length;
  if (activeCount === 0) {
    return {
      activeCount,
      total,
      mode: 'templates',
      label: 'Templates only',
      detail: 'Runs complete end to end, with every stage using its deterministic template output.',
    };
  }
  if (activeCount < total) {
    return {
      activeCount,
      total,
      mode: 'partial',
      label: `AI on ${activeCount} of ${total}`,
      detail: 'Agents without a model and key keep their template output.',
    };
  }
  return {
    activeCount,
    total,
    mode: 'ai',
    label: 'AI on every agent',
    detail: 'Each stage layers model output on top of its template result.',
  };
}

/** Agents whose prompt was overridden by the operator. */
export function countCustomPrompts(settings, agents = PIPELINE_AGENTS) {
  return agents.filter((agent) => {
    const prompt = settings?.[agent.id]?.prompt;
    return Boolean(prompt) && prompt !== agent.defaultPrompt;
  }).length;
}
