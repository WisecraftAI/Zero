/**
 * API Key Manager - Secure key storage, validation, and rotation
 * Supports multiple providers: OpenAI, Anthropic, Google, Azure, Custom
 */
const crypto = require("crypto");
const { encrypt, decrypt, maskKey } = require("./encryption");

// In-memory key store with TTL support
const keyStore = new Map();
const keyMetadata = new Map();

// Supported API providers
const PROVIDERS = {
  OPENAI: {
    name: "OpenAI",
    prefix: "sk-",
    validatePattern: /^sk-[a-zA-Z0-9]{32,}$/,
    testEndpoint: "https://api.openai.com/v1/models",
    headerKey: "Authorization",
    headerFormat: (key) => `Bearer ${key}`
  },
  ANTHROPIC: {
    name: "Anthropic",
    prefix: "sk-ant-",
    validatePattern: /^sk-ant-[a-zA-Z0-9-]{32,}$/,
    testEndpoint: "https://api.anthropic.com/v1/messages",
    headerKey: "x-api-key",
    headerFormat: (key) => key
  },
  GOOGLE: {
    name: "Google AI",
    prefix: "AIza",
    validatePattern: /^AIza[a-zA-Z0-9_-]{35}$/,
    testEndpoint: null, // Uses different auth
    headerKey: "x-goog-api-key",
    headerFormat: (key) => key
  },
  AZURE: {
    name: "Azure OpenAI",
    prefix: null,
    validatePattern: /^[a-f0-9]{32}$/i,
    testEndpoint: null, // Endpoint varies
    headerKey: "api-key",
    headerFormat: (key) => key
  },
  CUSTOM: {
    name: "Custom",
    prefix: null,
    validatePattern: /.+/,
    testEndpoint: null,
    headerKey: "Authorization",
    headerFormat: (key) => `Bearer ${key}`
  }
};

/**
 * Detect provider from API key format
 */
function detectProvider(apiKey) {
  if (!apiKey) return null;
  
  if (apiKey.startsWith("sk-ant-")) return "ANTHROPIC";
  if (apiKey.startsWith("sk-")) return "OPENAI";
  if (apiKey.startsWith("AIza")) return "GOOGLE";
  if (/^[a-f0-9]{32}$/i.test(apiKey)) return "AZURE";
  
  return "CUSTOM";
}

/**
 * Validate API key format
 */
function validateKeyFormat(apiKey, provider = null) {
  if (!apiKey || typeof apiKey !== "string") {
    return { valid: false, error: "API key is required" };
  }
  
  const detectedProvider = provider || detectProvider(apiKey);
  const providerConfig = PROVIDERS[detectedProvider];
  
  if (!providerConfig) {
    return { valid: false, error: "Unknown provider" };
  }
  
  if (!providerConfig.validatePattern.test(apiKey)) {
    return { 
      valid: false, 
      error: `Invalid ${providerConfig.name} API key format`,
      provider: detectedProvider
    };
  }
  
  return { valid: true, provider: detectedProvider };
}

/**
 * Generate a unique key ID for storage
 */
