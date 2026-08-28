"use strict";

const { analyzerContextOptions } = require("../services/executor/jobs");

describe("web analyzer browser context", () => {
  it("uses a browser-identifying user agent and configurable locale", () => {
    const options = analyzerContextOptions(
      { version: () => "145.0.7632.6" },
      { ZERO_ANALYZER_LOCALE: "en-IN" }
    );

    expect(options).toMatchObject({
      viewport: { width: 1920, height: 1080 },
      locale: "en-IN",
      extraHTTPHeaders: { "Accept-Language": "en-IN,en;q=0.9" }
    });
    expect(options.userAgent).toContain("Chrome/145.0.7632.6");
    expect(options.userAgent).not.toContain("HeadlessChrome");
  });
});
