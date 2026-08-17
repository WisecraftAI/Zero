const { startOrchestrator, TOPIC } = require("@zero/orchestrator");
const queue = require("@zero/cloud/local/queue");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("orchestrator + local queue", () => {
  let unsub;

  afterEach(() => {
    if (typeof unsub === "function") unsub();
    unsub = null;
  });

  it("publish returns before a slow handler finishes", async () => {
    let started = false;
    let finished = false;
    unsub = queue.subscribe("m3-speed", async () => {
      started = true;
      await wait(80);
      finished = true;
    });

    const t0 = Date.now();
    await queue.publish("m3-speed", { ok: true });
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(50);
    expect(finished).toBe(false);
    await wait(120);
    expect(started).toBe(true);
    expect(finished).toBe(true);
  });

  it("consumes runs.requested and caps concurrency", async () => {
    const seen = [];
    let concurrent = 0;
    let maxSeen = 0;

    const orch = startOrchestrator({
      queue,
      cache: { publish: async () => {}, set: async () => {} },
      maxConcurrent: 1,
      logger: { log() {}, warn() {}, error() {} },
      async processRun(runId) {
        concurrent += 1;
        maxSeen = Math.max(maxSeen, concurrent);
        seen.push(runId);
        await wait(40);
        concurrent -= 1;
      }
    });
    unsub = orch.unsubscribe;

    await queue.publish(TOPIC, { runId: "a" });
    await queue.publish(TOPIC, { runId: "b" });
    await wait(150);

    expect(seen).toEqual(["a", "b"]);
    expect(maxSeen).toBe(1);
    expect(orch.stats().active).toBe(0);
  });
});
