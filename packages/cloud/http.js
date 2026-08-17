/**
 * HTTP surface for local signed object-store URLs.
 * PUT/GET /api/cloud/local?key=&op=&exp=&token=
 */

"use strict";

const express = require("express");
const cloud = require("./index");

function objectKey(runId, kind, name) {
  const safe = String(name || kind).replace(/^\/+/, "").replace(/\.\./g, "");
  return `runs/${runId}/${kind}/${safe}`;
}

async function readObjectBuffer(key) {
  const stream = await cloud.objectStore.get(key);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function sendForbidden(res, message) {
  return res.status(403).json({ error: message || "Invalid or expired signature" });
}

async function handleLocal(req, res) {
  const key = String(req.query.key || "");
  const op = String(req.query.op || "").toLowerCase();
  const exp = req.query.exp;
  const token = req.query.token;
  const verify = cloud.objectStore && cloud.objectStore._verify;

  if (!verify) {
    return res.status(501).json({
      error: "Signed local URLs require ZERO_CLOUD=local"
    });
  }
  if (!key || (op !== "put" && op !== "get")) {
    return res.status(400).json({ error: "key and op=put|get are required" });
  }
  if (!verify(key, op, exp, token)) {
    return sendForbidden(res);
  }

  try {
    if (op === "put") {
      if (req.method !== "PUT" && req.method !== "POST") {
        return res.status(405).json({ error: "Use PUT for presigned uploads" });
      }
      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || "");
      await cloud.objectStore.put(key, body, {
        contentType: req.headers["content-type"] || "application/octet-stream"
      });
      return res.status(201).json({ ok: true, key, bytes: body.length });
    }

    const stream = await cloud.objectStore.get(key);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Cache-Control", "private, no-store");
    stream.on("error", (err) => {
      if (!res.headersSent) res.status(404).json({ error: err.message });
    });
    return stream.pipe(res);
  } catch (err) {
    const code = err.code === "ENOENT" ? 404 : 500;
    if (!res.headersSent) return res.status(code).json({ error: err.message });
  }
}

function createCloudRouter() {
  const router = express.Router();
  const raw = express.raw({ type: "*/*", limit: "25mb" });
  router.put("/local", raw, handleLocal);
  router.post("/local", raw, handleLocal);
  router.get("/local", handleLocal);
  return router;
}

module.exports = {
  createCloudRouter,
  objectKey,
  readObjectBuffer
};
