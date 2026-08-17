"use strict";

/**
 * Redis-backed queue so API and executor containers share topics.
 *
 *   *.requested  → Redis LIST (LPUSH / BLPOP) — competing consumers, no lost jobs
 *   everything else (execution.completed, …) → pub/sub fan-out
 *
 * Falls back to the in-process local queue when REDIS_URL is unset, ioredis
 * is missing, or Jest is running — npm start / npm test still work without Redis.
 */

function createQueue(opts = {}) {
  if (opts.impl) return opts.impl;
  if (process.env.JEST_WORKER_ID) return require("./local/queue");

  const url = opts.url || process.env.REDIS_URL;
  if (!url) return require("./local/queue");

  let Redis;
  try {
    Redis = require("ioredis");
  } catch {
    return require("./local/queue");
  }

  const pub = opts.redis || new Redis(url, { maxRetriesPerRequest: 2 });
  const handlers = new Map();
  const subscribers = new Map();
  const ready = new Map();

  function isWorkTopic(topic) {
    return String(topic).endsWith(".requested");
  }

  function dispatch(topic, msg) {
    for (const h of handlers.get(topic) || []) {
      Promise.resolve()
        .then(() => h(msg))
        .catch((err) => {
          console.error(`[redis.queue] handler error on ${topic}:`, err.message);
        });
    }
  }

  function parse(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  function ensureSub(topic) {
    if (subscribers.has(topic)) return subscribers.get(topic);

    if (isWorkTopic(topic)) {
      const sub = typeof pub.duplicate === "function" ? pub.duplicate() : new Redis(url, { maxRetriesPerRequest: 2 });
      const key = `zero:q:${topic}`;
      let stopped = false;
      (async function loop() {
        while (!stopped) {
          try {
            const res = await sub.blpop(key, 1);
            if (!res) continue;
            dispatch(topic, parse(res[1]));
          } catch {
            if (stopped) break;
            await new Promise((r) => setTimeout(r, 250));
          }
        }
      })();
      const handle = {
        stop() {
          stopped = true;
          if (typeof sub.disconnect === "function") sub.disconnect();
        }
      };
      subscribers.set(topic, handle);
      ready.set(topic, Promise.resolve());
      return handle;
    }

    const sub = typeof pub.duplicate === "function" ? pub.duplicate() : new Redis(url, { maxRetriesPerRequest: 2 });
    const channel = `zero:q:${topic}`;
    const onMessage = (ch, raw) => {
      if (ch !== channel) return;
      dispatch(topic, parse(raw));
    };
    const readyP = Promise.resolve(sub.subscribe(channel))
      .then(() => {
        if (typeof sub.on === "function") sub.on("message", onMessage);
      })
      .catch(() => {});
    subscribers.set(topic, sub);
    ready.set(topic, readyP);
    return sub;
  }

  return {
    async publish(topic, msg) {
      const payload = JSON.stringify(msg);
      if (isWorkTopic(topic)) {
        await pub.lpush(`zero:q:${topic}`, payload);
        return;
      }
      await pub.publish(`zero:q:${topic}`, payload);
    },
    subscribe(topic, handler) {
      const list = handlers.get(topic) || [];
      list.push(handler);
      handlers.set(topic, list);
      ensureSub(topic);
      return () => {
        handlers.set(
          topic,
          (handlers.get(topic) || []).filter((h) => h !== handler)
        );
      };
    },
    whenSubscribed(topic) {
      ensureSub(topic);
      return ready.get(topic) || Promise.resolve();
    }
  };
}

module.exports = { createQueue };
