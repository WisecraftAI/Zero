/**
 * DAG walker: consume a run id and walk stageKeys in order.
 * Chromium runs in @zero/executor on execution.requested.
 */

"use strict";

const {
  stageKeys,
  RunStoppedError,
  isRunStoppedError,
  isRunCancelRequested,
  markRunStopped,
} = require("@zero/domain");
const {
  shouldRunDomainInference,
  buildDomainInferenceContext,
  applyClassificationToArtifact,
} = require("./inferDomain");

function createProcessRun(deps) {
  async function processRun(id, request = {}) {
    const {
      getRun,
      persistRun,
      persistAssets,
      setStage,
      applyLlm,
      consolidateRequirements,
      generateCasesFromUploadedOnly,
      generateCasesFromManualInput,
      generateCasesFromUrlAnalysis,
      generateManualCases,
      generateAutomationBundle,
      hostFromUrl,
      enqueueExecution,
      generateManagerReport,
      generateDeliveryReport,
      javaSeleniumBuilder,
      dbHelpers
    } = deps;

    const cache = deps.cache;
    const run = await getRun(id);
    if (!run) return;
    if (run.status === "awaiting_uploads") return;
    if (run.status === "stopped") {
      await persistRun(run);
      return;
    }

    async function ensureNotStopped() {
      if (
        run.cancelRequested ||
        run.status === "stopped" ||
        run.status === "stopping" ||
        (await isRunCancelRequested(cache, id))
      ) {
        throw new RunStoppedError();
      }
    }

    async function save() {
      await persistRun(run);
      await ensureNotStopped();
    }

    try {
      await ensureNotStopped();
      run.status = "running";
      await save();

      if (request.rerunFailedOnly) {
        await ensureNotStopped();
        setStage(run, "execution", "running");
        run.artifacts.executionReport = await enqueueExecution(run.id, {
          kind: "execution",
          rerunFailedOnly: true
        });
        setStage(run, "execution", "done");
        await save();

        setStage(run, "manager", "running");
        run.artifacts.managerReport = await applyLlm(
          "manager",
          generateManagerReport(
            run.artifacts.requirements,
            run.artifacts.manualTestCases,
            run.artifacts.automationBundle,
            run.artifacts.executionReport,
            run.artifacts.accessibilityReport,
            run.artifacts.performanceReport,
            run.artifacts.securityReport
          ),
          run,
          {
            verdict: run.artifacts.executionReport && run.artifacts.executionReport.totals,
            ottUrl: run.input.ottUrl
          }
        );
        setStage(run, "manager", "done");

        run.artifacts.deliveryReport = generateDeliveryReport(
          run.artifacts.requirements,
          run.artifacts.managerReport,
          run.artifacts.executionReport
        );
        run.status = "completed";
        await persistRun(run);
        await persistAssets(run);
        return;
      }

      // Optional: Web Analyzer Agent (runs when no test document provided)
      if (run.stages.webAnalyzer) {
        await ensureNotStopped();
        setStage(run, "webAnalyzer", "running");
        run.artifacts.webAnalysis = await enqueueExecution(run.id, { kind: "webAnalyzer" });
        setStage(run, "webAnalyzer", "done");
        await save();
      }

      if (run.artifacts.webAnalysis?.baInsights) {
        const insights = run.artifacts.webAnalysis.baInsights;
        const websiteTypeConfidence = Number(insights.websiteTypeConfidence ?? 0);
        if (shouldRunDomainInference({ ...insights, websiteTypeConfidence })) {
          const baseInsights = { ...insights };
          run.artifacts.webAnalysis.baInsights = await applyLlm(
            "domainInference",
            baseInsights,
            run,
            buildDomainInferenceContext(run.artifacts.webAnalysis)
          );
          if (run.artifacts.webAnalysis.baInsights.metadata?.llm?.used) {
            run.artifacts.webAnalysis.metadata = {
              ...(run.artifacts.webAnalysis.metadata || {}),
              domainInference: run.artifacts.webAnalysis.baInsights.metadata.llm,
            };
          }
        }
        // Runs whether or not inference fired, so the rule-based answer also
        // reaches metadata/siteOverview and the reports built from them.
        applyClassificationToArtifact(run.artifacts.webAnalysis);
        await save();
      }

      await ensureNotStopped();
      setStage(run, "ba", "running");
      // If web analysis was run, enhance requirements with its insights
      if (run.artifacts.webAnalysis && run.artifacts.webAnalysis.baInsights) {
        run.input._webAnalysisInsights = run.artifacts.webAnalysis.baInsights;
        run.input._domainClassification = run.artifacts.webAnalysis.domainClassification || null;
        run.input._suggestedRequirements = run.artifacts.webAnalysis.suggestedRequirements;
        run.input._suggestedTestAreas = run.artifacts.webAnalysis.suggestedTestAreas;
        run.input._brdDocument = run.artifacts.webAnalysis.brdDocument;
        run.input._autoGeneratedTestCases = run.artifacts.webAnalysis.autoGeneratedTestCases;
        run.input._userFlows = run.artifacts.webAnalysis.userFlows;
        run.input._allElements = run.artifacts.webAnalysis.allElements;
        run.input._observations = run.artifacts.webAnalysis.observations;
      }
      run.artifacts.requirements = await applyLlm(
        "ba",
        consolidateRequirements(run.input),
        run,
        {
          ottUrl: run.input.ottUrl,
          profile: run.input.channelProfile,
          notes: (run.input.notes || "").slice(0, 800)
        }
      );
      run.input.tcFileBuffer = null;
      setStage(run, "ba", "done");
      await save();

      await ensureNotStopped();
      setStage(run, "manualQa", "running");
      if (run.input.executionMode === "uploaded_tc_only") {
        // CSV file was uploaded
        run.artifacts.manualTestCases = generateCasesFromUploadedOnly(run.artifacts.requirements);
      } else if (run.input.executionMode === "manual_tc_only" && run.input.manualTestCases && run.input.manualTestCases.length > 0) {
        // Manual test cases were entered in the UI
        run.artifacts.manualTestCases = generateCasesFromManualInput(run.input.manualTestCases, run.artifacts.requirements);
      } else if (
        run.artifacts.webAnalysis &&
        (
          (run.artifacts.webAnalysis.majorFunctionalCases && run.artifacts.webAnalysis.majorFunctionalCases.length > 0) ||
          (run.artifacts.webAnalysis.autoGeneratedTestCases && run.artifacts.webAnalysis.autoGeneratedTestCases.length > 0)
        )
      ) {
        // Use auto-generated test cases from URL Analyzer when no CSV/manual is provided
        run.artifacts.manualTestCases = generateCasesFromUrlAnalysis(run.artifacts.webAnalysis, run.artifacts.requirements);
      } else {
        run.artifacts.manualTestCases = generateManualCases(run.artifacts.requirements);
      }
      run.artifacts.manualTestCases = await applyLlm(
        "manualQa",
        run.artifacts.manualTestCases,
        run,
        {
          ottUrl: run.input.ottUrl,
          caseCount: (run.artifacts.manualTestCases.testCases || []).length
        }
      );
      setStage(run, "manualQa", "done");
      await save();

      await ensureNotStopped();
      setStage(run, "automationQa", "running");
      run.artifacts.automationBundle = await applyLlm(
        "automationQa",
        await generateAutomationBundle(run.input, run.artifacts.manualTestCases, run.artifacts.requirements),
        run,
        { ottUrl: run.input.ottUrl, host: hostFromUrl(run.input.ottUrl) }
      );
      setStage(run, "automationQa", "done");
      await save();

      await ensureNotStopped();
      setStage(run, "execution", "running");
      await persistRun(run);
      run.artifacts.executionReport = await enqueueExecution(run.id, { kind: "execution" });
      setStage(run, "execution", "done");
      await save();

      // Optional: Accessibility Agent
      if (run.input.enableAccessibility && run.stages.accessibility) {
        await ensureNotStopped();
        setStage(run, "accessibility", "running");
        run.artifacts.accessibilityReport = await enqueueExecution(run.id, { kind: "accessibility" });
        setStage(run, "accessibility", "done");
        await save();
      }

      // Optional: Performance Agent
      if (run.input.enablePerformance && run.stages.performance) {
        await ensureNotStopped();
        setStage(run, "performance", "running");
        run.artifacts.performanceReport = await enqueueExecution(run.id, { kind: "performance" });
        setStage(run, "performance", "done");
        await save();
      }

      // Optional: Security Agent
      if (run.input.enableSecurity && run.stages.security) {
        await ensureNotStopped();
        setStage(run, "security", "running");
        run.artifacts.securityReport = await enqueueExecution(run.id, { kind: "security" });
        setStage(run, "security", "done");
        await save();
      }

      await ensureNotStopped();
      setStage(run, "manager", "running");
      run.artifacts.managerReport = await applyLlm(
        "manager",
        generateManagerReport(
          run.artifacts.requirements,
          run.artifacts.manualTestCases,
          run.artifacts.automationBundle,
          run.artifacts.executionReport,
          run.artifacts.accessibilityReport,
          run.artifacts.performanceReport,
          run.artifacts.securityReport
        ),
        run,
        {
          verdict: run.artifacts.executionReport && run.artifacts.executionReport.totals,
          ottUrl: run.input.ottUrl
        }
      );
      setStage(run, "manager", "done");
      await save();

      setStage(run, "delivery", "running");
      run.artifacts.deliveryReport = generateDeliveryReport(
        run.artifacts.requirements,
        run.artifacts.managerReport,
        run.artifacts.executionReport
      );
      setStage(run, "delivery", "done");

      if (deps.dbEnabled && deps.dbPool && run.input.projectId && run.artifacts.manualTestCases && run.artifacts.automationBundle) {
        const selectors = run.artifacts.automationBundle?.selectorCandidates || {};
        const locatorsByKey = Object.fromEntries(Object.entries(selectors).map(([k, v]) => [k, (v || []).map((s) => ({ selectorValue: s, selectorType: "css" }))]));
        const tcs = run.artifacts.manualTestCases.testCases || [];
        for (const tc of tcs.slice(0, 50)) {
          const javaContent = javaSeleniumBuilder.buildSeleniumJavaTest(tc, locatorsByKey, run.input.ottUrl);
          await dbHelpers.insertStoredScript(deps.dbPool, { projectId: run.input.projectId, tcId: tc.id, language: "java", framework: "selenium", contentText: javaContent }).catch(() => { });
        }
      }

      run.status = "completed";
      run.updatedAt = new Date().toISOString();
      await persistRun(run);
      await persistAssets(run);
    } catch (error) {
      if (isRunStoppedError(error)) {
        markRunStopped(run, setStage, stageKeys);
        await persistRun(run);
        return;
      }
      run.status = "failed";
      run.error = error.message;
      for (const key of stageKeys) {
        if (run.stages[key] && run.stages[key].status === "running") {
          setStage(run, key, "failed");
          break;
        }
      }
      await persistRun(run);
    }
  }

  return processRun;
}

module.exports = {
  createProcessRun,
  stageKeys
};
