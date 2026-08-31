"use strict";

const path = require("path");
const XLSX = require("xlsx");
const { appProfiles } = require("@zero/domain");
const locatorRegistry = require("@zero/locators/locatorRegistry");
const scriptBuilder = require("@zero/builders/scriptBuilder");
const javaSeleniumBuilder = require("@zero/builders/javaSeleniumBuilder");

const profileScenarioCatalog = {
  tvnz: [
    { module: "Authentication", scenario: "Default Splash Screen Playback", expected: "Video plays for 3-6 seconds then transitions to Login/Profile", priority: "High", type: "Sanity" },
    { module: "Authentication", scenario: "OTP Login / Sign Up", expected: "User authenticates with 6-digit OTP", priority: "High", type: "Sanity" },
    { module: "Profiles", scenario: "Profile Creation & Switching", expected: "Up to 5 profiles supported with switch behavior", priority: "High", type: "Sanity" },
    { module: "Profiles", scenario: "Kids/Preschool Experience", expected: "Age-safe content and simplified menu shown", priority: "High", type: "Sanity" },
    { module: "Discovery", scenario: "Search Results", expected: "2+ char search returns relevant shows/movies/sport/news", priority: "High", type: "Sanity" },
    { module: "Content Details", scenario: "Show/Movie Details Page", expected: "Metadata, Add to My List, Play CTA shown", priority: "High", type: "Sanity" },
    { module: "Playback", scenario: "Basic VOD Control", expected: "Play/Pause/Scrub with smooth interaction", priority: "High", type: "Sanity" },
    { module: "Playback", scenario: "Resume / Continue Watching", expected: "Resume from saved position in Continue Watching rail", priority: "High", type: "Sanity" },
    { module: "Playback", scenario: "Skip Intro / Recap", expected: "Skip CTA appears and jumps to marked segment end", priority: "Medium", type: "Sanity" },
    { module: "EPG / Channels", scenario: "Full EPG Navigation", expected: "Week schedule and channel metadata are available", priority: "High", type: "Sanity" },
    { module: "Live Event", scenario: "Watch from Start + Jump to Live", expected: "DVR controls support watch-from-start and jump-to-live", priority: "High", type: "Sanity" },
    { module: "Ads", scenario: "SSAI VOD Ads", expected: "Ad pod plays and FF/scrub disabled during ads", priority: "High", type: "Sanity" },
    { module: "Payments", scenario: "Paid Content Access", expected: "Padlock shown and Buy Now redirects to payment journey", priority: "High", type: "Sanity" },
    { module: "Device Features", scenario: "Chromecast + PiP", expected: "Cast discovery and PiP activation works", priority: "Medium", type: "Sanity" },
    { module: "Recommendations", scenario: "Personalized Belts", expected: "Recommended For / Because You Watched / Trending belts are visible", priority: "Medium", type: "Sanity" },
    { module: "Maintenance", scenario: "Forced App Update", expected: "Old versions see forced update blocking screen", priority: "High", type: "Sanity" }
  ],
  aha: [
    { module: "Authentication", scenario: "Login and profile entry", expected: "User reaches logged-in home experience", priority: "High", type: "Sanity" },
    { module: "Discovery", scenario: "Home rails and category navigation", expected: "Home, language rails, and detail drill-down function", priority: "High", type: "Sanity" },
    { module: "Playback", scenario: "Play/Pause/Seek", expected: "Playback controls remain stable", priority: "High", type: "Sanity" },
    { module: "Personalization", scenario: "My List behavior", expected: "Add/remove content reflects in My List", priority: "Medium", type: "Sanity" }
  ],
  gray: [
    { module: "Authentication", scenario: "Login gate handling", expected: "User progresses through auth gate", priority: "High", type: "Sanity" },
    { module: "Navigation", scenario: "Home to detail drill-down", expected: "Card open and details metadata are visible", priority: "High", type: "Sanity" },
    { module: "Playback", scenario: "Playback control checks", expected: "Play/Pause/Seek interactions work", priority: "High", type: "Sanity" }
  ],
  // ============== DOMAIN-SPECIFIC SCENARIO CATALOGS ==============
  retail_store: [
    { module: "Navigation", scenario: "Main menu navigation", expected: "All menu items are clickable and navigate correctly", priority: "Critical", type: "Sanity" },
    { module: "Branches", scenario: "Store branch listing", expected: "All store branches are displayed with addresses", priority: "Critical", type: "Sanity" },
    { module: "Branches", scenario: "Branch details and contact", expected: "Contact information and store hours are visible", priority: "High", type: "Functional" },
    { module: "Categories", scenario: "Product category browsing", expected: "Product categories are navigable and show items", priority: "High", type: "Functional" },
    { module: "Contact", scenario: "Contact information access", expected: "Phone, email, and address are accessible", priority: "High", type: "Functional" },
    { module: "UI", scenario: "Image and media loading", expected: "All images load without errors", priority: "Medium", type: "UI" },
    { module: "Footer", scenario: "Footer links verification", expected: "Footer links navigate to correct pages", priority: "Medium", type: "Sanity" }
  ],
  ecommerce: [
    { module: "Search", scenario: "Product search functionality", expected: "Search returns relevant products", priority: "Critical", type: "Sanity" },
    { module: "Products", scenario: "Product listing page", expected: "Products display with image, price, and title", priority: "Critical", type: "Sanity" },
    { module: "Products", scenario: "Product details page", expected: "Product details show complete information", priority: "High", type: "Functional" },
    { module: "Cart", scenario: "Add to cart functionality", expected: "Product is added to cart, count updates", priority: "Critical", type: "Sanity" },
    { module: "Cart", scenario: "Cart management", expected: "Items can be updated and removed", priority: "High", type: "Functional" },
    { module: "Authentication", scenario: "User login", expected: "User can log in with valid credentials", priority: "High", type: "Functional" },
    { module: "Checkout", scenario: "Checkout flow", expected: "User can complete checkout process", priority: "Critical", type: "E2E" }
  ],
  healthcare: [
    { module: "Navigation", scenario: "Main navigation verification", expected: "All sections are accessible", priority: "Critical", type: "Sanity" },
    { module: "Products", scenario: "Product information access", expected: "Product details are accurate and complete", priority: "High", type: "Functional" },
    { module: "Contact", scenario: "Contact form submission", expected: "Form accepts input and confirms submission", priority: "High", type: "Functional" },
    { module: "Compliance", scenario: "Adverse event reporting access", expected: "Adverse event reporting is accessible", priority: "Critical", type: "Compliance" },
    { module: "About", scenario: "Company information pages", expected: "About, careers, and investor pages load", priority: "Medium", type: "Functional" }
  ],
  corporate: [
    { module: "Navigation", scenario: "Main navigation verification", expected: "All sections are accessible", priority: "Critical", type: "Sanity" },
    { module: "About", scenario: "Company information pages", expected: "About, leadership, and history pages load", priority: "High", type: "Functional" },
    { module: "Contact", scenario: "Contact form submission", expected: "Form accepts input and confirms submission", priority: "High", type: "Functional" },
    { module: "Careers", scenario: "Career portal access", expected: "Job listings are viewable", priority: "Medium", type: "Functional" }
  ],
  banking: [
    { module: "Security", scenario: "HTTPS verification", expected: "All pages use HTTPS", priority: "Critical", type: "Security" },
    { module: "Authentication", scenario: "Secure login", expected: "Login accepts credentials securely", priority: "Critical", type: "Security" },
    { module: "Navigation", scenario: "Main navigation verification", expected: "All sections are accessible", priority: "High", type: "Sanity" },
    { module: "Forms", scenario: "Form validation", expected: "Forms validate input correctly", priority: "High", type: "Functional" }
  ],
  food_delivery: [
    { module: "Search", scenario: "Restaurant search", expected: "Search returns relevant restaurants", priority: "Critical", type: "Sanity" },
    { module: "Browse", scenario: "Restaurant listing", expected: "Restaurants display with ratings and info", priority: "High", type: "Functional" },
    { module: "Menu", scenario: "Menu browsing", expected: "Menu items are viewable with prices", priority: "High", type: "Functional" },
    { module: "Cart", scenario: "Add items to cart", expected: "Items are added and cart updates", priority: "Critical", type: "Sanity" }
  ],
  travel: [
    { module: "Search", scenario: "Flight/hotel search", expected: "Search returns relevant results", priority: "Critical", type: "Sanity" },
    { module: "Results", scenario: "Search results display", expected: "Results show prices and details", priority: "High", type: "Functional" },
    { module: "Booking", scenario: "Booking flow", expected: "User can proceed through booking", priority: "Critical", type: "E2E" }
  ],
  education: [
    { module: "Courses", scenario: "Course catalog browsing", expected: "Courses are listed and searchable", priority: "Critical", type: "Sanity" },
    { module: "Enrollment", scenario: "Course enrollment", expected: "User can enroll in a course", priority: "High", type: "Functional" },
    { module: "Learning", scenario: "Content access", expected: "Learning content is accessible", priority: "High", type: "Functional" }
  ],
  news_media: [
    { module: "Navigation", scenario: "Category navigation", expected: "All news categories are accessible", priority: "Critical", type: "Sanity" },
    { module: "Content", scenario: "Article loading", expected: "Articles load with full content", priority: "High", type: "Functional" },
    { module: "Search", scenario: "Content search", expected: "Search returns relevant articles", priority: "High", type: "Functional" }
  ],
  default: [
    { module: "Navigation", scenario: "Main navigation verification", expected: "All menu items are clickable and navigate correctly", priority: "Critical", type: "Sanity" },
    { module: "UI", scenario: "Page loading and display", expected: "Page loads completely without errors", priority: "High", type: "Sanity" },
    { module: "Forms", scenario: "Form functionality", expected: "Forms accept input and provide feedback", priority: "High", type: "Functional" },
    { module: "Links", scenario: "Link verification", expected: "All links navigate to valid pages", priority: "Medium", type: "Sanity" }
  ]
};
function setStage(run, key, status) {
  const stage = run.stages[key];
  if (!stage) return;
  const now = new Date().toISOString();
  stage.status = status;
  if (status === "running") stage.startedAt = now;
  if (status === "done" || status === "failed" || status === "stopped") stage.finishedAt = now;
  run.updatedAt = now;
}

