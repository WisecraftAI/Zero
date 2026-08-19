"use strict";

/**
 * Domain (Banking) and sub-domain (Insurance) resolution for a web analysis.
 *
 * The analyzer produces a rule-based classification plus the curated sub-domain
 * catalog for the detected domain. This module decides whether an LLM pass is
 * worth it, builds its context, merges the reply, and — importantly — pushes the
 * final answer back onto the fields the UI and downstream agents actually read.
 */

const CONFIDENT = 0.5;

function shouldRunDomainInference(baInsights = {}) {
  const confidence = Number(baInsights.websiteTypeConfidence ?? baInsights.confidence ?? 1);
  const typeName = String(baInsights.websiteType || baInsights.typeName || "").toLowerCase();
  if (confidence < CONFIDENT) return true;
  if (typeName.includes("generic") || typeName === "website") return true;

  // The domain is known but its sub-domain is not, and the taxonomy offers
  // candidates — exactly the Banking-without-Insurance case.
  const options = Array.isArray(baInsights.subDomainOptions) ? baInsights.subDomainOptions : [];
  if (options.length) {
    const subConfidence = Number(baInsights.subDomainConfidence ?? 0);
    if (!baInsights.subDomain || subConfidence < CONFIDENT) return true;
  }

  return false;
}

function buildDomainInferenceContext(webAnalysis = {}) {
  const ba = webAnalysis.baInsights || {};
  const classification = webAnalysis.domainClassification || {};
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
    subDomain: ba.subDomain || classification.subDomain || null,
    subDomainConfidence: ba.subDomainConfidence ?? classification.subDomainConfidence ?? null,
    subDomainOptions: ba.subDomainOptions || classification.subDomainOptions || [],
    subDomainCandidates: (classification.subDomainCandidates || [])
      .slice(0, 3)
      .map((c) => ({ name: c.name, confidence: c.confidence, matchedIndicators: c.matchedIndicators })),
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
  if (parsed.subDomainLabel) out.inferredSubDomain = String(parsed.subDomainLabel).slice(0, 120);
  if (Number.isFinite(Number(parsed.subDomainConfidence))) {
    out.inferredSubDomainConfidence = Math.max(0, Math.min(1, Number(parsed.subDomainConfidence)));
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

  if (out.inferredSubDomain) {
    out.subDomain = out.inferredSubDomain;
    if (out.inferredSubDomainConfidence != null) {
      out.subDomainConfidence = Math.max(out.subDomainConfidence || 0, out.inferredSubDomainConfidence);
    }
    out.subDomainSource = "llm";
  }

  return out;
}

/** Curated priorities/flows for a sub-domain name, from the artifact's catalog. */
function catalogEntryFor(classification, subDomainName) {
  const needle = String(subDomainName || "").trim().toLowerCase();
  if (!needle) return null;
  return (
    (classification.subDomainCatalog || []).find(
      (entry) => String(entry.name).trim().toLowerCase() === needle
    ) || null
  );
}

/**
 * Push the resolved domain/sub-domain onto `metadata`, `siteOverview` and
 * `domainClassification`.
 *
 * Inference used to write only into `baInsights`, so the Site Overview panel
 * stayed pinned to whatever the rules guessed first — even after a successful
 * LLM pass. Everything downstream reads from these fields, so they have to be
 * the single resolved answer.
 */
function applyClassificationToArtifact(webAnalysis) {
  if (!webAnalysis || typeof webAnalysis !== "object") return webAnalysis;
  if (webAnalysis.analysisFailed) return webAnalysis;

  const ba = webAnalysis.baInsights || {};
  const classification = webAnalysis.domainClassification || {};

  const domainName = ba.websiteType || classification.domain || webAnalysis.siteOverview?.type || null;
  const domainConfidence = Number(ba.websiteTypeConfidence ?? classification.domainConfidence ?? 0);
  const subDomainName = ba.subDomain || classification.subDomain || null;
  const subDomainConfidence = subDomainName
    ? Number(ba.subDomainConfidence ?? classification.subDomainConfidence ?? 0)
    : null;
  const source = ba.subDomainSource || classification.source || "rules";

  const catalogEntry = catalogEntryFor(classification, subDomainName);
  const testPriorities = ba.inferredTestPriorities?.length
    ? ba.inferredTestPriorities
    : catalogEntry?.testPriorities || webAnalysis.subDomainTestPriorities || [];
  const criticalFlows = ba.inferredCriticalFlows?.length
    ? ba.inferredCriticalFlows
    : catalogEntry?.criticalFlows || webAnalysis.subDomainCriticalFlows || [];

  webAnalysis.domainClassification = {
    ...classification,
    domain: domainName,
    domainConfidence,
    subDomain: subDomainName,
    subDomainConfidence,
    testPriorities,
    criticalFlows,
    source,
  };

  webAnalysis.metadata = {
    ...(webAnalysis.metadata || {}),
    domainName,
    websiteType: domainName,
    websiteTypeConfidence: domainConfidence,
    subDomain: subDomainName,
    subDomainConfidence,
    classificationSource: source,
  };

  webAnalysis.siteOverview = {
    ...(webAnalysis.siteOverview || {}),
    type: domainName || webAnalysis.siteOverview?.type || null,
    subDomain: subDomainName,
  };

  webAnalysis.subDomainTestPriorities = testPriorities;
  webAnalysis.subDomainCriticalFlows = criticalFlows;

  return webAnalysis;
}

module.exports = {
  shouldRunDomainInference,
  buildDomainInferenceContext,
  mergeDomainInference,
  applyClassificationToArtifact,
  inferDomain: mergeDomainInference,
};
