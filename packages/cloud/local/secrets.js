'use strict';

/**
 * Local secrets — process.env + optional artifacts/cloud-secrets.json.
 * Never commit real secrets. Login passwords must not be written here from agents.
 */

const fs = require('fs');
const path = require('path');

const FILE = process.env.ZERO_LOCAL_SECRETS_FILE
  || path.join(process.cwd(), 'artifacts', 'cloud-secrets.json');

function readFile() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeFile(obj) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(obj, null, 2));
}

const secrets = {
  async get(name) {
    if (process.env[name]) return process.env[name];
    const all = readFile();
    if (all[name] == null) {
      const err = new Error(`Secret not found: ${name}`);
      err.code = 'ENOENT';
      throw err;
    }
    return String(all[name]);
  },
  async put(name, value) {
    const all = readFile();
    all[name] = value;
    writeFile(all);
  },
};

module.exports = secrets;
