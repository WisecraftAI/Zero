const { isDatabaseConfigured, sanitizeRunInput, runPendingMigrations } = require("@zero/db");
const schema = require("@zero/db/schema");

describe("isDatabaseConfigured", () => {
  it("is false when neither DATABASE_URL nor PGHOST is set", () => {
    expect(isDatabaseConfigured({})).toBe(false);
  });

  it("is true when DATABASE_URL is set", () => {
    expect(isDatabaseConfigured({ DATABASE_URL: "postgres://zero:zero@localhost:5432/zero" })).toBe(true);
  });

  it("is true when PGHOST is set", () => {
    expect(isDatabaseConfigured({ PGHOST: "localhost" })).toBe(true);
  });
});

describe("sanitizeRunInput", () => {
  it("strips login passwords and file buffers before persistence", () => {
    const clean = sanitizeRunInput({
      ottUrl: "https://example.com",
      tcFileBuffer: Buffer.from("secret-csv"),
      tcFileContent: "id,step\n1,open",
      loginPassword: "hunter2",
      password: "also-secret",
      login: { enabled: true, usernameMasked: "u***", password: "hunter2" }
    });

    expect(clean.tcFileBuffer).toBeUndefined();
    expect(clean.loginPassword).toBeUndefined();
    expect(clean.password).toBeUndefined();
    expect(clean.tcFileContent).toBe("[stored-in-artifacts]");
    expect(clean.login.password).toBeUndefined();
    expect(clean.login.usernameMasked).toBe("u***");
  });
});

describe("@zero/db schema exports", () => {
  it("exposes DDL constants and migration helpers", () => {
    expect(schema.TABLE_QA_RUNS).toMatch(/CREATE TABLE IF NOT EXISTS qa_runs/);
    expect(schema.TABLE_QA_ASSETS).toMatch(/CREATE TABLE IF NOT EXISTS qa_assets/);
    expect(typeof schema.runPendingMigrations).toBe("function");
    expect(typeof runPendingMigrations).toBe("function");
  });
});
