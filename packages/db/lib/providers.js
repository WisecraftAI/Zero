async function listProviderKeys(pool, userEmail) {
  const r = await pool.query(
    `SELECT provider, last_4, created_at, updated_at, last_used_at
       FROM provider_keys
      WHERE user_email = $1
      ORDER BY provider`,
    [userEmail]
  );
  return r.rows;
}

async function upsertProviderKey(pool, { userEmail, provider, encryptedKey, last4 }) {
  await pool.query(
    `INSERT INTO provider_keys (user_email, provider, encrypted_key, last_4, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (user_email, provider)
     DO UPDATE SET encrypted_key = EXCLUDED.encrypted_key,
                   last_4 = EXCLUDED.last_4,
                   updated_at = NOW()`,
    [userEmail, provider, encryptedKey, last4]
  );
}

async function deleteProviderKey(pool, userEmail, provider) {
  await pool.query("DELETE FROM provider_keys WHERE user_email = $1 AND provider = $2", [userEmail, provider]);
}

async function getEncryptedProviderKey(pool, userEmail, provider) {
  const r = await pool.query(
    "SELECT encrypted_key FROM provider_keys WHERE user_email = $1 AND provider = $2",
    [userEmail, provider]
  );
  return r.rows[0]?.encrypted_key || null;
}

async function listAgentSettings(pool, userEmail) {
  const r = await pool.query(
    `SELECT agent, provider, model, prompt, updated_at
       FROM agent_settings
      WHERE user_email = $1
      ORDER BY agent`,
    [userEmail]
  );
  return r.rows;
}

async function upsertAgentSettings(pool, { userEmail, agent, provider, model, prompt }) {
  await pool.query(
    `INSERT INTO agent_settings (user_email, agent, provider, model, prompt, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (user_email, agent)
     DO UPDATE SET provider = EXCLUDED.provider,
                   model = EXCLUDED.model,
                   prompt = EXCLUDED.prompt,
                   updated_at = NOW()`,
    [userEmail, agent, provider || null, model || null, prompt || null]
  );
}

module.exports = {
  listProviderKeys,
  upsertProviderKey,
  deleteProviderKey,
  getEncryptedProviderKey,
  listAgentSettings,
  upsertAgentSettings
};
