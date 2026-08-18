const { escapeJava } = require("../shared/text");
const { buildSeleniumJavaTest } = require("./javaTest");
const { buildSeleniumJavaClass } = require("./javaClass");
const { buildEcommerceSelenium } = require("./ecommerceSelenium");

module.exports = {
  buildSeleniumJavaTest,
  buildSeleniumJavaClass,
  buildEcommerceSelenium,
  escapeJava
};
