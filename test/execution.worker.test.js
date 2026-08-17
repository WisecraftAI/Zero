const {
  startExecutionWorker,
  requestExecution,
  REQUESTED,
  COMPLETED
} = require("../lib/execution/worker");
const queue = require("../lib/cloud/local/queue");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("execution farm", () => {
  let unsub;

  afterEach(() => {
    if (typeof unsub === "function") unsub();
    unsub = null;
  });

  it("requestExecution waits for execution.completed from the worker", async () => {
    const worker = startExecutionWorker({
      queue,
      maxConcurrent: 2,
      maxAttempts: 1,
      logger: { log() {}, warn() {}, error() {} },
      async runJob(job) {
        expect(job.runId).toBe("run-1");
        return { tests: [{ id: "TC-1", status: "passed" }], mode: "minimal" };
      }
    });
    unsub = worker.unsubscribe;

    const report = await requestExecution(queue, { runId: "run-1" }, { timeoutMs: 2000 });
    expect(report.tests[0].status).toBe("passed");
  });

  it("retries a failed job then succeeds", async () => {
    let n = 0;
    const worker = startExecutionWorker({
      queue,
      maxAttempts: 2,
      logger: { log() {}, warn() {}, error() {} },
      async runJob() {
        n += 1;
        if (n === 1) throw new Error("browser crashed");
        return { tests: [], recovered: true };
      }
    });
    unsub = worker.unsubscribe;

    const report = await requestExecution(queue, { runId: "run-retry" }, { timeoutMs: 2000 });
    expect(n).toBe(2);
    expect(report.recovered).toBe(true);
  });

  it("caps concurrent Playwright jobs", async () => {
    let concurrent = 0;
    let maxSeen = 0;
    const worker = startExecutionWorker({
      queue,
      maxConcurrent: 1,
      maxAttempts: 1,
      logger: { log() {}, warn() {}, error() {} },
      async runJob(job) {
        concurrent += 1;
        maxSeen = Math.max(maxSeen, concurrent);
        await wait(40);
        concurrent -= 1;
        return { runId: job.runId };
      }
    });
    unsub = worker.unsubscribe;

    const [a, b] = await Promise.all([
      requestExecution(queue, { runId: "a" }, { timeoutMs: 2000 }),
      requestExecution(queue, { runId: "b" }, { timeoutMs: 2000 })
    ]);
    expect([a.runId, b.runId].sort()).toEqual(["a", "b"]);
    expect(maxSeen).toBe(1);
    expect(worker.stats().active).toBe(0);
  });

  it("exports the execution.requested topic", () => {
    expect(REQUESTED).toBe("execution.requested");
    expect(COMPLETED).toBe("execution.completed");
  });
});
