/**
 * Merges parsed LLM output into template artifacts.
 *
 * Every merger returns `true` only when it actually changed the artifact, so
 * the caller can report `used: false` for a well-formed but empty answer
 * instead of claiming enrichment that never happened.
 */

"use strict";

const LIMITS = {
  baRequirements: 8,
  baSummary: 2000,
  managerNarrative: 4000,
  managerActions: 5,
  manualCases: 8,
  automationHints: 8,
  label: 120,
  summary: 2000,
  testPriorities: 8,
  criticalFlows: 6
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clamp(value, max) {
  return String(value).slice(0, max);
}

function asStringList(value, limit) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function clampUnit(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n));
}

function markSource(target, fallbackName) {
  if (!isPlainObject(target.metadata)) return;
  target.metadata.source = `${target.metadata.source || fallbackName} + LLM`;
}

const MERGERS = {
  ba(target, parsed) {
    let changed = false;

    const extra = asStringList(parsed.extraRequirements, LIMITS.baRequirements);
    if (extra.length) {
      target.requirementStatements = [
        ...new Set([...asArray(target.requirementStatements), ...extra])
      ];
      changed = true;
    }
    if (parsed.summary) {
      target.llmSummary = clamp(parsed.summary, LIMITS.baSummary);
      changed = true;
    }
    if (changed) markSource(target, "BA Agent");
    return changed;
  },

  manager(target, parsed) {
    let changed = false;

    if (parsed.narrative) {
      if (!isPlainObject(target.analysis)) target.analysis = {};
      target.analysis.llmNarrative = clamp(parsed.narrative, LIMITS.managerNarrative);
      changed = true;
    }
    const extras = asStringList(parsed.extraActions, LIMITS.managerActions);
    if (extras.length) {
      target.actionPlan = [...asArray(target.actionPlan), ...extras];
      changed = true;
    }
    if (changed) markSource(target, "Manager Agent");
    return changed;
  },

  manualQa(target, parsed) {
    const cases = asArray(parsed.extraCases)
      .slice(0, LIMITS.manualCases)
      .filter((raw) => isPlainObject(raw) && raw.scenario);
    if (!cases.length) return false;

    if (!Array.isArray(target.testCases)) target.testCases = [];
    cases.forEach((raw, index) => {
      const steps = asStringList(raw.steps, 20);
      target.testCases.push({
        id: String(raw.id || `LLM-${index + 1}`),
        module: String(raw.module || "LLM"),
        scenario: String(raw.scenario),
        priority: raw.priority ? String(raw.priority) : "P2",
        preconditions: raw.preconditions ? String(raw.preconditions) : "",
        steps: steps.length ? steps : [String(raw.scenario)],
        expectedResult: String(raw.expectedResult || "Behaves as specified"),
        type: "llm_suggested"
      });
    });
    return true;
  },

  automationQa(target, parsed) {
    const hints = asStringList(parsed.hints, LIMITS.automationHints);
    if (!hints.length) return false;
    target.llmHints = hints;
    return true;
  },

  domainInference(target, parsed) {
    let changed = false;

    if (parsed.domainLabel) {
      target.inferredDomain = clamp(parsed.domainLabel, LIMITS.label);
      changed = true;
    }
    if (parsed.summary) {
      target.inferredSummary = clamp(parsed.summary, LIMITS.summary);
      changed = true;
    }

    const confidence = clampUnit(parsed.confidence);
    if (confidence !== null) {
      target.inferredConfidence = confidence;
      changed = true;
    }

    const priorities = asStringList(parsed.testPriorities, LIMITS.testPriorities);
    if (priorities.length) {
      target.inferredTestPriorities = priorities;
      changed = true;
    }

    const flows = asStringList(parsed.criticalFlows, LIMITS.criticalFlows);
    if (flows.length) {
      target.inferredCriticalFlows = flows;
      changed = true;
    }

    if (parsed.subDomainLabel) {
      target.inferredSubDomain = clamp(parsed.subDomainLabel, LIMITS.label);
      changed = true;
    }
    const subConfidence = clampUnit(parsed.subDomainConfidence);
    if (subConfidence !== null) {
      target.inferredSubDomainConfidence = subConfidence;
      changed = true;
    }

    // Promote inference onto the canonical classification fields the rest of
    // the pipeline reads, never lowering an existing confidence.
    if (target.inferredDomain) {
      target.websiteType = target.inferredDomain;
      if (target.inferredConfidence != null) {
        target.websiteTypeConfidence = Math.max(
          Number(target.websiteTypeConfidence) || 0,
          target.inferredConfidence
        );
      }
    }
    if (target.inferredSubDomain) {
      target.subDomain = target.inferredSubDomain;
      target.subDomainConfidence = Math.max(
        Number(target.subDomainConfidence) || 0,
        Number(target.inferredSubDomainConfidence) || 0
      );
      target.subDomainSource = "llm";
    }

    return changed;
  }
};

function applyEnrichment(agent, target, parsed) {
  const merge = MERGERS[agent];
  if (!merge || !isPlainObject(target) || !isPlainObject(parsed)) return false;
  return merge(target, parsed);
}

/** Records the LLM decision on `target.metadata.llm` for reports and the UI. */
function stampLlm(target, meta = {}) {
  if (!isPlainObject(target)) return target;
  if (!isPlainObject(target.metadata)) target.metadata = {};
  target.metadata.llm = {
    used: Boolean(meta.used),
    provider: meta.provider || null,
    model: meta.model || null,
    promptVersion: meta.promptVersion || null,
    fallbackReason: meta.fallbackReason || null,
    fallbackStatus: meta.fallbackStatus || null,
    fallbackDetail: meta.fallbackDetail || null,
    costUsd: Number(meta.costUsd) || 0
  };
  return target;
}

module.exports = { applyEnrichment, isPlainObject, stampLlm };
