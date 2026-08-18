"use strict";

const tables = require("./tables");
const init = require("./init");
const migrate = require("./migrate");

module.exports = {
  ...tables,
  ...init,
  ...migrate
};
