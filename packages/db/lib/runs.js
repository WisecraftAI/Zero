const { sanitizeRunInput } = require("./sanitize");

async function upsertRun(pool, run) {
  const a = run.artifacts || {};
  const input = sanitizeRunInput(run.input);

  await pool.query(
    `INSERT INTO qa_runs (
       id, project_id, status, input_json, stages_json, requirements_json,
       manual_tc_json, automation_bundle_json, execution_report_json,
       manager_report_json, delivery_report_json, cms_signal_json,
       created_at, updated_at, tenant_id
     ) VALUES (
       $1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,
       $10::jsonb,$11::jsonb,$12::jsonb,$13::timestamptz,$14::timestamptz,$15
     )
     ON CONFLICT (id) DO UPDATE SET
       project_id = EXCLUDED.project_id,
       status = EXCLUDED.status,
       input_json = EXCLUDED.input_json,
       stages_json = EXCLUDED.stages_json,
       requirements_json = EXCLUDED.requirements_json,
       manual_tc_json = EXCLUDED.manual_tc_json,
       automation_bundle_json = EXCLUDED.automation_bundle_json,
       execution_report_json = EXCLUDED.execution_report_json,
       manager_report_json = EXCLUDED.manager_report_json,
       delivery_report_json = EXCLUDED.delivery_report_json,
       cms_signal_json = EXCLUDED.cms_signal_json,
       tenant_id = EXCLUDED.tenant_id,
       updated_at = EXCLUDED.updated_at`,
    [
      run.id,
      input.projectId || null,
      run.status,
      JSON.stringify(input),
      JSON.stringify(run.stages || {}),
      JSON.stringify(a.requirements ?? null),
      JSON.stringify(a.manualTestCases ?? null),
      JSON.stringify(a.automationBundle ?? null),
      JSON.stringify(a.executionReport ?? null),
      JSON.stringify(a.managerReport ?? null),
      JSON.stringify(a.deliveryReport ?? null),
      JSON.stringify(a.cmsSignalReport ?? null),
      run.createdAt || new Date().toISOString(),
      run.updatedAt || new Date().toISOString(),
      run.tenantId || input.tenantId || "local"
    ]
  );
}

async function getRunById(pool, id) {
  const r = await pool.query("SELECT * FROM qa_runs WHERE id = $1", [id]);
  return r.rows[0] || null;
}

async function listRunRows(pool, limit = 50, tenantId = null) {
  if (tenantId) {
    const r = await pool.query(
      `SELECT * FROM qa_runs
        WHERE tenant_id = $2 OR (tenant_id IS NULL AND $2 = 'local')
        ORDER BY created_at DESC LIMIT $1`,
      [limit, tenantId]
    );
    return r.rows;
  }
  const r = await pool.query("SELECT * FROM qa_runs ORDER BY created_at DESC LIMIT $1", [limit]);
  return r.rows;
}

module.exports = {
  upsertRun,
  getRunById,
  listRunRows
};
