"use strict";

function loadSdk() {
  try {
    return {
      s3: require("@aws-sdk/client-s3"),
      presigner: require("@aws-sdk/s3-request-presigner")
    };
  } catch (err) {
    const e = new Error(
      "ZERO_CLOUD=aws object store requires @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner"
    );
    e.cause = err;
    throw e;
  }
}

function createObjectStore(opts = {}) {
  const bucket = opts.bucket || process.env.ZERO_S3_BUCKET || process.env.S3_BUCKET;
  const region = opts.region || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
  const endpoint = opts.endpoint || process.env.S3_ENDPOINT || process.env.AWS_S3_ENDPOINT;

  function client() {
    if (opts.client) return opts.client;
    const { S3Client } = loadSdk().s3;
    const cfg = { region };
    if (endpoint) {
      cfg.endpoint = endpoint;
      cfg.forcePathStyle = true;
    }
    if (process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID) {
      cfg.credentials = {
        accessKeyId: process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY
      };
    }
    opts.client = new S3Client(cfg);
    return opts.client;
  }

  async function presign(op, key, ttlSec) {
    if (opts.presign) return opts.presign(op, key, ttlSec);
    if (!bucket) throw new Error("ZERO_S3_BUCKET (or S3_BUCKET) is required for ZERO_CLOUD=aws");
    const sdk = loadSdk();
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
      if (!bucket) throw new Error("ZERO_S3_BUCKET (or S3_BUCKET) is required for ZERO_CLOUD=aws");
      const { PutObjectCommand } = loadSdk().s3;
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
      if (!bucket) throw new Error("ZERO_S3_BUCKET (or S3_BUCKET) is required for ZERO_CLOUD=aws");
      const { GetObjectCommand } = loadSdk().s3;
      const out = await client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      return out.Body;
    },
    async remove(key) {
      if (opts.remove) return opts.remove(key);
      if (!bucket) throw new Error("ZERO_S3_BUCKET (or S3_BUCKET) is required for ZERO_CLOUD=aws");
      const { DeleteObjectCommand } = loadSdk().s3;
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

module.exports = { createObjectStore };
