"use strict";

const SUPPORTED_PROVIDERS = ["local", "aws", "gcp", "azure", "vercel"];

function normalizeProviderName(name) {
  return String(name || "local").toLowerCase();
}

function loadProvider(name) {
  const provider = normalizeProviderName(name);
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throw new Error(`Unknown ZERO_CLOUD="${name}". Use ${SUPPORTED_PROVIDERS.join("|")}.`);
  }
  return require(`../${provider}`);
}

module.exports = {
  SUPPORTED_PROVIDERS,
  normalizeProviderName,
  loadProvider
};
