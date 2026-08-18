"use strict";

const { loadProvider, normalizeProviderName } = require("./provider");

function createCloudBindings(env = process.env) {
  const provider = normalizeProviderName(env.ZERO_CLOUD);
  const impl = loadProvider(provider);

  return {
    provider,
    objectStore: impl.objectStore,
    queue: impl.queue,
    secrets: impl.secrets,
    cache: impl.cache,
    /** @deprecated alias */
    storage: impl.objectStore
  };
}

module.exports = {
  createCloudBindings,
  loadProvider,
  normalizeProviderName
};
