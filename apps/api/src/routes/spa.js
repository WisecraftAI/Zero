"use strict";

const path = require("path");

module.exports = function registerSpaRoutes(app) {
  app.get("/", (req, res) => {
    res.sendFile(path.join(process.cwd(), "public", "index.html"));
  });
  app.get("*", (req, res) => {
    res.sendFile(path.join(process.cwd(), "public", "index.html"));
  });
};
