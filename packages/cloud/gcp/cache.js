"use strict";

const { createCache } = require("../redisCache");

function createGcpCache(opts = {}) {
  return createCache(opts);
}

module.exports = { createGcpCache };
