"use strict";

function qstashBase(opts) {
  const raw = opts.url || process.env.QSTASH_URL || "https://qstash.upstash.io";
  return raw.replace(/\/$/, "");
}

function qstashToken(opts) {
  return opts.token || process.env.QSTASH_TOKEN;
}

function topicDestination(topic, opts) {
  if (opts.destinations && opts.destinations[topic]) return opts.destinations[topic];
  const key = `QSTASH_DEST_${String(topic).replace(/\./g, "_").toUpperCase()}`;
  return process.env[key] || process.env.QSTASH_CALLBACK_URL || null;
}

function createQueue(opts = {}) {
  return {
    async publish(topic, msg) {
      if (opts.publish) return opts.publish(topic, msg);
      const token = qstashToken(opts);
      if (!token) throw new Error("QSTASH_TOKEN is required for ZERO_CLOUD=vercel queue publish");
      const dest = topicDestination(topic, opts);
      if (!dest) {
        throw new Error(
          `No QStash destination for topic "${topic}". Set QSTASH_CALLBACK_URL or QSTASH_DEST_${String(topic).replace(/\./g, "_").toUpperCase()}`
        );
      }
      const url = `${qstashBase(opts)}/v2/publish/${encodeURIComponent(dest)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ topic, msg })
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`QStash publish failed (${res.status}): ${text}`);
      }
    },
    subscribe(topic, handler) {
      if (opts.subscribe) return opts.subscribe(topic, handler);
      // QStash delivers via HTTP push to your deployment — no in-process pull loop.
      console.warn(
        `[vercel.queue] subscribe("${topic}") is a no-op without opts.subscribe — configure a QStash webhook endpoint.`
      );
      return () => {};
    }
  };
}

module.exports = { createQueue, qstashBase, topicDestination };
