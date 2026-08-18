const merge = require("./merge");
const elements = require("./elements");
const ecommerce = require("./ecommerce");

module.exports = {
  ...merge,
  ...elements,
  ...ecommerce
};