function safeList(text) {
  return (text || "")
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 25);
}

function hostFromUrl(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function inferProfile(ottUrl, requestedProfile) {
  const allowed = new Set(["gray", "tvnz", "aha", "hotstar", "primevideo", "default"]);
  if (requestedProfile && allowed.has(requestedProfile)) return requestedProfile;
  const host = hostFromUrl(ottUrl);
  if (host.includes("gray")) return "gray";
  if (host.includes("tvnz")) return "tvnz";
  if (host.includes("aha") || host.includes("aha.video") || host.includes("ahatv")) return "aha";
  if (host.includes("hotstar")) return "hotstar";
  if (host.includes("primevideo")) return "primevideo";
  return "default";
}

function inferDomainFallbackProfile(ottUrl, requestedProfile) {
  const requested = String(requestedProfile || "").trim().toLowerCase();
  if (requested && appProfiles[requested]) return requested;

  const host = hostFromUrl(ottUrl);

  const ecommerceHosts = [
    "amazon", "flipkart", "myntra", "snapdeal", "ajio", "nykaa", "meesho", "tatacliq", "ebay", "walmart", "target", "bestbuy"
  ];
  if (ecommerceHosts.some((name) => host.includes(name))) return "ecommerce";

  if (host.includes("supersaravanastores") || host.includes("saravana")) return "retail_store";
  if (host.includes("mankindpharma") || host.includes("pharma") || host.includes("health")) return "healthcare";

  return inferProfile(ottUrl, requestedProfile);
}

function evidenceText(value) {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";
  const description =
    value.description ||
    value.message ||
    value.name ||
    value.title ||
    value.scenario ||
    value.area ||
    value.feature ||
    value.module ||
    value.type ||
    value.level;
  if (!description) return "";
  const id = value.id ? `${value.id}: ` : "";
  return `${id}${description}`.trim();
}

function uniqueEvidence(values, limit = 25) {
  const seen = new Set();
  const result = [];
  for (const value of values.flat(Infinity)) {
    const text = evidenceText(value);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
    if (result.length >= limit) break;
  }
  return result;
}

function labelToRequirement(label, subject) {
  const text = String(label || "").trim().replace(/\.$/, "");
  if (!text) return "";
  if (/\bmust\b|\bshould\b/i.test(text)) return `${text}.`;
  return `${text} must work correctly on ${subject}.`;
}

/**
 * Second evidence tier: a thin crawl still exposes nav labels, test areas, and
 * a BRD skeleton, which describe the target site far better than a channel
 * template does.
 */
function analyzerStructureStatements({ insights, brdDocument, suggestedTestAreas, subject }) {
  const testAreaLabels = (suggestedTestAreas || []).flatMap((entry) => {
    if (typeof entry === "string") return [entry];
    const area = entry?.area;
    if (!area) return [];
    const tests = Array.isArray(entry.tests) ? entry.tests : [];
    return tests.length ? [`${area} must cover ${tests.join(", ")}`] : [area];
  });

  return uniqueEvidence([
    (insights.keyFunctionalities || []).map((item) => labelToRequirement(evidenceText(item), subject)),
    (insights.criticalPaths || []).map((path) => labelToRequirement(path, subject)),
    testAreaLabels.map((label) => labelToRequirement(label, subject)),
    (brdDocument?.testStrategy?.testTypes || []).map((entry) =>
      labelToRequirement(`${evidenceText(entry)} testing`, subject)
    ),
    (brdDocument?.projectScope?.inScope || []).map((item) => labelToRequirement(item, subject)),
    (insights.topNavLabels || []).map((label) =>
      labelToRequirement(`The ${label} destination`, subject)
    ),
    brdDocument?.nonFunctionalRequirements || []
  ]);
}

function buildRequirementEvidence({
  profileKey,
  insights,
  suggestedRequirements,
  suggestedTestAreas,
  brdDocument,
  domainClassification,
  detectedSubDomain,
  subject,
  notes
}) {
  const subDomainAreas = domainClassification?.testPriorities || [];
  const subDomainFlows = domainClassification?.criticalFlows || [];
  const brdRequirements = (brdDocument?.functionalRequirements || []).filter((requirement) => requirement.testable);
  const evidenceDriven = uniqueEvidence([
    detectedSubDomain
      ? subDomainAreas.map((area) => `${area} must work correctly for the ${detectedSubDomain} journey.`)
      : [],
    detectedSubDomain
      ? subDomainFlows.map((flow) => `${flow} must complete end-to-end without blocking errors.`)
      : [],
    suggestedRequirements,
    brdRequirements,
    notes
  ]);

  if (evidenceDriven.length) {
    return { statements: evidenceDriven, source: "analyzer-and-user-evidence" };
  }

  const structural = analyzerStructureStatements({ insights, brdDocument, suggestedTestAreas, subject });
  if (structural.length) {
    return { statements: structural, source: "analyzer-structure-evidence" };
  }

  const fallbackCatalog = profileScenarioCatalog[profileKey] || profileScenarioCatalog.default;
  return {
    statements: uniqueEvidence(
      fallbackCatalog.map((item) => `${item.scenario}: ${item.expected}`)
    ),
    source: "profile-template-fallback"
  };
}

function countCrawledElements(allElements) {
  if (Array.isArray(allElements)) return allElements.length;
  if (allElements && typeof allElements === "object") {
    return Object.values(allElements).reduce(
      (total, group) => total + (Array.isArray(group) ? group.length : 0),
      0
    );
  }
  return 0;
}

function summarizeEvidence({ hasUrlAnalysis, insights, allElements, userFlows, observations }) {
  const stats = observations.find((observation) => observation.type === "summary")?.stats || {};
  const elementCount = countCrawledElements(allElements) || Number(stats.elementsFound || 0);
  const formCount = (insights.formAnalysis || []).length || Number(stats.formsFound || 0);
  const flowCount = userFlows.length || Number(stats.userFlowsDetected || 0);
  const pagesCrawled = Number(insights.pagesCrawled || stats.pagesCrawled || 0);
  const navLabelCount = (insights.topNavLabels || []).length;

  let level = "none";
  if (hasUrlAnalysis) {
    const rich = elementCount >= 10 || formCount > 0 || flowCount > 0 || navLabelCount > 0;
    level = rich ? "analyzer-rich" : "analyzer-thin";
  }

  return { level, pagesCrawled, elementCount, formCount, flowCount, navLabelCount };
}

function parseTcFile(raw) {
  const lines = safeList(raw);
  const parsed = [];
  for (const line of lines) {
    if (/^tc[-\s_]?\d+/i.test(line)) {
      parsed.push(line);
      continue;
    }
    if (line.length > 18) parsed.push(line);
  }
  return parsed.slice(0, 20);
}

function looksBinary(buffer) {
  if (!buffer || !buffer.length) return false;
  let suspicious = 0;
  const scanLen = Math.min(buffer.length, 512);
  for (let i = 0; i < scanLen; i += 1) {
    const b = buffer[i];
    if (b === 0) return true;
    if (b < 9 || (b > 13 && b < 32)) suspicious += 1;
  }
  return suspicious > 20;
}

function normalizeCaseLine(line) {
  const cleaned = String(line || "").replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.length < 12) return null;
  if (/^pk\u0003\u0004|^PK\u0003\u0004/.test(cleaned)) return null;
  return cleaned;
}

