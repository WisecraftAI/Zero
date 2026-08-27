/** Surface why an LLM stage fell back to templates. */

const FALLBACK_COPY = {
  invalid_key: "The API key was rejected. Re-save a key from the provider dashboard, then re-run.",
  unknown_model: "The selected model is not available on this account.",
  insufficient_quota: "Provider quota or billing is exhausted.",
  forbidden: "This key is not allowed to call the chat API.",
  ERR_BAD_REQUEST: "The provider returned HTTP 4xx. Check the key, model access, and billing.",
  rate_limit: "Provider rate limit hit; this stage used templates.",
  cost_cap: "Per-run LLM spend cap reached; remaining stages used templates.",
};

function llmSpots(run) {
  const artifacts = (run && run.artifacts) || {};
  return [
    artifacts.webAnalysis && artifacts.webAnalysis.metadata && artifacts.webAnalysis.metadata.domainInference,
    artifacts.webAnalysis && artifacts.webAnalysis.baInsights && artifacts.webAnalysis.baInsights.metadata && artifacts.webAnalysis.baInsights.metadata.llm,
    artifacts.requirements && artifacts.requirements.metadata && artifacts.requirements.metadata.llm,
    artifacts.manualTestCases && artifacts.manualTestCases.metadata && artifacts.manualTestCases.metadata.llm,
    artifacts.automationBundle && artifacts.automationBundle.metadata && artifacts.automationBundle.metadata.llm,
    artifacts.managerReport && artifacts.managerReport.metadata && artifacts.managerReport.metadata.llm,
  ].filter(Boolean);
}

export function collectLlmIssues(run) {
  const seen = new Set();
  const issues = [];
  for (const llm of llmSpots(run)) {
    if (!llm || llm.used) continue;
    const reason = llm.fallbackReason;
    if (!reason || reason === "no_key" || reason === "disabled" || reason === "unknown_agent") continue;
    const fingerprint = `${llm.provider || ""}:${reason}:${llm.fallbackMessage || ""}`;
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    issues.push({
      provider: llm.provider,
      model: llm.model,
      reason,
      message: llm.fallbackMessage || FALLBACK_COPY[reason] || reason,
    });
  }
  return issues;
}
