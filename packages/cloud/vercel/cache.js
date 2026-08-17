"use strict";

const { createCache } = require("../redisCache");

function upstashRest(opts) {
  const url = (opts.restUrl || process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, "");
  const token = opts.restToken || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  async function command(path, init = {}) {
    const res = await fetch(`${url}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.headers || {})
      }
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Upstash REST failed (${res.status}): ${text}`);
    }
    return res.json();
  }

  return {
    async get(key) {
      const out = await command(`/get/${encodeURIComponent(key)}`);
      if (out.result == null) return null;
      try {
        return JSON.parse(out.result);
      } catch {
        return out.result;
      }
    },
    async set(key, val, ttlSec) {
      const payload = JSON.stringify(val);
      if (ttlSec) {
        await command(`/set/${encodeURIComponent(key)}/${encodeURIComponent(payload)}?EX=${ttlSec}`, {
          method: "POST"
        });
      } else {
        await command(`/set/${encodeURIComponent(key)}/${encodeURIComponent(payload)}`, {
          method: "POST"
        });
      }
    },
    async publish(channel, msg) {
      await command(
        `/publish/${encodeURIComponent(channel)}/${encodeURIComponent(JSON.stringify(msg))}`,
        { method: "POST" }
      );
    },
    subscribe(channel, cb) {
      // Upstash REST has no long-lived subscribe — use REDIS_URL + ioredis for pub/sub.
      console.warn(
        `[vercel.cache] subscribe("${channel}") needs REDIS_URL/ioredis or opts.impl — REST pub/sub is publish-only.`
      );
      return () => {};
    }
  };
}

function createVercelCache(opts = {}) {
  if (opts.impl) return opts.impl;
  const rest = upstashRest(opts);
  if (rest) return rest;
  return createCache(opts);
}

module.exports = { createVercelCache, upstashRest };
