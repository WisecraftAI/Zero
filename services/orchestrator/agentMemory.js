/**
 * Host-scoped agentic memory: durable observations from BA / Manual /
 * Automation / Manager / execution, recalled on later runs for the same host.
 *
 * Classification keys are never stored here (Q5 forbids caching an unproven
 * taxonomy answer). Login passwords and key-like values are stripped.
 */

"use strict";

const LIMITS = {
  summary: 500,
  narrative: 800,
  list: 8,
  item: 200,
  scenarios: 6,
  failed: 8
};

const SECRET_KEY =
  /password|passwd|secret|token|api[_-]?key|authorization|cookie|credential|private[_-]?key/i;
const SECRET_VALUE = /sk-[a-zA-Z0-9]{8,}|AIza[0-9A-Za-z_-]{20,}|ghp_[A-Za-z0-9]{20,}/;

const MEMORY_AGENTS = new Set(["ba", "manualQa", "automationQa", "manager", "execution"]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clamp(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

function asStringList(value, limit = LIMITS.list) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  for (const item of value) {
    const text = clamp(item, LIMITS.item);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function sanitizeValue(value, depth = 0) {
  if (depth > 6 || value == null) return value == null ? value : null;
  if (typeof value === "string") {
    if (SECRET_VALUE.test(value)) return "[redacted]";
    return value.replace(/(password|passwd|secret|token)\s*[:=]\s*\S+/gi, "$1=[redacted]");
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1)).filter((item) => item != null);
  }
  if (!isPlainObject(value)) return null;
  const out = {};
  for (const [key, nested] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) continue;
    const clean = sanitizeValue(nested, depth + 1);
    if (clean !== undefined) out[key] = clean;
  }
  return out;
}

function mergeStringLists(next, prev, limit = LIMITS.list) {
  return asStringList([...(next || []), ...(prev || [])], limit);
}

function isEmptyMemory(memory) {
  if (!isPlainObject(memory)) return true;
  if (memory.summary || memory.narrative) return false;
  if (memory.notes && memory.notes.length) return false;
  if (memory.hints && memory.hints.length) return false;
  if (memory.extraScenarios && memory.extraScenarios.length) return false;
  if (memory.actions && memory.actions.length) return false;
  if (memory.failed && memory.failed.length) return false;
  const totals = memory.totals;
  if (totals && (Number(totals.passed) || Number(totals.failed) || Number(totals.total))) return false;
  return true;
}

function extractBa(artifact) {
  const llmUsed = Boolean(artifact.metadata && artifact.metadata.llm && artifact.metadata.llm.used);
  const summary = artifact.llmSummary ? clamp(artifact.llmSummary, LIMITS.summary) : "";
  const notes = llmUsed ? asStringList(artifact.requirementStatements) : [];
  if (!summary && !notes.length) return null;
  return { ...(summary ? { summary } : {}), ...(notes.length ? { notes } : {}) };
}

function extractManualQa(artifact) {
  const cases = Array.isArray(artifact.testCases) ? artifact.testCases : [];
  const extraScenarios = cases
    .filter((row) => row && (row.type === "llm_suggested" || String(row.id || "").startsWith("LLM-")))
    .slice(0, LIMITS.scenarios)
    .map((row) => ({
      module: clamp(row.module, 80) || "LLM",
      scenario: clamp(row.scenario, LIMITS.item)
    }))
    .filter((row) => row.scenario);
  return extraScenarios.length ? { extraScenarios } : null;
}

function extractAutomationQa(artifact) {
  const hints = asStringList(artifact.llmHints);
  return hints.length ? { hints } : null;
}

function extractManager(artifact) {
  const llmUsed = Boolean(artifact.metadata && artifact.metadata.llm && artifact.metadata.llm.used);
  const narrative = artifact.analysis && artifact.analysis.llmNarrative
    ? clamp(artifact.analysis.llmNarrative, LIMITS.narrative)
    : "";
  const actions = llmUsed ? asStringList(artifact.actionPlan, 5) : [];
  if (!narrative && !actions.length) return null;
  return { ...(narrative ? { narrative } : {}), ...(actions.length ? { actions } : {}) };
}

