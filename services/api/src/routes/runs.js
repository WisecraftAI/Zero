"use strict";

const fs = require("fs/promises");
const path = require("path");
const { normalizeTargetUrl, isStoppableStatus, isTerminalStatus, requestRunCancel } = require("@zero/domain");
const { sendRunPdfReport } = require("../reports/runPdfReport");

async function streamToBuffer(stream, maxBytes = 20 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBytes) throw new Error("Screenshot exceeds the PDF evidence size limit");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

module.exports = function registerRunsRoutes(app, ctx) {
  app.post("/runs", ctx.upload.fields([{ name: "tcFile", maxCount: 1 }, { name: "recordingFile", maxCount: 1 }]), async (req, res) => {
    try {
      const targetUrl = normalizeTargetUrl(req.body.ottUrl);
      const ottUrl = targetUrl.url || "";
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
      // Determine execution mode based on input
      const hasUploadedTcFile = Boolean(tcFile);
      const hasManualCases = manualTestCases.length > 0 && manualTestCases.some(tc => tc.feature || tc.scenario);
      
      let executionMode = "standard";
      if (hasUploadedTcFile) {
        executionMode = "uploaded_tc_only";
      } else if (hasManualCases) {
        executionMode = "manual_tc_only";
      } else if (testCaseInputMode === "auto") {
        executionMode = "url_analysis_auto";
      }

      if (targetUrl.error) return res.status(400).json({ error: targetUrl.error });
      
      // Allow running with just URL in auto mode (URL Analyzer will generate test cases)
      const canRunWithAutoGeneration = testCaseInputMode === "auto" || executionMode === "url_analysis_auto";
      if (!figmaUrl && !tcFile && !hasManualCases && !notes && !canRunWithAutoGeneration) {
        return res.status(400).json({ error: "Upload a CSV, enter manual test cases, or use URL Analyzer auto-generation" });
      }
      if (hasUploadedTcFile) {
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
          const objectName = uploadObjectNameForField(field);
          const key = ctx.cloudHttp.objectKey(run.id, "inputs", objectName);
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

  function uploadObjectNameForField(field) {
    const normalized = String(field || "").trim();
    if (normalized === "tcFile") return "tcFile.csv";
    if (normalized === "recordingFile") return "recordingFile.json";
    return normalized || "upload.bin";
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
        if (ext === ".csv" || ext === ".xlsx" || ext === ".xls" || ext === ".json" || ext === ".txt" || ext === ".md") {
          run.input.executionMode = "uploaded_tc_only";
        }
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
      if (msg && (msg.status === "completed" || msg.status === "failed" || msg.status === "stopped")) {
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
    if (!isTerminalStatus(run.status)) {
      return res.status(409).json({ error: "Run is still in progress" });
    }
    const tests = run.artifacts?.executionReport?.tests || [];
    if (!tests.some((test) => test.status === "failed")) {
      return res.status(409).json({ error: "Run has no failed checks to re-run" });
    }

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

  /**
   * @swagger
   * /runs/{id}/stop:
   *   post:
   *     summary: Stop a queued or running pipeline
   *     tags: [Runs]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       202:
   *         description: Stop accepted; running jobs halt at the next checkpoint
   *       409:
   *         description: Run is already finished
   */
  app.post("/runs/:id/stop", async (req, res) => {
    const run = await ctx.loadRunForRequest(req, res);
    if (!run) return;
    if (run.status === "stopped") {
      return res.json({ ok: true, runId: run.id, status: "stopped" });
    }
    if (isTerminalStatus(run.status) || (!isStoppableStatus(run.status) && run.status !== "awaiting_uploads")) {
      return res.status(409).json({ error: `Cannot stop a ${run.status} run` });
    }

    try {
      run.cancelRequested = true;
      const immediate = run.status === "queued" || run.status === "awaiting_uploads";
      run.status = immediate ? "stopped" : "stopping";
      run.error = "Stopped by operator";
      await requestRunCancel(ctx.cloud.cache, run.id, {
        by: ctx.auth.identityEmail(req.auth) || null
      });
      await ctx.persistRun(run);
      return res.status(202).json({ ok: true, runId: run.id, status: run.status });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

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

    try {
      await sendRunPdfReport(run, res, {
        // The palette lives in the browser, so the client tells us which one it
        // is on. Unknown ids fall back to the default inside the generator.
        theme: req.query.theme,
        paper: String(req.query.paper || "").toLowerCase() === "light" ? "light" : "theme",
        resolveScreenshot: async (name) => {
          try {
            const key = `runs/${run.id}/files/${path.basename(name)}`;
            return await streamToBuffer(await ctx.cloud.objectStore.get(key));
          } catch {
            return null;
          }
        }
      });
    } catch (error) {
      ctx.logger.error("Failed to generate run PDF", {
        runId: run.id,
        error: error.message,
        requestId: req.requestId
      });
      if (res.headersSent) {
        return res.destroy(error);
      }
      return res.status(500).json({ error: "Could not generate PDF report" });
    }
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
