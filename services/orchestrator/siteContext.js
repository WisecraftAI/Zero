"use strict";

/**
 * Compact fact sheet about the site under test, for the agents that write
 * content (BA, Manual QA, Automation QA).
 *
 * Those agents used to receive only the URL and a case count, so the model had
 * nothing site-specific to work from and could only restate the template. The
 * caps here keep the payload well inside the prompt context budget, since a
 * truncated context is worse than a small one.
 */

const LIMITS = {
  pages: 6,
  navLabelsPerPage: 8,
  forms: 5,
  fieldsPerForm: 8,
  headings: 10,
  flows: 8,
  observations: 5,
  text: 100,
};

function text(value, max = LIMITS.text) {
  return String(value ?? "").trim().slice(0, max);
}

function compactList(values, limit, max = LIMITS.text) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const item = text(value, max);
    if (!item || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

function fieldName(field) {
  if (!field || typeof field !== "object") return text(field);
  return text(field.label || field.name || field.placeholder || field.type);
}

/**
 * @param {object} webAnalysis run.artifacts.webAnalysis
 * @returns {object|null} null when there is no trustworthy analysis to describe
 */
function buildSiteContext(webAnalysis) {
  if (!webAnalysis || typeof webAnalysis !== "object") return null;
  if (webAnalysis.analysisFailed || webAnalysis.insufficientEvidence) return null;

  const pages = (webAnalysis.crawledPages || []).slice(0, LIMITS.pages).map((page) => ({
    path: text(page.path || page.url),
    title: text(page.title),
    navLabels: compactList(page.navLabels, LIMITS.navLabelsPerPage, 60),
  }));

  const forms = (webAnalysis.forms || []).slice(0, LIMITS.forms).map((form) => ({
    purpose: text(form.purpose),
    fields: compactList((form.fields || []).map(fieldName), LIMITS.fieldsPerForm, 60),
  }));

  const elementCategories = {};
  for (const [category, items] of Object.entries(webAnalysis.allElements || {})) {
    if (Array.isArray(items) && items.length) elementCategories[category] = items.length;
  }

  const headings = compactList(
    (webAnalysis.pageStructure?.headings || []).map((h) =>
      h && typeof h === "object" ? `H${h.level}: ${h.text}` : h
    ),
    LIMITS.headings
  );

  const context = {
    url: webAnalysis.metadata?.url || webAnalysis.siteOverview?.url || null,
    siteTitle: text(webAnalysis.pageStructure?.title || webAnalysis.siteOverview?.title),
    domain: webAnalysis.domainClassification?.domain || null,
    subDomain: webAnalysis.domainClassification?.subDomain || null,
    pages,
    forms,
    headings,
    elementCategories,
    userFlowNames: compactList(
      (webAnalysis.userFlows || []).map((flow) => flow && flow.name),
      LIMITS.flows
    ),
    observations: compactList(
      (webAnalysis.observations || []).map((o) => (o && (o.message || o.category)) || o),
      LIMITS.observations,
      160
    ),
  };

  // A context with no page, form or element evidence tells the model nothing;
  // returning null keeps the stage honestly on templates.
  const hasEvidence =
    context.pages.length ||
    context.forms.length ||
    context.headings.length ||
    Object.keys(context.elementCategories).length;

  return hasEvidence ? context : null;
}

module.exports = { buildSiteContext };
