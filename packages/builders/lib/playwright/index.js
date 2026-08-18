const { buildPlaywrightSpec } = require("./channelSpec");
const { buildPlaywrightSpecFromTestCases } = require("./testCasesSpec");
const { buildEcommerceSpec } = require("./ecommerceSpec");
const { buildExecutionSteps } = require("./executionSteps");
const {
  buildDiscoveredFlowTests,
  runDiscoveredFlows,
} = require("./discoveredFlows");

module.exports = {
  buildPlaywrightSpec,
  buildPlaywrightSpecFromTestCases,
  buildEcommerceSpec,
  buildExecutionSteps,
  buildDiscoveredFlowTests,
  runDiscoveredFlows,
};
