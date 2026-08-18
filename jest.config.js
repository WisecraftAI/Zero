/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/**/*.test.js"],
  testTimeout: 180000,
  watchman: false,
  coverageDirectory: "<rootDir>/dist/coverage",
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/web/",
    "/support/zero-docs/",
    "/dist/"
  ]
};
