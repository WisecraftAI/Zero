const { normalizeElementKey } = require("./keys");

function parseElementEntry(entry) {
  const key = normalizeElementKey(entry.key || entry.label);
  const selector = entry.selector || entry.css || entry.selectorValue;
  const xpath = entry.xpath || null;
  const role = entry.role || entry.ariaRole || null;
  const label = entry.label || entry.text || entry.ariaLabel || null;
  if (!selector && !xpath) return null;

  return {
    elementKey: key,
    selectorType: entry.selectorType || (selector && selector.startsWith("//") ? "xpath" : "css"),
    selectorValue: xpath || selector,
    xpath: xpath || null,
    role,
    label
  };
}

module.exports = { parseElementEntry };
