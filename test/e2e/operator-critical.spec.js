"use strict";

const { test, expect } = require("@playwright/test");

const API = "http://127.0.0.1:3997";

test("application boots and invalid run links recover", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.locator(".dash-view")).toBeVisible();
  await expect(page.locator(".stat-card")).toHaveCount(4);

  await page.goto("/runs/does-not-exist");
  await expect(page.getByRole("alert")).toContainText("Run not found");
  await expect(page.getByRole("button", { name: "Back to runs" })).toBeVisible();
});

test("operator starts a run and downloads its completed PDF", async ({ page, request }) => {
  await page.goto("/runs/new");
  await page.locator('input[name="ottUrl"]').fill("https://example.com");
  await page.locator('textarea[name="notes"]').fill(
    "Browser smoke notes long enough to skip crawling while exercising the complete operator pipeline."
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();

  await expect(page).toHaveURL(/\/runs\/\d+-\d+/);
  const runId = page.url().match(/\/runs\/([^/]+)/)[1];

  await expect.poll(async () => {
    const response = await request.get(`${API}/runs/${runId}`);
    const run = await response.json();
    return run.status;
  }, {
    timeout: 150000,
    intervals: [1000, 1500, 2500]
  }).toBe("completed");

  const pdf = await request.get(`${API}/runs/${runId}/download`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");
});