function extractCasesFromRows(rows = []) {
  const out = [];
  for (const row of rows) {
    const cells = Array.isArray(row) ? row : [row];
    const line = normalizeCaseLine(cells.filter(Boolean).join(" | "));
    if (!line) continue;
    out.push(line);
    if (out.length >= 40) break;
  }
  return out;
}

function parseCsvLine(line, delim) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes && (c === delim || c === "\t")) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

function extractStructuredCsvCases(buffer) {
  const text = buffer.toString("utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { rows: [], structured: [] };

  const firstLine = lines[0];
  const useTab = firstLine.includes("\t") && (firstLine.match(/\t/g) || []).length >= 2;
  const delim = useTab ? "\t" : ",";

  const header = parseCsvLine(lines[0], delim).map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));
  const featureIdx = header.findIndex((h) => h.includes("feature"));
  const scenarioIdx = header.findIndex((h) => h.includes("scenario"));
  const expectedIdx = header.findIndex((h) => h.includes("expected") || h.includes("expected result"));

  if (featureIdx === -1 && scenarioIdx === -1 && expectedIdx === -1) {
    return { rows: [], structured: [] };
  }

  const rows = [];
  const structured = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i], delim).map((c) => c.replace(/^["']|["']$/g, "").trim());
    const feature = featureIdx >= 0 ? (cols[featureIdx] || "") : "General";
    const scenario = scenarioIdx >= 0 ? (cols[scenarioIdx] || "") : "Scenario";
    const expected = expectedIdx >= 0 ? (cols[expectedIdx] || "") : "Expected behavior";
    if (!feature && !scenario && !expected) continue;
    rows.push(`${feature} | ${scenario} | ${expected}`);
    structured.push({ feature, scenario, expectedResult: expected });
  }
  return { rows, structured };
}

function extractUploadedCases(input) {
  const warnings = [];
  const fileName = input.tcFileName || "";
  const ext = path.extname(fileName).toLowerCase();
  const buf = input.tcFileBuffer;

  if (!fileName || !buf) {
    return { cases: parseTcFile(input.tcFileContent || ""), warnings };
  }

  try {
    if (ext === ".xlsx" || ext === ".xls") {
      const workbook = XLSX.read(buf, { type: "buffer" });
      const rows = [];
      workbook.SheetNames.forEach((name) => {
        const ws = workbook.Sheets[name];
        const jsonRows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
        rows.push(...jsonRows);
      });
      return { cases: extractCasesFromRows(rows), warnings };
    }

    if (ext === ".csv") {
      const parsed = extractStructuredCsvCases(buf);
      if (parsed.rows.length) return { cases: parsed.rows, structured: parsed.structured, warnings };
      const text = buf.toString("utf8");
      const rows = text.split(/\r?\n/).map((line) => line.split(","));
      return { cases: extractCasesFromRows(rows), structured: [], warnings };
    }

    if (looksBinary(buf)) {
      warnings.push("Uploaded file appears binary and could not be parsed. Use .xlsx/.csv/.txt/.md/.json.");
      return { cases: [], warnings };
    }

    return { cases: parseTcFile(buf.toString("utf8")), warnings };
  } catch (error) {
    warnings.push(`Failed to parse uploaded test-case file: ${error.message}`);
    return { cases: [], warnings };
  }
}

function consolidateRequirements(input) {
  const assertions = safeList(input.assertions);
  const notes = safeList(input.notes);
  const extraction = extractUploadedCases(input);
  const uploadedCases = extraction.cases;
  const testCaseRowsStructured = extraction.structured || [];

  // Check for URL Analysis insights
  const hasUrlAnalysis = Boolean(input._webAnalysisInsights || input._brdDocument);
  const brdDocument = input._brdDocument || null;
  const urlAnalysisInsights = input._webAnalysisInsights || {};
  const suggestedRequirements = input._suggestedRequirements || [];
  const suggestedTestAreas = input._suggestedTestAreas || [];
  const autoGeneratedTestCases = input._autoGeneratedTestCases || [];
  const userFlows = input._userFlows || [];
  const observations = input._observations || [];

  // Determine the actual website type from URL analysis
  const domainClassification = input._domainClassification || null;
  const detectedWebsiteType = urlAnalysisInsights.websiteType || urlAnalysisInsights.siteType || null;
  const websiteTypeConfidence = urlAnalysisInsights.websiteTypeConfidence || 0;
  const detectedSubDomain =
    urlAnalysisInsights.subDomain || (domainClassification && domainClassification.subDomain) || null;
  const subDomainConfidence =
    urlAnalysisInsights.subDomainConfidence ??
    (domainClassification && domainClassification.subDomainConfidence) ??
    null;
  
  // Map detected website type to profile key
  let profileKey = 'default';
  if (detectedWebsiteType && websiteTypeConfidence >= 0.5) {
    if (detectedWebsiteType.toLowerCase().includes('retail')) profileKey = 'retail_store';
    else if (detectedWebsiteType.toLowerCase().includes('e-commerce') || detectedWebsiteType.toLowerCase().includes('ecommerce')) profileKey = 'ecommerce';
    else if (detectedWebsiteType.toLowerCase().includes('healthcare') || detectedWebsiteType.toLowerCase().includes('pharma')) profileKey = 'healthcare';
    else if (detectedWebsiteType.toLowerCase().includes('corporate')) profileKey = 'corporate';
    else if (detectedWebsiteType.toLowerCase().includes('bank') || detectedWebsiteType.toLowerCase().includes('finance')) profileKey = 'banking';
    else if (detectedWebsiteType.toLowerCase().includes('food') || detectedWebsiteType.toLowerCase().includes('delivery')) profileKey = 'food_delivery';
    else if (detectedWebsiteType.toLowerCase().includes('travel') || detectedWebsiteType.toLowerCase().includes('booking')) profileKey = 'travel';
    else if (detectedWebsiteType.toLowerCase().includes('education') || detectedWebsiteType.toLowerCase().includes('learning')) profileKey = 'education';
    else if (detectedWebsiteType.toLowerCase().includes('news') || detectedWebsiteType.toLowerCase().includes('media')) profileKey = 'news_media';
    else if (detectedWebsiteType.toLowerCase().includes('ott') || detectedWebsiteType.toLowerCase().includes('streaming')) {
      // Check for specific OTT platforms
      profileKey = inferProfile(input.ottUrl, input.channelProfile);
    }
  } else {
    // Fallback to lightweight host-based domain inference when URL Analyzer data is unavailable.
    profileKey = inferDomainFallbackProfile(input.ottUrl, input.channelProfile);
  }
  
  const profile = appProfiles[profileKey] || appProfiles.default;
  const effectiveProfileName = detectedWebsiteType || profile.name;

  const sourceMode = input.figmaUrl
    ? "figma-plus-user-input"
    : uploadedCases.length
      ? (testCaseRowsStructured.length ? "csv-test-cases-only" : "uploaded-test-cases-plus-user-input")
      : hasUrlAnalysis
        ? "url-analysis-auto-generated"
        : "user-input-only";

  // Runtime context comes from analyzer/BRD evidence. Profile data is fallback only.
  const hostname = hostFromUrl(input.ottUrl);
  const targetDomain = detectedWebsiteType || profileKey.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  const subject = hostname || targetDomain;
  const evidence = summarizeEvidence({
    hasUrlAnalysis,
    insights: urlAnalysisInsights,
    allElements: input._allElements,
    userFlows,
    observations
  });

  const requirementEvidence = buildRequirementEvidence({
    profileKey,
    insights: urlAnalysisInsights,
    suggestedRequirements,
    suggestedTestAreas,
    brdDocument,
    domainClassification,
    detectedSubDomain,
    subject,
    notes
  });
  const requirementStatements = requirementEvidence.statements;

  const discoveredModules = uniqueEvidence([
    suggestedTestAreas,
    autoGeneratedTestCases.map((testCase) => testCase.module),
    userFlows.map((flow) => flow.name),
    urlAnalysisInsights.topNavLabels
  ]);
  const modules = discoveredModules.length ? discoveredModules : profile.modules;

  // A generic channel profile would otherwise describe an OTT playback journey
  // for any site, so profile journeys are used only when the profile matched.
  const discoveredJourneys = uniqueEvidence([
    userFlows.map((flow) => flow.name),
    urlAnalysisInsights.criticalPaths,
    urlAnalysisInsights.userJourneys,
    urlAnalysisInsights.topNavLabels
  ]);
  const profileJourneys = hasUrlAnalysis && profileKey === "default" ? [] : profile.journeys || [];
  const enhancedJourneys = discoveredJourneys.length
    ? discoveredJourneys
    : (profileJourneys.length ? [...profileJourneys] : modules);

  const audience =
    urlAnalysisInsights.targetAudience ||
    brdDocument?.executiveSummary?.targetAudience ||
    `${detectedSubDomain || targetDomain} users`;
  const assumptions = uniqueEvidence([
    brdDocument?.projectScope?.assumptions || [],
    `Target host ${hostname || "is unresolved"} is reachable when execution starts.`,
    input.login?.enabled
      ? "Runtime credentials are available for authenticated flows."
      : "Authenticated flows may be limited because runtime credentials were not supplied.",
    input.figmaUrl ? "The supplied Figma reference represents the intended experience." : null,
    evidence.level === "analyzer-thin"
      ? `The crawl of ${subject} returned ${evidence.elementCount} element(s) across ${evidence.pagesCrawled} page(s), so this plan describes intent rather than discovered behavior.`
      : null
  ]);
  const risks = uniqueEvidence([
    evidence.level === "analyzer-thin"
      ? `Crawl evidence for ${subject} is thin (${evidence.elementCount} elements, ${evidence.formCount} forms, ${evidence.flowCount} flows). Client-rendered content or bot protection likely blocked discovery, so generated cases may not match the live UI.`
      : null,
    (brdDocument?.riskAssessment || []).map((risk) => {
      const description = evidenceText(risk);
      return risk.mitigation ? `${description} Mitigation: ${risk.mitigation}` : description;
    }),
    brdDocument?.projectScope?.constraints || [],
    brdDocument?.warnings || [],
    observations.filter((observation) => observation.type === "warning"),
    extraction.warnings
  ]);
  const criticalFlowCount = userFlows.filter((flow) =>
    ["critical", "high", "p0", "p1"].includes(String(flow.priority || "").toLowerCase())
  ).length;

  return {
    metadata: {
      ottUrl: input.ottUrl,
      figmaUrl: input.figmaUrl || null,
      profileKey,
      profile: effectiveProfileName,
      websiteType: detectedWebsiteType,
      websiteTypeConfidence,
      subDomain: detectedSubDomain,
      subDomainConfidence,
      generatedAt: new Date().toISOString(),
      source: hasUrlAnalysis ? "BA Agent + URL Analyzer Pro" : "BA Agent",
      sourceMode,
      sourceCaseCount: uploadedCases.length,
      hasUrlAnalysis,
      autoGeneratedTestCaseCount: autoGeneratedTestCases.length,
      valueMode: requirementEvidence.source,
      classificationSource:
        urlAnalysisInsights.subDomainSource ||
        domainClassification?.source ||
        (hasUrlAnalysis ? "analyzer" : "profile-fallback"),
      evidence
    },
    testCaseRowsStructured,
    channelContext: {
      hostname,
      targetDomain,
      targetSubDomain: detectedSubDomain,
      audience,
      releaseIntent: criticalFlowCount
        ? `Validate ${criticalFlowCount} discovered critical/high-priority flow(s)`
        : `Validate ${enhancedJourneys.length} discovered or configured user journey(s)`,
      loginCredentialsProvided: Boolean(input.login && input.login.enabled)
    },
    modules,
    userJourneys: enhancedJourneys,
    requirementStatements,
    qualityStandard: {
      mode: "pro",
      manualCaseTemplate: ["id", "module", "scenario", "priority", "preconditions", "steps", "expectedResult", "type"]
    },
    assertionInputs: assertions,
    testCaseSeedFromUpload: uploadedCases,
    ingestionWarnings: extraction.warnings,
    userNotes: notes,
    assumptions,
    risks,
    // URL Analysis enhanced data
    urlAnalysis: hasUrlAnalysis ? {
      insights: urlAnalysisInsights,
      suggestedTestAreas,
      suggestedRequirements,
      autoGeneratedTestCases,
      userFlows,
      observations: observations.filter(o => o.type !== 'warning'),
      brdDocument
    } : null
  };
}

function generateManualCases(requirements) {
  const profile = requirements.metadata.profile;
  const profileKey = requirements.metadata.profileKey || "default";
  const uploadedSeeds = requirements.testCaseSeedFromUpload || [];
  const assertions = requirements.assertionInputs || [];
  const journeys = requirements.userJourneys || [];
  const modules = requirements.modules || [];
  const useEvidenceCatalog =
    Boolean(requirements.metadata.hasUrlAnalysis) &&
    requirements.metadata.valueMode !== "profile-template-fallback";

  const baseCatalog = useEvidenceCatalog
    ? (requirements.requirementStatements || []).map((statement, index) => {
      const module =
        modules.find((candidate) =>
          String(statement).toLowerCase().includes(String(candidate).toLowerCase())
        ) ||
        modules[index % Math.max(modules.length, 1)] ||
        "Site Requirement";
      return {
        module,
        scenario: String(statement).slice(0, 140),
        expected: String(statement),
        priority: "High",
        type: "Evidence"
      };
    })
    : (profileScenarioCatalog[profileKey] || []);
  const testCases = baseCatalog.map((item, index) => ({
    id: `TC-${String(profileKey).toUpperCase()}-${String(index + 1).padStart(3, "0")}`,
    module: item.module,
    scenario: item.scenario,
    title: `${profile}: ${item.module} - ${item.scenario}`,
    type: item.type,
    priority: item.priority,
    preconditions: useEvidenceCatalog
      ? `The ${requirements.channelContext?.hostname || "target"} page is reachable`
      : "Environment is stable, user/profile prerequisites are met, and content is available",
    testData: useEvidenceCatalog
      ? "Use only data and controls discovered during the run"
      : "Use sanctioned QA account and deterministic content fixtures",
    steps: [
      `Navigate to ${item.module} workflow entry point`,
      `Execute scenario: ${item.scenario}`,
      "Capture evidence and compare with expected behavior"
    ],
    expectedResult: item.expected,
    traceability: useEvidenceCatalog
      ? `BA requirement (${requirements.metadata.valueMode})`
      : "Mapped from BA requirement + channel sanity catalog"
  }));

  journeys.forEach((journey, i) => {
    testCases.push({
      id: `TC-${String(profileKey).toUpperCase()}-J${String(i + 1).padStart(3, "0")}`,
      module: "Journey",
      scenario: journey,
      title: `${profile}: Journey - ${journey}`,
      type: "Regression",
      priority: "Medium",
      preconditions: "Entry route is reachable and backend services are healthy",
      testData: "Default seeded content",
      steps: ["Open journey start point", "Traverse journey end-to-end", "Capture deviations with screenshot evidence"],
      expectedResult: "Journey completes and user-facing behavior remains stable",
      traceability: "Mapped from BA userJourneys"
    });
  });

  uploadedSeeds.forEach((seed, i) => {
    testCases.push({
      id: `TC-${String(profileKey).toUpperCase()}-UPL-${String(i + 1).padStart(3, "0")}`,
      module: "Uploaded Baseline",
      scenario: seed.slice(0, 80),
      title: `${profile}: Uploaded baseline case ${i + 1}`,
      type: "Baseline",
      priority: "High",
      preconditions: "Uploaded baseline is approved for this release",
      testData: "Input taken from uploaded suite",
      steps: [
        `Execute baseline statement: ${seed.slice(0, 140)}`,
        "Collect pass/fail evidence",
        "Record exact mismatch if observed"
      ],
      expectedResult: "Behavior aligns with uploaded baseline",
      traceability: "Mapped from uploaded test case"
    });
  });

  assertions.forEach((assertion, i) => {
    testCases.push({
      id: `TC-${String(profileKey).toUpperCase()}-AS-${String(i + 1).padStart(3, "0")}`,
      module: "Assertion",
      scenario: assertion.slice(0, 80),
      title: `${profile}: Assertion Validation ${i + 1}`,
      type: "Assertion",
      priority: "High",
      preconditions: "Target page and element are reachable",
      testData: "Assertion string provided by end user",
      steps: ["Navigate to relevant state", `Validate assertion: ${assertion}`, "Capture proof in report"],
      expectedResult: `Assertion holds true: ${assertion}`,
      traceability: "Mapped from user assertion input"
    });
  });

  const structuredRate = testCases.length
    ? Math.round((testCases.filter((tc) => tc.module && tc.scenario && tc.steps && tc.steps.length >= 3).length / testCases.length) * 100)
    : 0;

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: "Manual QA Agent",
      profile,
      professionalMode: true,
      qualityGate: {
        structureRate: `${structuredRate}%`,
        minAcceptedStructureRate: "90%"
      }
    },
    testCases
  };
}

