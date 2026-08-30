"use strict";

const fs = require("fs/promises");
const path = require("path");
const PDFDocument = require("pdfkit");

const {
  PAGE,
  WIDTH,
  HEIGHT,
  CONTENT_LEFT,
  CONTENT_RIGHT,
  CONTENT_WIDTH,
  CONTENT_BOTTOM,
  FONT,
  safe,
  createPalette
} = require("./pdfTheme");

const { createDrawKit } = require("./pdfKit");
const { createLogoPainter } = require("./pdfLogo");

const TAGLINE = "AI-first QA orchestration";

const MAX_MANUAL_ROWS = 60;
const MAX_EXECUTION_ROWS = 250;
const MAX_FAILURE_CARDS = 15;
const MAX_ACTION_ROWS = 14;
const MAX_TRACE_ROWS = 60;
const MAX_SCREENSHOTS = 40;

// The release decision in this report is gated on the automated pass rate, so
// identical evidence always yields the same verdict. The Manager agent's own
// Go / Conditional Go / Hold label counts failures instead of scoring them, so
// it is reported as a secondary signal rather than the headline verdict.
const GATE_BANDS = [
  {
    min: 95,
    verdict: "Full pass",
    directive: "Automated coverage is accepted. Spot-check the highest-risk journey manually before sign-off."
  },
  {
    min: 85,
    verdict: "Conditional pass",
    directive: "Conditional release only. Triage every failing check and manually verify the journeys they cover before sign-off."
  },
  {
    min: 0,
    verdict: "Manual check",
    directive: "Automated coverage is not trustworthy at this score. Complete a full manual QA pass before release."
  }
];

const GATE_SCALE = "Gate scale: 95% and above is a full pass with a manual spot check, 85% to 94% is a conditional pass, below 85% requires a manual check.";

