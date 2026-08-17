"use strict";

function loadKv() {
  try {
    return {
      secrets: require("@azure/keyvault-secrets"),
      identity: require("@azure/identity")
    };
  } catch (err) {
    const e = new Error(
      "ZERO_CLOUD=azure secrets requires @azure/keyvault-secrets and @azure/identity"
    );
    e.cause = err;
    throw e;
  }
}

function createSecrets(opts = {}) {
  const vault =
    opts.vault ||
    process.env.AZURE_KEY_VAULT_NAME ||
    process.env.ZERO_AZURE_KEY_VAULT;
  const prefix = opts.prefix || process.env.ZERO_SECRETS_PREFIX || "zero-";

  function client() {
    if (opts.client) return opts.client;
    const { SecretClient } = loadKv().secrets;
    const { DefaultAzureCredential } = loadKv().identity;
    if (!vault) {
      throw new Error("AZURE_KEY_VAULT_NAME is required for ZERO_CLOUD=azure secrets");
    }
    const url = vault.startsWith("https://")
      ? vault
      : `https://${vault}.vault.azure.net`;
    opts.client = new SecretClient(url, new DefaultAzureCredential());
    return opts.client;
  }

  function secretName(name) {
    return `${prefix}${name}`.replace(/[^a-zA-Z0-9-]/g, "-");
  }

  return {
    async get(name) {
      if (opts.get) return opts.get(name);
      if (process.env[name]) return process.env[name];
      const secret = await client().getSecret(secretName(name));
      if (secret.value == null) {
        const err = new Error(`Secret not found: ${name}`);
        err.code = "ENOENT";
        throw err;
      }
      return secret.value;
    },
    async put(name, value) {
      if (opts.put) return opts.put(name, value);
      await client().setSecret(secretName(name), String(value));
    }
  };
}

module.exports = { createSecrets };
