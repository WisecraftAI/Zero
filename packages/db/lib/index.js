const { isDatabaseConfigured } = require("./config");
const { sanitizeRunInput } = require("./sanitize");
const {
  initAllTables,
  initRunsTables,
  initElementTables,
  initProjectsTables,
  initProviderTables
} = require("./schema/init");
const { runPendingMigrations } = require("./schema/migrate");
const { upsertRun, getRunById, listRunRows } = require("./runs");
const { replaceAssets, listAssetsByRunId } = require("./assets");
const { upsertLocator, getLocatorsByHost, insertElementLog, getElementLogsByHost } = require("./elements");
const {
  createProject,
  listProjects,
  getProject,
  insertStoredScript,
  getStoredScriptsByProject,
  insertRecording
} = require("./projects");
const {
  listProviderKeys,
  upsertProviderKey,
  deleteProviderKey,
  getEncryptedProviderKey,
  listAgentSettings,
  upsertAgentSettings
} = require("./providers");

module.exports = {
  isDatabaseConfigured,
  sanitizeRunInput,
  initAllTables,
  initRunsTables,
  initElementTables,
  initProjectsTables,
  initProviderTables,
  runPendingMigrations,
  upsertRun,
  getRunById,
  listRunRows,
  replaceAssets,
  listAssetsByRunId,
  upsertLocator,
  getLocatorsByHost,
  insertElementLog,
  getElementLogsByHost,
  createProject,
  listProjects,
  getProject,
  insertStoredScript,
  getStoredScriptsByProject,
  insertRecording,
  listProviderKeys,
  upsertProviderKey,
  deleteProviderKey,
  getEncryptedProviderKey,
  listAgentSettings,
  upsertAgentSettings
};
