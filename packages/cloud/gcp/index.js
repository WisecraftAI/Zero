/**
 * GCP cloud bundle (M7).
 * GCS · Pub/Sub · Secret Manager · Redis (Memorystore via REDIS_URL).
 * SDKs are lazy-required so ZERO_CLOUD=local does not load them.
 */

"use strict";

const { createObjectStore } = require("./objectStore");
const { createQueue } = require("./queue");
const { createSecrets } = require("./secrets");
const { createGcpCache } = require("./cache");

function createGcp(opts = {}) {
  return {
    objectStore: opts.objectStore || createObjectStore(opts.gcs || opts),
    queue: opts.queue || createQueue(opts.pubsub || opts),
    secrets: opts.secrets || createSecrets(opts.sm || opts),
    cache: opts.cache || createGcpCache(opts.redis || opts)
  };
}

module.exports = createGcp();
module.exports.createGcp = createGcp;
