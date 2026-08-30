"use strict";

// Throwaway harness: drives discovered-flow tests against a local fixture site
// and hashes the end-of-flow screenshot for each test.
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { buildDiscoveredFlowTests } = require("../packages/builders/lib/playwright/discoveredFlows");

const PAGES = {
  "/": `<header><nav><a href="/">Home</a><a href="/search">Search</a><a href="/listing">Product Listing</a><a href="/cart">Cart</a></nav></header><main><h1>Fixture Home</h1><p>Landing copy</p></main>`,
  "/search": `<header><nav><a href="/">Home</a><a href="/search">Search</a><a href="/listing">Product Listing</a><a href="/cart">Cart</a></nav></header><main><h1>Search</h1><input type="search" name="q" placeholder="Search products"><button type="submit">Go</button></main>`,
  "/listing": `<header><nav><a href="/">Home</a><a href="/search">Search</a><a href="/listing">Product Listing</a><a href="/cart">Cart</a></nav></header><main><h1>Product Listing</h1><article class="product-card">Milk</article><article class="product-card">Bread</article></main>`,
  "/cart": `<header><nav><a href="/">Home</a><a href="/search">Search</a><a href="/listing">Product Listing</a><a href="/cart">Cart</a></nav></header><main><h1>Your Cart</h1><div class="cart-summary">Cart is empty</div></main>`
};

const server = http.createServer((req, res) => {
  const body = PAGES[req.url.split("?")[0]] || "<main><h1>Not found</h1></main>";
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(`<!doctype html><html><body style="font-family:sans-serif">${body}</body></html>`);
});

const manualTestCases = [
  {
    id: "TC-MAJ-001",
    module: "Search",
    scenario: "Verify Search functionality",
    priority: "Critical",
    steps: [
      'From the homepage, open "Search" in the main navigation',
      "Verify the Search UI is visible and usable",
      "Validate primary Search user action completes"
    ]
  },
  {
    id: "TC-MAJ-002",
    module: "Cart",
    scenario: "Verify Cart functionality",
    priority: "Critical",
    steps: ['Navigate to /cart ("Your Cart")', "Verify the Cart UI is visible and usable"]
  },
  {
    id: "TC-MAJ-003",
    module: "Product Listing",
    scenario: "Verify Product Listing functionality",
    priority: "Critical",
    steps: [
      'From the homepage, open "Product Listing" in the main navigation',
      "Verify the Product Listing UI is visible and usable"
    ]
  },
  {
    id: "TC-MAJ-004",
    module: "Loyalty Program",
    scenario: "Verify Loyalty Program functionality",
    priority: "High",
    steps: [
      "Navigate to the Loyalty Program entry point",
      "Verify the Loyalty Program UI is visible and usable"
    ]
  }
];

(async () => {
  await new Promise((resolve) => server.listen(4599, resolve));
  const ottUrl = "http://127.0.0.1:4599/";
  const outDir = path.join(__dirname, "shots");
  fs.mkdirSync(outDir, { recursive: true });

  const tests = buildDiscoveredFlowTests({ ottUrl, manualTestCases });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  const context = await browser.newContext();
  const page = await context.newPage();

  for (const testDef of tests) {
    const trace = [];
    const result = await testDef.execute(page, trace);
    const status = result.skip ? "skipped" : result.failed ? "failed" : "passed";
    const file = path.join(outDir, `${testDef.id}-${status}.png`);
    await page.screenshot({ path: file });
    const hash = crypto.createHash("sha1").update(fs.readFileSync(file)).digest("hex").slice(0, 12);
    console.log(`${testDef.id}  ${status.padEnd(8)} ${hash}  ${page.url()}`);
    console.log(`   ${trace.filter((t) => t.startsWith("flow:")).join(" | ")}`);
    if (result.reason) console.log(`   reason: ${result.reason}`);
  }

  await browser.close();
  server.close();
})();
