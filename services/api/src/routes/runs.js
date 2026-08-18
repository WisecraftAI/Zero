"use strict";

const fs = require("fs/promises");
const path = require("path");
const PDFDocument = require("pdfkit");

module.exports = function registerRunsRoutes(app, ctx) {
  app.post("/runs", ctx.upload.fields([{ name: "tcFile", maxCount: 1 }, { name: "recordingFile", maxCount: 1 }]), async (req, res) => {
    try {
      const ottUrl = String(req.body.ottUrl || "").trim();
      const figmaUrl = String(req.body.figmaUrl || "").trim();
      const assertions = String(req.body.assertions || "").trim();
      const notes = String(req.body.notes || "").trim();
      const loginUsername = String(req.body.loginUsername || "").trim();
      const loginPassword = String(req.body.loginPassword || "").trim();
      const channelProfile = String(req.body.channelProfile || "").trim().toLowerCase();
      const recordingSessionId = String(req.body.recordingSessionId || "").trim() || null;
      const recordingId = String(req.body.recordingId || "").trim() || null;
      
      // Manual test cases from UI
      const manualTestCasesRaw = String(req.body.manualTestCases || "").trim();
      const testCaseInputMode = String(req.body.testCaseInputMode || "").trim() || "auto";
      let manualTestCases = [];
      if (manualTestCasesRaw) {
        try {
          manualTestCases = JSON.parse(manualTestCasesRaw);
        } catch (_) { manualTestCases = []; }
      }

      const tcFile = req.files && req.files.tcFile ? req.files.tcFile[0] : null;
      const recordingFile = req.files && req.files.recordingFile ? req.files.recordingFile[0] : null;
      const tcExt = tcFile ? path.extname(tcFile.originalname).toLowerCase() : "";
      
      // Determine execution mode based on input
      const hasCsv = tcFile && tcExt === ".csv";
      const hasManualCases = manualTestCases.length > 0 && manualTestCases.some(tc => tc.feature || tc.scenario);
      
      let executionMode = "standard";
      if (hasCsv) {
        executionMode = "uploaded_tc_only";
      } else if (hasManualCases) {
        executionMode = "manual_tc_only";
      } else if (testCaseInputMode === "auto") {
        executionMode = "url_analysis_auto";
      }

      if (!ottUrl) return res.status(400).json({ error: "OTT URL is required" });
      
      // Allow running with just URL in auto mode (URL Analyzer will generate test cases)
      const canRunWithAutoGeneration = testCaseInputMode === "auto" || executionMode === "url_analysis_auto";
      if (!figmaUrl && !tcFile && !hasManualCases && !notes && !canRunWithAutoGeneration) {
        return res.status(400).json({ error: "Upload a CSV, enter manual test cases, or use URL Analyzer auto-generation" });
      }
      if (hasCsv) {
        // CSV is primary: run only uploaded test cases, no built-in manual TC
      }

      let recording = null;
      if (recordingSessionId) {
        const session = ctx.recordingSessions.get(recordingSessionId);
        if (session) {
          recording = { ottUrl: session.ottUrl, events: session.events, createdAt: session.createdAt, source: "session" };
          ctx.recordingSessions.delete(recordingSessionId);
        }
      }
      if (!recording && recordingId && ctx.recordingsById.has(recordingId)) {
        const rec = ctx.recordingsById.get(recordingId);
        recording = { id: rec.id, ottUrl: rec.ottUrl, events: rec.events, createdAt: rec.createdAt, source: "id" };
      }
      if (!recording && recordingFile) {
        try {
          const raw = recordingFile.buffer.toString("utf8");
          recording = JSON.parse(raw);
          recording.source = "upload";
        } catch (_) {
          // ignore invalid JSON
        }
      }

      const projectId = String(req.body.projectId || "").trim() || null;
      const runHeaded = req.body.runHeaded === "true" || req.body.runHeaded === "on" || process.env.RUN_HEADED === "true";
      const enableAccessibility = req.body.enableAccessibility === "true" || req.body.enableAccessibility === "on";
      const enablePerformance = req.body.enablePerformance === "true" || req.body.enablePerformance === "on";
      const input = {
        tenantId: (req.auth && req.auth.tenantId) || ctx.auth.LOCAL_TENANT,
        ownerEmail: ctx.auth.identityEmail(req.auth),
        ottUrl,
        figmaUrl: figmaUrl || null,
        assertions,
        notes,
        channelProfile: channelProfile || null,
        executionMode,
        testCaseInputMode,
        manualTestCases: hasManualCases ? manualTestCases : null,
        projectId,
        runHeaded,
        enableAccessibility,
        enablePerformance,
        recording,
        login: {
          enabled: Boolean(loginUsername || loginPassword),
          usernameMasked: ctx.maskLogin(loginUsername)
        },
        tcFileName: tcFile ? tcFile.originalname : null,
        tcFileContent: tcFile ? tcFile.buffer.toString("utf8") : null,
        tcFileBuffer: tcFile ? tcFile.buffer : null
      };

      const run = ctx.createRun(input);
      await fs.mkdir(run.runDir, { recursive: true });
      if (tcFile) {
        await fs.writeFile(path.join(run.runDir, tcFile.originalname), tcFile.buffer);
      }
      if (recording) {
        run.artifacts.recording = recording;
      }
      await ctx.setRunSecret(run.id, { username: loginUsername, password: loginPassword });

      const objectKeys = {};
      if (tcFile) {
        const key = ctx.cloudHttp.objectKey(run.id, "inputs", tcFile.originalname);
        await ctx.cloud.objectStore.put(key, tcFile.buffer, { contentType: tcFile.mimetype || "text/csv" });
        objectKeys.tcFile = key;
      }
      if (recording) {
        const key = ctx.cloudHttp.objectKey(run.id, "inputs", "recording.json");
        await ctx.cloud.objectStore.put(key, Buffer.from(JSON.stringify(recording)), { contentType: "application/json" });
        objectKeys.recordingFile = key;
      }
      run.input.objectKeys = objectKeys;

      const requestedUploads = parseRequestedUploads(req.body);
      const deferForPresign = requestedUploads.length > 0 && !tcFile && !recordingFile;
      if (deferForPresign) {
        run.status = "awaiting_uploads";
        const uploads = [];
        for (const field of requestedUploads) {
          const key = ctx.cloudHttp.objectKey(run.id, "inputs", field);
          objectKeys[field] = key;
          uploads.push({
            field,
            key,
            method: "PUT",
            url: await ctx.cloud.objectStore.presignPut(key, 900)
          });
        }
        run.input.objectKeys = objectKeys;
        await ctx.persistRun(run).catch(e => console.error("Initial run persistence failed:", e));
        return res.status(202).json({ runId: run.id, uploads });
      }

      await ctx.persistRun(run).catch(e => console.error("Initial run persistence failed:", e));
      await ctx.enqueueRun(run.id);
      return res.status(202).json({ runId: run.id, uploads: [] });
    } catch (err) {
      console.error("CRITICAL ENDPOINT FAILURE:", err);
      return res.status(500).json({ 
        error: err.message || "Internal runtime error starting pipeline",
        stack: process.env.NODE_ENV === "development" || process.env.VERCEL ? err.stack : undefined,
        diagnostics: {
          hasFiles: !!req.files,
          hasBody: !!req.body,
          dbEnabled: ctx.dbEnabled
        }
      });
    }
  });

  function parseRequestedUploads(body) {
    const raw = body && body.uploads;
    if (Array.isArray(raw)) return raw.map((v) => String(v).trim()).filter(Boolean);
    if (typeof raw === "string" && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
      } catch (_) {
        return raw.split(",").map((v) => v.trim()).filter(Boolean);
      }
    }
    return [];
  }

  app.post("/runs/:id/commit", async (req, res) => {
    const run = await ctx.loadRunForRequest(req, res);
    if (!run) return;
    if (run.status !== "awaiting_uploads") {
      return res.status(409).json({ error: "Run is not awaiting uploads" });
    }

    try {
      const keys = run.input.objectKeys || {};
      if (keys.tcFile) {
        const buf = await ctx.cloudHttp.readObjectBuffer(keys.tcFile);
        run.input.tcFileBuffer = buf;
        run.input.tcFileContent = buf.toString("utf8");
        run.input.tcFileName = path.basename(keys.tcFile);
        const ext = path.extname(run.input.tcFileName).toLowerCase();
        if (ext === ".csv") run.input.executionMode = "uploaded_tc_only";
        await fs.mkdir(run.runDir, { recursive: true });
        await fs.writeFile(path.join(run.runDir, run.input.tcFileName), buf);
      }
      if (keys.recordingFile) {
        const buf = await ctx.cloudHttp.readObjectBuffer(keys.recordingFile);
        try {
          run.artifacts.recording = JSON.parse(buf.toString("utf8"));
          run.input.recording = run.artifacts.recording;
        } catch (_) {
          return res.status(400).json({ error: "recordingFile in object store is not valid JSON" });
        }
      }

      run.status = "queued";
      run.updatedAt = new Date().toISOString();
      await ctx.persistRun(run);
      await ctx.enqueueRun(run.id);
      return res.status(202).json({ runId: run.id });
    } catch (err) {
      return res.status(400).json({ error: err.message || "Could not read uploaded objects" });
    }
  });

  app.get("/runs/:id/files/:name", async (req, res) => {
    const run = await ctx.loadRunForRequest(req, res);
    if (!run) return;
    const name = path.basename(req.params.name);
    const key = `runs/${run.id}/files/${name}`;
    try {
      const stream = await ctx.cloud.objectStore.get(key);
      res.setHeader("Cache-Control", "private, no-store");
      if (name.endsWith(".png")) res.setHeader("Content-Type", "image/png");
      return stream.pipe(res);
    } catch (_) {
      const abs = path.join(run.runDir, name);
      try {
        await fs.access(abs);
        return res.sendFile(abs);
      } catch {
        return res.status(404).json({ error: "File not found" });
      }
    }
  });

  app.get("/runs", async (req, res) => {
    const tenantId = (req.auth && req.auth.tenantId) || ctx.auth.LOCAL_TENANT;
    const visible = (run) => ctx.auth.canAccessRun({ tenantId }, run);
    try {
      if (ctx.dbEnabled && ctx.dbPool) {
        const rows = await ctx.dbHelpers.listRunRows(ctx.dbPool, 50, tenantId);
        return res.json({ source: "postgres", runs: rows.map(ctx.toRunShape).filter(visible) });
      }

      const files = await fs.readdir(ctx.artifactsRoot);
      const loadedRuns = [];
      for (const file of files) {
        const runPath = path.join(ctx.artifactsRoot, file, "run.json");
        try {
          const data = await fs.readFile(runPath, "utf8");
          const run = JSON.parse(data);
          if (visible(run)) loadedRuns.push(run);
        } catch (_) {
          // ignore files/folders that don't contain a valid run.json
        }
      }
      // Sort by createdAt descending
      loadedRuns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json({ source: "file", runs: loadedRuns.slice(0, 20) });
    } catch (e) {
      return res.json({
        source: "memory",
        runs: Array.from(ctx.runs.values()).filter(visible).slice(-20).reverse()
      });
    }
  });

  app.get("/runs/:id", async (req, res) => {
    const run = await ctx.loadRunForRequest(req, res);
    if (!run) return;
    return res.json(run);
  });

  app.get("/runs/:id/stream", async (req, res) => {
    const run = await ctx.loadRunForRequest(req, res);
    if (!run) return;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders && res.flushHeaders();

    const writeEvent = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    writeEvent("state", {
      runId: run.id,
      status: run.status,
      stages: run.stages,
      updatedAt: run.updatedAt
    });

    const cached = await ctx.cloud.cache.get(`state.${run.id}`);
    if (cached) writeEvent("state", cached);

    const unsubscribe = ctx.cloud.cache.subscribe(`state.${req.params.id}`, (msg) => {
      writeEvent("state", msg);
      if (msg && (msg.status === "completed" || msg.status === "failed")) {
        writeEvent("done", { runId: req.params.id, status: msg.status });
      }
    });

    const heartbeat = setInterval(() => {
      res.write(": ping\n\n");
    }, 15000);

    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  app.post("/runs/:id/rerun-failed", async (req, res) => {
    const run = await ctx.loadRunForRequest(req, res);
    if (!run) return;
    if (run.status === "running") return res.status(409).json({ error: "Run is already in progress" });

    try {
      run.status = "queued";
      if (run.stages.execution) {
        run.stages.execution.status = "pending";
        run.stages.execution.startedAt = null;
        run.stages.execution.finishedAt = null;
      }
      await ctx.persistRun(run);
      await ctx.enqueueRun(run.id, { rerunFailedOnly: true });
      return res.status(202).json({ ok: true, runId: run.id, status: "queued" });
    } catch (error) {
      run.status = "failed";
      await ctx.persistRun(run);
      return res.status(500).json({ error: error.message });
    }
  });

  function ensurePdfSpace(doc, minHeight = 80) {
    if (doc.y > doc.page.height - doc.page.margins.bottom - minHeight) {
      doc.addPage();
    }
  }

  function statusColor(status) {
    if (status === "passed") return "#118d57";
    if (status === "failed") return "#d7263d";
    return "#4d5d78";
  }

  async function screenshotPathFromRef(run, ref) {
    if (!ref || typeof ref !== "string") return null;
    const fileName = path.basename(ref);
    const abs = path.join(run.runDir, fileName);
    try {
      await fs.access(abs);
      return abs;
    } catch {
      return null;
    }
  }

  async function sendPdfReport(run, res) {
    const doc = new PDFDocument({ margin: 36, size: "A4", layout: "landscape" });
    const fileName = `run-${run.id}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    doc.pipe(res);

    const exec = run.artifacts.executionReport || { totals: {}, tests: [] };
    const manager = run.artifacts.managerReport || {};
    const manualCases = (run.artifacts.manualTestCases && run.artifacts.manualTestCases.testCases) || [];
    const tests = exec.tests || [];

    const orderedTests = [...tests].sort((a, b) => {
      if (a.status === b.status) return 0;
      if (a.status === "failed") return -1;
      if (b.status === "failed") return 1;
      return 0;
    });

    doc.fillColor("#0f172a").fontSize(24).text("ZER0 QA Report", { align: "left" });
    doc.moveDown(0.3);
    doc.fillColor("#334155").fontSize(10)
      .text(`Run ID: ${run.id}`)
      .text(`Generated: ${new Date().toISOString()}`)
      .text(`OTT URL: ${run.input.ottUrl || "N/A"}`)
      .text(`Profile: ${(run.artifacts.requirements && run.artifacts.requirements.metadata && run.artifacts.requirements.metadata.profile) || "N/A"}`);

    doc.moveDown(0.8);
    doc.fillColor("#0f172a").fontSize(14).text("Execution Summary");
    doc.moveDown(0.2);
    doc.fontSize(11).fillColor("#1e293b")
      .text(`Total Checks: ${exec.totals.total || 0}`)
      .text(`Passed: ${exec.totals.passed || 0}`)
      .text(`Failed: ${exec.totals.failed || 0}`)
      .text(`Pass Rate: ${exec.totals.passRate || "0%"}`);

    doc.moveDown(0.8);
    doc.fillColor("#0f172a").fontSize(14).text("Test Case Coverage");
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor("#1e293b")
      .text(`Manual Test Cases Planned: ${manualCases.length}`)
      .text(`Automation Checks Executed: ${tests.length}`)
      .text("Execution table below contains definitive pass/fail outcomes for all executed checks.");

    doc.moveDown(0.8);
    doc.fillColor("#0f172a").fontSize(14).text("Execution Result Table");
    doc.moveDown(0.3);

    const left = doc.page.margins.left;
    const top = doc.y;
    const widths = { id: 120, title: 330, status: 90, duration: 90, retries: 70 };

    function drawRow(y, cells, header = false) {
      const bg = header ? "#e2e8f0" : "#f8fafc";
      doc.save();
      doc.rect(left, y - 2, widths.id + widths.title + widths.status + widths.duration + widths.retries, 22).fill(bg);
      doc.restore();
      doc.fillColor("#0f172a").fontSize(9);
      doc.text(cells.id, left + 6, y + 4, { width: widths.id - 10, ellipsis: true });
      doc.text(cells.title, left + widths.id + 6, y + 4, { width: widths.title - 10, ellipsis: true });
      doc.fillColor(header ? "#0f172a" : statusColor(cells.statusRaw));
      doc.text(cells.status, left + widths.id + widths.title + 6, y + 4, { width: widths.status - 10 });
      doc.fillColor("#0f172a");
      doc.text(cells.duration, left + widths.id + widths.title + widths.status + 6, y + 4, { width: widths.duration - 10 });
      doc.text(cells.retries, left + widths.id + widths.title + widths.status + widths.duration + 6, y + 4, { width: widths.retries - 10 });
    }

    drawRow(top, {
      id: "Test ID",
      title: "Title",
      status: "Status",
      statusRaw: "header",
      duration: "Duration",
      retries: "Retries"
    }, true);

    let rowY = top + 24;
    orderedTests.forEach((t) => {
      ensurePdfSpace(doc, 80);
      if (rowY > doc.page.height - doc.page.margins.bottom - 30) {
        doc.addPage();
        rowY = doc.page.margins.top;
        drawRow(rowY, {
          id: "Test ID",
          title: "Title",
          status: "Status",
          statusRaw: "header",
          duration: "Duration",
          retries: "Retries"
        }, true);
        rowY += 24;
      }
      drawRow(rowY, {
        id: t.id || "N/A",
        title: t.title || "Untitled",
        status: String(t.status || "unknown").toUpperCase(),
        statusRaw: t.status || "unknown",
        duration: `${t.durationMs || 0} ms`,
        retries: String(t.retries || 0)
      }, false);
      rowY += 24;
    });

    const failed = orderedTests.filter((t) => t.status === "failed");
    if (failed.length) {
      doc.moveDown(1);
      doc.fillColor("#991b1b").fontSize(11).text("Failure Details:");
      failed.slice(0, 12).forEach((t) => {
        ensurePdfSpace(doc, 50);
        doc.fillColor("#0f172a").fontSize(10).text(`${t.id}: ${t.title}`);
        doc.fillColor("#991b1b").fontSize(9).text(String(t.error || "No error captured").slice(0, 350));
      });
    }

    doc.addPage();
    doc.fillColor("#0f172a").fontSize(14).text("Screenshot Evidence");
    doc.moveDown(0.2);
    doc.fillColor("#334155").fontSize(9).text("Failed screenshots are shown first for easier triage.");
    doc.moveDown(0.3);
    let attached = 0;
    for (let i = 0; i < orderedTests.length; i += 1) {
      const t = orderedTests[i];
      const imgPath = await screenshotPathFromRef(run, t.screenshot);
      if (!imgPath) continue;
      doc.addPage();
      doc.fontSize(12).fillColor("#0f172a").text(`${t.id} - ${(t.status || "unknown").toUpperCase()} - ${t.title || ""}`);
      doc.moveDown(0.3);
      try {
        doc.image(imgPath, {
          fit: [760, 470],
          align: "center"
        });
        doc.moveDown(0.3);
        doc.fillColor("#334155").fontSize(9).text(`Image: ${path.basename(imgPath)}`);
        attached += 1;
      } catch {
        doc.fillColor("#b91c1c").fontSize(9).text("Failed to attach screenshot image.");
      }
    }
    if (!attached) {
      doc.fillColor("#475569").fontSize(10).text("No screenshots available for this run.");
    }

    doc.addPage();
    doc.fillColor("#0f172a").fontSize(14).text("Manager Review");
    doc.moveDown(0.3);
    const decision = manager.executiveSummary ? manager.executiveSummary.qualityDecision : "N/A";
    doc.fillColor("#1e293b").fontSize(11).text(`Release Decision: ${decision}`);
    const rootCauses = (manager.analysis && manager.analysis.majorRootCauses) || [];
    if (rootCauses.length) {
      doc.moveDown(0.3);
      doc.fillColor("#0f172a").fontSize(11).text("Top Root Causes:");
      rootCauses.slice(0, 8).forEach((cause) => {
        doc.fillColor("#334155").fontSize(10).text(`- ${cause}`);
      });
    }

    const actions = manager.actionPlan || [];
    if (actions.length) {
      doc.moveDown(0.4);
      doc.fillColor("#0f172a").fontSize(11).text("Action Plan:");
      actions.slice(0, 8).forEach((action) => {
        doc.fillColor("#334155").fontSize(10).text(`- ${action}`);
      });
    }

    doc.end();
  }

  app.get("/runs/:id/download", async (req, res) => {
    const run = await ctx.loadRunForRequest(req, res);
    if (!run) return;
    if (run.status !== "completed") return res.status(409).json({ error: "Run is not completed yet" });

    const wantJson = String(req.query.format || "pdf").toLowerCase() === "json";
    const wantSigned = req.query.signed === "1" || req.query.url === "1";

    if (wantJson) {
      const payload = {
        id: run.id,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
        input: run.input,
        artifacts: run.artifacts
      };
      const body = Buffer.from(JSON.stringify(payload, null, 2));
      if (wantSigned) {
        const key = `runs/${run.id}/reports/run.json`;
        await ctx.cloud.objectStore.put(key, body, { contentType: "application/json" });
        const url = await ctx.cloud.objectStore.presignGet(key, 300);
        if (req.query.url === "1") return res.json({ url, key });
        return res.redirect(302, url);
      }
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename=run-${run.id}.json`);
      return res.send(body);
    }

    await sendPdfReport(run, res);
  });

  app.get("/runs/:id/assets", async (req, res) => {
    const run = await ctx.loadRunForRequest(req, res);
    if (!run) return;
    if (!ctx.dbEnabled || !ctx.dbPool) {
      return res.json({
        source: "memory",
        assets: [
          {
            assetType: "manual_test_cases",
            assetName: "manual_test_cases.json",
            content: run.artifacts.manualTestCases
          },
          {
            assetType: "automation_script",
            assetName: "generated.spec.ts",
            content: run.artifacts.automationBundle ? run.artifacts.automationBundle.generatedPlaywrightScript : null
          }
        ]
      });
    }

    const rows = await ctx.dbPool.query(
      "SELECT asset_type, asset_name, content_text, created_at FROM qa_assets WHERE run_id = $1 ORDER BY id ASC",
      [run.id]
    );
    return res.json({
      source: "postgres",
      assets: rows.rows.map((row) => ({
        assetType: row.asset_type,
        assetName: row.asset_name,
        content: row.content_text,
        createdAt: row.created_at
      }))
    });
  });
};
