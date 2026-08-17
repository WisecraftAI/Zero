/**
 * GATE-9 — shared primitive conformance checks for every cloud provider.
 * Run with injected fakes (no real vendor SDKs or cloud accounts).
 */

"use strict";

const { Readable } = require("stream");

function fakeStoreHooks(store = {}) {
  const mem = new Map();
  return {
    presign: store.presign || (async (op, key) => `https://fake.example/${op}/${key}`),
    put:
      store.put ||
      (async (key, body) => {
        const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
        mem.set(key, buf);
      }),
    get:
      store.get ||
      (async (key) => {
        const buf = mem.get(key) || Buffer.from("ok");
        return Readable.from([buf]);
      }),
    remove:
      store.remove ||
      (async (key) => {
        mem.delete(key);
      })
  };
}

function fakeQueueHooks(queue = {}) {
  const handlers = new Map();
  return {
    publish:
      queue.publish ||
      (async (topic, msg) => {
        const list = handlers.get(topic) || [];
        for (const h of list) await h(msg);
      }),
    subscribe:
      queue.subscribe ||
      ((topic, handler) => {
        const list = handlers.get(topic) || [];
        list.push(handler);
        handlers.set(topic, list);
        return () => {
          const idx = list.indexOf(handler);
          if (idx >= 0) list.splice(idx, 1);
        };
      })
  };
}

function fakeSecretsHooks(secrets = {}) {
  const mem = new Map();
  return {
    get: secrets.get || (async (name) => (mem.has(name) ? mem.get(name) : "secret")),
    put:
      secrets.put ||
      (async (name, value) => {
        mem.set(name, String(value));
      })
  };
}

function fakeCacheHooks(cache = {}) {
  const mem = new Map();
  const subs = new Map();
  return {
    impl: cache.impl || {
      async get(key) {
        return mem.has(key) ? mem.get(key) : null;
      },
      async set(key, val) {
        mem.set(key, val);
      },
      async publish(channel, msg) {
        for (const cb of subs.get(channel) || []) cb(msg);
      },
      subscribe(channel, cb) {
        const list = subs.get(channel) || [];
        list.push(cb);
        subs.set(channel, list);
        return () => {
          const idx = list.indexOf(cb);
          if (idx >= 0) list.splice(idx, 1);
        };
      }
    }
  };
}

function buildFakeOpts(overrides = {}) {
  return {
    ...(overrides.s3 && { s3: fakeStoreHooks(overrides.s3) }),
    ...(overrides.blob && { blob: fakeStoreHooks(overrides.blob) }),
    ...(overrides.gcs && { gcs: fakeStoreHooks(overrides.gcs) }),
    ...(overrides.r2 && { r2: fakeStoreHooks(overrides.r2) }),
    ...(overrides.sqs && { sqs: fakeQueueHooks(overrides.sqs) }),
    ...(overrides.serviceBus && { serviceBus: fakeQueueHooks(overrides.serviceBus) }),
    ...(overrides.pubsub && { pubsub: fakeQueueHooks(overrides.pubsub) }),
    ...(overrides.qstash && { qstash: fakeQueueHooks(overrides.qstash) }),
    ...(overrides.sm && { sm: fakeSecretsHooks(overrides.sm) }),
    ...(overrides.kv && { kv: fakeSecretsHooks(overrides.kv) }),
    ...(overrides.env && { env: fakeSecretsHooks(overrides.env) }),
    ...(overrides.redis && { redis: fakeCacheHooks(overrides.redis) })
  };
}

async function assertObjectStore(store) {
  if (!store || typeof store.presignPut !== "function") {
    throw new Error("objectStore.presignPut missing");
  }
  const url = await store.presignPut("runs/1/a.txt", 60);
  if (typeof url !== "string" || !url) throw new Error("presignPut returned empty url");
  await store.put("runs/1/a.txt", Buffer.from("hello"));
  const stream = await store.get("runs/1/a.txt");
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  if (Buffer.concat(chunks).toString() !== "hello") {
    throw new Error("objectStore get/put round-trip failed");
  }
  await store.remove("runs/1/a.txt");
}

async function assertQueue(queue) {
  if (!queue || typeof queue.publish !== "function") {
    throw new Error("queue.publish missing");
  }
  let got = null;
  queue.subscribe("runs.requested", async (msg) => {
    got = msg;
  });
  await queue.publish("runs.requested", { runId: "r1" });
  if (!got || got.runId !== "r1") throw new Error("queue publish/subscribe failed");
}

async function assertSecrets(secrets) {
  if (!secrets || typeof secrets.get !== "function") {
    throw new Error("secrets.get missing");
  }
  await secrets.put("API_KEY", "abc");
  const val = await secrets.get("API_KEY");
  if (val !== "abc") throw new Error("secrets put/get failed");
}

async function assertCache(cache) {
  if (!cache || typeof cache.set !== "function") {
    throw new Error("cache.set missing");
  }
  await cache.set("k", { ok: true });
  const val = await cache.get("k");
  if (!val || val.ok !== true) throw new Error("cache set/get failed");
  let pub = null;
  cache.subscribe("ch", (msg) => {
    pub = msg;
  });
  await cache.publish("ch", { ping: 1 });
  if (!pub || pub.ping !== 1) throw new Error("cache publish/subscribe failed");
}

const PROVIDER_FAKE_KEYS = {
  aws: { store: "s3", queue: "sqs", secrets: "sm" },
  gcp: { store: "gcs", queue: "pubsub", secrets: "sm" },
  azure: { store: "blob", queue: "serviceBus", secrets: "kv" },
  vercel: { store: "r2", queue: "qstash", secrets: "env" }
};

function defaultFakeOpts(label) {
  const keys = PROVIDER_FAKE_KEYS[label];
  if (!keys) throw new Error(`Unknown provider label: ${label}`);
  return buildFakeOpts({
    [keys.store]: {},
    [keys.queue]: {},
    [keys.secrets]: {},
    redis: {}
  });
}

async function runProviderConformance(label, createFn, _fakeKey, overrides = {}) {
  const bundle = createFn({ ...defaultFakeOpts(label), ...overrides });
  for (const name of ["objectStore", "queue", "secrets", "cache"]) {
    if (!bundle[name]) throw new Error(`${label}: missing ${name}`);
  }
  await assertObjectStore(bundle.objectStore);
  await assertQueue(bundle.queue);
  await assertSecrets(bundle.secrets);
  await assertCache(bundle.cache);
  return { label, pass: true };
}

module.exports = {
  fakeStoreHooks,
  fakeQueueHooks,
  fakeSecretsHooks,
  fakeCacheHooks,
  buildFakeOpts,
  defaultFakeOpts,
  PROVIDER_FAKE_KEYS,
  assertObjectStore,
  assertQueue,
  assertSecrets,
  assertCache,
  runProviderConformance
};
