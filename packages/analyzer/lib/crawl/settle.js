"use strict";

/**
 * SPA / overlay helpers for the analyzer crawl. Quick-commerce and other
 * client-rendered sites often paint an empty shell at `domcontentloaded`, then
 * a location or cookie dialog on top of the real UI.
 */

const ANALYZER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

/** Default pin for location-gated grocery / quick-commerce sites. */
const DEFAULT_GEOLOCATION = { latitude: 12.9716, longitude: 77.5946 };

/**
 * Playwright's default headless UA is treated as a bot by grocery SPAs
 * (Zepto, Blinkit, Instamart). They then serve an empty shell, which the
 * analyzer recorded as "generic Website / 0 elements".
 */
const ANALYZER_BROWSER_CONTEXT = {
  viewport: { width: 1440, height: 900 },
  userAgent: ANALYZER_USER_AGENT,
  locale: "en-IN",
  timezoneId: "Asia/Kolkata",
  geolocation: DEFAULT_GEOLOCATION,
  permissions: ["geolocation"],
};

const DISMISS_LABEL =
  /^(accept( all)?|agree|allow|got it|ok|okay|close|dismiss|not now|maybe later|skip|continue|i agree|reject( all)?|no thanks|select later)$/i;

const LOCATION_LABEL =
  /detect (my )?location|use (my )?(current )?location|allow location|enable location|share location|current location/i;

async function dismissBlockingOverlays(page) {
  if (!page) return;
  if (page.keyboard && typeof page.keyboard.press === "function") {
    await page.keyboard.press("Escape").catch(() => {});
  }
  if (typeof page.evaluate !== "function") return;

  await page
    .evaluate((patterns) => {
      const labels = new RegExp(patterns.dismiss, "i");
      const location = new RegExp(patterns.location, "i");
      const nodes = document.querySelectorAll('button, [role="button"], a, [aria-label]');
      let clickedLocation = false;
      for (const el of nodes) {
        const text = (
          el.getAttribute("aria-label") ||
          el.innerText ||
          el.textContent ||
          ""
        )
          .trim()
          .slice(0, 60);
        if (!text) continue;
        if (location.test(text)) {
          if (el.offsetParent === null && el.getClientRects().length === 0) continue;
          try {
            el.click();
            clickedLocation = true;
            break;
          } catch {
            /* keep looking */
          }
        }
      }
      if (clickedLocation) return "location";
      for (const el of nodes) {
        const text = (
          el.getAttribute("aria-label") ||
          el.innerText ||
          el.textContent ||
          ""
        )
          .trim()
          .slice(0, 40);
        if (!text || !labels.test(text)) continue;
        if (el.offsetParent === null && el.getClientRects().length === 0) continue;
        try {
          el.click();
          return "dismiss";
        } catch {
          /* keep looking */
        }
      }
      const close = document.querySelector(
        '[aria-label="Close"], [aria-label="close"], button.close'
      );
      if (close) {
        try {
          close.click();
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }, { dismiss: DISMISS_LABEL.source, location: LOCATION_LABEL.source })
    .catch(() => false);
}

async function waitForRenderableDom(page, timeout) {
  if (!page || typeof page.waitForFunction !== "function") return;
  await page
    .waitForFunction(
      () => {
        const text = (document.body && document.body.innerText ? document.body.innerText : "")
          .replace(/\s+/g, " ")
          .trim();
        const root = document.querySelector("#__next, #root, [data-reactroot], main, [role='main']");
        const rooted = !root || root.childElementCount > 0;
        const interactive = document.querySelectorAll("a[href], button, input, [role='button']").length;
        return rooted && (text.length > 80 || interactive > 3);
      },
      null,
      { timeout }
    )
    .catch(() => {});
}

/**
 * Wait for a client-rendered page to expose real content, then try to clear
 * the dialogs that otherwise leave the analyzer with 0 elements.
 */
async function settleAnalyzedPage(page, options = {}) {
  if (!page) return;
  const timeout = Math.max(500, Number(options.timeout ?? 8000));

  if (typeof page.waitForLoadState === "function") {
    await page.waitForLoadState("networkidle", { timeout: Math.min(timeout, 5000) }).catch(() => {});
  }

  await waitForRenderableDom(page, timeout);
  await dismissBlockingOverlays(page);
  await waitForRenderableDom(page, Math.min(timeout, 4000));
}

module.exports = {
  ANALYZER_USER_AGENT,
  ANALYZER_BROWSER_CONTEXT,
  DEFAULT_GEOLOCATION,
  DISMISS_LABEL,
  LOCATION_LABEL,
  dismissBlockingOverlays,
  settleAnalyzedPage,
};