function extractExecution(artifact) {
  const totalsIn = isPlainObject(artifact.totals) ? artifact.totals : {};
  const tests = Array.isArray(artifact.tests) ? artifact.tests : [];
  const failed = tests
    .filter((row) => row && row.status === "failed")
    .slice(0, LIMITS.failed)
    .map((row) => ({
      id: clamp(row.id || row.name || row.title, 80),
      error: clamp(row.error, 120)
    }))
    .filter((row) => row.id || row.error);
  const totals = {
    passed: Number(totalsIn.passed) || 0,
    failed: Number(totalsIn.failed) || failed.length,
    total: Number(totalsIn.total) || tests.length
  };
  if (!totals.total && !failed.length) return null;
  return { totals, ...(failed.length ? { failed } : {}) };
}

const EXTRACTORS = {
  ba: extractBa,
  manualQa: extractManualQa,
  automationQa: extractAutomationQa,
  manager: extractManager,
  execution: extractExecution
};

function extractMemory(agent, artifact) {
  if (!MEMORY_AGENTS.has(agent) || !isPlainObject(artifact)) return null;
  const extracted = EXTRACTORS[agent](artifact);
  if (!extracted) return null;
  const clean = sanitizeValue(extracted);
  return isEmptyMemory(clean) ? null : clean;
}

function mergeMemory(agent, incoming, previous) {
  const next = isPlainObject(incoming) ? incoming : {};
  const prev = isPlainObject(previous) ? previous : {};
  if (agent === "ba") {
    return {
      summary: next.summary || prev.summary || undefined,
      notes: mergeStringLists(next.notes, prev.notes)
    };
  }
  if (agent === "manualQa") {
    const combined = [...(next.extraScenarios || []), ...(prev.extraScenarios || [])];
    const seen = new Set();
    const extraScenarios = [];
    for (const row of combined) {
      if (!row || !row.scenario) continue;
      const key = `${row.module || ""}::${row.scenario}`;
      if (seen.has(key)) continue;
      seen.add(key);
      extraScenarios.push({
        module: clamp(row.module, 80) || "LLM",
        scenario: clamp(row.scenario, LIMITS.item)
      });
      if (extraScenarios.length >= LIMITS.scenarios) break;
    }
    return extraScenarios.length ? { extraScenarios } : null;
  }
  if (agent === "automationQa") {
    const hints = mergeStringLists(next.hints, prev.hints);
    return hints.length ? { hints } : null;
  }
  if (agent === "manager") {
    return {
      narrative: next.narrative || prev.narrative || undefined,
      actions: mergeStringLists(next.actions, prev.actions, 5)
    };
  }
  if (agent === "execution") {
    return {
      totals: next.totals || prev.totals,
      failed: Array.isArray(next.failed) && next.failed.length ? next.failed : prev.failed
    };
  }
  return next;
}

function compactRecord(record) {
  if (!isPlainObject(record) || !record.memory) return null;
  const memory = record.memory;
  const compact = {};
  if (memory.summary) compact.summary = clamp(memory.summary, LIMITS.summary);
  if (memory.narrative) compact.narrative = clamp(memory.narrative, LIMITS.narrative);
  if (memory.notes && memory.notes.length) compact.notes = asStringList(memory.notes);
  if (memory.hints && memory.hints.length) compact.hints = asStringList(memory.hints);
  if (memory.actions && memory.actions.length) compact.actions = asStringList(memory.actions, 5);
  if (memory.extraScenarios && memory.extraScenarios.length) {
    compact.extraScenarios = memory.extraScenarios.slice(0, LIMITS.scenarios);
  }
  if (memory.totals) compact.totals = memory.totals;
  if (memory.failed && memory.failed.length) compact.failed = memory.failed.slice(0, LIMITS.failed);
  return isEmptyMemory(compact) ? null : compact;
}

