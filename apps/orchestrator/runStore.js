"use strict";

const fs = require("fs/promises");
const path = require("path");
const dbHelpers = require("@zero/db");
const cloud = require("@zero/cloud");

function artifactsRoot() {
  return process.env.VERCEL
    ? path.join("/tmp", "artifacts")
    : path.join(process.cwd(), "artifacts");
}

function createRunStore(opts = {}) {
  const root = opts.artifactsRoot || artifactsRoot();
  const memory = opts.runs || new Map();
  let dbPool = opts.dbPool || null;
  let dbEnabled = Boolean(opts.dbEnabled);

  function setPool(pool) {
    dbPool = pool;
    dbEnabled = Boolean(pool);
  }

  async function persistRun(run) {
    if (!run || !run.id) return;
    run.updatedAt = new Date().toISOString();
    memory.set(run.id, run);
    try {
      await fs.mkdir(run.runDir || path.join(root, run.id), { recursive: true });
      const dir = run.runDir || path.join(root, run.id);
      run.runDir = dir;
      const storageRun = {
        ...run,
        input: {
          ...run.input,
          tcFileBuffer: undefined
        }
      };
      await fs.writeFile(path.join(dir, "run.json"), JSON.stringify(storageRun, null, 2));
    } catch (e) {
      console.error(`Failed to write run.json for ${run.id}:`, e.message);
    }
    if (dbPool) {
      try {
        await dbHelpers.upsertRun(dbPool, run);
      } catch (e) {
        console.error(`Failed to persist run ${run.id} to Postgres:`, e.message);
      }
    }
    try {
      const json = await fs.readFile(path.join(run.runDir, "run.json"));
      await cloud.objectStore.put(`runs/${run.id}/run.json`, json, { contentType: "application/json" });
    } catch (e) {
      if (e.code !== "ENOENT") {
        console.error(`Failed to persist run ${run.id} to object store:`, e.message);
      }
    }
    try {
      await cloud.cache.set(`state.${run.id}`, {
        runId: run.id,
        status: run.status,
        stages: run.stages,
        updatedAt: run.updatedAt
      }, 86400);
      await cloud.cache.publish(`state.${run.id}`, {
        runId: run.id,
        status: run.status,
        stages: run.stages,
        updatedAt: run.updatedAt
      });
    } catch (e) {
      console.error(`Failed to publish run state ${run.id}:`, e.message);
    }
  }

  async function getRun(id) {
    if (memory.has(id)) return memory.get(id);
    try {
      const runPath = path.join(root, id, "run.json");
      const data = await fs.readFile(runPath, "utf8");
      const run = JSON.parse(data);
      run.runDir = path.join(root, id);
      memory.set(id, run);
      return run;
    } catch {
      // fall through to Postgres
    }
    if (dbPool) {
      try {
        const row = await dbHelpers.getRunById(dbPool, id);
        if (row) {
          const input = row.input_json || {};
          const run = {
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
          memory.set(id, run);
          return run;
        }
      } catch (e) {
        console.error(`Postgres getRun failed for ${id}:`, e.message);
      }
    }
    return null;
  }

  async function persistAssets(run) {
    if (!dbEnabled || !dbPool) return;
    try {
      await dbHelpers.replaceAssets(dbPool, run);
    } catch (e) {
      console.error(`Failed to persist assets for ${run.id}:`, e.message);
    }
  }

  return {
    getRun,
    persistRun,
    persistAssets,
    setPool,
    get dbPool() { return dbPool; },
    get dbEnabled() { return dbEnabled; },
    artifactsRoot: root,
    runs: memory
  };
}

module.exports = { createRunStore, artifactsRoot };
