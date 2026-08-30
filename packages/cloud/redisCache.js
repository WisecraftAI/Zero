/**
 * Redis-protocol cache (ElastiCache / Memorystore / docker redis).
 * Falls back to the in-process local cache when REDIS_URL is unset
 * or no client is injected — npm start still works without Redis.
 */

"use strict";

function createCache(opts = {}) {
  if (opts.impl) return opts.impl;
  if (opts.redis) return wrapRedis(opts.redis);

  const url = opts.url || process.env.REDIS_URL;
  if (url) {
    try {
      const Redis = require("ioredis");
      return wrapRedis(new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 2 }));
    } catch {
      // ioredis not installed — fall through
    }
  }

  return require("./local/cache");
}

function wrapRedis(redis) {
  return {
    async get(key) {
      const raw = await redis.get(key);
      if (raw == null) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    },
    async set(key, val, ttlSec) {
      const payload = JSON.stringify(val);
      if (ttlSec) await redis.set(key, payload, "EX", ttlSec);
      else await redis.set(key, payload);
    },
    async publish(channel, msg) {
      await redis.publish(channel, JSON.stringify(msg));
    },
    subscribe(channel, cb) {
      const sub = typeof redis.duplicate === "function" ? redis.duplicate() : redis;
      const onMessage = (ch, message) => {
        if (ch !== channel) return;
        try {
          cb(JSON.parse(message));
        } catch {
          cb(message);
        }
      };
      if (typeof sub.subscribe === "function") {
        Promise.resolve(sub.subscribe(channel)).catch(() => {});
      }
      if (typeof sub.on === "function") sub.on("message", onMessage);
      return async () => {
        if (typeof sub.off === "function") sub.off("message", onMessage);
        try {
          if (typeof sub.unsubscribe === "function") {
            await sub.unsubscribe(channel);
          }
        } catch {
          // The connection may already be closing after an SSE client leaves.
        } finally {
          try {
            if (typeof sub.disconnect === "function" && sub !== redis) sub.disconnect();
          } catch {
            // Cleanup must never surface as an unhandled request-level error.
          }
        }
      };
    }
  };
}

module.exports = { createCache, wrapRedis };
