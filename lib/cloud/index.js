/**
 * Provider-agnostic cloud primitives for ZER0 target architecture.
 * Domain / agent code must import from here — never vendor SDKs directly.
 *
 * Wire once: process.env.ZERO_CLOUD = "local" | "aws" | "gcp" | "azure" | "vercel"
 */

'use strict';

const provider = (process.env.ZERO_CLOUD || 'local').toLowerCase();

function loadProvider(name) {
  switch (name) {
    case 'local':
      return require('./local');
    case 'aws':
      return require('./aws');
    case 'gcp':
      return require('./gcp');
    case 'azure':
    case 'vercel':
      try {
        return require(`./${name}`);
      } catch (err) {
        const e = new Error(
          `ZERO_CLOUD=${name} is not implemented. Use local|aws|gcp. (${err.message})`
        );
        e.cause = err;
        throw e;
      }
    default:
      throw new Error(`Unknown ZERO_CLOUD="${name}". Use local|aws|gcp|azure|vercel.`);
  }
}

const impl = loadProvider(provider);

module.exports = {
  provider,
  objectStore: impl.objectStore,
  queue: impl.queue,
  secrets: impl.secrets,
  cache: impl.cache,
  /** @deprecated alias */
  storage: impl.objectStore,
};
