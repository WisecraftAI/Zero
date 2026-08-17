"use strict";

function loadSm() {
  try {
    return require("@aws-sdk/client-secrets-manager");
  } catch (err) {
    const e = new Error("ZERO_CLOUD=aws secrets requires @aws-sdk/client-secrets-manager");
    e.cause = err;
    throw e;
  }
}

function createSecrets(opts = {}) {
  const region = opts.region || process.env.AWS_REGION || "us-east-1";
  const prefix = opts.prefix || process.env.ZERO_SECRETS_PREFIX || "zero/";

  function client() {
    if (opts.client) return opts.client;
    const { SecretsManagerClient } = loadSm();
    opts.client = new SecretsManagerClient({ region });
    return opts.client;
  }

  function id(name) {
    return `${prefix}${name}`;
  }

  return {
    async get(name) {
      if (opts.get) return opts.get(name);
      if (process.env[name]) return process.env[name];
      const { GetSecretValueCommand } = loadSm();
      const out = await client().send(new GetSecretValueCommand({ SecretId: id(name) }));
      if (out.SecretString != null) return out.SecretString;
      if (out.SecretBinary) return Buffer.from(out.SecretBinary).toString("utf8");
      const err = new Error(`Secret not found: ${name}`);
      err.code = "ENOENT";
      throw err;
    },
    async put(name, value) {
      if (opts.put) return opts.put(name, value);
      const sdk = loadSm();
      try {
        await client().send(
          new sdk.PutSecretValueCommand({ SecretId: id(name), SecretString: String(value) })
        );
      } catch (err) {
        if (err && (err.name === "ResourceNotFoundException" || err.$metadata?.httpStatusCode === 404)) {
          await client().send(
            new sdk.CreateSecretCommand({ Name: id(name), SecretString: String(value) })
          );
          return;
        }
        throw err;
      }
    }
  };
}

module.exports = { createSecrets };
