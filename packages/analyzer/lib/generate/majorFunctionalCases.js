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
      preconditions: "Homepage loaded",
      testData: "N/A",
      steps: [
        `Navigate to the ${area} entry point`,
        `Verify ${area} UI is visible and usable`,
        `Validate primary ${area} user action completes`,
      ],
      expectedResult: `${area} works as expected for this site type`,
      traceability: fromSubDomain
        ? "majorFunctionalCases:subDomainPriority"
        : "majorFunctionalCases:testPriority",
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
      preconditions: "Site is accessible",
      testData: "N/A",
      steps: [
        `Start ${flowName} from the homepage`,
        `Complete each step in ${flowName}`,
        `Confirm ${flowName} outcome matches site expectations`,
      ],
      expectedResult: `${flowName} succeeds end-to-end`,
      traceability: subDomainAreaKeys.has(key)
        ? "majorFunctionalCases:subDomainCriticalFlow"
        : "majorFunctionalCases:criticalFlow",
      domain: websiteType.typeName || null,
      subDomain: subDomain?.name || null,
    });
  });

  if (crawledPages.length > 1 && testCases.length < MAX_CASES) {
    const paths = crawledPages.slice(0, 5).map((p) => p.path || p.url);
    testCases.push({
      id: makeId(),
      module: "Site Crawl",
      scenario: "Multi-page navigation coverage",
      title: `${typeName}: Multi-page navigation`,
      type: "Smoke",
      priority: "High",
      preconditions: "Crawl discovered internal pages",
      testData: "N/A",
      steps: paths.map((path) => `Navigate to ${path} and verify page loads with main content`),
      expectedResult: "All crawled pages load without fatal errors",
      traceability: "majorFunctionalCases:crawledPages",
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
