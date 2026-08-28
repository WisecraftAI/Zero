"use strict";

async function upsertAgentMemory(pool, { tenantId, host, agent, memoryJson, sourceRunId }) {
  if (!pool || !host || !agent || !memoryJson) return;
  await pool.query(
    `INSERT INTO agent_memory (tenant_id, host, agent, memory_json, source_run_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4::jsonb, $5, NOW(), NOW())
     ON CONFLICT (tenant_id, host, agent)
     DO UPDATE SET memory_json = EXCLUDED.memory_json,
                   source_run_id = EXCLUDED.source_run_id,
                   updated_at = NOW()`,
    [
      tenantId || "local",
      String(host).toLowerCase(),
      String(agent),
      JSON.stringify(memoryJson),
      sourceRunId || null
    ]
  );
}

async function getAgentMemoryByHost(pool, { tenantId, host } = {}) {
  if (!pool || !host) return [];
  const result = await pool.query(
    `SELECT agent, memory_json, source_run_id, updated_at
       FROM agent_memory
      WHERE tenant_id = $1 AND host = $2
      ORDER BY agent`,
    [tenantId || "local", String(host).toLowerCase()]
  );
  return result.rows.map((row) => ({
    agent: row.agent,
    memory: row.memory_json,
    sourceRunId: row.source_run_id,
    updatedAt: row.updated_at
  }));
}

module.exports = {
  upsertAgentMemory,
  getAgentMemoryByHost
};
