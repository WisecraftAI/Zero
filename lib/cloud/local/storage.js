'use strict';

/**
 * Local ObjectStore — filesystem under artifacts/cloud-store + HMAC-ish tokens.
 * Presigned URLs are http(s) paths served by the API (/api/cloud/local/...),
 * not real S3. Enough for M2 local-first development.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.env.ZERO_LOCAL_STORE_DIR
  || path.join(process.cwd(), 'artifacts', 'cloud-store');
const SECRET = process.env.ZERO_LOCAL_STORE_SECRET || 'zero-local-dev-store';
const PUBLIC_BASE = (process.env.ZERO_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

function ensureRoot() {
  fs.mkdirSync(ROOT, { recursive: true });
}

function safeKey(key) {
  const cleaned = String(key).replace(/^\/+/, '').replace(/\.\./g, '');
  if (!cleaned) throw new Error('object key required');
  return cleaned;
}

function absPath(key) {
  return path.join(ROOT, safeKey(key));
}

function sign(key, op, exp) {
  return crypto
    .createHmac('sha256', SECRET)
    .update(`${op}:${key}:${exp}`)
    .digest('hex')
    .slice(0, 32);
}

function verify(key, op, exp, token) {
  if (Date.now() / 1000 > Number(exp)) return false;
  const expected = sign(key, op, exp);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(token)));
  } catch {
    return false;
  }
}

function makeUrl(op, key, ttlSec = 900) {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const token = sign(key, op, exp);
  const q = new URLSearchParams({ key, op, exp: String(exp), token });
  return `${PUBLIC_BASE}/api/cloud/local?${q}`;
}

const objectStore = {
  async presignPut(key, ttlSec = 900) {
    return makeUrl('put', safeKey(key), ttlSec);
  },
  async presignGet(key, ttlSec = 900) {
    return makeUrl('get', safeKey(key), ttlSec);
  },
  async put(key, body, meta = {}) {
    ensureRoot();
    const dest = absPath(key);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (Buffer.isBuffer(body)) {
      fs.writeFileSync(dest, body);
    } else if (body && typeof body.pipe === 'function') {
      await new Promise((resolve, reject) => {
        const out = fs.createWriteStream(dest);
        body.pipe(out);
        out.on('finish', resolve);
        out.on('error', reject);
        body.on('error', reject);
      });
    } else {
      fs.writeFileSync(dest, Buffer.from(String(body ?? '')));
    }
    if (meta && Object.keys(meta).length) {
      fs.writeFileSync(`${dest}.meta.json`, JSON.stringify(meta));
    }
  },
  async get(key) {
    const dest = absPath(key);
    if (!fs.existsSync(dest)) {
      const err = new Error(`Object not found: ${key}`);
      err.code = 'ENOENT';
      throw err;
    }
    return fs.createReadStream(dest);
  },
  async remove(key) {
    const dest = absPath(key);
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    if (fs.existsSync(`${dest}.meta.json`)) fs.unlinkSync(`${dest}.meta.json`);
  },
  /** helpers for API route verification */
  _verify: verify,
  _absPath: absPath,
  _root: ROOT,
};

module.exports = objectStore;