function compactPriorMemory(records) {
  const out = {};
  for (const record of Array.isArray(records) ? records : []) {
    if (!record || !MEMORY_AGENTS.has(record.agent)) continue;
    const compact = compactRecord(record);
    if (compact) out[record.agent] = compact;
  }
  return out;
}

function memoryKey(tenantId, host, agent) {
  return `${tenantId || "local"}::${String(host || "").toLowerCase()}::${agent}`;
}

function recordsFromMap(memoryMap, tenantId, host) {
  if (!memoryMap || typeof memoryMap.entries !== "function" || !host) return [];
  const prefix = `${tenantId || "local"}::${String(host).toLowerCase()}::`;
  const records = [];
  for (const [key, value] of memoryMap.entries()) {
    if (!String(key).startsWith(prefix) || !isPlainObject(value)) continue;
    records.push({
      agent: value.agent,
      memory: value.memory,
      sourceRunId: value.sourceRunId
    });
  }
  return records;
}

function createAgentMemoryStore(deps = {}) {
  const memoryMap = deps.agentMemory || new Map();

  function dbReady() {
    const enabled = typeof deps.dbEnabled === "boolean"
      ? deps.dbEnabled
      : Boolean(deps.getDbEnabled && deps.getDbEnabled());
    const pool = deps.dbPool || (deps.getDbPool && deps.getDbPool());
    const helpers = deps.dbHelpers;
    return Boolean(enabled && pool && helpers && helpers.getAgentMemoryByHost && helpers.upsertAgentMemory);
  }

  async function load(tenantId, host) {
    if (!host) return {};
    try {
      if (dbReady()) {
        const rows = await deps.dbHelpers.getAgentMemoryByHost(
          deps.dbPool || deps.getDbPool(),
          { tenantId, host }
        );
        return compactPriorMemory(rows);
      }
    } catch {
      // Fall through to process memory; a down Postgres must not fail the run.
    }
    return compactPriorMemory(recordsFromMap(memoryMap, tenantId, host));
  }

  async function save({ tenantId, host, agent, artifact, run } = {}) {
    if (!host || !MEMORY_AGENTS.has(agent)) return null;
    const extracted = extractMemory(agent, artifact);
    if (!extracted) return null;

    let previous = null;
    try {
      if (dbReady()) {
        const rows = await deps.dbHelpers.getAgentMemoryByHost(
          deps.dbPool || deps.getDbPool(),
          { tenantId, host }
        );
        const row = rows.find((item) => item.agent === agent);
        previous = row && row.memory;
      } else {
        const current = memoryMap.get(memoryKey(tenantId, host, agent));
        previous = current && current.memory;
      }
    } catch {
      previous = null;
    }

    const merged = mergeMemory(agent, extracted, previous);
    if (isEmptyMemory(merged)) return null;

    const promptVersion =
      artifact && artifact.metadata && artifact.metadata.llm && artifact.metadata.llm.promptVersion
        ? String(artifact.metadata.llm.promptVersion)
        : null;
    const stored = sanitizeValue({
      ...merged,
      promptVersion,
      sourceRunId: run && run.id ? String(run.id) : null,
      updatedAt: new Date().toISOString()
    });

    memoryMap.set(memoryKey(tenantId, host, agent), {
      agent,
      memory: stored,
      sourceRunId: stored.sourceRunId
    });

    try {
      if (dbReady()) {
        await deps.dbHelpers.upsertAgentMemory(deps.dbPool || deps.getDbPool(), {
          tenantId,
          host,
          agent,
          memoryJson: stored,
          sourceRunId: stored.sourceRunId
        });
      }
    } catch {
      // Process map still holds the row for this worker lifetime.
    }

    return compactRecord({ agent, memory: stored });
  }

  return { load, save };
}

module.exports = {
  LIMITS,
  MEMORY_AGENTS,
  extractMemory,
  mergeMemory,
  compactPriorMemory,
  sanitizeValue,
  createAgentMemoryStore
};
