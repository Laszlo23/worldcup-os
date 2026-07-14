import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required to run migrations.");
  process.exit(1);
}

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const schema = await readFile(path.join(repoRoot, "database/schema.sql"), "utf8");
const migrationsDir = path.join(repoRoot, "supabase/migrations");

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

try {
  await pool.query(schema);
  console.log("Postgres schema applied successfully.");

  let migrationFiles = [];
  try {
    migrationFiles = (await readdir(migrationsDir))
      .filter((f) => f.endsWith(".sql"))
      .sort();
  } catch {
    // no supabase migrations dir
  }

  for (const file of migrationFiles) {
// Filter migrations: engagement, superfan, live_markets, sticker
    if (
      !file.includes("engagement") &&
      !file.includes("superfan") &&
      !file.includes("live_markets") &&
      !file.includes("sticker")
    )
      continue;
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    await pool.query(sql);
    console.log(`Applied migration: ${file}`);
  }
} finally {
  await pool.end();
}
