const { hostFromUrl } = require("../shared/url");
const { ELEMENT_KEYS, normalizeElementKey } = require("./keys");
const { parseElementEntry } = require("./parser");
const { processElementLog } = require("./logger");

module.exports = {
  hostFromUrl,
  normalizeElementKey,
  parseElementEntry,
  processElementLog,
  ELEMENT_KEYS
};
