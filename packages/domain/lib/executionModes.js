"use strict";

const EXECUTION_MODES = {
  MINIMAL: "minimal",
  FULL: "full",
  DISCOVERED_FLOWS: "discovered_flows",
  UPLOADED: "uploaded_tc_only",
  URL_ANALYSIS: "url_analysis_auto",
};

/**
 * Resolve how Playwright execution should run for this input.
 */
function resolveExecutionMode(input = {}, env = process.env) {
  const mode = String(input.executionMode || "").toLowerCase();

  if (mode === EXECUTION_MODES.UPLOADED || mode === "uploaded_tc_only") {
    return EXECUTION_MODES.UPLOADED;
  }

  if (mode === EXECUTION_MODES.URL_ANALYSIS || mode === "url_analysis_auto") {
    return EXECUTION_MODES.DISCOVERED_FLOWS;
  }

  if (mode === EXECUTION_MODES.DISCOVERED_FLOWS) {
    return EXECUTION_MODES.DISCOVERED_FLOWS;
  }

  if (String(env.EXECUTION_MODE || "").toLowerCase() === "full") {
    return EXECUTION_MODES.FULL;
  }

  return EXECUTION_MODES.MINIMAL;
}

module.exports = {
  EXECUTION_MODES,
  resolveExecutionMode,
};
