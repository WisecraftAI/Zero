async function upsertLocator(pool, { host, elementKey, selectorType, selectorValue, xpath, role, label, runId }) {
  await pool.query(
    `INSERT INTO element_locators (host, element_key, selector_type, selector_value, xpath, role, label, run_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (host, element_key, selector_value)
     DO UPDATE SET xpath = COALESCE(EXCLUDED.xpath, element_locators.xpath),
                   role = COALESCE(EXCLUDED.role, element_locators.role),
                   label = COALESCE(EXCLUDED.label, element_locators.label),
                   run_id = EXCLUDED.run_id,
                   created_at = NOW()`,
    [
      host,
      elementKey,
      selectorType || "css",
      selectorValue,
      xpath || null,
      role || null,
      label || null,
      runId || null
    ]
  );
}

async function getLocatorsByHost(pool, host) {
  const result = await pool.query(
    `SELECT element_key, selector_type, selector_value, xpath, role, label
     FROM element_locators
     WHERE host = $1
     ORDER BY created_at DESC`,
    [host]
  );
  const byKey = {};
  for (const row of result.rows) {
    if (!byKey[row.element_key]) byKey[row.element_key] = [];
    byKey[row.element_key].push({
      selectorType: row.selector_type,
      selectorValue: row.selector_value,
      xpath: row.xpath,
      role: row.role,
      label: row.label
    });
  }
  return byKey;
}

async function insertElementLog(pool, { runId, host, url, snapshotJson }) {
  const result = await pool.query(
    `INSERT INTO element_logs (run_id, host, url, snapshot_json)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING id`,
    [runId || null, host, url, JSON.stringify(snapshotJson)]
  );
  return result.rows[0].id;
}

async function getElementLogsByHost(pool, host, limit = 10) {
  const result = await pool.query(
    `SELECT id, run_id, url, snapshot_json, created_at
     FROM element_logs
     WHERE host = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [host, limit]
  );
  return result.rows;
}

module.exports = {
  upsertLocator,
  getLocatorsByHost,
  insertElementLog,
  getElementLogsByHost
};
