#!/usr/bin/env node
/**
 * Remove hackathon demo seed from Postgres (fake events, proofs, users, replay fixtures).
 * Run: DATABASE_URL=... node scripts/purge-demo-data.mjs
 */
import pg from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const migrationPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../supabase/migrations/20260709160000_real_data_only.sql",
);
const sql = readFileSync(migrationPath, "utf8");

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

try {
  await pool.query(sql);
  console.log("Demo data purged. Only TxLINE-sourced rows remain.");
} finally {
  await pool.end();
}
