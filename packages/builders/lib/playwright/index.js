const { buildPlaywrightSpec } = require("./channelSpec");
const { buildPlaywrightSpecFromTestCases } = require("./testCasesSpec");
const { buildEcommerceSpec } = require("./ecommerceSpec");
const { buildExecutionSteps } = require("./executionSteps");
const {
  buildDiscoveredFlowTests,
  runDiscoveredFlows,
} = require("./discoveredFlows");
const {
  healingEnabled,
  healingKeyForStep,
  healLocator,
} = require("./locatorHealing");

module.exports = {
  buildPlaywrightSpec,
  buildPlaywrightSpecFromTestCases,
  buildEcommerceSpec,
  buildExecutionSteps,
  buildDiscoveredFlowTests,
  runDiscoveredFlows,
  healingEnabled,
  healingKeyForStep,
  healLocator,
};
