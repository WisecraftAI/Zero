"use strict";

function createSecrets(opts = {}) {
  const memory = opts.memory || new Map();

  return {
    async get(name) {
      if (opts.get) return opts.get(name);
      if (process.env[name] != null) return process.env[name];
      if (memory.has(name)) return memory.get(name);
      const err = new Error(`Secret not found: ${name}`);
      err.code = "ENOENT";
      throw err;
    },
    async put(name, value) {
      if (opts.put) return opts.put(name, value);
      // Vercel project env vars are managed in the dashboard — runtime put is in-memory only.
      memory.set(name, String(value));
    }
  };
}

module.exports = { createSecrets };
