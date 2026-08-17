/**
 * AES-256-GCM symmetric encryption for storing secrets at rest.
 * Same algorithm as apps/api/encryption.js (orchestrator must not import sibling apps).
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

module.exports = { decrypt, DEV_KEY_ENC_FALLBACK };
