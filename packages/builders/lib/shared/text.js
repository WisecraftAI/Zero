function escapeJava(value) {
  if (value == null) {
    return "";
  }
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function sanitizeTestTitle(value, fallback = "Test Case", maxLength = 100) {
  return String(value || fallback)
    .replace(/"/g, "'")
    .slice(0, maxLength);
}

function toJavaClassName(value, fallback = "Test") {
  return String(value || fallback).replace(/[^a-zA-Z0-9]/g, "");
}

function toJavaMethodName(value, fallback = "TC_001") {
  return String(value || fallback).replace(/[^a-zA-Z0-9]/g, "_");
}

module.exports = {
  escapeJava,
  sanitizeTestTitle,
  toJavaClassName,
  toJavaMethodName
};
