"use strict";

const { createCache } = require("../redisCache");

function createAzureCache(opts = {}) {
  return createCache(opts);
}

module.exports = { createAzureCache };
