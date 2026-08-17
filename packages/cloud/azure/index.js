/**
 * Azure cloud bundle (S6).
 * Blob Storage · Service Bus · Key Vault · Redis (REDIS_URL).
 * SDKs are lazy-required so ZERO_CLOUD=local does not load them.
 */

"use strict";

const { createObjectStore } = require("./objectStore");
const { createQueue } = require("./queue");
const { createSecrets } = require("./secrets");
const { createAzureCache } = require("./cache");

function createAzure(opts = {}) {
  return {
    objectStore: opts.objectStore || createObjectStore(opts.blob || opts),
    queue: opts.queue || createQueue(opts.serviceBus || opts),
    secrets: opts.secrets || createSecrets(opts.kv || opts),
    cache: opts.cache || createAzureCache(opts.redis || opts)
  };
}

module.exports = createAzure();
module.exports.createAzure = createAzure;
