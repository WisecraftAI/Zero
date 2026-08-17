/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/**/*.test.js"],
  testTimeout: 180000,
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/client/",
    "/zero-docs/",
    "/public/",
    "/artifacts/"
  ]
};