function generateCasesFromUploadedOnly(requirements) {
  const profile = requirements.metadata.profile;
  const profileKey = requirements.metadata.profileKey || "default";
  const structured = requirements.testCaseRowsStructured || [];
  const uploadedSeeds = requirements.testCaseSeedFromUpload || [];

  const source = structured.length ? structured : uploadedSeeds
    .map((seed) => {
      const raw = String(seed || "").trim();
      if (!raw) return null;

      // Fallback parser: support both "feature | scenario | expected" and plain CSV rows.
      const parts = raw.includes("|")
        ? raw.split("|").map((p) => p.trim())
        : parseCsvLine(raw, ",").map((p) => p.trim());

      const first = String(parts[0] || "").toLowerCase();
      const second = String(parts[1] || "").toLowerCase();
      const third = String(parts[2] || "").toLowerCase();
      if (first === "feature" && second === "scenario" && third.includes("expected")) {
        return null;
      }

      return {
        feature: parts[0] || "General",
        scenario: parts[1] || "Scenario",
        expectedResult: parts[2] || "Expected"
      };
    })
    .filter(Boolean);

  const testCases = source.map((row, i) => {
    const feature = row.feature || "General";
    const scenario = row.scenario || `Scenario ${i + 1}`;
    const expected = row.expectedResult || "Expected behavior from uploaded test case";
    return {
      id: `TC-CSV-${String(i + 1).padStart(3, "0")}`,
      module: feature,
      scenario,
      title: `${feature}: ${scenario}`,
      type: "CSV",
      priority: "High",
      preconditions: "OTT URL loaded; preconditions as per test case",
      testData: "Uploaded CSV (Feature, Scenario, Expected Result)",
      steps: [
        `Navigate to relevant area for: ${feature}`,
        `Execute: ${scenario}`,
        `Verify: ${expected.slice(0, 120)}${expected.length > 120 ? "…" : ""}`
      ],
      expectedResult: expected,
      traceability: "Uploaded CSV"
    };
  });

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: "CSV (Feature, Scenario, Expected Result)",
      profile,
      professionalMode: true,
      mode: "uploaded_tc_only",
      totalCases: testCases.length
    },
    testCases
  };
}

