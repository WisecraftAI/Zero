"use strict";

const fs = require("fs/promises");
const path = require("path");
const dbHelpers = require("./index");

function defaultArtifactsRoot() {
  return process.env.VERCEL
    ? path.join("/tmp", "artifacts")
    : path.join(process.cwd(), "artifacts");
}

function rowToRun(row, root) {
  const input = row.input_json || {};
  return {
    id: row.id,
    tenantId: row.tenant_id || input.tenantId,
    runDir: path.join(root, row.id),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    input,
    status: row.status,
    stages: row.stages_json,
    artifacts: {
      requirements: row.requirements_json,
      manualTestCases: row.manual_tc_json,
      automationBundle: row.automation_bundle_json,
      executionReport: row.execution_report_json,
      managerReport: row.manager_report_json,
      deliveryReport: row.delivery_report_json || null,
      recording: input.recording || null,
      cmsSignalReport: row.cms_signal_json || null
    }
  };
}

function createRunStore(opts = {}) {
  const root = opts.artifactsRoot || defaultArtifactsRoot();
  const memory = opts.runs || new Map();
  const cloud = opts.cloud;
  let dbPool = opts.dbPool || null;

  function setPool(pool) {
    dbPool = pool;
  }

  async function persistRun(run) {
    if (!run || !run.id) return;
    run.updatedAt = new Date().toISOString();
    memory.set(run.id, run);

    const dir = run.runDir || path.join(root, run.id);
    run.runDir = dir;
    const storageRun = {
      ...run,
      input: { ...run.input, tcFileBuffer: undefined }
    };

    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "run.json"), JSON.stringify(storageRun, null, 2));
    } catch (err) {
      console.error(`Failed to write run.json for ${run.id}:`, err.message);
    }

    if (dbPool) {
      try {
        await dbHelpers.upsertRun(dbPool, run);
      } catch (err) {
        console.error(`Failed to persist run ${run.id} to Postgres:`, err.message);
      }
    }

    if (cloud && cloud.objectStore) {
      try {
        const json = await fs.readFile(path.join(dir, "run.json"));
        await cloud.objectStore.put(`runs/${run.id}/run.json`, json, {
          contentType: "application/json"
        });
      } catch (err) {
        if (err.code !== "ENOENT") {
          console.error(`Failed to persist run ${run.id} to object store:`, err.message);
        }
      }
    }

    if (cloud && cloud.cache) {
      const state = {
        runId: run.id,
        status: run.status,
        stages: run.stages,
        updatedAt: run.updatedAt
      };
      try {
        await cloud.cache.set(`state.${run.id}`, state, 86400);
        await cloud.cache.publish(`state.${run.id}`, state);
      } catch (err) {
        console.error(`Failed to publish run state ${run.id}:`, err.message);
      }
    }
  }

  async function getRun(id) {
    if (memory.has(id)) return memory.get(id);

    try {
      const data = await fs.readFile(path.join(root, id, "run.json"), "utf8");
      const run = JSON.parse(data);
      run.runDir = path.join(root, id);
      memory.set(id, run);
      return run;
    } catch {
      // Shared volumes are optional; fall through to the durable database.
    }

    if (!dbPool) return null;
    try {
      const row = await dbHelpers.getRunById(dbPool, id);
      if (!row) return null;
      const run = rowToRun(row, root);
      memory.set(id, run);
      return run;
    } catch (err) {
      console.error(`Postgres getRun failed for ${id}:`, err.message);
      return null;
    }
  }

  async function persistAssets(run) {
    if (!dbPool) return;
    try {
      await dbHelpers.replaceAssets(dbPool, run);
    } catch (err) {
      console.error(`Failed to persist assets for ${run.id}:`, err.message);
    }
  }

  return {
    getRun,
    persistRun,
    persistAssets,
    setPool,
    get dbPool() {
      return dbPool;
    },
    get dbEnabled() {
      return Boolean(dbPool);
    },
    artifactsRoot: root,
    runs: memory
  };
}

module.exports = {
  createRunStore,
  defaultArtifactsRoot,
  rowToRun
};
