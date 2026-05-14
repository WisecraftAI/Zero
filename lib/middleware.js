/**
 * Security and Performance Middleware
 * Includes rate limiting, caching, and security headers
 */
const rateLimit = require("express-rate-limit");
const NodeCache = require("node-cache");
const helmet = require("helmet");

// Initialize cache with 10 minute default TTL
const cache = new NodeCache({ 
  stdTTL: 600, 
  checkperiod: 120,
  useClones: false
});

// Rate limiters for different endpoints
const rateLimiters = {
  // General API rate limit
  general: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: {
      error: "Too many requests",
      message: "Rate limit exceeded. Please try again later.",
      retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || req.headers["x-forwarded-for"]
  }),

  // Stricter limit for expensive operations (web analysis, execution)
  expensive: rateLimit({
    windowMs: 60 * 1000,
    max: 10, // 10 expensive operations per minute
    message: {
      error: "Too many requests",
      message: "Rate limit for expensive operations exceeded. Please wait.",
      retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Auth endpoint protection
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per 15 minutes
    message: {
      error: "Too many authentication attempts",
      message: "Please try again later.",
      retryAfter: 900
    },
    standardHeaders: true,
    legacyHeaders: false
  }),

  // API key validation
  apiKey: rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: {
      error: "Too many API key operations",
      message: "Rate limit exceeded.",
      retryAfter: 60
    }
  })
};

// Security headers configuration
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      connectSrc: ["'self'", "https:", "wss:"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
});

// Cache middleware factory
function cacheMiddleware(ttlSeconds = 300, keyPrefix = "") {
  return (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== "GET") {
      return next();
    }

    const cacheKey = `${keyPrefix}:${req.originalUrl}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      res.set("X-Cache", "HIT");
      return res.json(cached);
    }

    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      if (res.statusCode === 200) {
        cache.set(cacheKey, data, ttlSeconds);
      }
      res.set("X-Cache", "MISS");
      return originalJson(data);
    };

    next();
  };
}

// Invalidate cache for a specific pattern
function invalidateCache(pattern) {
  const keys = cache.keys();
  const regex = new RegExp(pattern);
  keys.forEach(key => {
    if (regex.test(key)) {
      cache.del(key);
    }
  });
}

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173",
      "https://zer0.io",
      "https://app.zer0.io"
    ];
    
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "x-request-id"],
  exposedHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset", "X-Cache"]
};

// Request ID middleware
function requestId(req, res, next) {
  const id = req.headers["x-request-id"] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = id;
  res.set("X-Request-ID", id);
  next();
}

// API key authentication middleware
function apiKeyAuth(optional = false) {
  return (req, res, next) => {
    const apiKey = req.headers["x-api-key"] || req.query.apiKey;
    
    if (!apiKey && !optional) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "API key required. Include x-api-key header."
      });
    }

    // For now, accept any non-empty API key
    // In production, validate against stored keys
    if (apiKey) {
      req.apiKey = apiKey;
      req.authenticated = true;
    }

    next();
  };
}

// Compression check middleware
function compressionFilter(req, res) {
  // Don't compress if client doesn't want it
  if (req.headers["x-no-compression"]) {
    return false;
  }
  // Use compression filter
  return require("compression").filter(req, res);
}

module.exports = {
  rateLimiters,
  securityHeaders,
  cacheMiddleware,
  invalidateCache,
  corsOptions,
  requestId,
  apiKeyAuth,
  compressionFilter,
  cache
};
