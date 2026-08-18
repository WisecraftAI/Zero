const db = require("@zero/db");
const { hostFromUrl } = require("../shared/url");
const { parseElementEntry } = require("./parser");

async function processElementLog(pool, payload, runId = null) {
  if (!pool) return { ok: false, error: "Database not configured" };

  const url = payload.url || payload.pageUrl || "";
  const host = hostFromUrl(url);
  if (!host) return { ok: false, error: "Invalid or missing url" };

  let elements = payload.elements || (payload.snapshot && payload.snapshot.elements) || [];
  if (!Array.isArray(elements)) elements = [];

  const inserted = [];
  for (const entry of elements) {
    const parsed = parseElementEntry(entry);
    if (!parsed) continue;
    await db.upsertLocator(pool, {
      host,
      elementKey: parsed.elementKey,
      selectorType: parsed.selectorType,
      selectorValue: parsed.selectorValue,
      xpath: parsed.xpath,
      role: parsed.role,
      label: parsed.label,
      runId
    });
    inserted.push(parsed.elementKey);
  }

  await db.insertElementLog(pool, {
    runId,
    host,
    url,
    snapshotJson: { url, elements: payload.elements || (payload.snapshot && payload.snapshot.elements) || [] }
  });

  return { ok: true, host, count: inserted.length, keys: [...new Set(inserted)] };
}

module.exports = { processElementLog };
