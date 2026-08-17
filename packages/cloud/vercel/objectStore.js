"use strict";

function loadS3() {
  try {
    return {
      s3: require("@aws-sdk/client-s3"),
      presigner: require("@aws-sdk/s3-request-presigner")
    };
  } catch (err) {
    const e = new Error(
      "ZERO_CLOUD=vercel object store (R2) requires @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner"
    );
    e.cause = err;
    throw e;
  }
}

function r2Endpoint(accountId) {
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

function createObjectStore(opts = {}) {
  const bucket = opts.bucket || process.env.R2_BUCKET;
  const accountId = opts.accountId || process.env.R2_ACCOUNT_ID;
  const accessKeyId = opts.accessKeyId || process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = opts.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY;

  function client() {
    if (opts.client) return opts.client;
    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY are required for ZERO_CLOUD=vercel object store"
      );
    }
    const { S3Client } = loadS3().s3;
    opts.client = new S3Client({
      region: "auto",
      endpoint: r2Endpoint(accountId),
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true
    });
    return opts.client;
  }

  async function presign(op, key, ttlSec) {
    if (opts.presign) return opts.presign(op, key, ttlSec);
    if (!bucket) throw new Error("R2_BUCKET is required for ZERO_CLOUD=vercel object store");
    const sdk = loadS3();
    const Command = op === "put" ? sdk.s3.PutObjectCommand : sdk.s3.GetObjectCommand;
    return sdk.presigner.getSignedUrl(client(), new Command({ Bucket: bucket, Key: key }), {
      expiresIn: ttlSec
    });
  }

  return {
    async presignPut(key, ttlSec = 900) {
      return presign("put", key, ttlSec);
    },
    async presignGet(key, ttlSec = 900) {
      return presign("get", key, ttlSec);
    },
    async put(key, body, meta = {}) {
      if (opts.put) return opts.put(key, body, meta);
      if (!bucket) throw new Error("R2_BUCKET is required for ZERO_CLOUD=vercel object store");
      const { PutObjectCommand } = loadS3().s3;
      const Body = Buffer.isBuffer(body) ? body : await streamToBuffer(body);
      await client().send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body,
          ContentType: meta.contentType || "application/octet-stream"
        })
      );
    },
    async get(key) {
      if (opts.get) return opts.get(key);
      if (!bucket) throw new Error("R2_BUCKET is required for ZERO_CLOUD=vercel object store");
      const { GetObjectCommand } = loadS3().s3;
      const out = await client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      return out.Body;
    },
    async remove(key) {
      if (opts.remove) return opts.remove(key);
      if (!bucket) throw new Error("R2_BUCKET is required for ZERO_CLOUD=vercel object store");
      const { DeleteObjectCommand } = loadS3().s3;
      await client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
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

module.exports = { createObjectStore, r2Endpoint };
