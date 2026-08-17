"use strict";

function envQueueUrl(topic) {
  const key = `ZERO_SQS_${String(topic).replace(/\./g, "_").toUpperCase()}`;
  return process.env[key] || null;
}

function loadSqs() {
  try {
    return require("@aws-sdk/client-sqs");
  } catch (err) {
    const e = new Error("ZERO_CLOUD=aws queue requires @aws-sdk/client-sqs");
    e.cause = err;
    throw e;
  }
}

function createQueue(opts = {}) {
  const region = opts.region || process.env.AWS_REGION || "us-east-1";
  const pollMs = Number(opts.pollMs || process.env.ZERO_SQS_POLL_MS || 1000);
  const pollers = [];

  function client() {
    if (opts.client) return opts.client;
    const { SQSClient } = loadSqs();
    opts.client = new SQSClient({ region });
    return opts.client;
  }

  function queueUrl(topic) {
    if (opts.queues && opts.queues[topic]) return opts.queues[topic];
    const fromEnv = envQueueUrl(topic);
    if (fromEnv) return fromEnv;
    throw new Error(
      `No SQS URL for topic "${topic}". Set ZERO_SQS_${String(topic).replace(/\./g, "_").toUpperCase()}`
    );
  }

  return {
    async publish(topic, msg) {
      if (opts.publish) return opts.publish(topic, msg);
      const { SendMessageCommand } = loadSqs();
      await client().send(
        new SendMessageCommand({
          QueueUrl: queueUrl(topic),
          MessageBody: JSON.stringify(msg)
        })
      );
    },
    subscribe(topic, handler) {
      if (opts.subscribe) return opts.subscribe(topic, handler);
      let stopped = false;
      const url = queueUrl(topic);

      async function poll() {
        if (stopped) return;
        try {
          const { ReceiveMessageCommand, DeleteMessageCommand } = loadSqs();
          const out = await client().send(
            new ReceiveMessageCommand({
              QueueUrl: url,
              MaxNumberOfMessages: 5,
              WaitTimeSeconds: 8
            })
          );
          for (const m of out.Messages || []) {
            let parsed = m.Body;
            try {
              parsed = JSON.parse(m.Body);
            } catch {
              // keep raw
            }
            await handler(parsed);
            if (m.ReceiptHandle) {
              await client().send(
                new DeleteMessageCommand({ QueueUrl: url, ReceiptHandle: m.ReceiptHandle })
              );
            }
          }
        } catch (err) {
          if (!stopped) console.error(`[aws.queue] poll ${topic}:`, err.message);
        }
        if (!stopped) setTimeout(poll, pollMs);
      }

      setTimeout(poll, 0);
      const stop = () => {
        stopped = true;
      };
      pollers.push(stop);
      return stop;
    }
  };
}

module.exports = { createQueue, envQueueUrl };
