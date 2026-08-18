async function replaceAssets(pool, run) {
  if (!run.artifacts || !run.artifacts.automationBundle) return 0;

  const script = run.artifacts.automationBundle.generatedPlaywrightScript || "";
  const javaScript = run.artifacts.automationBundle.generatedSeleniumJava || "";
  const manualTc = JSON.stringify(run.artifacts.manualTestCases || {}, null, 2);
  const manager = JSON.stringify(run.artifacts.managerReport || {}, null, 2);

  await pool.query("DELETE FROM qa_assets WHERE run_id = $1", [run.id]);

  const rows = [
    ["manual_test_cases", "manual_test_cases.json", manualTc],
    ["automation_script", "generated.spec.ts", script],
    ["manager_report", "manager_report.json", manager]
  ];
  if (javaScript) {
    rows.push(["automation_script_java", "generated.java", javaScript]);
  }

  const placeholders = rows.map((_, i) => {
    const n = i * 3;
    return `($1,$${n + 2},$${n + 3},$${n + 4})`;
  });
  const params = [run.id, ...rows.flat()];

  await pool.query(
    `INSERT INTO qa_assets (run_id, asset_type, asset_name, content_text)
     VALUES ${placeholders.join(",")}`,
    params
  );
  return rows.length;
}

async function listAssetsByRunId(pool, runId) {
  const r = await pool.query(
    "SELECT asset_type, asset_name, content_text FROM qa_assets WHERE run_id = $1 ORDER BY id",
    [runId]
  );
  return r.rows;
}

module.exports = {
  replaceAssets,
  listAssetsByRunId
};
