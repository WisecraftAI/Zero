function sanitizeRunInput(input) {
  const clean = { ...(input || {}) };
  delete clean.tcFileBuffer;
  delete clean.loginPassword;
  delete clean.password;
  if (clean.tcFileContent) clean.tcFileContent = "[stored-in-artifacts]";
  if (clean.login && typeof clean.login === "object") {
    const { password: _pw, ...loginSafe } = clean.login;
    clean.login = loginSafe;
  }
  return clean;
}

module.exports = { sanitizeRunInput };