/**
 * Analyzer cases arrive in two shapes: domain cases use plain-string steps,
 * while the evidence-backed cases use `{ action, target, description }` step
 * objects and an `expectedResults` array. Downstream reports, script builders
 * and the UI all assume strings, so flatten to that here.
 */
function flattenStep(step) {
  if (typeof step === "string") return step.trim();
  if (!step || typeof step !== "object") return "";

  const detail = step.description || step.target || step.action || "";
  const action = step.action && step.description ? `${step.action}: ` : "";
  const expected = step.expectedBehavior ? ` → ${step.expectedBehavior}` : "";
  return `${action}${detail}${expected}`.trim();
}

function flattenText(value, fallback) {
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          // Form test data rows: { field, value, validation }
          if (item.field) return `${item.field}=${item.value ?? ""}`.trim();
          return item.description || item.name || "";
        }
        return "";
      })
      .filter(Boolean);
    return parts.length ? parts.join("; ") : fallback;
  }
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

function normalizeAnalyzerCase(tc, index, profile) {
  const steps = (Array.isArray(tc.steps) ? tc.steps : [tc.steps])
    .map(flattenStep)
    .filter(Boolean);

  return {
    id: tc.id || `TC-AUTO-${String(index + 1).padStart(3, '0')}`,
    module: tc.module || 'Auto-Discovered',
    scenario: tc.scenario || tc.title,
    title: tc.title || `${profile}: Auto-discovered test ${index + 1}`,
    type: tc.type || 'Auto',
    priority: tc.priority || 'High',
    preconditions: flattenText(tc.preconditions, 'Website is accessible, browser is ready'),
    testData: flattenText(tc.testData, 'Standard test data'),
    steps: steps.length ? steps : ['Execute test scenario'],
    expectedResult: flattenText(
      tc.expectedResult || tc.expectedResults,
      'Test passes without errors'
    ),
    traceability: tc.traceability || 'Generated by URL Analyzer Agent'
  };
}

