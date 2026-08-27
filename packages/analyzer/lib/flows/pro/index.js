const { createElementContext, createFlow } = require('./helpers');
const { buildCommonFlows } = require('./commonFlows');
const { buildTypeSpecificFlows } = require('./typeFlows');
const { buildFormAndFallbackFlows } = require('./formFlows');

function uniqueFlowNames(values) {
  const seen = new Set();
  const names = [];
  for (const value of values) {
    const label = String(value || "").trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(label);
  }
  return names;
}

/**
 * When the crawl found no interactive elements, still emit the critical flows
 * the taxonomy already knows for this domain / sub-domain.
 */
function buildClassificationFallbackFlows(websiteType, subDomain) {
  const names = uniqueFlowNames([
    ...(subDomain?.criticalFlows || []),
    ...(websiteType?.criticalFlows || []),
  ]).slice(0, 5);

  return names.map((name) =>
    createFlow({
      name,
      priority: "Critical",
      description: `Verify ${name} for this site type`,
      steps: [
        { action: "navigate", target: "Homepage", description: `Start ${name} from the homepage` },
        { action: "interact", target: name, description: `Complete each step in ${name}` },
        { action: "verify", target: name, description: `Confirm ${name} completes without blocking errors` },
      ],
      assertions: [`${name} succeeds end-to-end`],
    })
  );
}

/**
 * Derive prioritized user flows from crawl signals.
 *
 * @param {{ type?: string, criticalFlows?: string[] }} websiteType
 * @param {Array<{ category: string, selector?: string }>} elements
 * @param {Array<{ id?: string, purpose: string }>} forms
 * @param {{ criticalFlows?: string[] }|null} subDomain
 */
function detectUserFlows(websiteType, elements = [], forms = [], subDomain = null) {
  const ctx = createElementContext(elements);

  const commonFlows = buildCommonFlows(ctx);
  const typeFlows = buildTypeSpecificFlows(websiteType, ctx, forms);
  const combined = [...commonFlows, ...typeFlows];
  const formFlows = buildFormAndFallbackFlows(ctx, forms, combined);
  const flows = [...combined, ...formFlows];

  if (flows.length === 0) {
    return buildClassificationFallbackFlows(websiteType, subDomain);
  }

  return flows;
}

module.exports = { detectUserFlows, buildClassificationFallbackFlows };
