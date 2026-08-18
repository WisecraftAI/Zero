const { buildPlaywrightSpec } = require("./channelSpec");
const { buildPlaywrightSpecFromTestCases } = require("./testCasesSpec");
const { buildEcommerceSpec } = require("./ecommerceSpec");
const { buildExecutionSteps } = require("./executionSteps");

module.exports = {
  buildPlaywrightSpec,
  buildPlaywrightSpecFromTestCases,
  buildEcommerceSpec,
  buildExecutionSteps
};
