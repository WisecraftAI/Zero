'use strict';

/**
 * Local in-process queue. Lost on restart — fine for M3 local-first;
 * replace with SQS/PubSub/etc. under lib/cloud/{aws,...} in M7.
 */

const handlers = new Map();

const queue = {
  async publish(topic, msg) {
    const list = handlers.get(topic) || [];
    // Do not await handlers — API must return before the pipeline finishes.
    setImmediate(() => {
      for (const h of list) {
        Promise.resolve()
          .then(() => h(msg))
          .catch((err) => {
            console.error(`[local.queue] handler error on ${topic}:`, err.message);
          });
      }
    });
  },
  subscribe(topic, handler) {
    const list = handlers.get(topic) || [];
    list.push(handler);
    handlers.set(topic, list);
    return () => {
      const next = (handlers.get(topic) || []).filter((h) => h !== handler);
      handlers.set(topic, next);
    };
  },
};

module.exports = queue;
