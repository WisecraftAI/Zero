/**
 * Shared helpers: secret redaction, tolerant JSON parsing, provider error
 * normalisation, and numeric config resolution. Nothing here performs I/O.
 */

"use strict";

const SECRET_PATTERNS = [
  [/\bsk-[a-zA-Z0-9_-]+/g, "sk-••••"],
  [/\bAIza[a-zA-Z0-9_-]+/g, "AIza••••"],
  [/Bearer\s+\S+/gi, "Bearer ••••"]
];

const MAX_DETAIL_CHARS = 300;

function redact(value) {
  if (!value) return "";
  const s = String(value);
  if (s.length <= 8) return "••••";
  return `••••${s.slice(-4)}`;
}

function scrubSecrets(value) {
  return SECRET_PATTERNS.reduce(
    (text, [pattern, mask]) => text.replace(pattern, mask),
    String(value ?? "")
  );
}

/**
 * Resolves the first usable number from `candidates` (option → env → default).
 * Empty strings and non-numeric values are skipped so that a blank `.env`
 * entry falls through to the default instead of collapsing to 0/NaN.
 */
function resolveNumber(candidates, fallback, min = Number.NEGATIVE_INFINITY) {
  for (const raw of candidates) {
    if (raw === undefined || raw === null || raw === "") continue;
    const value = Number(raw);
    if (Number.isFinite(value)) return Math.max(min, value);
  }
  return Math.max(min, fallback);
}

function codedError(message, code) {
  const err = new Error(message);
  err.code = code;
  return err;
}

function parseJsonContent(text) {
  if (!text) return null;
  const trimmed = String(text)
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Turns a thrown provider/transport error into a stable `{reason, status,
 * detail}` triple. Detail is scrubbed and truncated so it is safe to persist
 * in run artifacts and surface in the UI.
 */
function providerFailure(err) {
  const status = Number(err?.response?.status) || null;
  const body = err?.response?.data;
  const providerError = (body && typeof body === "object" && body.error) || body;
  const isObject = providerError && typeof providerError === "object";
  const providerCode = (isObject && (providerError.code || providerError.type)) || null;
  const rawDetail =
    (isObject && providerError.message) || err?.message || "LLM provider request failed";

  return {
    reason: providerCode || (status ? `http_${status}` : err?.code || "provider_error"),
    status,
    detail: scrubSecrets(rawDetail).slice(0, MAX_DETAIL_CHARS)
  };
}

module.exports = {
  MAX_DETAIL_CHARS,
  codedError,
  parseJsonContent,
  providerFailure,
  redact,
  resolveNumber,
  scrubSecrets
};
