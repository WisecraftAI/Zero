/**
 * Identity + ACL (M5).
 *
 * Verified API keys (hashed) and optional Bearer JWT / OIDC.
 * X-User-Email is never treated as identity.
 * Arbitrary non-empty x-api-key values are rejected.
 */

"use strict";

const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const LOCAL_TENANT = "local";
const DEV_KEY_ENC_FALLBACK = "zero-default-dev-key-change-in-production";

function timingSafeEqualString(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) {
    crypto.timingSafeEqual(left, Buffer.alloc(left.length));
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

function hashApiKey(plain) {
  return crypto.createHash("sha256").update(`zero.ak:${String(plain)}`).digest("hex");
}

function parseApiKeyEntries(raw) {
  if (!raw) return [];
  const text = String(raw).trim();
  if (!text) return [];
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      return (Array.isArray(parsed) ? parsed : []).map((row) => ({
        tenantId: String(row.tenantId || row.tenant || LOCAL_TENANT).trim(),
        email: String(row.email || row.subject || "").trim().toLowerCase() || null,
        key: String(row.key || row.secret || "").trim()
      })).filter((row) => row.key);
    } catch {
      return [];
    }
  }
  return text.split(",").map((part) => part.trim()).filter(Boolean).map((part) => {
    const bits = part.split(":");
    if (bits.length >= 3) {
      const tenantId = bits[0].trim();
      const email = bits[1].trim().toLowerCase();
      const key = bits.slice(2).join(":").trim();
      return { tenantId, email, key };
    }
    if (bits.length === 2) {
      return { tenantId: bits[0].trim(), email: null, key: bits[1].trim() };
    }
    return { tenantId: LOCAL_TENANT, email: null, key: part };
  }).filter((row) => row.key);
}

function loadApiKeyRecords(env = process.env) {
  const records = [];
  for (const entry of parseApiKeyEntries(env.ZERO_API_KEYS)) {
    records.push({
      tenantId: entry.tenantId || LOCAL_TENANT,
      email: entry.email,
      subject: entry.email || entry.tenantId || LOCAL_TENANT,
      keyHash: hashApiKey(entry.key)
    });
  }
  if (env.ZERO_DEV_API_KEY) {
    records.push({
      tenantId: env.ZERO_DEV_TENANT || LOCAL_TENANT,
      email: env.ZERO_DEV_EMAIL || "dev@local",
      subject: "dev",
      keyHash: hashApiKey(env.ZERO_DEV_API_KEY)
    });
  }
  return records;
}

function isAuthRequired(env = process.env) {
  if (env.NODE_ENV === "production") return true;
  return String(env.ZERO_AUTH || "").toLowerCase() === "on";
}

function assertProductionSecrets(env = process.env) {
  if (env.NODE_ENV !== "production") return;
  const secret = env.KEY_ENC_SECRET;
  if (!secret || secret === DEV_KEY_ENC_FALLBACK) {
    throw new Error("KEY_ENC_SECRET is required in production and must not be the dev default");
  }
}

function verifyApiKey(plain, records) {
  if (!plain || typeof plain !== "string") return null;
  const incoming = hashApiKey(plain);
  for (const rec of records) {
    if (timingSafeEqualString(incoming, rec.keyHash)) {
      return {
        authenticated: true,
        tenantId: rec.tenantId,
        subject: rec.subject,
        email: rec.email,
        method: "api_key"
      };
    }
  }
  return null;
}

function verifyBearerJwt(token, env = process.env) {
  if (!token) return null;
  const issuer = env.OIDC_ISSUER || undefined;
  const audience = env.OIDC_AUDIENCE || undefined;
  const rsa = env.OIDC_PUBLIC_KEY;
  const hs = env.ZERO_AUTH_JWT_SECRET;
  const secret = rsa || hs;
  if (!secret) return null;
  try {
    const payload = jwt.verify(token, secret, {
      algorithms: rsa ? ["RS256"] : ["HS256"],
      issuer,
      audience
    });
    const tenantId = payload.tenantId || payload.tid || payload.org_id || payload.org || LOCAL_TENANT;
    return {
      authenticated: true,
      tenantId: String(tenantId),
      subject: String(payload.sub || payload.email || tenantId),
      email: payload.email ? String(payload.email).toLowerCase() : null,
      method: rsa ? "oidc" : "jwt"
    };
  } catch {
    return null;
  }
}

