const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");

const { createAws } = require("@zero/cloud/aws");
const { createGcp } = require("@zero/cloud/gcp");
const { createAzure } = require("@zero/cloud/azure");
const { createVercel } = require("@zero/cloud/vercel");
const { createCache } = require("@zero/cloud/redisCache");

function walkJs(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (name === "node_modules" || name === "cloud") continue;
      walkJs(full, acc);
    } else if (name.endsWith(".js")) {
      acc.push(full);
    }
  }
  return acc;
}

describe("M7 multi-cloud adapters", () => {
  it("exports aws and gcp bundles with the four primitives", () => {
    const aws = createAws({
      s3: {
        presign: async (op, key) => `https://s3.example/${op}/${key}`,
        put: async () => {},
        get: async () => Readable.from([Buffer.from("ok")]),
        remove: async () => {}
      },
      sqs: {
        publish: async () => {},
        subscribe: () => () => {}
      },
      sm: {
        get: async () => "secret",
        put: async () => {}
      },
      redis: { impl: createCache() }
    });
    expect(aws.objectStore.presignPut).toBeInstanceOf(Function);
    expect(aws.queue.publish).toBeInstanceOf(Function);
    expect(aws.secrets.get).toBeInstanceOf(Function);
    expect(aws.cache.set).toBeInstanceOf(Function);

    const gcp = createGcp({
      gcs: {
        presign: async (op, key) => `https://storage.googleapis.com/${op}/${key}`,
        put: async () => {},
        get: async () => Readable.from([Buffer.from("ok")]),
        remove: async () => {}
      },
      pubsub: {
        publish: async () => {},
        subscribe: () => () => {}
      },
      sm: {
        get: async () => "secret",
        put: async () => {}
      },
      redis: { impl: createCache() }
    });
    expect(gcp.objectStore.presignGet).toBeInstanceOf(Function);
    expect(gcp.queue.subscribe).toBeInstanceOf(Function);
  });

  it("AWS object store uses injected S3 helpers (no SDK)", async () => {
    const calls = [];
    const store = createAws({
      s3: {
        presign: async (op, key, ttl) => {
          calls.push(["presign", op, key, ttl]);
          return `https://bucket.s3.amazonaws.com/${key}?X-Amz-Algorithm=AWS4-HMAC-SHA256&op=${op}`;
        },
        put: async (key, body) => {
          calls.push(["put", key, Buffer.isBuffer(body)]);
        },
        get: async (key) => {
          calls.push(["get", key]);
          return Readable.from([Buffer.from("hello")]);
        },
        remove: async (key) => calls.push(["remove", key])
      },
      sqs: { publish: async () => {}, subscribe: () => () => {} },
      sm: { get: async () => "x", put: async () => {} }
    }).objectStore;

    const url = await store.presignPut("runs/1/a.txt", 60);
    expect(url).toMatch(/X-Amz-Algorithm/);
    await store.put("runs/1/a.txt", Buffer.from("hello"));
    const stream = await store.get("runs/1/a.txt");
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    expect(Buffer.concat(chunks).toString()).toBe("hello");
    await store.remove("runs/1/a.txt");
    expect(calls.map((c) => c[0])).toEqual(["presign", "put", "get", "remove"]);
  });

  it("GCP object store uses injected GCS helpers", async () => {
    const store = createGcp({
      gcs: {
        presign: async (op, key) => `https://storage.googleapis.com/${key}?action=${op}`,
        put: async () => {},
        get: async () => Readable.from([Buffer.from("gcs")]),
        remove: async () => {}
      },
      pubsub: { publish: async () => {}, subscribe: () => () => {} },
      sm: { get: async () => "x", put: async () => {} }
    }).objectStore;
    const url = await store.presignGet("k");
    expect(url).toMatch(/storage\.googleapis\.com/);
  });

  it("Azure object store uses injected blob helpers (no SDK)", async () => {
    const store = createAzure({
      blob: {
        presign: async (op, key) => `https://account.blob.core.windows.net/${key}?op=${op}`,
        put: async () => {},
        get: async () => Readable.from([Buffer.from("azure")]),
        remove: async () => {}
      },
      serviceBus: { publish: async () => {}, subscribe: () => () => {} },
      kv: { get: async () => "x", put: async () => {} }
    }).objectStore;
    const url = await store.presignGet("k");
    expect(url).toMatch(/blob\.core\.windows\.net/);
  });

  it("Vercel object store uses injected R2 helpers (no SDK)", async () => {
    const store = createVercel({
      r2: {
        presign: async (op, key) => `https://r2.example/${key}?op=${op}`,
        put: async () => {},
        get: async () => Readable.from([Buffer.from("r2")]),
        remove: async () => {}
      },
      qstash: { publish: async () => {}, subscribe: () => () => {} },
      env: { get: async () => "x", put: async () => {} }
    }).objectStore;
    const url = await store.presignPut("k");
    expect(url).toMatch(/r2\.example/);
  });

  it("AWS queue publish/subscribe go through injected SQS", async () => {
    const seen = [];
    const aws = createAws({
      s3: { presign: async () => "u", put: async () => {}, get: async () => Readable.from([]), remove: async () => {} },
      sqs: {
        publish: async (topic, msg) => seen.push({ topic, msg }),
        subscribe: (topic, handler) => {
          handler({ runId: "r1" });
          return () => {};
        }
      },
      sm: { get: async () => "x", put: async () => {} }
    });
    await aws.queue.publish("runs.requested", { runId: "r1" });
    expect(seen[0]).toEqual({ topic: "runs.requested", msg: { runId: "r1" } });
    let got = null;
    aws.queue.subscribe("runs.requested", async (m) => {
      got = m;
    });
    expect(got).toEqual({ runId: "r1" });
  });

  it("keeps vendor SDKs out of domain code", () => {
    const root = path.resolve(__dirname, "..");
    const banned = /@aws-sdk|@google-cloud\/|aws-sdk|@azure\/|@google-cloud/;
    const files = [
      path.join(root, "services/api/server.js"),
      ...walkJs(path.join(root, "services")),
      ...walkJs(path.join(root, "packages")).filter((f) => !f.includes(`${path.sep}cloud${path.sep}`))
    ];
    for (const file of files) {
      const text = fs.readFileSync(file, "utf8");
      expect(text).not.toMatch(banned);
    }
  });

  it("ships IaC modules for aws and gcp", () => {
    expect(fs.existsSync(path.join(__dirname, "../infra/aws/main.tf"))).toBe(true);
    expect(fs.existsSync(path.join(__dirname, "../infra/gcp/main.tf"))).toBe(true);
    expect(fs.existsSync(path.join(__dirname, "../.github/workflows/ci.yml"))).toBe(true);
  });
});
