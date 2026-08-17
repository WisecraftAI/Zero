const { Readable } = require("stream");

const { createAws } = require("@zero/cloud/aws");
const { createGcp } = require("@zero/cloud/gcp");
const { createAzure } = require("@zero/cloud/azure");
const { createVercel } = require("@zero/cloud/vercel");
const { createCache } = require("@zero/cloud/redisCache");
const { runProviderConformance } = require("@zero/cloud/conformance/gate9");

describe("GATE-9 cloud primitive conformance", () => {
  it("aws bundle passes injected-fake conformance", async () => {
    await runProviderConformance("aws", createAws, "s3");
  });

  it("gcp bundle passes injected-fake conformance", async () => {
    await runProviderConformance("gcp", createGcp, "gcs");
  });

  it("azure bundle passes injected-fake conformance", async () => {
    await runProviderConformance("azure", createAzure, "blob");
  });

  it("vercel bundle passes injected-fake conformance", async () => {
    await runProviderConformance("vercel", createVercel, "r2");
  });
});

describe("S6 azure and vercel adapter surfaces", () => {
  it("exports azure and vercel bundles with the four primitives", () => {
    const azure = createAzure({
      blob: {
        presign: async (op, key) => `https://blob.core.windows.net/${op}/${key}`,
        put: async () => {},
        get: async () => Readable.from([Buffer.from("ok")]),
        remove: async () => {}
      },
      serviceBus: {
        publish: async () => {},
        subscribe: () => () => {}
      },
      kv: {
        get: async () => "secret",
        put: async () => {}
      },
      redis: { impl: createCache() }
    });
    expect(azure.objectStore.presignPut).toBeInstanceOf(Function);
    expect(azure.queue.publish).toBeInstanceOf(Function);
    expect(azure.secrets.get).toBeInstanceOf(Function);
    expect(azure.cache.set).toBeInstanceOf(Function);

    const vercel = createVercel({
      r2: {
        presign: async (op, key) => `https://r2.example/${op}/${key}`,
        put: async () => {},
        get: async () => Readable.from([Buffer.from("ok")]),
        remove: async () => {}
      },
      qstash: {
        publish: async () => {},
        subscribe: () => () => {}
      },
      env: {
        get: async () => "secret",
        put: async () => {}
      },
      redis: { impl: createCache() }
    });
    expect(vercel.objectStore.presignGet).toBeInstanceOf(Function);
    expect(vercel.queue.subscribe).toBeInstanceOf(Function);
  });

  it("ZERO_CLOUD=local loads @zero/cloud without azure/vercel SDKs", () => {
    const prev = process.env.ZERO_CLOUD;
    delete process.env.ZERO_CLOUD;
    jest.resetModules();
    const cloud = require("@zero/cloud");
    expect(cloud.provider).toBe("local");
    expect(cloud.objectStore.put).toBeInstanceOf(Function);
    if (prev != null) process.env.ZERO_CLOUD = prev;
    else delete process.env.ZERO_CLOUD;
  });
});
