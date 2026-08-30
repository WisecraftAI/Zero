"use strict";

const { MARK, ICON, WORDMARK } = require("./brandArt");
const { PALETTES, THEME_IDS } = require("./palettes");
const { reportPalette, resolveThemeId, DEFAULT_THEME } = require("./reportPalette");
const color = require("./color");

module.exports = {
  MARK,
  ICON,
  WORDMARK,
  PALETTES,
  THEME_IDS,
  DEFAULT_THEME,
  reportPalette,
  resolveThemeId,
  color
};
