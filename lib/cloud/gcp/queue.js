"use strict";

function topicId(topic) {
  return String(topic).replace(/\./g, "-");
}

function loadPubSub() {
  try {
    return require("@google-cloud/pubsub");
  } catch (err) {
    const e = new Error("ZERO_CLOUD=gcp queue requires @google-cloud/pubsub");
    e.cause = err;
    throw e;
  }
}

function createQueue(opts = {}) {
  function client() {
    if (opts.client) return opts.client;
    const { PubSub } = loadPubSub();
    opts.client = new PubSub();
    return opts.client;
  }

  return {
    async publish(topic, msg) {
      if (opts.publish) return opts.publish(topic, msg);
      const t = client().topic(opts.topics && opts.topics[topic] ? opts.topics[topic] : topicId(topic));
      await t.publishMessage({ data: Buffer.from(JSON.stringify(msg)) });
    },
    subscribe(topic, handler) {
      if (opts.subscribe) return opts.subscribe(topic, handler);
      const name = opts.subscriptions && opts.subscriptions[topic]
        ? opts.subscriptions[topic]
        : `${topicId(topic)}-zero`;
      const sub = client().subscription(name);
      const onMsg = async (message) => {
        let parsed = message.data ? message.data.toString("utf8") : "{}";
        try {
          parsed = JSON.parse(parsed);
        } catch {
          // keep raw
        }
        try {
          await handler(parsed);
          message.ack();
        } catch (err) {
          console.error(`[gcp.queue] handler ${topic}:`, err.message);
          message.nack();
        }
      };
      sub.on("message", onMsg);
      return () => {
        sub.removeListener("message", onMsg);
      };
    }
  };
}

module.exports = { createQueue, topicId };
