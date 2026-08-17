'use strict';

/**
 * Local KV + pub/sub for run state / SSE fan-out (single process).
 */

const store = new Map();
const channels = new Map();

const cache = {
  async get(key) {
    const row = store.get(key);
    if (!row) return null;
    if (row.exp && Date.now() > row.exp) {
      store.delete(key);
      return null;
    }
    return row.val;
  },
  async set(key, val, ttlSec) {
    const exp = ttlSec ? Date.now() + ttlSec * 1000 : null;
    store.set(key, { val, exp });
  },
  async publish(channel, msg) {
    const list = channels.get(channel) || [];
    for (const cb of list) {
      try {
        cb(msg);
      } catch (err) {
        console.error(`[local.cache] subscriber error on ${channel}:`, err.message);
      }
    }
  },
  subscribe(channel, cb) {
    const list = channels.get(channel) || [];
    list.push(cb);
    channels.set(channel, list);
    return () => {
      channels.set(
        channel,
        (channels.get(channel) || []).filter((x) => x !== cb)
      );
    };
  },
};

module.exports = cache;
