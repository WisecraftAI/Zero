const { createElementContext } = require('./helpers');
const { buildCommonFlows } = require('./commonFlows');
const { buildTypeSpecificFlows } = require('./typeFlows');
const { buildFormAndFallbackFlows } = require('./formFlows');

/**
 * Derive prioritized user flows from crawl signals.
 *
 * @param {{ type?: string }} websiteType
 * @param {Array<{ category: string, selector?: string }>} elements
 * @param {Array<{ id?: string, purpose: string }>} forms
 */
function detectUserFlows(websiteType, elements = [], forms = []) {
  const ctx = createElementContext(elements);

  const commonFlows = buildCommonFlows(ctx);
  const typeFlows = buildTypeSpecificFlows(websiteType, ctx, forms);
  const combined = [...commonFlows, ...typeFlows];
  const formFlows = buildFormAndFallbackFlows(ctx, forms, combined);

  return [...combined, ...formFlows];
}

module.exports = { detectUserFlows };
