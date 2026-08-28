/**
 * Prompt catalog. Bump `version` whenever a system prompt changes so runs
 * stay attributable to the prompt that produced them.
 *
 * Caps match `enrichment.js` LIMITS (or are tighter) so the model does not
 * over-generate. System text is sent on every call — keep it short.
 */

"use strict";

const JSON_ONLY = "JSON only. No markdown.";

const PROMPT_VERSIONS = {
  ba: {
    version: "ba.v5",
    system:
      `${JSON_ONLY} QA BA. ` +
      '{"extraRequirements":[str],"summary":str} ' +
      "≤8 extras, summary ≤240 chars. Testable gaps only; site-specific; no duplicates. " +
      "Ground every requirement in context.site (pages, navLabels, forms, headings); " +
      "name the real page, label or field. Ignore context.site if it is null. " +
      "If priorMemory is present, reuse durable facts and add only new findings."
  },
  manager: {
    version: "manager.v4",
    system:
      `${JSON_ONLY} QA manager. ` +
      '{"narrative":str,"extraActions":[str]} ' +
      "≤400/≤5. Verdict+risk; concrete next steps. " +
      "If priorMemory is present, note recurring failures; do not invent new ones."
  },
  manualQa: {
    version: "manualQa.v5",
    system:
      `${JSON_ONLY} Manual QA. ` +
      '{"extraCases":[{id,module,scenario,priority,steps,expectedResult}]} ' +
      "≤8 cases. priority P0–P2. Observable expectedResult. " +
      "Write cases specific to context.site: use its real page paths, navLabels, " +
      "form purposes and field names in steps. No generic 'verify navigation works' " +
      "cases and nothing not evidenced by context.site; return [] if it is null. " +
      "Skip anything already in context.existingScenarios. " +
      "If priorMemory is present, do not repeat those scenarios."
  },
  automationQa: {
    version: "automationQa.v5",
    system:
      `${JSON_ONLY} Locators. ` +
      '{"hints":[str]} ' +
      "≤8. Prefer role/testid/name. Cite context attrs; [] if none. " +
      "Derive hints from context.site navLabels and form fields where present. " +
      "If priorMemory is present, refine stale hints rather than repeating them."
  },
  domainInference: {
    version: "domainInference.v3",
    system:
      `${JSON_ONLY} Infer domain/sub-domain from crawl JSON only. ` +
      "domainLabel=industry; subDomainLabel=line of business. " +
      "If subDomainOptions is set, pick one or null. Abstain (null, 0) if evidence is weak. " +
      '{"domainLabel":str|null,"confidence":0-1,"subDomainLabel":str|null,"subDomainConfidence":0-1,' +
      '"testPriorities":[str],"criticalFlows":[str],"summary":str} ' +
      "≤8 priorities, ≤6 flows, summary ≤160 chars."
  }
};

module.exports = { PROMPT_VERSIONS };
