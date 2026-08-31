import { describe, expect, it } from 'vitest';
import { LLM_AGENT_IDS } from '../src/lib/aiSetup';
import {
  PIPELINE_AGENTS,
  RUN_PHASES,
  agentGuidance,
  agentNames,
  agentStatus,
  countCustomPrompts,
  enrichmentSummary,
  findModel,
} from '../src/views/agents/agentCatalog';

const geminiCfg = { provider: 'gemini', model: 'gemini-2.0-flash' };

describe('pipeline agent catalog', () => {
  it('describes exactly the LLM-configurable agents, in pipeline order', () => {
    expect(PIPELINE_AGENTS.map((agent) => agent.id)).toEqual(LLM_AGENT_IDS);
    expect(PIPELINE_AGENTS.map((agent) => agent.step)).toEqual([1, 2, 3, 4]);
  });

  it('gives every agent the copy the view renders', () => {
    for (const agent of PIPELINE_AGENTS) {
      expect(agent.name).toBeTruthy();
      expect(agent.role).toBeTruthy();
      expect(agent.reads).toBeTruthy();
      expect(agent.produces).toBeTruthy();
      expect(agent.aiAdds).toBeTruthy();
      expect(agent.defaultPrompt.length).toBeGreaterThan(40);
    }
  });

  it('maps every run phase to known agents and covers each agent once', () => {
    const driven = RUN_PHASES.flatMap((phase) => phase.agentIds);
    expect(driven.toSorted()).toEqual([...LLM_AGENT_IDS].toSorted());
    for (const phase of RUN_PHASES) {
      expect(phase.output).toBeTruthy();
      expect(agentNames(phase.agentIds)).toHaveLength(phase.agentIds.length);
    }
  });

  it('marks execution as the one phase no model drives', () => {
    const modelFree = RUN_PHASES.filter((phase) => phase.agentIds.length === 0);
    expect(modelFree.map((phase) => phase.id)).toEqual(['execute']);
    expect(modelFree[0].note).toMatch(/discovered-flow/i);
  });

  it('resolves models only within their own provider', () => {
    expect(findModel('gemini', 'gemini-2.0-flash')?.contextWindow).toBe(1_000_000);
    expect(findModel('openai', 'gemini-2.0-flash')).toBeNull();
    expect(findModel(undefined, undefined)).toBeNull();
  });
});

describe('agentStatus', () => {
  it.each([
    ['active when provider, model, and key are present', geminiCfg, true, 'active'],
    ['optimizing when the key is missing', geminiCfg, false, 'optimizing'],
    ['optimizing when only a provider is chosen', { provider: 'gemini' }, false, 'optimizing'],
    ['idle when nothing is configured', {}, false, 'idle'],
  ])('is %s', (_name, cfg, hasKey, expected) => {
    expect(agentStatus(cfg, hasKey)).toBe(expected);
  });
});

describe('agentGuidance', () => {
  it('confirms enrichment when the agent can reach a model', () => {
    expect(agentGuidance(geminiCfg, true)).toEqual({
      status: 'active',
      label: 'AI ON',
      hint: 'Template output is enriched on every run.',
    });
  });

  it('names the missing key when provider and model are chosen', () => {
    const guidance = agentGuidance(geminiCfg, false);
    expect(guidance.label).toBe('NO KEY');
    expect(guidance.hint).toContain('Google Gemini');
  });

  it('asks for the missing half of the pair', () => {
    expect(agentGuidance({ provider: 'openai' }, true).label).toBe('SETUP');
  });

  it('explains template-only output when nothing is configured', () => {
    const guidance = agentGuidance({}, false);
    expect(guidance.label).toBe('TEMPLATE');
    expect(guidance.hint).toMatch(/no model is called/i);
  });
});

describe('enrichmentSummary', () => {
  const keys = { gemini: true };

  it('reports templates-only when no agent is wired', () => {
    const summary = enrichmentSummary({}, keys);
    expect(summary).toMatchObject({ activeCount: 0, total: 4, mode: 'templates' });
    expect(summary.detail).toMatch(/complete end to end/i);
  });

  it('reports partial coverage and keeps the fallback promise', () => {
    const summary = enrichmentSummary({ ba: geminiCfg }, keys);
    expect(summary).toMatchObject({ activeCount: 1, mode: 'partial', label: 'AI on 1 of 4' });
  });

  it('reports full coverage only when every agent resolves a key', () => {
    const settings = Object.fromEntries(LLM_AGENT_IDS.map((id) => [id, geminiCfg]));
    expect(enrichmentSummary(settings, keys)).toMatchObject({ activeCount: 4, mode: 'ai' });
    expect(enrichmentSummary(settings, {})).toMatchObject({ activeCount: 0, mode: 'templates' });
  });
});

describe('countCustomPrompts', () => {
  it('ignores prompts that still equal the shipped default', () => {
    const settings = {
      ba: { prompt: PIPELINE_AGENTS[0].defaultPrompt },
      manualQa: { prompt: 'Focus on checkout only.' },
      manager: { prompt: '' },
    };
    expect(countCustomPrompts(settings)).toBe(1);
    expect(countCustomPrompts({})).toBe(0);
  });
});
