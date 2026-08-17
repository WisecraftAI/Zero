"use strict";

function envQueueName(topic) {
  const key = `ZERO_AZURE_SB_${String(topic).replace(/\./g, "_").toUpperCase()}`;
  return process.env[key] || null;
}

function loadServiceBus() {
  try {
    return require("@azure/service-bus");
  } catch (err) {
    const e = new Error("ZERO_CLOUD=azure queue requires @azure/service-bus");
    e.cause = err;
    throw e;
  }
}

function createQueue(opts = {}) {
  const pollMs = Number(opts.pollMs || process.env.ZERO_AZURE_SB_POLL_MS || 1000);
  const pollers = [];

  function client() {
    if (opts.client) return opts.client;
    const { ServiceBusClient } = loadServiceBus();
    const conn =
      opts.connectionString || process.env.AZURE_SERVICE_BUS_CONNECTION_STRING;
    if (!conn) {
      throw new Error(
        "AZURE_SERVICE_BUS_CONNECTION_STRING is required for ZERO_CLOUD=azure queue"
      );
    }
    opts.client = new ServiceBusClient(conn);
    return opts.client;
  }

  function queueName(topic) {
    if (opts.queues && opts.queues[topic]) return opts.queues[topic];
    const fromEnv = envQueueName(topic);
    if (fromEnv) return fromEnv;
    throw new Error(
      `No Service Bus queue for topic "${topic}". Set ZERO_AZURE_SB_${String(topic).replace(/\./g, "_").toUpperCase()}`
    );
  }

  return {
    async publish(topic, msg) {
      if (opts.publish) return opts.publish(topic, msg);
      const sender = client().createSender(queueName(topic));
      try {
        await sender.sendMessages({ body: msg });
      } finally {
        await sender.close();
      }
    },
    subscribe(topic, handler) {
      if (opts.subscribe) return opts.subscribe(topic, handler);
      let stopped = false;
      const name = queueName(topic);
      const receiver = client().createReceiver(name);

      async function poll() {
        if (stopped) return;
        try {
          const messages = await receiver.receiveMessages(5, { maxWaitTimeInMs: 8000 });
          for (const message of messages) {
            let parsed = message.body;
            if (typeof parsed === "string") {
              try {
                parsed = JSON.parse(parsed);
              } catch {
                // keep raw
              }
            }
            await handler(parsed);
            await receiver.completeMessage(message);
          }
        } catch (err) {
          if (!stopped) console.error(`[azure.queue] poll ${topic}:`, err.message);
        }
        if (!stopped) setTimeout(poll, pollMs);
      }

      setTimeout(poll, 0);
      const stop = () => {
        stopped = true;
        receiver.close().catch(() => {});
      };
      pollers.push(stop);
      return stop;
    }
  };
}

module.exports = { createQueue, envQueueName };
