/**
 * Vercel-hybrid cloud bundle (S6).
 * R2 (S3-compatible) · QStash · env secrets · Upstash/Redis cache.
 * SDKs are lazy-required so ZERO_CLOUD=local does not load them.
 */

"use strict";

const { createObjectStore } = require("./objectStore");
const { createQueue } = require("./queue");
const { createSecrets } = require("./secrets");
const { createVercelCache } = require("./cache");

function createVercel(opts = {}) {
  return {
    objectStore: opts.objectStore || createObjectStore(opts.r2 || opts),
    queue: opts.queue || createQueue(opts.qstash || opts),
    secrets: opts.secrets || createSecrets(opts.env || opts),
    cache: opts.cache || createVercelCache(opts.redis || opts)
  };
}

module.exports = createVercel();
module.exports.createVercel = createVercel;
