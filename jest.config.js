/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/**/*.test.js"],
  testTimeout: 180000,
  watchman: false,
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/web/",
    "/zero-docs/",
    "/public/",
    "/artifacts/"
  ]
};
