"use strict";

function loadSdk() {
  try {
    return require("@azure/storage-blob");
  } catch (err) {
    const e = new Error(
      "ZERO_CLOUD=azure object store requires @azure/storage-blob"
    );
    e.cause = err;
    throw e;
  }
}

function containerName(opts) {
  return (
    opts.container ||
    process.env.ZERO_AZURE_CONTAINER ||
    process.env.AZURE_STORAGE_CONTAINER ||
    "zero"
  );
}

function createObjectStore(opts = {}) {
  const container = containerName(opts);

  function serviceClient() {
    if (opts.client) return opts.client;
    const { BlobServiceClient, StorageSharedKeyCredential } = loadSdk();
    const conn =
      opts.connectionString || process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (conn) {
      opts.client = BlobServiceClient.fromConnectionString(conn);
      return opts.client;
    }
    const account =
      opts.account || process.env.AZURE_STORAGE_ACCOUNT || process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const key =
      opts.accountKey ||
      process.env.AZURE_STORAGE_ACCOUNT_KEY ||
      process.env.AZURE_STORAGE_KEY;
    if (account && key) {
      const cred = new StorageSharedKeyCredential(account, key);
      opts.client = new BlobServiceClient(
        `https://${account}.blob.core.windows.net`,
        cred
      );
      return opts.client;
    }
    throw new Error(
      "AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT + AZURE_STORAGE_ACCOUNT_KEY is required for ZERO_CLOUD=azure"
    );
  }

  function blobClient(key) {
    if (opts.blob) return opts.blob(key);
    return serviceClient().getContainerClient(container).getBlockBlobClient(key);
  }

  async function presign(op, key, ttlSec) {
    if (opts.presign) return opts.presign(op, key, ttlSec);
    const sdk = loadSdk();
    const client = blobClient(key);
    const startsOn = new Date();
    const expiresOn = new Date(Date.now() + ttlSec * 1000);
    const permissions = op === "put" ? "cw" : "r";
    const sas = await client.generateSasUrl({
      permissions: sdk.BlobSASPermissions.parse(permissions),
      startsOn,
      expiresOn
    });
    return sas;
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
      const buf = Buffer.isBuffer(body) ? body : await streamToBuffer(body);
      await blobClient(key).uploadData(buf, {
        blobHTTPHeaders: {
          blobContentType: meta.contentType || "application/octet-stream"
        }
      });
    },
    async get(key) {
      if (opts.get) return opts.get(key);
      const download = await blobClient(key).download();
      return download.readableStreamBody;
    },
    async remove(key) {
      if (opts.remove) return opts.remove(key);
      await blobClient(key).deleteIfExists();
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

module.exports = { createObjectStore, containerName };
