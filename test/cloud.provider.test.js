"use strict";

const cloud = require("@zero/cloud");
const {
  SUPPORTED_PROVIDERS,
  normalizeProviderName,
  loadProvider
} = require("../packages/cloud/lib/provider");
const { createCloudBindings } = require("../packages/cloud/lib");

describe("@zero/cloud provider loader", () => {
  it("normalizes provider names and exposes supported providers", () => {
    expect(normalizeProviderName("LOCAL")).toBe("local");
    expect(SUPPORTED_PROVIDERS).toEqual(expect.arrayContaining(["local", "aws", "gcp"]));
  });

  it("loads the local provider implementation", () => {
    const local = loadProvider("local");

    expect(local.objectStore).toBeDefined();
    expect(local.queue).toBeDefined();
    expect(local.secrets).toBeDefined();
    expect(local.cache).toBeDefined();
  });

  it("throws for unknown providers", () => {
    expect(() => loadProvider("unknown")).toThrow(/Unknown ZERO_CLOUD/);
  });
});

describe("@zero/cloud bindings", () => {
  it("creates provider-scoped bindings from env", () => {
    const bindings = createCloudBindings({ ZERO_CLOUD: "local" });

    expect(bindings.provider).toBe("local");
    expect(bindings.objectStore).toBe(bindings.storage);
    expect(typeof bindings.queue.publish).toBe("function");
  });

  it("defaults to local when ZERO_CLOUD is unset", () => {
    expect(cloud.provider).toBe("local");
    expect(cloud.objectStore).toBeDefined();
  });
});
