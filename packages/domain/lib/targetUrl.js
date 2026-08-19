"use strict";

/**
 * Target URL normalisation for run intake.
 *
 * Operators routinely type "example.com" or "www.example.com". Playwright
 * rejects a scheme-less URL outright, and because the analyzer swallows its own
 * navigation errors that used to surface as a bogus "generic" analysis rather
 * than a validation error. Normalise and validate at the edge instead.
 */

const SUPPORTED_PROTOCOLS = new Set(["http:", "https:"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]"]);

/**
 * @param {string} raw
 * @returns {{ url: string|null, error: string|null, normalized: boolean }}
 */
function normalizeTargetUrl(raw) {
  const trimmed = String(raw == null ? "" : raw).trim();
  if (!trimmed) return { url: null, error: "Target URL is required", normalized: false };

  if (/\s/.test(trimmed)) {
    return { url: null, error: "Target URL must not contain spaces", normalized: false };
  }

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
  if (!hasScheme && /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return { url: null, error: "Target URL must use http or https", normalized: false };
  }

  const candidate = hasScheme ? trimmed : `https://${trimmed}`;

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    return { url: null, error: `Target URL is not a valid URL: ${trimmed}`, normalized: false };
  }

  if (!SUPPORTED_PROTOCOLS.has(parsed.protocol)) {
    return { url: null, error: "Target URL must use http or https", normalized: false };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) {
    return { url: null, error: `Target URL has no hostname: ${trimmed}`, normalized: false };
  }

  const isLocal = LOCAL_HOSTS.has(hostname);
  const isIp = /^\d+(\.\d+){3}$/.test(hostname);
  if (!isLocal && !isIp && !hostname.includes(".")) {
    return {
      url: null,
      error: `Target URL hostname looks incomplete: ${hostname}`,
      normalized: false,
    };
  }

  if (!parsed.pathname) parsed.pathname = "/";

  return { url: parsed.href, error: null, normalized: !hasScheme };
}

module.exports = { normalizeTargetUrl };