function generateKeyId() {
  return `key_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
}

/**
 * Store an API key securely
 */
function storeKey(apiKey, options = {}) {
  const { 
    name = "default", 
    provider = null, 
    ttlHours = 0, // 0 = no expiry
    metadata = {}
  } = options;
  
  const validation = validateKeyFormat(apiKey, provider);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  
  const keyId = generateKeyId();
  const encryptedKey = encrypt(apiKey);
  
  const keyData = {
    id: keyId,
    name,
    provider: validation.provider,
    encryptedKey,
    createdAt: new Date().toISOString(),
    expiresAt: ttlHours > 0 ? new Date(Date.now() + ttlHours * 3600000).toISOString() : null,
    lastUsed: null,
    usageCount: 0
  };
  
  keyStore.set(keyId, encryptedKey);
  keyMetadata.set(keyId, { ...keyData, ...metadata, encryptedKey: undefined });
  
  return {
    success: true,
    keyId,
    provider: validation.provider,
    maskedKey: maskKey(apiKey)
  };
}

/**
 * Retrieve an API key
 */
function getKey(keyId) {
  const encryptedKey = keyStore.get(keyId);
  if (!encryptedKey) {
    return null;
  }
  
  const meta = keyMetadata.get(keyId);
  if (meta?.expiresAt && new Date(meta.expiresAt) < new Date()) {
    deleteKey(keyId);
    return null;
  }
  
  // Update usage stats
  if (meta) {
    meta.lastUsed = new Date().toISOString();
    meta.usageCount++;
    keyMetadata.set(keyId, meta);
  }
  
  return decrypt(encryptedKey);
}

/**
 * Get key by name
 */
function getKeyByName(name) {
  for (const [keyId, meta] of keyMetadata.entries()) {
    if (meta.name === name) {
      return getKey(keyId);
    }
  }
  return null;
}

/**
 * Delete an API key
 */
function deleteKey(keyId) {
  keyStore.delete(keyId);
  keyMetadata.delete(keyId);
  return true;
}

/**
 * List all stored keys (metadata only, no actual keys)
 */
function listKeys() {
  const keys = [];
  for (const [keyId, meta] of keyMetadata.entries()) {
    const encryptedKey = keyStore.get(keyId);
    const decrypted = decrypt(encryptedKey);
    keys.push({
      ...meta,
      maskedKey: maskKey(decrypted),
      isExpired: meta.expiresAt ? new Date(meta.expiresAt) < new Date() : false
    });
  }
  return keys;
}

/**
 * Rotate an API key (replace with new key)
 */
function rotateKey(keyId, newApiKey) {
  const meta = keyMetadata.get(keyId);
  if (!meta) {
    return { success: false, error: "Key not found" };
  }
  
  const validation = validateKeyFormat(newApiKey, meta.provider);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  
  const encryptedKey = encrypt(newApiKey);
  keyStore.set(keyId, encryptedKey);
  
  meta.rotatedAt = new Date().toISOString();
  keyMetadata.set(keyId, meta);
  
  return {
    success: true,
    keyId,
    maskedKey: maskKey(newApiKey)
  };
}

/**
 * Test API key validity by making a test request
 */
async function testKey(apiKey, provider = null) {
  const axios = require("axios");
  const detectedProvider = provider || detectProvider(apiKey);
  const config = PROVIDERS[detectedProvider];
  
  if (!config || !config.testEndpoint) {
    return { 
      valid: true, 
      message: "Format valid, but cannot test connectivity",
      provider: detectedProvider
    };
  }
  
  try {
    const response = await axios.get(config.testEndpoint, {
      headers: {
        [config.headerKey]: config.headerFormat(apiKey)
      },
      timeout: 10000
    });
    
    return {
      valid: true,
      message: "API key is valid and active",
      provider: detectedProvider
    };
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      const apiMessage = error.response?.data?.error?.message;
      return {
        valid: false,
        message: apiMessage || "Invalid or expired API key",
        provider: detectedProvider
      };
    }
    if (error.response?.status === 429) {
      return {
        valid: true,
        message: "API key is valid (rate limited)",
        provider: detectedProvider
      };
    }
    return {
      valid: true,
      message: "Format valid, connectivity test inconclusive",
      provider: detectedProvider,
      error: error.message
    };
  }
}

/**
 * Get provider configuration for making API calls
 */
function getProviderConfig(provider) {
  return PROVIDERS[provider] || PROVIDERS.CUSTOM;
}

/**
 * Create authorization headers for a provider
 */
function createAuthHeaders(apiKey, provider = null) {
  const detectedProvider = provider || detectProvider(apiKey);
  const config = PROVIDERS[detectedProvider];
  
  return {
    [config.headerKey]: config.headerFormat(apiKey)
  };
}

module.exports = {
  PROVIDERS,
  detectProvider,
  validateKeyFormat,
  storeKey,
  getKey,
  getKeyByName,
  deleteKey,
  listKeys,
  rotateKey,
  testKey,
  getProviderConfig,
  createAuthHeaders,
  generateKeyId
};
