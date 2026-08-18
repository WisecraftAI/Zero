"use strict";

function shouldRunDomainInference(baInsights = {}) {
  const confidence = Number(baInsights.websiteTypeConfidence ?? baInsights.confidence ?? 1);
  const typeName = String(baInsights.websiteType || baInsights.typeName || "").toLowerCase();
  if (confidence < 0.5) return true;
  if (typeName.includes("generic") || typeName === "website") return true;
  return false;
}

function buildDomainInferenceContext(webAnalysis = {}) {
  const ba = webAnalysis.baInsights || {};
  const crawledPages = (webAnalysis.crawledPages || []).slice(0, 8).map((p) => ({
    url: p.url,
    title: p.title,
    path: p.path,
    navLabels: (p.navLabels || []).slice(0, 8),
    formCount: p.formCount,
  }));

  const elementCategories = {};
  const grouped = webAnalysis.allElements || {};
  for (const [category, items] of Object.entries(grouped)) {
    elementCategories[category] = Array.isArray(items) ? items.length : 0;
  }

  return {
    url: webAnalysis.metadata?.url || webAnalysis.siteOverview?.url,
    websiteType: ba.websiteType,
    websiteTypeConfidence: ba.websiteTypeConfidence,
    topNavLabels: ba.topNavLabels || [],
    crawledPages,
    elementCategories,
    forms: (webAnalysis.forms || []).slice(0, 6).map((f) => ({ purpose: f.purpose, fieldCount: f.fieldCount })),
    userFlowNames: (webAnalysis.userFlows || []).slice(0, 8).map((f) => f.name),
    observations: (webAnalysis.observations || []).slice(0, 6).map((o) => o.message || o.category),
  };
}

function mergeDomainInference(target, parsed) {
  if (!parsed || typeof parsed !== "object") return target;
  const out = { ...(target || {}) };

  if (parsed.domainLabel) out.inferredDomain = String(parsed.domainLabel).slice(0, 120);
  if (parsed.summary) out.inferredSummary = String(parsed.summary).slice(0, 2000);
  if (Number.isFinite(Number(parsed.confidence))) {
    out.inferredConfidence = Math.max(0, Math.min(1, Number(parsed.confidence)));
  }

  if (Array.isArray(parsed.testPriorities) && parsed.testPriorities.length) {
    out.inferredTestPriorities = parsed.testPriorities.map(String).slice(0, 8);
  }
  if (Array.isArray(parsed.criticalFlows) && parsed.criticalFlows.length) {
    out.inferredCriticalFlows = parsed.criticalFlows.map(String).slice(0, 6);
  }

  if (out.inferredDomain) {
    out.websiteType = out.inferredDomain;
    if (out.inferredConfidence != null) {
      out.websiteTypeConfidence = Math.max(out.websiteTypeConfidence || 0, out.inferredConfidence);
    }
  }

  return out;
}

module.exports = {
  shouldRunDomainInference,
  buildDomainInferenceContext,
  mergeDomainInference,
  inferDomain: mergeDomainInference,
};
