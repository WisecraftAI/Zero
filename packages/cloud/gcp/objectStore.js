"use strict";

function loadStorage() {
  try {
    return require("@google-cloud/storage");
  } catch (err) {
    const e = new Error("ZERO_CLOUD=gcp object store requires @google-cloud/storage");
    e.cause = err;
    throw e;
  }
}

function createObjectStore(opts = {}) {
  const bucketName = opts.bucket || process.env.ZERO_GCS_BUCKET || process.env.GCS_BUCKET;

  function file(key) {
    if (opts.file) return opts.file(key);
    const { Storage } = loadStorage();
    if (!opts.storage) opts.storage = new Storage();
    if (!bucketName) throw new Error("ZERO_GCS_BUCKET (or GCS_BUCKET) is required for ZERO_CLOUD=gcp");
    return opts.storage.bucket(bucketName).file(key);
  }

  return {
    async presignPut(key, ttlSec = 900) {
      if (opts.presign) return opts.presign("write", key, ttlSec);
      const [url] = await file(key).getSignedUrl({
        version: "v4",
        action: "write",
        expires: Date.now() + ttlSec * 1000,
        contentType: "application/octet-stream"
      });
      return url;
    },
    async presignGet(key, ttlSec = 900) {
      if (opts.presign) return opts.presign("read", key, ttlSec);
      const [url] = await file(key).getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + ttlSec * 1000
      });
      return url;
    },
    async put(key, body, meta = {}) {
      if (opts.put) return opts.put(key, body, meta);
      const buf = Buffer.isBuffer(body) ? body : await streamToBuffer(body);
      await file(key).save(buf, {
        contentType: meta.contentType || "application/octet-stream",
        resumable: false
      });
    },
    async get(key) {
      if (opts.get) return opts.get(key);
      return file(key).createReadStream();
    },
    async remove(key) {
      if (opts.remove) return opts.remove(key);
      await file(key).delete({ ignoreNotFound: true });
    }
  };
}

function streamToBuffer(body) {
  if (!body) return Buffer.alloc(0);
  if (typeof body.pipe !== "function") return Buffer.from(String(body));
  return new Promise((resolve, reject) => {
    const chunks = [];
    body.on("data", (c) => chunks.push(c));
    body.on("end", () => resolve(Buffer.concat(chunks)));
    body.on("error", reject);
  });
}

module.exports = { createObjectStore };
