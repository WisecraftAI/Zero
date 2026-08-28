"use strict";

const { WEBSITE_TYPES } = require("../constants");

const MAX_CASES = 20;

function priorityRank(priority) {
  const value = String(priority || "").toLowerCase();
  if (value === "critical" || value === "p0") return 0;
  if (value === "high" || value === "p1") return 1;
  if (value === "medium" || value === "p2") return 2;
  return 3;
}

function normalizeSteps(flow) {
  return (flow.steps || []).map((step) => {
    if (typeof step === "string") return step;
    if (step && typeof step === "object") {
      return step.description || step.target || step.action || "Execute step";
    }
    return "Execute step";
  }).filter(Boolean);
}

function flattenElements(allElements) {
  if (Array.isArray(allElements)) return allElements;
  if (allElements && typeof allElements === "object") {
    return Object.values(allElements).flat();
  }
  return [];
}

/**
 * Real signals observed during the crawl. Case text is written from these so a
 * step names the actual menu entry, path or form field instead of echoing the
 * catalog word that produced the case.
 */
function collectSiteEvidence(analysis) {
  const navLabels = [];
  const pages = [];

  for (const page of analysis.crawledPages || []) {
    for (const label of page.navLabels || []) {
      const text = String(label || "").trim();
      if (text) navLabels.push(text);
    }
    const path = page.path || page.url;
    if (path) pages.push({ path, title: String(page.title || "").trim() });
  }

  const forms = (analysis.forms || []).map((form) => ({
    purpose: String(form.purpose || "").trim(),
    fields: (form.fields || [])
      .map((field) => field.label || field.name || field.placeholder || field.type)
      .map((name) => String(name || "").trim())
      .filter(Boolean),
    submit: form.submitButton?.text ? String(form.submitButton.text).trim() : null,
  }));

  return {
    navLabels: [...new Set(navLabels)],
    pages,
    forms,
    homeTitle: String(analysis.pageStructure?.title || "").trim(),
  };
}

/** Significant words, so "Store Locator" can match a "Locator" nav entry. */
function keyWords(area) {
  return String(area || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3);
}

function matchesArea(haystack, area) {
  const hay = String(haystack || "").toLowerCase();
  if (!hay) return false;
  const key = String(area || "").toLowerCase();
  if (key && (hay.includes(key) || key.includes(hay))) return true;
  return keyWords(area).some((word) => hay.includes(word));
}

function findNavLabel(evidence, area) {
  return evidence.navLabels.find((label) => matchesArea(label, area)) || null;
}

function findPage(evidence, area) {
  return evidence.pages.find((page) => matchesArea(`${page.path} ${page.title}`, area)) || null;
}

function findForm(evidence, area) {
  return evidence.forms.find((form) => matchesArea(form.purpose, area)) || null;
}

/** Concrete entry step for an area, using the strongest evidence available. */
function entryStep(evidence, area) {
  const navLabel = findNavLabel(evidence, area);
  if (navLabel) return `From the homepage, open "${navLabel}" in the main navigation`;

  const page = findPage(evidence, area);
  if (page) {
    return page.title
      ? `Navigate to ${page.path} ("${page.title}")`
      : `Navigate to ${page.path}`;
  }
  return `Navigate to the ${area} entry point`;
}

/** Form-aware action step naming real fields and the real submit control. */
function actionStep(evidence, area) {
  const form = findForm(evidence, area);
  if (form && form.fields.length) {
    const named = form.fields.slice(0, 5).join(", ");
    const submit = form.submit ? `"${form.submit}"` : "the submit control";
    return `Complete the ${form.purpose} form (${named}) and submit using ${submit}`;
  }
  return `Validate primary ${area} user action completes`;
}

function evidenceTag(evidence, area) {
  if (findNavLabel(evidence, area)) return "nav";
  if (findPage(evidence, area)) return "page";
  if (findForm(evidence, area)) return "form";
  return "catalog";
}

/**
 * Domain-driven major functional cases from crawl + type + flows (rules only).
 */
