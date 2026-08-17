"use strict";

const express = require("express");
const fs = require("fs/promises");
const path = require("path");

module.exports = function registerRecordingRoutes(app, ctx) {
  // --- Recording session API (explicit origins only — bookmarklet from allowlisted OTT pages) ---
  app.options("/api/recordings/*", ctx.auth.recordingCors);
  app.post("/api/recordings/start", ctx.auth.recordingCors, express.json(), (req, res) => {
    const ottUrl = String(req.body?.ottUrl || "").trim() || null;
    const sessionId = `rec-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    ctx.recordingSessions.set(sessionId, { ottUrl, events: [], createdAt: new Date().toISOString() });
    return res.json({ sessionId, ottUrl });
  });
  app.post("/api/recordings/events", ctx.auth.recordingCors, express.json(), (req, res) => {
    const sessionId = String(req.body?.sessionId || "").trim();
    const events = Array.isArray(req.body?.events) ? req.body.events : [];
    const session = ctx.recordingSessions.get(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });
    session.events.push(...events);
    return res.json({ ok: true, count: session.events.length });
  });
  app.post("/api/recordings/end", ctx.auth.recordingCors, express.json(), (req, res) => {
    const sessionId = String(req.body?.sessionId || "").trim();
    const session = ctx.recordingSessions.get(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });
    ctx.recordingSessions.delete(sessionId);
    const recordingId = `recording-${++ctx.recordingIdCounter}-${Date.now()}`;
    const recording = { id: recordingId, ottUrl: session.ottUrl, events: session.events, createdAt: session.createdAt };
    ctx.recordingsById.set(recordingId, recording);
    ctx.endedSessionToRecordingId.set(sessionId, recordingId);
    return res.json({ recordingId, recording });
  });
  app.get("/api/recordings/check/:sessionId", (req, res) => {
    const recordingId = ctx.endedSessionToRecordingId.get(req.params.sessionId);
    if (!recordingId) return res.json({ ended: false });
    return res.json({ ended: true, recordingId });
  });
  app.get("/api/recordings/:id", (req, res) => {
    const rec = ctx.recordingsById.get(req.params.id);
    if (!rec) return res.status(404).json({ error: "Recording not found" });
    return res.json(rec);
  });

  function getApiBase(req) {
    if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
    const host = req && req.get ? req.get("host") : null;
    const protocol = req && req.protocol ? req.protocol : "http";
    return host ? protocol + "://" + host : "http://localhost:" + ctx.PORT;
  }
  app.get("/recorder.js", ctx.auth.recordingCors, (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    const sessionId = String(req.query.sessionId || "").replace(/[^a-zA-Z0-9-]/g, "");
    const base = getApiBase(req);
    const script = `
  (function(){
    var SESSION_ID = "${sessionId}";
    var API_BASE = "${base}";
    var events = [];
    function send(ev) { events.push(ev); }
    function post(path, body) {
      return fetch(API_BASE + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    document.addEventListener("click", function(e) {
      var t = e.target;
      var sel = t.id ? "#" + t.id : (t.className && typeof t.className === "string" ? "." + t.className.split(" ")[0] : t.tagName);
      send({ type: "click", selector: sel, tagName: t.tagName, text: (t.textContent || "").slice(0, 80), url: location.href, ts: Date.now() });
    }, true);
    document.addEventListener("change", function(e) {
      var t = e.target;
      send({ type: "change", selector: t.name ? "[name=" + t.name + "]" : t.tagName, tagName: t.tagName, value: (t.value || "").slice(0, 200), url: location.href, ts: Date.now() });
    }, true);
    var startUrl = location.href;
    var stopBtn = document.createElement("button");
    stopBtn.textContent = "Stop ZER0 recording";
    stopBtn.style.cssText = "position:fixed;bottom:12px;right:12px;z-index:999999;padding:10px 14px;background:#2ea043;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.2);";
    stopBtn.onclick = function() {
      post("/api/recordings/events", { sessionId: SESSION_ID, events: events }).then(function() {
        return post("/api/recordings/end", { sessionId: SESSION_ID });
      }).then(function(r) { return r.json(); }).then(function(d) {
        stopBtn.textContent = "Saved: " + (d.recordingId || "").slice(0, 20);
        if (window.opener) window.opener.postMessage({ type: "recording-saved", recordingId: d.recordingId }, "*");
      }).catch(function() { stopBtn.textContent = "Error saving"; });
    };
    document.body.appendChild(stopBtn);
  })();
  `;
    res.send(script);
  });
  const RECORD_PAGE_HTML = `<!DOCTYPE html>
  <html lang="en">
  <head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>ZERO – Record session</title>
  <style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:1.25rem;max-width:520px;margin:0 auto;}h1{font-size:1.25rem;}p{color:#94a3b8;font-size:0.9rem;}.step{margin:1rem 0;padding:0.75rem;background:#1e293b;border-radius:8px;}a{color:#2ea043;}.bookmarklet{display:inline-block;padding:0.5rem 1rem;background:#2ea043;color:#fff;text-decoration:none;border-radius:6px;margin-top:0.5rem;}.status{margin-top:1rem;padding:0.75rem;border-radius:8px;}.status.waiting{background:#1e293b;color:#94a3b8;}.status.done{background:#14532d;color:#86efac;}</style></head>
  <body>
  <h1>Record session</h1>
  <p>Record your actions on the OTT app so requirements and locators can be improved.</p>
  <div class="step"><strong>1.</strong> Open your OTT app in a new tab: <a id="ottLink" href="#" target="_blank" rel="noopener">Open OTT URL</a></div>
  <div class="step"><strong>2.</strong> Drag this link to your bookmarks bar, then on the <strong>OTT page</strong> click the bookmark: <a id="bookmarklet" class="bookmarklet" href="#">Start ZER0 recorder</a></div>
  <div class="step"><strong>3.</strong> Use the app. A green <strong>Stop ZER0 recording</strong> button will appear at the bottom-right of the OTT page.</div>
  <div class="step"><strong>4.</strong> When done, click <strong>Stop ZER0 recording</strong> on the OTT page, then return here.</div>
  <div id="status" class="status waiting">Waiting for recording to be saved…</div>
  <script>
  (function(){
  var params=new URLSearchParams(location.search);
  var sessionId=params.get("sessionId")||"";
  var ottUrl=params.get("ottUrl")||"";
  var ottLink=document.getElementById("ottLink");
  var bookmarklet=document.getElementById("bookmarklet");
  var statusEl=document.getElementById("status");
  if(ottUrl) ottLink.href=ottUrl;
  ottLink.textContent=ottUrl||"Set ottUrl in the Run form";
  var origin=location.origin;
  bookmarklet.href="javascript:(function(){var d=document,s=d.createElement('script');s.src='"+origin+"/recorder.js?sessionId="+encodeURIComponent(sessionId)+"';d.body.appendChild(s);})();";
  if(!sessionId){statusEl.textContent="No session ID. Start recording from the Run form.";return;}
  var poll=setInterval(function(){
  fetch("/api/recordings/check/"+encodeURIComponent(sessionId)).then(function(r){return r.json();}).then(function(d){
  if(d.ended&&d.recordingId){clearInterval(poll);statusEl.className="status done";statusEl.textContent="Recording saved. You can close this tab and run the pipeline with this recording.";if(window.opener)window.opener.postMessage({type:"recording-saved",recordingId:d.recordingId},"*");}
  }).catch(function(){});
  },2000);
  })();
  </script>
  </body>
  </html>`;

  app.get("/record", (req, res) => {
    const recordPath = path.join(process.cwd(), "public", "record.html");
    fs.access(recordPath).then(() => {
      res.sendFile(recordPath);
    }).catch(() => {
      res.type("html").send(RECORD_PAGE_HTML);
    });
  });
  registerRecordingRoutes.RECORD_PAGE_HTML = RECORD_PAGE_HTML;
};
