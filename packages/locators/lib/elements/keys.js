const ELEMENT_KEYS = [
  "primaryNav",
  "continueCta",
  "loginCta",
  "loginUserField",
  "loginPasswordField",
  "loginSubmit",
  "contentCard",
  "playCta",
  "pauseCta",
  "seekBar",
  "searchInput",
  "myListCta",
  "profileCta"
];

const KEY_ALIASES = {
  nav: "primaryNav",
  primarynav: "primaryNav",
  continue: "continueCta",
  continuecta: "continueCta",
  login: "loginCta",
  logincta: "loginCta",
  email: "loginUserField",
  user: "loginUserField",
  loginuserfield: "loginUserField",
  password: "loginPasswordField",
  loginpasswordfield: "loginPasswordField",
  submit: "loginSubmit",
  loginsubmit: "loginSubmit",
  card: "contentCard",
  contentcard: "contentCard",
  play: "playCta",
  playcta: "playCta",
  pause: "pauseCta",
  seek: "seekBar",
  seekbar: "seekBar",
  search: "searchInput",
  mylist: "myListCta",
  profile: "profileCta"
};

function normalizeElementKey(labelOrKey) {
  const normalized = String(labelOrKey || "").toLowerCase().replace(/\s+/g, "");
  return KEY_ALIASES[normalized] || (ELEMENT_KEYS.includes(normalized) ? normalized : null) || "custom";
}

module.exports = {
  ELEMENT_KEYS,
  KEY_ALIASES,
  normalizeElementKey
};
