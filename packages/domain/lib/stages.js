"use strict";

const stageKeys = [
  "webAnalyzer",
  "ba",
  "manualQa",
  "automationQa",
  "execution",
  "accessibility",
  "performance",
  "security",
  "manager",
  "delivery"
];

const optionalStageKeys = ["accessibility", "performance"];
const RUNS_REQUESTED = "runs.requested";

module.exports = {
  stageKeys,
  optionalStageKeys,
  RUNS_REQUESTED
};
