/**
 * Professional Logger - Winston-based logging with multiple transports
 * Supports console, file, and structured JSON logging
 */
const winston = require("winston");
const path = require("path");
const fs = require("fs");

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

// JSON format for file logging
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  defaultMeta: { service: "zer0-orchestrator" },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      format: fileFormat,
      maxsize: 5242880,
      maxFiles: 5
    }),
    // Access log file
    new winston.transports.File({
      filename: path.join(logsDir, "access.log"),
      level: "http",
      format: fileFormat,
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// Add audit log transport for security events
logger.addAudit = (event, details) => {
  logger.info(`[AUDIT] ${event}`, { audit: true, ...details });
};

// Add performance log
logger.performance = (operation, durationMs, details = {}) => {
  logger.info(`[PERF] ${operation} completed in ${durationMs}ms`, {
    performance: true,
    durationMs,
    ...details
  });
};

// Agent-specific logging
logger.agent = (agentName, message, details = {}) => {
  logger.info(`[AGENT:${agentName}] ${message}`, { agent: agentName, ...details });
};

// Pipeline stage logging
logger.pipeline = (runId, stage, status, details = {}) => {
  logger.info(`[PIPELINE] Run ${runId} - ${stage}: ${status}`, {
    pipeline: true,
    runId,
    stage,
    status,
    ...details
  });
};

// API request logging
logger.api = (method, path, statusCode, durationMs, details = {}) => {
  const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "http";
  logger[level](`${method} ${path} ${statusCode} - ${durationMs}ms`, {
    api: true,
    method,
    path,
    statusCode,
    durationMs,
    ...details
  });
};

// Morgan stream for Express middleware
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

// Express middleware for request logging
logger.requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.api(req.method, req.originalUrl, res.statusCode, duration, {
      ip: req.ip,
      userAgent: req.get("user-agent")
    });
  });
  next();
};

// Error logging middleware
logger.errorLogger = (err, req, res, next) => {
  logger.error(err.message, {
    stack: err.stack,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip
  });
  next(err);
};

module.exports = logger;
