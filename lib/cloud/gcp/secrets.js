"use strict";

function loadSm() {
  try {
    return require("@google-cloud/secret-manager");
  } catch (err) {
    const e = new Error("ZERO_CLOUD=gcp secrets requires @google-cloud/secret-manager");
    e.cause = err;
    throw e;
  }
}

function createSecrets(opts = {}) {
  const project = opts.project || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
  const prefix = opts.prefix || process.env.ZERO_SECRETS_PREFIX || "zero-";

  function client() {
    if (opts.client) return opts.client;
    const { SecretManagerServiceClient } = loadSm();
    opts.client = new SecretManagerServiceClient();
    return opts.client;
  }

  function secretPath(name) {
    if (!project) throw new Error("GOOGLE_CLOUD_PROJECT is required for ZERO_CLOUD=gcp secrets");
    return `projects/${project}/secrets/${prefix}${name}`;
  }

  return {
    async get(name) {
      if (opts.get) return opts.get(name);
      if (process.env[name]) return process.env[name];
      const [version] = await client().accessSecretVersion({
        name: `${secretPath(name)}/versions/latest`
      });
      const data = version.payload && version.payload.data;
      if (data == null) {
        const err = new Error(`Secret not found: ${name}`);
        err.code = "ENOENT";
        throw err;
      }
      return Buffer.isBuffer(data) ? data.toString("utf8") : String(data);
    },
    async put(name, value) {
      if (opts.put) return opts.put(name, value);
      const sm = client();
      const parent = `projects/${project}`;
      const secretId = `${prefix}${name}`;
      try {
        await sm.createSecret({
          parent,
          secretId,
          secret: { replication: { automatic: {} } }
        });
      } catch (err) {
        if (!err || !String(err.message || err).includes("already exists")) throw err;
      }
      await sm.addSecretVersion({
        parent: `${parent}/secrets/${secretId}`,
        payload: { data: Buffer.from(String(value), "utf8") }
      });
    }
  };
}

module.exports = { createSecrets };
