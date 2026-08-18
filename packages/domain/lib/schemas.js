"use strict";

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Pure run-intake validation (zod-free today). Mirrors product input rules in AGENTS.md.
 */
function validateRunInput(input = {}) {
  const errors = [];

  if (!hasText(input.ottUrl)) {
    errors.push("ottUrl is required");
  }

  const hasSupportingInput =
    hasText(input.figmaUrl) ||
    hasText(input.notes) ||
    hasText(input.tcFileContent) ||
    hasText(input.tcFileName) ||
    Boolean(input.tcFileBuffer);

  if (!hasSupportingInput) {
    errors.push("At least one of figmaUrl, notes, or tcFile is required");
  }

  return { ok: errors.length === 0, errors };
}

module.exports = {
  validateRunInput
};