/**
 * Generate test cases from URL Analysis results
 * Uses the auto-generated test cases from the URL Analyzer agent
 */
function generateCasesFromUrlAnalysis(webAnalysis, requirements) {
  const profile = requirements.metadata?.profile || webAnalysis.siteOverview?.title || "Website";
  const majorFunctionalCases = webAnalysis.majorFunctionalCases || [];
  const mergedCases = webAnalysis.autoGeneratedTestCases || [];
  // The merged set already contains the domain cases and adds the ones backed
  // by observed forms, fields and page structure, so it is the richer source.
  const autoTestCases = mergedCases.length ? mergedCases : majorFunctionalCases;
  const userFlows = webAnalysis.userFlows || [];
  const brd = webAnalysis.brdDocument || {};

  // Analyzer cases are the single source of truth for URL-only runs. Do not
  // append generic BRD/feature cases here after classification has resolved.
  const testCases = autoTestCases.map((tc, i) => normalizeAnalyzerCase(tc, i, profile));

  // Calculate quality metrics
  const structuredRate = testCases.length
    ? Math.round((testCases.filter(tc => tc.module && tc.scenario && tc.steps && tc.steps.length >= 2).length / testCases.length) * 100)
    : 0;

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: "URL Analyzer Agent",
      profile,
      domain: webAnalysis.domainClassification?.domain || requirements.metadata?.websiteType || null,
      subDomain: webAnalysis.domainClassification?.subDomain || requirements.metadata?.subDomain || null,
      professionalMode: true,
      mode: "url_analysis",
      caseSource: mergedCases.length ? "autoGeneratedTestCases" : "majorFunctionalCases",
      majorFunctionalCount: majorFunctionalCases.length,
      totalCases: testCases.length,
      qualityGate: {
        structureRate: `${structuredRate}%`,
        minAcceptedStructureRate: "80%"
      },
      analysisStats: {
        autoGeneratedCount: autoTestCases.length,
        brdRequirementCount: brd.functionalRequirements?.length || 0,
        featureCount: webAnalysis.features?.length || 0,
        userFlowCount: userFlows.length
      }
    },
    testCases,
    brdDocument: brd,
    observations: webAnalysis.observations || [],
    warnings: webAnalysis.warnings || []
  };
}

