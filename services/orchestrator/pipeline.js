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
  if (status === "done" || status === "failed") stage.finishedAt = now;
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
  if (host.includes("primevideo") || host.includes("amazon")) return "primevideo";
  return "default";
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
  const hasUrlAnalysis = input._webAnalysisInsights || input._brdDocument;
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
    // Fallback to OTT profile inference for backward compatibility
    profileKey = inferProfile(input.ottUrl, input.channelProfile);
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

  // Generate domain-appropriate requirement statements
  let requirementStatements = [];
  
  if (profileKey === 'retail_store') {
    requirementStatements = [
      "All store branch locations must be displayed with complete address and contact information.",
      "Store operating hours must be clearly visible for each branch.",
      "Product categories must be navigable and display relevant items.",
      "Contact information must be accessible from all pages.",
      "Navigation menu must provide clear access to all main sections.",
      "Images and media must load correctly across all pages."
    ];
  } else if (profileKey === 'ecommerce') {
    requirementStatements = [
      "Product search must return relevant results within 3 seconds.",
      "Product listing pages must display price, image, and availability.",
      "Add to Cart functionality must update cart count immediately.",
      "Cart must persist items across page navigation.",
      "Checkout flow must be completable without errors.",
      "User authentication must work for login and registration."
    ];
  } else if (profileKey === 'healthcare') {
    requirementStatements = [
      "Product information must be accurate and accessible.",
      "Contact forms must accept user input and confirm submission.",
      "Adverse event reporting mechanism must be accessible.",
      "Company information must be available and accurate.",
      "Navigation must provide access to all product and corporate sections."
    ];
  } else if (profileKey === 'banking') {
    requirementStatements = [
      "Login must be secure with proper credential handling.",
      "All pages must be served over HTTPS.",
      "Session management must handle timeout appropriately.",
      "Account information must display accurately.",
      "Transaction forms must validate input properly."
    ];
  } else {
    // Default/OTT requirements
    requirementStatements = [
      "Application shell must render with primary navigation and discoverable entry points.",
      "Content must be accessible through navigation and search.",
      "Forms must accept user input and provide feedback.",
      "Images and media must load correctly.",
      "All interactive elements must respond to user actions."
    ];
  }

  // Sub-domain requirements (Banking → Insurance) are more specific than the
  // broad domain templates above, so they lead.
  const subDomainAreas = (domainClassification && domainClassification.testPriorities) || [];
  const subDomainFlows = (domainClassification && domainClassification.criticalFlows) || [];
  if (detectedSubDomain && (subDomainAreas.length || subDomainFlows.length)) {
    requirementStatements = [
      ...subDomainAreas.map((area) => `${area} must work correctly for a ${detectedSubDomain} journey.`),
      ...subDomainFlows.map((flow) => `${flow} must complete end-to-end without blocking errors.`),
      ...requirementStatements
    ];
  }

  // Add suggested requirements from URL Analysis
  if (suggestedRequirements.length > 0) {
    requirementStatements = [
      ...requirementStatements,
      ...suggestedRequirements.slice(0, 10)
    ];
  }

  // Add requirements from BRD document
  if (brdDocument && brdDocument.functionalRequirements) {
    const brdReqs = brdDocument.functionalRequirements
      .filter(r => r.testable)
      .slice(0, 10)
      .map(r => `${r.id}: ${r.description}`);
    requirementStatements = [...requirementStatements, ...brdReqs];
  }

  // Get user journeys from URL analysis or profile
  let enhancedJourneys = [...(profile.journeys || [])];
  if (urlAnalysisInsights.userJourneys && urlAnalysisInsights.userJourneys.length > 0) {
    enhancedJourneys = urlAnalysisInsights.userJourneys; // Prefer URL analysis journeys
  }
  if (userFlows.length > 0) {
    const flowNames = userFlows.map(f => f.name);
    enhancedJourneys = [...new Set([...flowNames, ...enhancedJourneys])];
  }

  // Determine target domain and audience from URL analysis
  const targetDomain = detectedWebsiteType || profileKey.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  let audience = "Website visitors";
  if (profileKey === 'ecommerce') audience = "Online shoppers";
  else if (profileKey === 'retail_store') audience = "Retail customers";
  else if (profileKey === 'healthcare') audience = "Patients and healthcare professionals";
  else if (profileKey === 'banking') audience = "Banking customers";
  else if (profileKey === 'food_delivery') audience = "Food ordering customers";
  else if (profileKey === 'travel') audience = "Travelers";
  else if (profileKey === 'education') audience = "Students and learners";
  else if (profileKey === 'news_media') audience = "Readers and viewers";
  else if (profileKey.includes('ott') || profile.name.includes('OTT')) audience = "Streaming users";

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
      autoGeneratedTestCaseCount: autoGeneratedTestCases.length
    },
    testCaseRowsStructured,
    channelContext: {
      hostname: hostFromUrl(input.ottUrl),
      targetDomain,
      targetSubDomain: detectedSubDomain,
      audience,
      releaseIntent: "Regression + user critical paths",
      loginCredentialsProvided: Boolean(input.login && input.login.enabled)
    },
    modules: profile.modules,
    userJourneys: enhancedJourneys,
    requirementStatements: [...new Set(requirementStatements)],
    qualityStandard: {
      mode: "pro",
      manualCaseTemplate: ["id", "module", "scenario", "priority", "preconditions", "steps", "expectedResult", "type"]
    },
    assertionInputs: assertions,
    testCaseSeedFromUpload: uploadedCases,
    ingestionWarnings: extraction.warnings,
    userNotes: notes,
    assumptions: [
      "Given URL is a valid pre-prod or prod-like environment.",
      "If figma is unavailable, uploaded test case file is accepted as baseline behavior reference.",
      "No credential secrets are provided in this tool; login walls may remain partial in automation.",
      ...(hasUrlAnalysis ? ["URL Analysis provides comprehensive element discovery for test coverage."] : [])
    ],
    risks: [
      "Dynamic content rails can shift selectors between runs.",
      "Regional variants may alter CTA labels.",
      "Login gates may require OTP/captcha not automatable in generic flow.",
      ...(observations.filter(o => o.type === 'warning').map(o => o.message) || [])
    ],
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

  const baseCatalog = profileScenarioCatalog[profileKey] || [];
  const testCases = baseCatalog.map((item, index) => ({
    id: `TC-${String(profileKey).toUpperCase()}-${String(index + 1).padStart(3, "0")}`,
    module: item.module,
    scenario: item.scenario,
    title: `${profile}: ${item.module} - ${item.scenario}`,
    type: item.type,
    priority: item.priority,
    preconditions: "Environment is stable, user/profile prerequisites are met, and content is available",
    testData: "Use sanctioned QA account and deterministic content fixtures",
    steps: [
      `Navigate to ${item.module} workflow entry point`,
      `Execute scenario: ${item.scenario}`,
      "Capture evidence and compare with expected behavior"
    ],
    expectedResult: item.expected,
    traceability: "Mapped from BA requirement + channel sanity catalog"
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
 * Generate test cases from URL Analysis results
 * Uses the auto-generated test cases from the URL Analyzer agent
 */
function generateCasesFromUrlAnalysis(webAnalysis, requirements) {
  const profile = requirements.metadata?.profile || webAnalysis.siteOverview?.title || "Website";
  const majorFunctionalCases = webAnalysis.majorFunctionalCases || [];
  const autoTestCases = majorFunctionalCases.length
    ? majorFunctionalCases
    : (webAnalysis.autoGeneratedTestCases || []);
  const userFlows = webAnalysis.userFlows || [];
  const brd = webAnalysis.brdDocument || {};
  
  // Combine auto-generated test cases with flow-based test cases
  const testCases = [];
  
  // Add auto-generated test cases from URL Analyzer
  autoTestCases.forEach((tc, i) => {
    testCases.push({
      id: tc.id || `TC-AUTO-${String(i + 1).padStart(3, '0')}`,
      module: tc.module || 'Auto-Discovered',
      scenario: tc.scenario || tc.title,
      title: tc.title || `${profile}: Auto-discovered test ${i + 1}`,
      type: tc.type || 'Auto',
      priority: tc.priority || 'High',
      preconditions: tc.preconditions || 'Website is accessible, browser is ready',
      testData: tc.testData || 'Standard test data',
      steps: Array.isArray(tc.steps) ? tc.steps : [tc.steps || 'Execute test scenario'],
      expectedResult: tc.expectedResult || 'Test passes without errors',
      traceability: tc.traceability || 'Generated by URL Analyzer Agent'
    });
  });

  // Add test cases from BRD functional requirements if not already covered
  if (brd.functionalRequirements) {
    const existingScenarios = new Set(testCases.map(tc => tc.scenario?.toLowerCase()));
    
    brd.functionalRequirements.forEach((req, i) => {
      if (req.testable && !existingScenarios.has(req.feature?.toLowerCase())) {
        testCases.push({
          id: `TC-BRD-${String(i + 1).padStart(3, '0')}`,
          module: req.feature || 'BRD Requirement',
          scenario: `Verify ${req.feature || 'Requirement'}`,
          title: `${profile}: ${req.feature} - BRD Verification`,
          type: 'BRD',
          priority: req.priority || 'High',
          preconditions: 'As specified in BRD document',
          testData: 'As per requirement specification',
          steps: req.acceptanceCriteria ? req.acceptanceCriteria.map((ac, j) => `Step ${j + 1}: Verify - ${ac}`) : [`Verify: ${req.description}`],
          expectedResult: req.acceptanceCriteria ? req.acceptanceCriteria.join('; ') : req.description,
          traceability: `BRD Requirement: ${req.id}`
        });
      }
    });
  }

  // Add test cases for discovered features not yet covered
  if (webAnalysis.features) {
    const coveredFeatures = new Set(testCases.map(tc => tc.module?.toLowerCase()));
    
    webAnalysis.features.forEach((feature, i) => {
      if (!coveredFeatures.has(feature.name?.toLowerCase())) {
        testCases.push({
          id: `TC-FEAT-${String(i + 1).padStart(3, '0')}`,
          module: feature.name,
          scenario: `Verify ${feature.name} functionality`,
          title: `${profile}: ${feature.name} - Feature Verification`,
          type: feature.type === 'core' ? 'Sanity' : 'Functional',
          priority: feature.type === 'core' ? 'Critical' : feature.priority || 'High',
          preconditions: 'Feature is accessible on the website',
          testData: 'Standard test data',
          steps: [
            `Navigate to ${feature.name} area`,
            `Verify ${feature.name} is visible`,
            `Interact with ${feature.name}`,
            `Verify expected behavior: ${feature.description || 'Feature works as expected'}`
          ],
          expectedResult: feature.description || `${feature.name} functions correctly`,
          traceability: 'Generated from URL Analysis - Feature Discovery'
        });
      }
    });
  }

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
  const totalCases = (manualCases.testCases || []).length;
  const totalExecuted = tests.length;
  const passRate = executionReport.totals.passRate || "0%";

  const rootCauses = [];
  const errorMessages = new Set(failures.map((f) => String(f.error).slice(0, 80)));
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
    rootCauses.push("Navigation: Search, EPG or channel entry not visible on landing");
  }
  if (!rootCauses.length && failures.length) {
    rootCauses.push("General: selector drift, timing, or environment variability");
  }

  const failCount = executionReport.totals.failed || 0;
  const decision = failCount === 0 ? "Go" : failCount <= 2 ? "Conditional Go" : "Hold";
  const riskLevel = failCount === 0 ? "Low" : failCount <= 3 ? "Medium" : "High";

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
    actionPlan.push("1. Fix failing tests: update selectors or add element logs for missing elements");
    actionPlan.push("2. Re-run failed only (Re-run Failed button) after selector/flow fixes");
  }
  if (rootCauses.some((r) => r.includes("Auth"))) {
    actionPlan.push("3. Provide valid login credentials in the run form if the app has a login wall");
  }
  actionPlan.push("4. Use Element log tab to feed stable selectors for this OTT URL (Postgres required)");
  actionPlan.push("5. Add assertion lines (selector: or text:) for critical UI checks");

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
      headline: totals.failed === 0 ? "All automated checks passed." : `${totals.failed} check(s) failed; review required.`,
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
