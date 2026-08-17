/**
 * AWS cloud bundle (M7).
 * S3 · SQS · Secrets Manager · Redis (ElastiCache via REDIS_URL).
 * SDKs are lazy-required so ZERO_CLOUD=local does not load them.
 */

"use strict";

const { createObjectStore } = require("./objectStore");
const { createQueue } = require("./queue");
const { createSecrets } = require("./secrets");
const { createAwsCache } = require("./cache");

function createAws(opts = {}) {
  return {
    objectStore: opts.objectStore || createObjectStore(opts.s3 || opts),
    queue: opts.queue || createQueue(opts.sqs || opts),
    secrets: opts.secrets || createSecrets(opts.sm || opts),
    cache: opts.cache || createAwsCache(opts.redis || opts)
  };
}

module.exports = createAws();
module.exports.createAws = createAws;
