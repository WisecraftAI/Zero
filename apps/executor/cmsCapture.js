"use strict";

const fs = require("fs/promises");
const path = require("path");
const { chromium } = require("./browser");

function stationSlugFromCmsUrl(url) {
  const m = String(url).match(/\/gm\/([^/]+)\//i);
  return m ? m[1].toLowerCase().replace(/[^a-z0-9-_]/g, "_") : "station";
}

async function cmsSwitchToStreamTab(page) {
  await page.waitForTimeout(1200);
  const streamTab = page.getByRole("tab", { name: /^Stream$/i }).first();
  try {
    await streamTab.waitFor({ state: "visible", timeout: 12000 });
    await streamTab.click({ timeout: 8000 });
    await page.waitForTimeout(2000);
    return true;
  } catch {
    try {
      await page.locator('[role="tab"]').filter({ hasText: /^Stream$/i }).first().click({ timeout: 5000 });
      await page.waitForTimeout(2000);
      return true;
    } catch {
      try {
        await page.locator("button, a, div").filter({ hasText: /^Stream$/ }).first().click({ timeout: 4000 });
        await page.waitForTimeout(2000);
        return true;
      } catch {
        return false;
      }
    }
  }
}

async function cmsCaptureSignalPage(page, url, waitMs, useStreamTab) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
  if (useStreamTab !== false) {
    await cmsSwitchToStreamTab(page);
  }
  await page.waitForTimeout(Math.min(45000, Math.max(2000, waitMs)));
  await page.getByText("Quick Actions", { exact: false }).first().waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
}

async function captureCmsScreenshot(job, deps) {
  const cloud = deps.cloud;
  const artifactsRoot = deps.artifactsRoot;
  const cmsCaptureDir = path.join(artifactsRoot, "cms-captures");
  const url = String(job.url || "").trim();
  const stationLabel = String(job.stationLabel || stationSlugFromCmsUrl(url) || "cms")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .slice(0, 48) || "cms";
  const waitMs = Math.min(45000, Math.max(3000, Number(job.waitMs) || 8000));
  const fullPage = job.fullPage !== false;
  const showBrowser = Boolean(job.showBrowser);
  const streamTab = job.streamTab !== false;

  await fs.mkdir(cmsCaptureDir, { recursive: true });
  const tag = streamTab ? "signal-stream" : "playout";
  const fileName = `cms-${tag}-${stationLabel}-${Date.now()}.png`;
  const absPath = path.join(cmsCaptureDir, fileName);
  let browser;
  try {
    browser = await chromium.launch({
      headless: !showBrowser,
      slowMo: showBrowser ? 200 : 0,
      args: showBrowser ? [] : ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
    });
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1
    });
    const page = await context.newPage();
    await cmsCaptureSignalPage(page, url, waitMs, streamTab);
    await page.screenshot({ path: absPath, fullPage });
    await browser.close();
    const key = `cms-captures/${fileName}`;
    await cloud.objectStore.put(key, await fs.readFile(absPath), { contentType: "image/png" });
    const publicPath = await cloud.objectStore.presignGet(key, 7 * 24 * 3600);
    return {
      ok: true,
      screenshot: publicPath,
      stationLabel,
      streamTab,
      note: streamTab
        ? "Captured with Stream tab (signal view), not Playout."
        : "Captured current view (Playout if that tab was default)."
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

async function captureCmsSignalBulk(job, deps) {
  const cloud = deps.cloud;
  const artifactsRoot = deps.artifactsRoot;
  const cmsCaptureDir = path.join(artifactsRoot, "cms-captures");
  let urls = job.urls || [];
  const waitMs = Math.min(45000, Math.max(3000, Number(job.waitMs) || 6000));
  const showBrowser = Boolean(job.showBrowser);
  const streamTab = job.streamTab !== false;

  await fs.mkdir(cmsCaptureDir, { recursive: true });
  const results = [];
  let browser;
  try {
    browser = await chromium.launch({
      headless: !showBrowser,
      slowMo: showBrowser ? 150 : 0,
      args: showBrowser ? [] : ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
    });
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1
    });
    const page = await context.newPage();
    const ts = Date.now();
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const slug = stationSlugFromCmsUrl(url);
      const tag = streamTab ? "signal-stream" : "playout";
      const fileName = `cms-${tag}-${slug}-${ts}-${i}.png`;
      const absPath = path.join(cmsCaptureDir, fileName);
      try {
        await cmsCaptureSignalPage(page, url, waitMs, streamTab);
        await page.screenshot({ path: absPath, fullPage: true });
        const key = `cms-captures/${fileName}`;
        await cloud.objectStore.put(key, await fs.readFile(absPath), { contentType: "image/png" });
        results.push({
          ok: true,
          url,
          station: slug,
          screenshot: await cloud.objectStore.presignGet(key, 7 * 24 * 3600)
        });
      } catch (err) {
        results.push({
          ok: false,
          url,
          station: slug,
          error: err.message || "failed"
        });
      }
    }
    await browser.close();
    browser = null;
    return {
      ok: true,
      count: results.length,
      streamTab,
      results,
      note: streamTab
        ? "Each shot is Stream tab (signal), not Playout. One browser session for all — log in once if Show browser."
        : "Bulk playout/current-tab captures."
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

module.exports = {
  stationSlugFromCmsUrl,
  captureCmsScreenshot,
  captureCmsSignalBulk
};
