/**
 * Set DATABASE_URL in .env from Neon (or any Postgres) connection string.
 * Usage: node scripts/set-database.js "postgres://user:pass@host/db?sslmode=require"
 *    or: set DATABASE_URL=postgres://... && node scripts/set-database.js
 */
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env");
const connectionString = process.argv[2] || process.env.DATABASE_URL;

if (!connectionString || !connectionString.startsWith("postgres")) {
  console.log("Usage: node scripts/set-database.js \"postgres://user:pass@host/db?sslmode=require\"");
  console.log("  Get your Neon URL from: https://console.neon.tech → your project → Connection string");
  process.exit(1);
}

let content = "";
if (fs.existsSync(envPath)) {
  content = fs.readFileSync(envPath, "utf8");
}

const line = `DATABASE_URL=${connectionString}`;
const lines = content.split(/\r?\n/);
let found = false;
const newLines = lines.map((l) => {
  if (l.startsWith("DATABASE_URL=") || l.startsWith("# DATABASE_URL=")) {
    found = true;
    return line;
  }
  return l;
});
if (!found) {
  newLines.push("");
  newLines.push(line);
}

fs.writeFileSync(envPath, newLines.join("\n").trimEnd() + "\n", "utf8");
console.log("Updated .env with DATABASE_URL. Run: npm start");
process.exit(0);
