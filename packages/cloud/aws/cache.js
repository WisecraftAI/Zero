"use strict";

const { createCache } = require("../redisCache");

function createAwsCache(opts = {}) {
  return createCache(opts);
}

module.exports = { createAwsCache };
