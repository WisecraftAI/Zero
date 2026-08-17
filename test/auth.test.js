const jwt = require("jsonwebtoken");
const auth = require("../lib/auth");
const { apiKeyAuth } = require("../lib/middleware/auth");

describe("M5 auth + ACL", () => {
  const env = {
    ZERO_AUTH: "on",
    ZERO_API_KEYS: "acme:qa@acme.test:zero-acme-secret,beta:qa@beta.test:zero-beta-secret",
    ZERO_AUTH_JWT_SECRET: "jwt-test-secret"
  };
  const instance = auth.createAuth(env);

  it("rejects arbitrary non-empty API keys", () => {
    expect(instance.authenticateRequest({ headers: { "x-api-key": "sk-anything" } })).toBeNull();
    expect(instance.authenticateRequest({ headers: { "x-api-key": "not-empty" } })).toBeNull();
  });

  it("verifies stored API keys and binds tenant", () => {
    const identity = instance.authenticateRequest({
      headers: { "x-api-key": "zero-acme-secret" }
    });
    expect(identity).toMatchObject({
      authenticated: true,
      tenantId: "acme",
      email: "qa@acme.test",
      method: "api_key"
    });
  });

  it("ignores spoofable X-User-Email as identity", () => {
    const identity = instance.authenticateRequest({
      headers: { "x-user-email": "admin@evil.test", "X-User-Email": "admin@evil.test" }
    });
    expect(identity).toBeNull();
    expect(auth.identityEmail({ tenantId: "acme", email: null })).toBe("acme@local");
  });

  it("accepts a signed JWT with tenant claim", () => {
    const token = jwt.sign(
      { sub: "user-1", email: "lead@acme.test", tenantId: "acme" },
      env.ZERO_AUTH_JWT_SECRET,
      { algorithm: "HS256" }
    );
    const identity = instance.authenticateRequest({
      headers: { authorization: `Bearer ${token}` }
    });
    expect(identity).toMatchObject({
      authenticated: true,
      tenantId: "acme",
      email: "lead@acme.test",
      method: "jwt"
    });
  });

  it("scopes runs per tenant", () => {
    const acme = { tenantId: "acme", authenticated: true };
    const beta = { tenantId: "beta", authenticated: true };
    const run = { id: "1", tenantId: "acme" };
    expect(auth.canAccessRun(acme, run)).toBe(true);
    expect(auth.canAccessRun(beta, run)).toBe(false);
    expect(auth.canAccessRun(null, run)).toBe(false);
  });

  it("fails production boot without KEY_ENC_SECRET", () => {
    expect(() => auth.assertProductionSecrets({ NODE_ENV: "production" })).toThrow(/KEY_ENC_SECRET/);
    expect(() =>
      auth.assertProductionSecrets({
        NODE_ENV: "production",
        KEY_ENC_SECRET: auth.DEV_KEY_ENC_FALLBACK
      })
    ).toThrow(/KEY_ENC_SECRET/);
    expect(() =>
      auth.assertProductionSecrets({ NODE_ENV: "production", KEY_ENC_SECRET: "real-secret" })
    ).not.toThrow();
  });

  it("recording CORS allowlist never uses *", () => {
    const origins = auth.allowedOrigins({
      RECORDING_ORIGINS: "https://watch.example.com",
      FRONTEND_URL: "https://app.zer0.io"
    });
    expect(origins).toContain("https://watch.example.com");
    expect(origins).not.toContain("*");

    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; } };
    auth.recordingCors(
      { headers: { origin: "https://evil.example" }, method: "GET" },
      res,
      () => {}
    );
    expect(res.headers["Access-Control-Allow-Origin"]).toBeUndefined();

    auth.recordingCors(
      { headers: { origin: "http://localhost:5173" }, method: "GET" },
      res,
      () => {}
    );
    expect(res.headers["Access-Control-Allow-Origin"]).toBe("http://localhost:5173");
  });

  it("apiKeyAuth middleware rejects unverified keys", () => {
    const req = { headers: { "x-api-key": "garbage" } };
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      }
    };
    let nextCalled = false;
    apiKeyAuth()(req, res, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });
});
