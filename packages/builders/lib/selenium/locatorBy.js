const { escapeJava } = require("../shared/text");

function toSeleniumBy(selector) {
  return selector.startsWith("//")
    ? `By.xpath("${escapeJava(selector)}")`
    : `By.cssSelector("${escapeJava(selector)}")`;
}

module.exports = { toSeleniumBy };
