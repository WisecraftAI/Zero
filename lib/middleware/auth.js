"use strict";

const auth = require("../auth");

function apiKeyAuth(optional = false) {
  return (req, res, next) => {
    const identity = auth.authenticateRequest(req);
    if (!identity) {
      if (optional) return next();
      return res.status(401).json({
        error: "Unauthorized",
        message: "Verified API key (x-api-key) or Bearer token required."
      });
    }
    req.auth = identity;
    req.authenticated = true;
    next();
  };
}

module.exports = {
  apiKeyAuth,
  attachIdentity: auth.attachIdentity,
  requireAuth: auth.requireAuth,
  requireAuthWhenEnabled: auth.requireAuthWhenEnabled,
  recordingCors: auth.recordingCors,
  verifyApiKey: auth.verifyApiKey
};