function releaseGate(score) {
  if (score === null) {
    return {
      score: null,
      scoreLabel: "n/a",
      verdict: "Manual check",
      directive: "No automated check produced a pass or fail result, so there is no evidence to score. Complete a full manual QA pass before release."
    };
  }
  const band = GATE_BANDS.find((entry) => score >= entry.min) || GATE_BANDS[GATE_BANDS.length - 1];
  return { score, scoreLabel: `${score}%`, verdict: band.verdict, directive: band.directive };
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return safe(value);
  return date.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

function formatDuration(ms) {
  const value = Number(ms);
  if (!Number.isFinite(value) || value < 0) return "-";
  if (value < 1000) return `${Math.round(value)} ms`;
  if (value < 60000) return `${(value / 1000).toFixed(1)} s`;
  const minutes = Math.floor(value / 60000);
  const seconds = Math.round((value % 60000) / 1000);
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function stageDuration(stage) {
  if (!stage || !stage.startedAt || !stage.finishedAt) return null;
  const started = new Date(stage.startedAt).getTime();
  const finished = new Date(stage.finishedAt).getTime();
  if (Number.isNaN(started) || Number.isNaN(finished)) return null;
  return Math.max(0, finished - started);
}

function columns(specs) {
  return specs.map((spec) => ({ ...spec, width: CONTENT_WIDTH * spec.fraction }));
}

function hostOf(url) {
  try {
    return new URL(String(url)).hostname;
  } catch {
    return safe(url, 60);
  }
}

function collectRootCauses(manager) {
  const analysis = manager.analysis || {};
  return analysis.rootCauses || analysis.majorRootCauses || [];
}

function actionKey(text) {
  return safe(text).toLowerCase();
}

// The Manager agent emits its action plan already ordered (security first, then
// remediation, then hygiene) and repeats its top items as `signOff.nextSteps`.
// That ordering is the only priority signal available, so it drives the labels.
function actionPriority(action, topActions) {
  if (/^security\b/i.test(action)) return "Critical";
  return topActions.has(actionKey(action)) ? "High" : "Medium";
}

function gatePosture(manager) {
  const gates = manager.optionalAgentSummaries || {};
  const parts = [];

  if (gates.accessibility) {
    const gate = gates.accessibility;
    parts.push({
      label: "Accessibility",
      value: [`Score ${gate.score ?? "-"}`, safe(gate.verdict, 24), `${gate.errors ?? 0} errors`]
        .filter(Boolean).join("  \u00B7  ")
    });
  }
  if (gates.performance) {
    const gate = gates.performance;
    parts.push({
      label: "Performance",
      value: [`Score ${gate.score ?? "-"}`, safe(gate.verdict, 24), safe(gate.loadTime, 16)]
        .filter(Boolean).join("  \u00B7  ")
    });
  }
  if (gates.security) {
    const gate = gates.security;
    parts.push({
      label: "Security",
      value: [`Score ${gate.score ?? "-"}`, safe(gate.verdict, 24), `${gate.vulnerabilities ?? 0} findings`,
        gate.criticalIssues ? `${gate.criticalIssues} critical` : null]
        .filter(Boolean).join("  \u00B7  ")
    });
  }

  return parts;
}

// Cover art and page furniture are drawn at absolute coordinates outside the
// text box; pdfkit would otherwise treat them as overflow and add blank pages.
function withoutMargins(doc, draw) {
  const margins = doc.page.margins;
  doc.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };
  try {
    draw();
  } finally {
    doc.page.margins = margins;
  }
}

function buildModel(run) {
  const artifacts = run.artifacts || {};
  const exec = artifacts.executionReport || {};
  const totals = exec.totals || {};
  const manager = artifacts.managerReport || {};
  const summary = manager.executiveSummary || {};
  const requirements = artifacts.requirements || {};
  const meta = requirements.metadata || {};

  const tests = Array.isArray(exec.tests) ? exec.tests : [];
  const orderedTests = [...tests].sort((a, b) => {
    const rank = (test) => (test.status === "failed" ? 0 : test.status === "skipped" ? 1 : 2);
    return rank(a) - rank(b);
  });

  const passed = Number(totals.passed || 0);
  const failed = Number(totals.failed || 0);
  const skipped = Number(totals.skipped || 0);
  const total = Number(totals.total || tests.length);

  // Scored from the counts rather than the executor's own string, so the gate
  // band can never disagree with the pass rate printed beside it.
  const executedTotal = passed + failed;
  const score = executedTotal ? Math.round((passed / executedTotal) * 100) : null;
  const gate = releaseGate(score);
  const passRate = gate.scoreLabel;

  const createdAt = new Date(run.createdAt).getTime();
  const updatedAt = new Date(run.updatedAt).getTime();
  const wallClockMs = Number.isNaN(createdAt) || Number.isNaN(updatedAt) ? null : Math.max(0, updatedAt - createdAt);

  return {
    run,
    input: run.input || {},
    artifacts,
    exec,
    tests,
    orderedTests,
    failedTests: orderedTests.filter((test) => test.status === "failed"),
    manager,
    summary,
    requirements,
    meta,
    manualCases: (artifacts.manualTestCases && artifacts.manualTestCases.testCases) || [],
    manualMeta: (artifacts.manualTestCases && artifacts.manualTestCases.metadata) || {},
    webAnalysis: artifacts.webAnalysis || null,
    delivery: artifacts.deliveryReport || null,
    automation: artifacts.automationBundle || null,
    accessibility: artifacts.accessibilityReport || null,
    performance: artifacts.performanceReport || null,
    security: artifacts.securityReport || null,
    totals: { total, passed, failed, skipped, passRate },
    wallClockMs,
    gate,
    verdict: gate.verdict,
    managerVerdict: safe(summary.verdict, 30) || "Not recorded",
    riskLevel: summary.riskLevel || "Unknown"
  };
}

/**
 * Builds every page of a run report. `C` is the resolved theme palette, `kit`
 * the drawing helpers bound to it, and `logo` the brand artwork painter.
 */
function createReporter(C, kit, logo, coverLogo) {
  const {
    ensureSpace, sectionTitle, subTitle, paragraph, bulletList,
    pill, statCardRow, donutChart, legend, stackedBar, keyValueGrid,
    calloutBox, drawTable
  } = kit;

  /* ---------------------------------------------------------------- cover */

  function renderCover(doc, model) {
    const { run, input, totals } = model;
    const cover = C.cover;

    doc.save();
    doc.rect(0, 0, WIDTH, HEIGHT).fill(cover.bg);
    doc.polygon([WIDTH * 0.7, 0], [WIDTH, 0], [WIDTH, HEIGHT], [WIDTH * 0.5, HEIGHT]).fill(cover.washNear);
    doc.polygon([WIDTH * 0.88, 0], [WIDTH, 0], [WIDTH, HEIGHT], [WIDTH * 0.72, HEIGHT]).fill(cover.washFar);
    doc.rect(0, 0, WIDTH, 4).fill(cover.rule);
    doc.restore();

    const iconWidth = coverLogo.icon(doc, 56, 42, 78);

    const wordmarkX = 56 + iconWidth + 20;
    const wordmarkHeight = 32;
    coverLogo.wordmark(doc, wordmarkX, 56, wordmarkHeight);
    doc.fillColor(cover.subtle).font(FONT.bold).fontSize(8)
      .text(TAGLINE.toUpperCase(), wordmarkX + 2, 56 + wordmarkHeight + 9, {
        characterSpacing: 2.2, lineBreak: false
      });

    doc.fillColor(cover.ink).font(FONT.bold).fontSize(40)
      .text("QA Execution Report", 56, 186, { width: WIDTH * 0.55 });
    doc.fillColor(cover.meta).font(FONT.regular).fontSize(12)
      .text(safe(input.ottUrl || "No target URL recorded", 90), 56, doc.y + 6, { width: WIDTH * 0.55 });

    const verdictY = doc.y + 22;
    let cursorX = 56;
    cursorX += pill(doc, cursorX, verdictY, `Gate: ${model.verdict}`, C.verdictTone(model.verdict), {
      size: 9.5, height: 22
    }) + 10;
    cursorX += pill(doc, cursorX, verdictY, `Score: ${model.gate.scoreLabel}`, C.verdictTone(model.verdict), {
      size: 9.5, height: 22
    }) + 10;
    pill(doc, cursorX, verdictY, `Risk: ${model.riskLevel}`, C.toneFor(model.riskLevel), {
      size: 9.5, height: 22
    });

    doc.fillColor(cover.meta).font(FONT.regular).fontSize(10.5)
      .text(safe(model.gate.directive, 260), 56, verdictY + 44, { width: WIDTH * 0.45, lineGap: 2.5 });

    const cards = [
      { label: "Gate score", value: totals.passRate },
      { label: "Executed", value: String(totals.total) },
      { label: "Passed", value: String(totals.passed) },
      { label: "Failed", value: String(totals.failed) }
    ];
    const cardWidth = 128;
    const cardY = HEIGHT - 168;
    cards.forEach((card, index) => {
      const x = 56 + index * (cardWidth + 14);
      doc.save();
      doc.roundedRect(x, cardY, cardWidth, 74, 9).fill(cover.cardBg);
      doc.roundedRect(x, cardY, cardWidth, 74, 9).lineWidth(0.8).stroke(cover.cardLine);
      doc.restore();
      doc.fillColor(cover.cardLabel).font(FONT.bold).fontSize(7.5)
        .text(card.label.toUpperCase(), x + 14, cardY + 14, { width: cardWidth - 24, lineBreak: false });
      doc.fillColor(cover.ink).font(FONT.bold).fontSize(24)
        .text(card.value, x + 13, cardY + 30, { width: cardWidth - 24, lineBreak: false });
    });

    doc.save().lineWidth(0.8).strokeColor(cover.divider)
      .moveTo(56, HEIGHT - 72).lineTo(WIDTH - 56, HEIGHT - 72).stroke().restore();

    doc.fillColor(cover.meta).font(FONT.regular).fontSize(8.5)
      .text(`Run ID  ${safe(run.id)}`, 56, HEIGHT - 60, { width: 300, lineBreak: false })
      .text(`Generated  ${formatDateTime(new Date().toISOString())}`, 56, HEIGHT - 46, { width: 300, lineBreak: false })
      .text(`Profile  ${safe(model.meta.profile || input.channelProfile || "Auto-detected", 40)}`,
        WIDTH - 356, HEIGHT - 60, { width: 300, align: "right", lineBreak: false })
      .text(`Theme  ${safe(C.label)}`, WIDTH - 356, HEIGHT - 46, { width: 300, align: "right", lineBreak: false });
  }

  /* ------------------------------------------------------------ sections */

  function renderExecutiveSummary(doc, model) {
    const { totals, summary, manager, delivery, gate } = model;
    const gateTone = C.verdictTone(model.verdict);

    sectionTitle(doc, "Executive Summary", "Release readiness at a glance");

    // Attributed, because an agent headline can read as if it contradicts the
    // gate: the Delivery agent calls a run with nothing executed "all passed".
    const deliveryHeadline = delivery && delivery.forStakeholder && delivery.forStakeholder.headline;
    const agentHeadline = deliveryHeadline
      ? `Delivery agent: ${safe(deliveryHeadline, 200)}`
      : (manager.signOff && manager.signOff.recommendation)
        ? `Manager agent: ${safe(manager.signOff.recommendation, 200)}`
        : `Pipeline finished with ${totals.passed} of ${totals.total} checks passing.`;

    calloutBox(doc, {
      title: `Release gate: ${model.verdict}  \u00B7  Score ${gate.scoreLabel}  \u00B7  Risk level: ${model.riskLevel}`,
      body: gate.directive,
      tone: gateTone,
      lines: [
        gate.score === null
          ? "Scored on passed / executed checks: nothing was executed, so no score could be awarded."
          : `Scored on passed / executed checks: ${totals.passed} of ${totals.passed + totals.failed} passed.`,
        GATE_SCALE,
        agentHeadline
      ]
    });

    statCardRow(doc, [
      { label: "Gate decision", value: safe(model.verdict, 20), accent: gateTone.fg, hint: `Score ${gate.scoreLabel}` },
      { label: "Gate score", value: totals.passRate, accent: gateTone.fg, hint: "Passed / executed" },
      { label: "Total checks", value: String(totals.total), accent: C.neutral, hint: "Automation checks run" },
      { label: "Passed", value: String(totals.passed), accent: C.pass },
      { label: "Failed", value: String(totals.failed), accent: totals.failed ? C.fail : C.neutral },
      { label: "Skipped", value: String(totals.skipped), accent: totals.skipped ? C.skip : C.neutral },
      { label: "Run duration", value: formatDuration(model.wallClockMs), accent: C.info, hint: "Queued to delivered" }
    ], { height: 70 });

    const chartTop = doc.y;
    ensureSpace(doc, 150);

    donutChart(doc, CONTENT_LEFT + 72, chartTop + 66, 56, [
      { value: totals.passed, color: C.pass },
      { value: totals.failed, color: C.fail },
      { value: totals.skipped, color: C.skip }
    ], { value: gate.scoreLabel, label: "gate score" });

    legend(doc, CONTENT_LEFT + 150, chartTop + 34, [
      { label: `Passed - ${totals.passed}`, color: C.pass },
      { label: `Failed - ${totals.failed}`, color: C.fail },
      { label: `Skipped - ${totals.skipped}`, color: C.skip }
    ]);

    const infoX = CONTENT_LEFT + 300;
    const infoWidth = CONTENT_RIGHT - infoX;
    const facts = [
      ["Target", safe(model.input.ottUrl, 70) || "-"],
      ["Domain", safe(summary.domain || model.meta.websiteType || "Not classified", 50)],
      ["Sub-domain", safe(summary.subDomain || model.meta.subDomain || "Not classified", 50)],
      ["Execution mode", safe(model.exec.metadata && model.exec.metadata.mode, 40) || safe(model.input.executionMode, 40) || "-"],
      ["Manager agent verdict", model.managerVerdict],
      ["Manual cases planned", String(model.manualCases.length)],
      ["Evidence captured", `${model.tests.filter((test) => test.screenshot).length} screenshots`]
    ];
    facts.forEach((fact, index) => {
      const y = chartTop + 20 + index * 16;
      doc.fillColor(C.faint).font(FONT.bold).fontSize(7.5)
        .text(fact[0].toUpperCase(), infoX, y + 2, { width: 120, lineBreak: false });
      doc.fillColor(C.ink).font(FONT.regular).fontSize(9)
        .text(fact[1], infoX + 124, y, { width: infoWidth - 124, lineBreak: false });
    });

    doc.y = chartTop + 148;
    doc.x = CONTENT_LEFT;

    const coverage = manager.coverageByFeature || {};
    const features = Object.keys(coverage).slice(0, 8);
    if (features.length) {
      subTitle(doc, "Coverage by feature");
      features.forEach((feature) => {
        const bucket = coverage[feature] || {};
        ensureSpace(doc, 24);
        const y = doc.y;
        doc.fillColor(C.body).font(FONT.regular).fontSize(8.5)
          .text(safe(feature, 42), CONTENT_LEFT, y + 2, { width: 190, lineBreak: false });
        stackedBar(doc, CONTENT_LEFT + 200, y + 3, CONTENT_WIDTH - 300, 9, [
          { value: bucket.passed || 0, color: C.pass },
          { value: bucket.failed || 0, color: C.fail },
          { value: bucket.skipped || 0, color: C.skip }
        ]);
        doc.fillColor(C.muted).font(FONT.regular).fontSize(8)
          .text(`${bucket.passed || 0}P / ${bucket.failed || 0}F / ${bucket.skipped || 0}S`,
            CONTENT_RIGHT - 92, y + 2, { width: 92, align: "right", lineBreak: false });
        doc.y = y + 18;
      });
      doc.y += 4;
    }
  }

  function renderRunConfiguration(doc, model) {
    const { run, input, meta } = model;

    doc.addPage();
    sectionTitle(doc, "Run Configuration & Pipeline", "Inputs supplied by the operator and how each agent performed");

    keyValueGrid(doc, [
      { label: "Target URL", value: input.ottUrl, bold: true },
      { label: "Host", value: hostOf(input.ottUrl) },
      { label: "Channel profile", value: meta.profile || input.channelProfile || "Auto-detected" },
      { label: "Execution mode", value: input.executionMode },
      { label: "Test case input", value: input.testCaseInputMode },
      { label: "Uploaded test file", value: input.tcFileName || "None" },
      { label: "Figma reference", value: input.figmaUrl || "None" },
      { label: "Login used", value: input.login && input.login.enabled ? `Yes (${safe(input.login.usernameMasked, 30)})` : "No" },
      { label: "Headed browser", value: input.runHeaded ? "Yes" : "No" },
      { label: "Optional gates", value: [
        input.enableAccessibility ? "Accessibility" : null,
        input.enablePerformance ? "Performance" : null,
        input.enableSecurity ? "Security" : null
      ].filter(Boolean).join(", ") || "None" },
      { label: "Run status", value: run.status },
      { label: "BA source mode", value: meta.sourceMode || meta.source }
    ], { columns: 4 });

    doc.y += 6;
    subTitle(doc, "Pipeline timeline");

    const stages = run.stages || {};
    const rows = Object.keys(stages).map((key) => {
      const stage = stages[key] || {};
      const duration = stageDuration(stage);
      return {
        stage: stage.label || key,
        status: stage.status || "pending",
        started: formatDateTime(stage.startedAt) || "-",
        finished: formatDateTime(stage.finishedAt) || "-",
        duration: duration === null ? "-" : formatDuration(duration)
      };
    });

    drawTable(doc, {
      columns: columns([
        { key: "stage", label: "Agent / stage", fraction: 0.26, bold: true, color: () => C.ink },
        { key: "status", label: "Status", fraction: 0.12, pill: true, align: "center" },
        { key: "started", label: "Started", fraction: 0.21 },
        { key: "finished", label: "Finished", fraction: 0.21 },
        { key: "duration", label: "Duration", fraction: 0.20, align: "right" }
      ]),
      rows,
      emptyText: "No stage timing recorded for this run."
    });

    const llmStamps = [
      ["BA", model.meta.llm],
      ["Manual QA", model.manualMeta.llm],
      ["Automation QA", model.automation && model.automation.metadata && model.automation.metadata.llm],
      ["Manager", model.manager.metadata && model.manager.metadata.llm]
    ].filter((entry) => entry[1] && entry[1].used);

    if (llmStamps.length) {
      subTitle(doc, "LLM assistance");
      bulletList(doc, llmStamps.map(([agent, llm]) => (
        `${agent}: ${safe(llm.provider)} / ${safe(llm.model)}${llm.costUsd ? ` - est. $${Number(llm.costUsd).toFixed(4)}` : ""}`
      )));
    }
  }

  function renderRequirements(doc, model) {
    const { requirements, meta } = model;
    const statements = requirements.requirementStatements || [];
    const modules = requirements.modules || [];
    const journeys = requirements.userJourneys || [];
    const risks = requirements.risks || [];
    const assumptions = requirements.assumptions || [];

    if (!statements.length && !modules.length && !journeys.length) return;

    doc.addPage();
    sectionTitle(doc, "Requirements & Scope", `Consolidated by the BA agent from ${safe(meta.source || "available inputs", 60)}`);

    if (requirements.llmSummary) {
      calloutBox(doc, { title: "BA summary", body: requirements.llmSummary, tone: { fg: C.info, bg: C.infoBg } });
    }

    if (modules.length) {
      subTitle(doc, `Modules in scope (${modules.length})`);
      paragraph(doc, modules.slice(0, 24).map((module) => safe(module)).join("  -  "), { size: 9 });
    }

    if (statements.length) {
      subTitle(doc, `Requirement statements (${statements.length})`);
      bulletList(doc, statements, { limit: 18 });
    }

    if (journeys.length) {
      subTitle(doc, `Critical user journeys (${journeys.length})`);
      bulletList(doc, journeys, { limit: 12, dotColor: C.info });
    }

    if (assumptions.length) {
      subTitle(doc, "Assumptions");
      bulletList(doc, assumptions, { limit: 8, dotColor: C.faint, color: C.muted });
    }

    if (risks.length) {
      subTitle(doc, "Risks flagged");
      bulletList(doc, risks, { limit: 10, dotColor: C.fail });
    }
  }

  function renderSiteUnderstanding(doc, model) {
    const analysis = model.webAnalysis;
    if (!analysis) return;

    const insights = analysis.baInsights || {};
    const overview = analysis.siteOverview || {};

    doc.addPage();
    sectionTitle(doc, "Site Understanding", "What the Web Analyzer discovered by crawling the target");

    if (analysis.analysisFailed || analysis.error) {
      calloutBox(doc, {
        title: "Crawl did not complete",
        body: analysis.error || "The analyzer could not gather evidence from the target site.",
        tone: { fg: C.fail, bg: C.failBg }
      });
    }

    statCardRow(doc, [
      { label: "Pages crawled", value: String(analysis.pagesCrawled || 0), accent: C.brand },
      { label: "Features found", value: String((analysis.features || []).length), accent: C.info },
      { label: "Forms", value: String((analysis.forms || []).length), accent: C.info },
      { label: "User flows", value: String((analysis.userFlows || []).length), accent: C.brand },
      { label: "Site type", value: safe(overview.type || insights.websiteType || "Generic", 18), accent: C.neutral },
      { label: "Confidence", value: `${Math.round((insights.websiteTypeConfidence || 0) * 100)}%`, accent: C.neutral }
    ], { height: 66 });

    if (insights.summary) paragraph(doc, insights.summary);

    const flows = (analysis.userFlows || []).slice(0, 10);
    if (flows.length) {
      subTitle(doc, "Discovered user flows");
      drawTable(doc, {
        columns: columns([
          { key: "name", label: "Flow", fraction: 0.3, bold: true, color: () => C.ink },
          { key: "priority", label: "Priority", fraction: 0.12, pill: true, pillKind: "priority", align: "center" },
          { key: "steps", label: "Steps", fraction: 0.08, align: "center" },
          { key: "description", label: "Description", fraction: 0.5 }
        ]),
        rows: flows.map((flow) => ({
          name: safe(flow.name, 60),
          priority: safe(flow.priority || "Medium"),
          steps: String((flow.steps || []).length),
          description: safe(flow.description || (flow.steps || []).map((step) => step.description || step.action).filter(Boolean).join(" -> "), 220)
        }))
      });
    }

    const areas = (analysis.suggestedTestAreas || []).slice(0, 8);
    if (areas.length) {
      subTitle(doc, "Suggested test areas");
      bulletList(doc, areas.map((area) => (
        `${safe(area.area)} (${safe(area.priority || "Medium")}): ${(area.tests || []).slice(0, 4).map((test) => safe(test)).join("; ")}`
      )));
    }

    if ((insights.riskAreas || []).length) {
      subTitle(doc, "Risk areas");
      bulletList(doc, insights.riskAreas, { limit: 8, dotColor: C.fail });
    }
  }

  function renderManualCoverage(doc, model) {
    const cases = model.manualCases;
    if (!cases.length) return;

    doc.addPage();
    sectionTitle(doc, "Manual Test Coverage", `${cases.length} cases authored by the Manual QA agent (${safe(model.manualMeta.source || "template", 40)})`);

    const byPriority = cases.reduce((acc, testCase) => {
      const key = safe(testCase.priority || "Unspecified");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const priorityCards = Object.keys(byPriority).slice(0, 6).map((key) => ({
      label: `${key} priority`,
      value: String(byPriority[key]),
      accent: C.toneFor(key, "priority").fg
    }));
    if (priorityCards.length) statCardRow(doc, priorityCards, { height: 60 });

    drawTable(doc, {
      columns: columns([
        { key: "id", label: "Case ID", fraction: 0.11, bold: true, color: () => C.ink },
        { key: "module", label: "Module", fraction: 0.15 },
        { key: "priority", label: "Priority", fraction: 0.09, pill: true, pillKind: "priority", align: "center" },
        { key: "type", label: "Type", fraction: 0.08 },
        { key: "scenario", label: "Scenario", fraction: 0.27 },
        { key: "expected", label: "Expected result", fraction: 0.30 }
      ]),
      rows: cases.slice(0, MAX_MANUAL_ROWS).map((testCase) => ({
        id: safe(testCase.id, 24),
        module: safe(testCase.module, 40),
        priority: safe(testCase.priority || "Medium"),
        type: safe(testCase.type, 16),
        scenario: safe(testCase.scenario || testCase.title, 160),
        expected: safe(testCase.expectedResult, 180)
      }))
    });

    if (cases.length > MAX_MANUAL_ROWS) {
      paragraph(doc, `${cases.length - MAX_MANUAL_ROWS} additional manual cases are available in the JSON export.`, {
        color: C.faint, size: 8.5
      });
    }
  }

  function renderExecutionResults(doc, model) {
    const { orderedTests, exec, totals } = model;

    doc.addPage();
    sectionTitle(doc, "Execution Results", "Definitive pass/fail outcome for every automated check");

    if (exec.infraError) {
      calloutBox(doc, {
        title: "Execution infrastructure error",
        body: exec.infraError,
        tone: { fg: C.fail, bg: C.failBg }
      });
    }
    if (exec.note) {
      calloutBox(doc, { title: "Execution note", body: exec.note, tone: { fg: C.skip, bg: C.skipBg } });
    }

    const totalDuration = orderedTests.reduce((sum, test) => sum + (Number(test.durationMs) || 0), 0);
    const slowest = orderedTests.reduce((worst, test) => (
      (Number(test.durationMs) || 0) > (Number(worst && worst.durationMs) || 0) ? test : worst
    ), null);

    statCardRow(doc, [
      { label: "Checks executed", value: String(totals.total), accent: C.brand },
      { label: "Gate score", value: totals.passRate, accent: C.verdictTone(model.verdict).fg, hint: safe(model.verdict, 20) },
      { label: "Total test time", value: formatDuration(totalDuration), accent: C.info },
      { label: "Retries used", value: String(orderedTests.reduce((sum, test) => sum + (Number(test.retries) || 0), 0)), accent: C.neutral },
      { label: "Slowest check", value: slowest ? formatDuration(slowest.durationMs) : "-", accent: C.neutral, hint: slowest ? safe(slowest.id, 20) : "" }
    ], { height: 64 });

    drawTable(doc, {
      columns: columns([
        { key: "id", label: "Check ID", fraction: 0.12, bold: true, color: () => C.ink },
        { key: "title", label: "Title", fraction: 0.32 },
        { key: "source", label: "Flow / source case", fraction: 0.14 },
        { key: "status", label: "Status", fraction: 0.10, pill: true, align: "center" },
        { key: "duration", label: "Duration", fraction: 0.10, align: "right" },
        { key: "retries", label: "Retries", fraction: 0.07, align: "center" },
        { key: "evidence", label: "Evidence", fraction: 0.15 }
      ]),
      rows: orderedTests.slice(0, MAX_EXECUTION_ROWS).map((test) => ({
        id: safe(test.id || "-", 26),
        title: safe(test.title || "Untitled check", 150),
        source: safe(test.flowName || test.sourceCaseId || "-", 40),
        status: safe(test.status || "unknown"),
        duration: formatDuration(test.durationMs),
        retries: String(test.retries || 0),
        evidence: test.screenshot ? safe(path.basename(String(test.screenshot)), 34) : "-"
      })),
      emptyText: "No automated checks were executed for this run."
    });

    if (orderedTests.length > MAX_EXECUTION_ROWS) {
      paragraph(doc, `${orderedTests.length - MAX_EXECUTION_ROWS} further checks omitted. Use the JSON export for the full list.`, {
        color: C.faint, size: 8.5
      });
    }

    const locators = (exec.locatorAnalysis || []).filter((entry) => entry.status !== "mapped").slice(0, 12);
    if (locators.length) {
      subTitle(doc, "Locator resolution problems");
      drawTable(doc, {
        columns: columns([
          { key: "key", label: "Element key", fraction: 0.24, bold: true, color: () => C.ink },
          { key: "status", label: "Status", fraction: 0.14, pill: true, align: "center" },
          { key: "tested", label: "Candidates tried", fraction: 0.62 }
        ]),
        rows: locators.map((entry) => ({
          key: safe(entry.key, 60),
          status: safe(entry.status),
          tested: safe((entry.testedCandidates || []).join("  |  "), 220)
        }))
      });
    }
  }

  function renderFailureAnalysis(doc, model) {
    const { failedTests, manager } = model;
    const rootCauses = collectRootCauses(manager);
    const highImpact = (manager.analysis && manager.analysis.highImpactFailures) || [];
    const skippedReasons = (manager.analysis && manager.analysis.skippedReasons) || [];

    if (!failedTests.length && !rootCauses.length && !skippedReasons.length) return;

    doc.addPage();
    sectionTitle(doc, "Failure Analysis", "Root causes and per-check diagnostics for triage");

    if (rootCauses.length) {
      subTitle(doc, "Root causes");
      bulletList(doc, rootCauses, { limit: 10, dotColor: C.fail });
    }

    if (highImpact.length) {
      subTitle(doc, "High impact failures");
      drawTable(doc, {
        columns: columns([
          { key: "id", label: "Check", fraction: 0.14, bold: true, color: () => C.ink },
          { key: "title", label: "Title", fraction: 0.36 },
          { key: "reason", label: "Reason", fraction: 0.50 }
        ]),
        rows: highImpact.slice(0, 12).map((entry) => ({
          id: safe(entry.id, 26),
          title: safe(entry.title, 140),
          reason: safe(entry.reason, 220)
        }))
      });
    }

    if (failedTests.length) {
      subTitle(doc, `Failure detail (${Math.min(failedTests.length, MAX_FAILURE_CARDS)} of ${failedTests.length})`);
      failedTests.slice(0, MAX_FAILURE_CARDS).forEach((test) => {
        const failedSteps = (test.steps || []).filter((step) => step.status === "failed");
        calloutBox(doc, {
          title: `${safe(test.id, 30)} - ${safe(test.title, 110)}`,
          body: safe(test.error || "No error message captured.", 700),
          tone: { fg: C.fail, bg: C.failBg },
          lines: [
            failedSteps.length ? `Failed step: ${safe(failedSteps[0].description || failedSteps[0].action, 160)}` : null,
            (test.trace || []).length ? `Trace: ${safe((test.trace || []).join(", "), 160)}` : null,
            test.screenshot ? `Evidence: ${safe(path.basename(String(test.screenshot)), 60)}` : null
          ].filter(Boolean)
        });
      });
    }

    if (skippedReasons.length) {
      subTitle(doc, "Why checks were skipped");
      bulletList(doc, skippedReasons, { limit: 10, dotColor: C.skip });
    }
  }

  function renderQualityGate(doc, report, title, cards) {
    if (!report) return;
    const summary = report.summary || {};

    // Keep the heading, score cards and the first issue rows on one page.
    ensureSpace(doc, 170);
    subTitle(doc, title);

    statCardRow(doc, cards(summary), { height: 58 });

    const issues = report.issues || report.vulnerabilities || [];
    if (issues.length) {
      drawTable(doc, {
        columns: columns([
          { key: "type", label: "Severity", fraction: 0.13, pill: true, align: "center" },
          { key: "name", label: "Issue", fraction: 0.32, bold: true, color: () => C.ink },
          { key: "detail", label: "Detail", fraction: 0.55 }
        ]),
        rows: issues.slice(0, 12).map((issue) => {
          const name = safe(issue.name || issue.category || issue.message, 120);
          const detail = safe(issue.description || issue.details || issue.message, 240);
          return {
            type: safe(issue.type || issue.severity || "info"),
            name,
            detail: detail === name ? "-" : detail
          };
        })
      });
    }

    if ((report.recommendations || []).length) {
      bulletList(doc, report.recommendations, { limit: 6, dotColor: C.info });
      doc.y += 4;
    }
  }

  function renderQualityGates(doc, model) {
    const { accessibility, performance, security } = model;
    if (!accessibility && !performance && !security) return;

    doc.addPage();
    sectionTitle(doc, "Quality Gates", "Accessibility, performance and security passes over the target");

    renderQualityGate(doc, accessibility, "Accessibility", (summary) => [
      { label: "Score", value: String(summary.score ?? "-"), accent: C.brand },
      { label: "Verdict", value: safe(summary.verdict || "-", 18), accent: C.toneFor(summary.verdict).fg },
      { label: "Checks run", value: String(summary.checksRun ?? "-"), accent: C.neutral },
      { label: "Errors", value: String(summary.errors ?? 0), accent: summary.errors ? C.fail : C.pass },
      { label: "Warnings", value: String(summary.warnings ?? 0), accent: C.skip }
    ]);

    renderQualityGate(doc, performance, "Performance", (summary) => [
      { label: "Score", value: String(summary.score ?? "-"), accent: C.brand },
      { label: "Verdict", value: safe(summary.verdict || "-", 18), accent: C.toneFor(summary.verdict).fg },
      { label: "Load time", value: safe(summary.loadTime ?? "-", 14), accent: C.info },
      { label: "Resources", value: String(summary.resourceCount ?? "-"), accent: C.neutral },
      { label: "Total size", value: safe(summary.totalSize ?? "-", 14), accent: C.neutral }
    ]);

    renderQualityGate(doc, security, "Security", (summary) => [
      { label: "Score", value: String(summary.score ?? "-"), accent: C.brand },
      { label: "Verdict", value: safe(summary.verdict || "-", 18), accent: C.toneFor(summary.verdict).fg },
      { label: "Checks run", value: String(summary.checksRun ?? "-"), accent: C.neutral },
      { label: "Failed", value: String(summary.failed ?? 0), accent: summary.failed ? C.fail : C.pass },
      { label: "Warnings", value: String(summary.warnings ?? 0), accent: C.skip }
    ]);
  }

  function renderManagerReview(doc, model) {
    const { manager, delivery, summary } = model;
    const signOff = manager.signOff || {};
    const actions = (manager.actionPlan || []).map((action) => safe(action)).filter(Boolean);
    const matrix = manager.traceabilityMatrix || [];

    doc.addPage();
    sectionTitle(doc, "Manager Review & Action Plan",
      manager.metadata && manager.metadata.generatedAt
        ? `${safe(manager.metadata.reviewLevel || "Executive", 30)} sign-off recorded ${formatDateTime(manager.metadata.generatedAt)}`
        : "Executive sign-off from the Manager and Delivery agents");

    if (!actions.length && !matrix.length && !signOff.recommendation && !manager.analysis) {
      calloutBox(doc, {
        title: "Manager review not available",
        body: "The Manager agent did not record a review for this run, so there is no sign-off or action plan to report. Execution results above remain the authoritative outcome.",
        tone: { fg: C.neutral, bg: C.neutralBg }
      });
      return;
    }

    const executed = Number(summary.executed ?? model.totals.total) || 0;
    const passed = Number(summary.passed ?? model.totals.passed) || 0;
    const failed = Number(summary.failed ?? model.totals.failed) || 0;
    const skipped = Number(summary.skipped ?? model.totals.skipped) || 0;

    calloutBox(doc, {
      title: `Release gate: ${model.verdict}  \u00B7  Score ${model.gate.scoreLabel}  \u00B7  Risk level: ${model.riskLevel}`,
      body: model.gate.directive,
      tone: C.verdictTone(model.verdict),
      lines: [
        `Basis: ${executed} checks executed - ${passed} passed, ${failed} failed, ${skipped} skipped (${model.totals.passRate} gate score).`,
        failed
          ? `${failed} failing check${failed === 1 ? "" : "s"} remain open and must be triaged before the gate score can improve.`
          : "No failing checks were open at sign-off.",
        `Manager agent recorded "${model.managerVerdict}": ${signOff.recommendation || "no recommendation recorded."}`
      ]
    });

    statCardRow(doc, [
      { label: "Release gate", value: safe(model.verdict, 20), accent: C.verdictTone(model.verdict).fg, hint: `Score ${model.gate.scoreLabel}` },
      { label: "Risk level", value: safe(model.riskLevel, 20), accent: C.toneFor(model.riskLevel).fg },
      { label: "Open failures", value: String(failed), accent: failed ? C.fail : C.pass, hint: "Awaiting triage" },
      { label: "Unverified", value: String(skipped), accent: skipped ? C.skip : C.neutral, hint: "Skipped checks" },
      { label: "Actions queued", value: String(actions.length), accent: C.brand, hint: "In the plan below" },
      { label: "Checks traced", value: String(matrix.length), accent: C.info, hint: "Mapped to source cases" }
    ], { height: 66 });

    if (manager.analysis && manager.analysis.llmNarrative) {
      subTitle(doc, "Analyst narrative");
      paragraph(doc, manager.analysis.llmNarrative);
    }

    const gates = gatePosture(manager);
    if (gates.length) {
      ensureSpace(doc, 72);
      subTitle(doc, "Quality gate posture at sign-off");
      keyValueGrid(doc, gates, { columns: 3 });
    }

    // `signOff.nextSteps` is a slice of `actionPlan`, so the two are merged into
    // one prioritised table instead of printing the same lines twice.
    const plannedActions = new Set(actions.map(actionKey));
    const topActions = new Set((signOff.nextSteps || []).map(actionKey).filter(Boolean));

    if (actions.length) {
      // Headings are placed with their table, otherwise drawTable's own page
      // break can strand the heading at the foot of the previous page.
      ensureSpace(doc, 110);
      subTitle(doc, `Action plan (${actions.length}) - in the order prioritised by the Manager agent`);
      drawTable(doc, {
        columns: columns([
          { key: "rank", label: "#", fraction: 0.05, bold: true, align: "center", color: () => C.faint },
          { key: "priority", label: "Priority", fraction: 0.13, pill: true, pillKind: "priority", align: "center" },
          { key: "action", label: "Recommended action", fraction: 0.82 }
        ]),
        rows: actions.slice(0, MAX_ACTION_ROWS).map((action, index) => ({
          rank: String(index + 1),
          priority: actionPriority(action, topActions),
          action: safe(action, 300)
        }))
      });
      if (actions.length > MAX_ACTION_ROWS) {
        paragraph(doc, `${actions.length - MAX_ACTION_ROWS} further actions are available in the JSON export.`, {
          color: C.faint, size: 8.5
        });
      }
    }

    const extraSteps = (signOff.nextSteps || [])
      .map((step) => safe(step))
      .filter((step) => step && !plannedActions.has(actionKey(step)));
    if (extraSteps.length) {
      ensureSpace(doc, 70);
      subTitle(doc, "Additional next steps");
      bulletList(doc, extraSteps, { limit: 8, dotColor: C.info });
    }

    if (delivery && delivery.forStakeholder) {
      const stakeholder = delivery.forStakeholder;
      ensureSpace(doc, 100);
      subTitle(doc, "Stakeholder delivery summary");
      calloutBox(doc, {
        title: safe(stakeholder.headline, 160) || "Delivery summary",
        body: stakeholder.recommendation,
        tone: { fg: C.info, bg: C.infoBg },
        lines: (stakeholder.nextSteps || [])
          .map((step) => safe(step))
          .filter((step) => step && !plannedActions.has(actionKey(step)))
          .slice(0, 4)
      });
    }

    if (matrix.length) {
      // Failures first, then skipped: the rows a reviewer acts on lead the table.
      const rank = (entry) => (entry.status === "failed" ? 0 : entry.status === "skipped" ? 1 : 2);
      const traced = [...matrix].sort((a, b) => rank(a) - rank(b));

      ensureSpace(doc, 110);
      subTitle(doc, `Traceability matrix (${matrix.length} checks mapped to source cases)`);
      drawTable(doc, {
        columns: columns([
          { key: "id", label: "Requirement / case", fraction: 0.18, bold: true, color: () => C.ink },
          { key: "title", label: "Title", fraction: 0.42 },
          { key: "status", label: "Status", fraction: 0.12, pill: true, align: "center" },
          { key: "error", label: "Notes", fraction: 0.28 }
        ]),
        rows: traced.slice(0, MAX_TRACE_ROWS).map((entry) => ({
          id: safe(entry.id, 30),
          title: safe(entry.title, 160),
          status: safe(entry.status || "unknown"),
          error: safe(entry.error, 150) || "-"
        }))
      });
      if (matrix.length > MAX_TRACE_ROWS) {
        paragraph(doc, `${matrix.length - MAX_TRACE_ROWS} further traced checks omitted. Use the JSON export for the full matrix.`, {
          color: C.faint, size: 8.5
        });
      }
    }
  }

  async function renderEvidence(doc, model, resolveScreenshot) {
    const { run, orderedTests } = model;

    const entries = [];
    for (const test of orderedTests) {
      if (entries.length >= MAX_SCREENSHOTS) break;
      const evidence = await resolveEvidence(run, test.screenshot, resolveScreenshot);
      if (evidence) entries.push({ test, ...evidence });
    }

    doc.addPage();
    sectionTitle(doc, "Evidence Appendix", "Browser screenshots captured during execution, failures first");

    if (!entries.length) {
      calloutBox(doc, {
        title: "No screenshots available",
        body: "The executor did not capture any screenshots for this run.",
        tone: { fg: C.neutral, bg: C.neutralBg }
      });
      return;
    }

    paragraph(doc, `${entries.length} screenshot${entries.length === 1 ? "" : "s"} attached, one per page below.`, {
      color: C.muted, size: 9
    });

    drawTable(doc, {
      columns: columns([
        { key: "id", label: "Check ID", fraction: 0.14, bold: true, color: () => C.ink },
        { key: "title", label: "Title", fraction: 0.42 },
        { key: "status", label: "Status", fraction: 0.10, pill: true, align: "center" },
        { key: "file", label: "Screenshot file", fraction: 0.34 }
      ]),
      rows: entries.map(({ test, name }) => ({
        id: safe(test.id, 26),
        title: safe(test.title, 150),
        status: safe(test.status || "unknown"),
        file: safe(name, 70)
      }))
    });

    for (const { test, source, name } of entries) {
      doc.addPage();

      const headerY = doc.y;
      doc.save().roundedRect(CONTENT_LEFT, headerY, CONTENT_WIDTH, 30, 6).fill(C.surface).restore();
      doc.fillColor(C.ink).font(FONT.bold).fontSize(10.5)
        .text(safe(`${test.id || "Check"} - ${test.title || "Untitled"}`, 110), CONTENT_LEFT + 12, headerY + 9, {
          width: CONTENT_WIDTH - 150, lineBreak: false
        });
      pill(doc, CONTENT_RIGHT - 88, headerY + 8, safe(test.status || "unknown"), C.toneFor(test.status), {
        size: 8, width: 76
      });
      doc.y = headerY + 38;

      const availableHeight = CONTENT_BOTTOM - doc.y - 16;
      try {
        const image = doc.openImage(source);
        const scale = Math.min(CONTENT_WIDTH / image.width, availableHeight / image.height, 1);
        const drawWidth = image.width * scale;
        const drawHeight = image.height * scale;
        const x = CONTENT_LEFT + (CONTENT_WIDTH - drawWidth) / 2;
        const y = doc.y;

        doc.save().lineWidth(0.75).strokeColor(C.line)
          .rect(x - 2, y - 2, drawWidth + 4, drawHeight + 4).stroke().restore();
        doc.image(image, x, y, { width: drawWidth, height: drawHeight });

        doc.fillColor(C.faint).font(FONT.regular).fontSize(8)
          .text(safe(name), CONTENT_LEFT, y + drawHeight + 6, {
            width: CONTENT_WIDTH, align: "center", lineBreak: false
          });
      } catch {
        doc.fillColor(C.fail).font(FONT.regular).fontSize(9)
          .text("This screenshot could not be embedded in the PDF.", CONTENT_LEFT, doc.y, { width: CONTENT_WIDTH });
      }
    }
  }

  /* ----------------------------------------------------- page furniture */

  function decoratePage(doc, model, pageNumber, pageCount) {
    doc.save();
    doc.rect(0, 0, WIDTH, 30).fill(C.page);
    doc.rect(0, 30, WIDTH, 0.75).fill(C.line);
    doc.restore();

    const markWidth = logo.mark(doc, CONTENT_LEFT, 8, 16);

    doc.fillColor(C.ink).font(FONT.bold).fontSize(9)
      .text("ZER0 QA Execution Report", CONTENT_LEFT + markWidth + 8, 14, { width: 260, lineBreak: false });
    doc.fillColor(C.faint).font(FONT.regular).fontSize(8)
      .text(safe(hostOf(model.input.ottUrl), 60), CONTENT_RIGHT - 300, 15, {
        width: 300, align: "right", lineBreak: false
      });

    doc.save().lineWidth(0.75).strokeColor(C.line)
      .moveTo(CONTENT_LEFT, HEIGHT - 34).lineTo(CONTENT_RIGHT, HEIGHT - 34).stroke().restore();
    doc.fillColor(C.faint).font(FONT.regular).fontSize(7.5)
      .text(`Run ${safe(model.run.id)}`, CONTENT_LEFT, HEIGHT - 26, { width: 300, lineBreak: false });
    doc.fillColor(C.muted).font(FONT.bold).fontSize(7.5)
      .text(`Page ${pageNumber} of ${pageCount}`, CONTENT_RIGHT - 200, HEIGHT - 26, {
        width: 200, align: "right", lineBreak: false
      });
  }

  function decoratePages(doc, model) {
    const range = doc.bufferedPageRange();
    const total = range.count;

    for (let index = range.start; index < range.start + total; index += 1) {
      doc.switchToPage(index);
      if (index === range.start) continue;
      // The cover is page 0 and carries no furniture, so numbering starts after it.
      withoutMargins(doc, () => decoratePage(doc, model, index - range.start, total - 1));
    }
  }

  return { renderCover, renderExecutiveSummary, renderRunConfiguration, renderRequirements,
    renderSiteUnderstanding, renderManualCoverage, renderExecutionResults, renderFailureAnalysis,
    renderQualityGates, renderManagerReview, renderEvidence, decoratePages };
}

/**
 * Locates one screenshot for embedding. Local artifacts win; otherwise the
 * caller's resolver pulls the bytes from the object store, which is the only
 * copy once the executor runs on another host.
 */
async function resolveEvidence(run, ref, resolveScreenshot) {
  if (!ref || typeof ref !== "string") return null;
  const name = path.basename(ref);

  if (run.runDir) {
    const abs = path.join(run.runDir, name);
    try {
      await fs.access(abs);
      return { source: abs, name };
    } catch {
      /* fall through to the object store */
    }
  }

  if (typeof resolveScreenshot === "function") {
    const buffer = await resolveScreenshot(name);
    if (buffer && buffer.length) return { source: buffer, name };
  }

  return null;
}

/* -------------------------------------------------------------------- entry */

/**
 * Streams a themed PDF report for `run` to `res`.
 *
 * `options.theme` is an operator theme id (see @zero/brand PALETTES); unknown
 * ids fall back to the default palette. `options.paper: "light"` keeps the
 * theme's accent and logo but prints on white, for dark palettes.
 */
async function sendRunPdfReport(run, res, options = {}) {
  const model = buildModel(run);
  const C = createPalette(options.theme, { paper: options.paper });
  const kit = createDrawKit(C);
  const report = createReporter(C, kit, createLogoPainter(C.logo), createLogoPainter(C.coverLogo));

  const doc = new PDFDocument({ ...PAGE, bufferPages: true, autoFirstPage: false });

  Object.assign(doc.info, {
    Title: `ZER0 QA Execution Report - ${run.id}`,
    Author: "ZER0 AI QA Orchestrator",
    Subject: `QA execution report for ${safe(model.input.ottUrl, 120)}`,
    Keywords: "QA, automation, Playwright, ZER0"
  });

  // PDF pages default to transparent, which prints white. Dark palettes need an
  // explicit field laid down before any content reaches the page.
  if (C.inverted) {
    doc.on("pageAdded", () => {
      doc.save().rect(0, 0, WIDTH, HEIGHT).fill(C.page).restore();
    });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=zero-qa-report-${run.id}.pdf`);
  doc.pipe(res);

  // pdfkit flushes asynchronously, so resolving on `doc.end()` alone would hand
  // the caller a half-written response and swallow any write error.
  const written = new Promise((resolve, reject) => {
    doc.on("end", resolve);
    doc.on("error", reject);
  });

  doc.addPage();
  withoutMargins(doc, () => report.renderCover(doc, model));

  doc.addPage();
  report.renderExecutiveSummary(doc, model);
  report.renderRunConfiguration(doc, model);
  report.renderRequirements(doc, model);
  report.renderSiteUnderstanding(doc, model);
  report.renderManualCoverage(doc, model);
  report.renderExecutionResults(doc, model);
  report.renderFailureAnalysis(doc, model);
  report.renderQualityGates(doc, model);
  report.renderManagerReview(doc, model);
  await report.renderEvidence(doc, model, options.resolveScreenshot);

  report.decoratePages(doc, model);
  doc.end();
  await written;
}

module.exports = { sendRunPdfReport, releaseGate };
