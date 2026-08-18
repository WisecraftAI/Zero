const { hostFromUrl } = require("../shared/url");
const {
  mergeSelectorCandidates,
  getMergedSelectors,
  dbLocatorsToCandidates,
  hydrateSelectorMemory
} = require("./registry");

module.exports = {
  hostFromUrl,
  mergeSelectorCandidates,
  getMergedSelectors,
  dbLocatorsToCandidates,
  hydrateSelectorMemory
};
