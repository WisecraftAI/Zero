'use strict';

const objectStore = require('./storage');
const secrets = require('./secrets');
const { createCache } = require('../redisCache');
const { createQueue } = require('../redisQueue');

module.exports = {
  objectStore,
  queue: createQueue(),
  secrets,
  cache: createCache()
};
