/**
 * AES-256-GCM symmetric encryption for storing secrets at rest.
 * The encryption key is derived from KEY_ENC_SECRET in the environment.
 *
 * If KEY_ENC_SECRET is not set, a default dev key is used (NOT for production).
 */
const crypto = require("crypto");

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const DEV_KEY_ENC_FALLBACK = "zero-default-dev-key-change-in-production";

function getKey() {
  const secret = process.env.KEY_ENC_SECRET || DEV_KEY_ENC_FALLBACK;
  return crypto.createHash("sha256").update(String(secret)).digest();
}

function encrypt(plain) {
  if (plain == null || plain === "") return null;
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

function decrypt(payload) {
  if (!payload) return null;
  try {
    const buf = Buffer.from(payload, "base64");
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const data = buf.subarray(IV_LEN + TAG_LEN);
    const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

function maskKey(plain) {
  if (!plain) return "";
  const s = String(plain);
  if (s.length <= 8) return "••••" + s.slice(-2);
  return "••••••••••••" + s.slice(-4);
}

function lastFour(plain) {
  if (!plain) return "";
  const s = String(plain);
  return s.length <= 4 ? s : s.slice(-4);
}

module.exports = { encrypt, decrypt, maskKey, lastFour, DEV_KEY_ENC_FALLBACK };
