function isDatabaseConfigured(env = process.env) {
  return Boolean(env.DATABASE_URL || env.PGHOST);
}

module.exports = { isDatabaseConfigured };
