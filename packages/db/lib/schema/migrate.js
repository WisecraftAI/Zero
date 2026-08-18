"use strict";

const fs = require("fs");
const path = require("path");

const MIGRATIONS_DIR = path.join(__dirname, "../../migrations");

const SCHEMA_MIGRATIONS = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

function listMigrationFiles(dir = MIGRATIONS_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

async function appliedMigrationIds(pool) {
  await pool.query(SCHEMA_MIGRATIONS);
  const result = await pool.query("SELECT id FROM schema_migrations ORDER BY id");
  return new Set(result.rows.map((row) => row.id));
}

async function applyMigrationFile(pool, filePath, id) {
  const sql = fs.readFileSync(filePath, "utf8");
  await pool.query("BEGIN");
  try {
    await pool.query(sql);
    await pool.query("INSERT INTO schema_migrations (id) VALUES ($1)", [id]);
    await pool.query("COMMIT");
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
}

async function runPendingMigrations(pool, opts = {}) {
  const dir = opts.migrationsDir || MIGRATIONS_DIR;
  const applied = await appliedMigrationIds(pool);
  const pending = [];

  for (const fileName of listMigrationFiles(dir)) {
    const id = fileName.replace(/\.sql$/, "");
    if (applied.has(id)) continue;
    await applyMigrationFile(pool, path.join(dir, fileName), id);
    pending.push(id);
  }

  return pending;
}

module.exports = {
  listMigrationFiles,
  runPendingMigrations
};
