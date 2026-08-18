async function createProject(pool, { id, name, baseUrl }) {
  const pid = id || `proj-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  await pool.query(
    "INSERT INTO projects (id, name, base_url) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, base_url = EXCLUDED.base_url",
    [pid, name || "Unnamed", baseUrl || null]
  );
  return pid;
}

async function listProjects(pool) {
  const r = await pool.query("SELECT id, name, base_url, created_at FROM projects ORDER BY created_at DESC");
  return r.rows;
}

async function getProject(pool, projectId) {
  const r = await pool.query("SELECT * FROM projects WHERE id = $1", [projectId]);
  return r.rows[0] || null;
}

async function insertStoredScript(pool, { projectId, tcId, language, framework, contentText }) {
  await pool.query(
    "INSERT INTO stored_scripts (project_id, tc_id, language, framework, content_text) VALUES ($1, $2, $3, $4, $5)",
    [projectId, tcId, language || "java", framework || "selenium", contentText]
  );
}

async function getStoredScriptsByProject(pool, projectId) {
  const r = await pool.query(
    "SELECT id, tc_id, language, framework, content_text, created_at FROM stored_scripts WHERE project_id = $1 ORDER BY created_at DESC",
    [projectId]
  );
  return r.rows;
}

async function insertRecording(pool, { projectId, recordingJson }) {
  const r = await pool.query(
    "INSERT INTO recordings (project_id, recording_json) VALUES ($1, $2::jsonb) RETURNING id",
    [projectId, JSON.stringify(recordingJson)]
  );
  return r.rows[0].id;
}

module.exports = {
  createProject,
  listProjects,
  getProject,
  insertStoredScript,
  getStoredScriptsByProject,
  insertRecording
};