/**
 * Generate test cases from manually entered test cases (from UI form)
 */
function generateCasesFromManualInput(manualTestCases, requirements) {
  const profile = requirements.metadata?.profile || "Website";
  
  const testCases = manualTestCases
    .filter(tc => tc.feature || tc.scenario || tc.expectedResult)
    .map((tc, i) => {
      const feature = tc.feature?.trim() || "General";
      const scenario = tc.scenario?.trim() || `Manual Test ${i + 1}`;
      const expectedResult = tc.expectedResult?.trim() || "Expected behavior as per test case";
      
      return {
        id: `TC-MANUAL-${String(i + 1).padStart(3, '0')}`,
        module: feature,
        scenario,
        title: `${feature}: ${scenario}`,
        type: 'Manual',
        priority: 'High',
        preconditions: 'Website is accessible, test environment is ready',
        testData: 'As specified in the test case',
        steps: [
          `Navigate to relevant area for: ${feature}`,
          `Execute: ${scenario}`,
          `Verify: ${expectedResult.slice(0, 120)}${expectedResult.length > 120 ? '…' : ''}`
        ],
        expectedResult,
        traceability: 'Manually entered test case'
      };
    });

  // Calculate quality metrics
  const structuredRate = testCases.length
    ? Math.round((testCases.filter(tc => tc.module && tc.scenario && tc.expectedResult).length / testCases.length) * 100)
    : 0;

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: "Manual Entry",
      profile,
      professionalMode: true,
      mode: "manual_tc_only",
      totalCases: testCases.length,
      qualityGate: {
        structureRate: `${structuredRate}%`,
        minAcceptedStructureRate: "80%"
      }
    },
    testCases
  };
}

function generateManagerReport(requirements, manualCases, automationBundle, executionReport, accessibilityReport = null, performanceReport = null, securityReport = null) {
  const tests = executionReport.tests || [];
  const failures = tests.filter((t) => t.status === "failed");
  const skipped = tests.filter((t) => t.status === "skipped");
  const passed = tests.filter((t) => t.status === "passed");
  const totalExecuted = tests.length;
  const totalCases = totalExecuted || (manualCases.testCases || []).length;
  const passRate = executionReport.totals.passRate || "0%";
  const profileKey = String(requirements?.metadata?.profileKey || "default").toLowerCase();
  const ottProfileKeys = new Set(["gray", "tvnz", "aha", "hotstar", "primevideo", "default"]);
  const isOttContext = ottProfileKeys.has(profileKey);
  const targetLabel = isOttContext ? "OTT URL" : "target URL";

  const rootCauses = [];
  const errorMessages = new Set(failures.map((f) => String(f.error).slice(0, 80)));
  if (failures.some((t) => /waitFor|Timeout \d+ms exceeded/i.test(String(t.error || "")))) {
    rootCauses.push("Flow execution: locators timed out waiting for visible elements; crawl selectors may not match the live page");
  }
  if (errorMessages.has("") || failures.some((t) => String(t.error).includes("not visible"))) {
    rootCauses.push("Elements not found: selectors may not match current app layout or content");
  }
  if (failures.some((t) => String(t.error).includes("content card") || String(t.error).includes("Content detail"))) {
    rootCauses.push("Content discovery: card/detail selectors need calibration for this channel");
  }
  if (failures.some((t) => String(t.error).includes("Play") || String(t.error).includes("playback"))) {
    rootCauses.push("Playback flow: Play/Resume CTA or player controls not detected");
  }
  if (failures.some((t) => String(t.error).includes("Login") || String(t.error).includes("OTP"))) {
    rootCauses.push("Auth flow: login/OTP elements not found; check credentials or selectors");
  }
  if (failures.some((t) => String(t.error).includes("Search") || String(t.error).includes("EPG") || String(t.error).includes("channel"))) {
    rootCauses.push(
      isOttContext
        ? "Navigation: Search, EPG, or channel entry not visible on landing"
        : "Navigation: search entry or product/result navigation is not visible on landing"
    );
  }
  if (!rootCauses.length && failures.length) {
    rootCauses.push("General: selector drift, timing, or environment variability");
  }

  // A skipped check leaves its journey unverified, so it weighs on the decision
  // exactly like a failure.
  const openCount = (executionReport.totals.failed || 0) + (executionReport.totals.skipped || 0);
  const decision = openCount === 0 ? "Go" : openCount <= 2 ? "Conditional Go" : "Hold";
  const riskLevel = openCount === 0 ? "Low" : openCount <= 3 ? "Medium" : "High";

  const byFeature = {};
  (manualCases.testCases || []).forEach((tc) => {
    const mod = tc.module || "Other";
    if (!byFeature[mod]) byFeature[mod] = { total: 0, passed: 0, failed: 0, skipped: 0 };
    byFeature[mod].total += 1;
  });
  tests.forEach((t) => {
    const id = t.id.replace("EXEC-", "");
    const tc = (manualCases.testCases || []).find((c) => c.id === id || `EXEC-${c.id}` === t.id);
    const mod = tc ? (tc.module || "Other") : "Other";
    if (!byFeature[mod]) byFeature[mod] = { total: 0, passed: 0, failed: 0, skipped: 0 };
    if (t.status === "passed") byFeature[mod].passed += 1;
    else if (t.status === "failed") byFeature[mod].failed += 1;
    else byFeature[mod].skipped += 1;
  });

  const traceability = tests.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    error: t.error || null
  }));

  const actionPlan = [];
  if (failures.length) {
    actionPlan.push("Fix failing tests: update selectors or add element logs for missing elements");
    actionPlan.push("Re-run failed only (Re-run Failed button) after selector/flow fixes");
  }
  if (rootCauses.some((r) => r.includes("Auth"))) {
    actionPlan.push("Provide valid login credentials in the run form if the app has a login wall");
  }
  actionPlan.push(`Use Element log tab to feed stable selectors for this ${targetLabel} (Postgres required)`);
  actionPlan.push("Add assertion lines (selector: or text:) for critical UI checks");

  // Include optional agent summaries
  const optionalAgentSummaries = {};
  if (accessibilityReport && accessibilityReport.summary) {
    optionalAgentSummaries.accessibility = {
      score: accessibilityReport.summary.score,
      verdict: accessibilityReport.summary.verdict,
      errors: accessibilityReport.summary.errors,
      warnings: accessibilityReport.summary.warnings
    };
  }
  if (performanceReport && performanceReport.summary) {
    optionalAgentSummaries.performance = {
      score: performanceReport.summary.score,
      verdict: performanceReport.summary.verdict,
      loadTime: performanceReport.summary.loadTime
    };
  }
  if (securityReport && securityReport.summary) {
    optionalAgentSummaries.security = {
      score: securityReport.summary.score,
      verdict: securityReport.summary.verdict,
      vulnerabilities: securityReport.vulnerabilities?.length || 0,
      criticalIssues: securityReport.vulnerabilities?.filter(v => v.type === 'critical').length || 0
    };
    // Adjust risk level if security issues found
    if (securityReport.summary.score < 50) {
      actionPlan.unshift("SECURITY: Address critical security vulnerabilities before release");
    }
  }

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: "Manager Agent",
      reviewLevel: "Executive"
    },
    executiveSummary: {
      verdict: decision,
      riskLevel,
      passRate,
      totalTestCases: totalCases,
      executed: totalExecuted,
      passed: passed.length,
      failed: failures.length,
      skipped: skipped.length,
      profile: requirements.metadata.profile,
      domain: requirements.metadata.websiteType || requirements.metadata.profile,
      subDomain: requirements.metadata.subDomain || null,
      ottUrl: requirements.metadata.ottUrl
    },
    optionalAgentSummaries,
    traceabilityMatrix: traceability,
    coverageByFeature: byFeature,
    analysis: {
      rootCauses,
      highImpactFailures: failures.slice(0, 10).map((f) => ({ id: f.id, title: f.title, reason: f.error })),
      skippedReasons: [...new Set(skipped.map((s) => s.error).filter(Boolean))]
    },
    actionPlan,
    signOff: {
      recommendation: decision === "Go" ? "Release readiness accepted from automation perspective." : decision === "Conditional Go" ? "Proceed with caution; address failing tests before release." : "Do not release until critical failures are resolved.",
      nextSteps: actionPlan.slice(0, 3)
    }
  };
}