/** Merge sub-domain entries ahead of domain entries, case-insensitively deduped. */
function mergeAreas(subDomainAreas = [], domainAreas = []) {
  const seen = new Set();
  const merged = [];
  for (const area of [...subDomainAreas, ...domainAreas]) {
    const label = String(area || "").trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(label);
  }
  return merged;
}

function generateMajorFunctionalCases(analysis = {}) {
  const websiteType = analysis.websiteType || {};
  const subDomain = analysis.subDomain || null;
  // Cases are titled by the most specific label available, so an insurance site
  // reads "Insurance: Claim Registration" rather than "Website: Navigation".
  const typeName = subDomain?.name || websiteType.typeName || "Website";
  const subDomainAreaKeys = new Set(
    [...(subDomain?.testPriorities || []), ...(subDomain?.criticalFlows || [])].map((a) =>
      String(a).toLowerCase()
    )
  );
  const userFlows = analysis.userFlows || [];
  const crawledPages = analysis.crawledPages || [];
  const elements = flattenElements(analysis.elements || analysis.allElements);
  const evidence = collectSiteEvidence(analysis);
  const landingContext = evidence.homeTitle
    ? `Homepage "${evidence.homeTitle}" loaded`
    : "Homepage loaded";
  const testCases = [];
  let counter = 1;

  const makeId = () => `TC-MAJ-${String(counter++).padStart(3, "0")}`;
  const coveredModules = new Set();

  userFlows
    .slice()
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
    .forEach((flow) => {
      if (testCases.length >= MAX_CASES) return;
      if (priorityRank(flow.priority) > 1) return;

      let steps = normalizeSteps(flow);
      if (!steps.length) steps.push(`Execute ${flow.name}`);

      const module = flow.name || "User Flow";
      coveredModules.add(module.toLowerCase());

      testCases.push({
        id: makeId(),
        module,
        scenario: flow.name || module,
        title: `${typeName}: ${flow.name || module}`,
        type: "Functional",
        priority: flow.priority || "Critical",
        preconditions: "Target site is reachable",
        testData: "Standard QA data",
        steps,
        expectedResult:
          (Array.isArray(flow.assertions) ? flow.assertions.join("; ") : null) ||
          `${flow.name || module} completes without blocking errors`,
        traceability: "majorFunctionalCases:userFlow",
        relatedFlow: flow.name,
      });
    });

  mergeAreas(subDomain?.testPriorities, websiteType.testPriorities).forEach((area) => {
    if (testCases.length >= MAX_CASES) return;
    const key = String(area).toLowerCase();
    if ([...coveredModules].some((m) => m.includes(key) || key.includes(m))) return;

    coveredModules.add(key);
    const fromSubDomain = subDomainAreaKeys.has(key);
    testCases.push({
      id: makeId(),
      module: area,
      scenario: `Verify ${area} functionality`,
      title: `${typeName}: ${area}`,
      type: "Functional",
      priority: fromSubDomain ? "Critical" : "High",
      preconditions: landingContext,
      testData: "N/A",
      steps: [
        entryStep(evidence, area),
        `Verify the ${area} UI is visible and usable`,
        actionStep(evidence, area),
      ],
      expectedResult: `${area} works as expected for this site type`,
      traceability: fromSubDomain
        ? "majorFunctionalCases:subDomainPriority"
        : "majorFunctionalCases:testPriority",
      evidenceSource: evidenceTag(evidence, area),
      domain: websiteType.typeName || null,
      subDomain: subDomain?.name || null,
    });
  });

  mergeAreas(subDomain?.criticalFlows, websiteType.criticalFlows).forEach((flowName) => {
    if (testCases.length >= MAX_CASES) return;
    const key = String(flowName).toLowerCase();
    if (testCases.some((tc) => String(tc.scenario || "").toLowerCase().includes(key))) return;

    testCases.push({
      id: makeId(),
      module: flowName,
      scenario: flowName,
      title: `${typeName}: ${flowName}`,
      type: "End-to-End",
      priority: "Critical",
      preconditions: landingContext,
      testData: "N/A",
      steps: [
        entryStep(evidence, flowName),
        actionStep(evidence, flowName),
        `Confirm ${flowName} outcome matches site expectations`,
      ],
      expectedResult: `${flowName} succeeds end-to-end`,
      traceability: subDomainAreaKeys.has(key)
        ? "majorFunctionalCases:subDomainCriticalFlow"
        : "majorFunctionalCases:criticalFlow",
      evidenceSource: evidenceTag(evidence, flowName),
      domain: websiteType.typeName || null,
      subDomain: subDomain?.name || null,
    });
  });

  if (crawledPages.length > 1 && testCases.length < MAX_CASES) {
    const targets = crawledPages.slice(0, 5).map((p) => ({
      path: p.path || p.url,
      title: String(p.title || "").trim(),
    }));
    testCases.push({
      id: makeId(),
      module: "Site Crawl",
      scenario: "Multi-page navigation coverage",
      title: `${typeName}: Multi-page navigation`,
      type: "Smoke",
      priority: "High",
      preconditions: "Crawl discovered internal pages",
      testData: "N/A",
      steps: targets.map(({ path, title }) =>
        title
          ? `Navigate to ${path} and verify "${title}" loads with main content`
          : `Navigate to ${path} and verify page loads with main content`
      ),
      expectedResult: "All crawled pages load without fatal errors",
      traceability: "majorFunctionalCases:crawledPages",
      evidenceSource: "page",
    });
  }

  const hasSearch = elements.some((el) => el.category === "SEARCH");
  const hasCart = elements.some((el) => el.category === "CART");
  const hasAuth = elements.some((el) => el.category === "AUTH");

  if (hasSearch && testCases.length < MAX_CASES && !coveredModules.has("search")) {
    testCases.push({
      id: makeId(),
      module: "Search",
      scenario: "Product or content search",
      title: `${typeName}: Search`,
      type: "Functional",
      priority: "Critical",
      steps: ["Locate search input", "Enter a sample query", "Verify results or empty state"],
      expectedResult: "Search accepts input and returns a valid response",
      traceability: "majorFunctionalCases:element:SEARCH",
    });
  }

  if (hasCart && testCases.length < MAX_CASES && !coveredModules.has("cart")) {
    testCases.push({
      id: makeId(),
      module: "Cart",
      scenario: "Cart access and visibility",
      title: `${typeName}: Cart`,
      type: "Functional",
      priority: "Critical",
      steps: ["Open cart or bag", "Verify cart UI loads", "Verify cart state is shown"],
      expectedResult: "Cart is reachable and renders",
      traceability: "majorFunctionalCases:element:CART",
    });
  }

  if (hasAuth && testCases.length < MAX_CASES && !coveredModules.has("auth")) {
    testCases.push({
      id: makeId(),
      module: "Authentication",
      scenario: "Login entry point",
      title: `${typeName}: Authentication`,
      type: "Functional",
      priority: "High",
      steps: ["Open login/sign-in", "Verify auth form fields", "Do not submit real credentials"],
      expectedResult: "Auth entry point is available",
      traceability: "majorFunctionalCases:element:AUTH",
      requiresAuth: true,
    });
  }

  return testCases
    .slice(0, MAX_CASES)
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
}

function mergeMajorWithGenerated(majorCases, generatedCases = []) {
  const seen = new Set(majorCases.map((tc) => `${tc.module}:${tc.scenario}`.toLowerCase()));
  const merged = [...majorCases];
  for (const tc of generatedCases) {
    if (merged.length >= MAX_CASES) break;
    const key = `${tc.module || ""}:${tc.scenario || tc.title || ""}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(tc);
  }
  return merged.slice(0, MAX_CASES);
}

module.exports = {
  generateMajorFunctionalCases,
  mergeMajorWithGenerated,
  priorityRank,
  WEBSITE_TYPES,
};
