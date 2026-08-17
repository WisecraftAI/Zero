const fs = require("fs");
const os = require("os");
const path = require("path");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "zero-store-"));
process.env.ZERO_CLOUD = "local";
process.env.ZERO_LOCAL_STORE_DIR = tmp;
process.env.ZERO_LOCAL_STORE_SECRET = "test-store-secret";
process.env.ZERO_PUBLIC_BASE_URL = "http://127.0.0.1:3998";

const store = require("../lib/cloud/local/storage");

describe("local ObjectStore", () => {
  afterAll(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("puts and gets a buffer", async () => {
    await store.put("runs/r1/inputs/tc.csv", Buffer.from("id,step\n1,open"));
    const stream = await store.get("runs/r1/inputs/tc.csv");
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    expect(Buffer.concat(chunks).toString("utf8")).toContain("id,step");
  });

  it("presignPut / presignGet include HMAC query params", async () => {
    const putUrl = await store.presignPut("runs/r1/inputs/tc.csv", 60);
    const getUrl = await store.presignGet("runs/r1/inputs/tc.csv", 60);
    expect(putUrl).toMatch(/\/api\/cloud\/local\?/);
    expect(putUrl).toMatch(/op=put/);
    expect(getUrl).toMatch(/op=get/);
    expect(getUrl).toMatch(/token=/);

    const put = new URL(putUrl);
    expect(store._verify(put.searchParams.get("key"), "put", put.searchParams.get("exp"), put.searchParams.get("token"))).toBe(true);
    expect(store._verify(put.searchParams.get("key"), "put", put.searchParams.get("exp"), "nope")).toBe(false);
  });

  it("rejects expired tokens", () => {
    expect(store._verify("k", "get", String(Math.floor(Date.now() / 1000) - 10), "abc")).toBe(false);
  });

  it("remove is idempotent", async () => {
    await store.put("tmp/x.txt", Buffer.from("x"));
    await store.remove("tmp/x.txt");
    await store.remove("tmp/x.txt");
    await expect(store.get("tmp/x.txt")).rejects.toThrow(/not found/i);
  });
});