function generateDeliveryReport(requirements, managerReport, executionReport) {
  const es = managerReport.executiveSummary || {};
  const exec = executionReport || {};
  const totals = exec.totals || {};
  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: "Delivery Manager Agent",
      role: "Final delivery review for stakeholder"
    },
    deliverySummary: {
      projectOrRun: requirements.metadata.ottUrl || "N/A",
      verdict: es.verdict || "N/A",
      riskLevel: es.riskLevel || "N/A",
      passRate: totals.passRate || "0%",
      totalExecuted: totals.total || 0,
      passed: totals.passed || 0,
      failed: totals.failed || 0,
      skipped: totals.skipped || 0
    },
    forStakeholder: {
      headline: (totals.failed || 0) + (totals.skipped || 0) === 0
        ? "All automated checks passed."
        : `${(totals.failed || 0) + (totals.skipped || 0)} check(s) failed or were skipped; review required.`,
      recommendation: es.verdict === "Go" ? "Ready for release from QA automation perspective." : es.verdict === "Conditional Go" ? "Proceed with caution; address failures before release." : "Do not release until critical failures are fixed.",
      nextSteps: (managerReport.actionPlan || []).slice(0, 5)
    },
    managerSignOff: managerReport.signOff || null
  };
}

function createPipeline(deps = {}) {
  const selectorMemory = deps.selectorMemory || new Map();
  const getDbPool = deps.getDbPool || (() => null);

  async function generateAutomationBundle(input, manualCases, requirements) {
    const host = hostFromUrl(input.ottUrl);
    const profileKey =
      (requirements?.metadata?.profileKey && appProfiles[requirements.metadata.profileKey]
        ? requirements.metadata.profileKey
        : null) || inferProfile(input.ottUrl, input.channelProfile);
    const profile = appProfiles[profileKey] || appProfiles.default;
    const profileSelectors = profile.selectorCandidates;
    await locatorRegistry.hydrateSelectorMemory(getDbPool(), selectorMemory, host);
    const memorySelectors = selectorMemory.get(host) || {};
    const selectors = await locatorRegistry.getMergedSelectors(getDbPool(), host, profileSelectors, memorySelectors);
    const useCsvScript = input.executionMode === "uploaded_tc_only" && manualCases.testCases && manualCases.testCases.length > 0;
    const script = useCsvScript
      ? scriptBuilder.buildPlaywrightSpecFromTestCases(input.ottUrl, manualCases, selectors)
      : scriptBuilder.buildPlaywrightSpec(input.ottUrl, selectors, { testName: "channel flow regression" });

    const projectName = (input.projectId || requirements?.metadata?.profile || "OTT").toString();
    const locatorsByKey = Object.fromEntries(Object.entries(selectors).map(([k, v]) => [k, (v || []).map((s) => (typeof s === "string" ? { selectorValue: s, selectorType: "css" } : s))]));
    const generatedSeleniumJava = javaSeleniumBuilder.buildSeleniumJavaClass(projectName, manualCases.testCases || [], locatorsByKey, input.ottUrl);

    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        source: "Automation QA Agent",
        scriptingLanguage: "Java",
        framework: "Selenium (Java); Playwright (runtime)",
        profile: requirements.metadata.profile,
        strategy: "adaptive-locator-candidates+db-registry"
      },
      mappedManualCaseIds: manualCases.testCases.map((tc) => tc.id),
      selectorCandidates: selectors,
      assertionFormatGuide: [
        "selector:.class-or-[data-testid='id']",
        "text:Exact or partial visible text"
      ],
      generatedScriptSnippet: [
        "await page.goto(ottUrl)",
        "await clickFirstAvailable(continueCta || loginCta)",
        "await clickFirstAvailable(contentCard)",
        "await clickFirstAvailable(playCta)",
        "await expectFirstAvailable(pauseCta, seekBar)"
      ],
      generatedPlaywrightScript: script,
      generatedSeleniumJava
    };
  }

  return {
    consolidateRequirements,
    generateManualCases,
    generateCasesFromUploadedOnly,
    generateCasesFromUrlAnalysis,
    generateCasesFromManualInput,
    generateAutomationBundle,
    generateManagerReport,
    generateDeliveryReport
  };
}

module.exports = {
  setStage,
  hostFromUrl,
  inferProfile,
  createPipeline,
  consolidateRequirements,
  generateManualCases,
  generateCasesFromUploadedOnly,
  generateCasesFromUrlAnalysis,
  generateCasesFromManualInput,
  generateManagerReport,
  generateDeliveryReport
};