function extractBearer(req) {
  const header = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (!header || typeof header !== "string") return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function extractApiKey(req) {
  const headers = req.headers || {};
  const fromHeader = headers["x-api-key"] || headers["X-API-Key"];
  if (fromHeader) return String(fromHeader).trim();
  if (req.query && req.query.apiKey) return String(req.query.apiKey).trim();
  return "";
}

function anonymousIdentity() {
  return {
    authenticated: false,
    tenantId: LOCAL_TENANT,
    subject: "anonymous",
    email: "default@local",
    method: "dev"
  };
}

function createAuth(env = process.env) {
  const records = loadApiKeyRecords(env);

  function authenticateRequest(req) {
    const key = extractApiKey(req);
    if (key) {
      const viaKey = verifyApiKey(key, records);
      if (viaKey) return viaKey;
      return null;
    }
    const bearer = extractBearer(req);
    if (bearer) return verifyBearerJwt(bearer, env);
    return null;
  }

  function resolveIdentity(req) {
    const verified = authenticateRequest(req);
    if (verified) return verified;
    if (isAuthRequired(env)) return null;
    return anonymousIdentity();
  }

  function attachIdentity() {
    return (req, _res, next) => {
      req.auth = resolveIdentity(req);
      next();
    };
  }

  function requireAuthWhenEnabled() {
    return (req, res, next) => {
      if (!req.auth) req.auth = resolveIdentity(req);
      if (isAuthRequired(env) && (!req.auth || !req.auth.authenticated)) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Verified API key (x-api-key) or Bearer token required."
        });
      }
      next();
    };
  }

  function requireAuth() {
    return (req, res, next) => {
      const identity = req.auth && req.auth.authenticated ? req.auth : authenticateRequest(req);
      if (!identity) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Verified API key (x-api-key) or Bearer token required."
        });
      }
      req.auth = identity;
      next();
    };
  }

  return {
    records,
    authenticateRequest,
    resolveIdentity,
    attachIdentity,
    requireAuth,
    requireAuthWhenEnabled
  };
}

const defaultAuth = createAuth();

function runTenantId(run) {
  if (!run) return LOCAL_TENANT;
  return run.tenantId || (run.input && run.input.tenantId) || LOCAL_TENANT;
}

function canAccessRun(identity, run) {
  if (!run) return false;
  if (!identity) return false;
  return runTenantId(run) === identity.tenantId;
}

function allowedOrigins(env = process.env) {
  const extras = [
    env.FRONTEND_URL,
    env.CLIENT_URL,
    env.PUBLIC_URL,
    env.APP_URL,
    env.RAILWAY_PUBLIC_DOMAIN ? `https://${env.RAILWAY_PUBLIC_DOMAIN}` : null,
    ...(String(env.RECORDING_ORIGINS || "").split(",")),
    ...(String(env.ALLOWED_ORIGINS || "").split(","))
  ];
  const base = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173"
  ];
  return [...base, ...extras].map((v) => v && String(v).trim()).filter(Boolean);
}

function recordingCors(req, res, next) {
  const origin = req.headers && req.headers.origin;
  if (origin && allowedOrigins().includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key");
  } else if (typeof res.removeHeader === "function") {
    res.removeHeader("Access-Control-Allow-Origin");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  if (typeof next === "function") next();
}

function identityEmail(identity) {
  if (!identity) return "default@local";
  return identity.email || `${identity.tenantId || LOCAL_TENANT}@local`;
}

module.exports = {
  LOCAL_TENANT,
  DEV_KEY_ENC_FALLBACK,
  hashApiKey,
  parseApiKeyEntries,
  loadApiKeyRecords,
  isAuthRequired,
  assertProductionSecrets,
  verifyApiKey,
  verifyBearerJwt,
  createAuth,
  authenticateRequest: defaultAuth.authenticateRequest,
  resolveIdentity: defaultAuth.resolveIdentity,
  attachIdentity: defaultAuth.attachIdentity,
  requireAuth: defaultAuth.requireAuth,
  requireAuthWhenEnabled: defaultAuth.requireAuthWhenEnabled,
  runTenantId,
  canAccessRun,
  allowedOrigins,
  recordingCors,
  identityEmail
};
