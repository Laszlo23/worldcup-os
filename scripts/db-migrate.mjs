import { readFile } from "node:fs/promises";
import process from "node:process";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required to run migrations.");
  process.exit(1);
}

const schema = await readFile(new URL("../database/schema.sql", import.meta.url), "utf8");
const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

try {
  await pool.query(schema);
  console.log("Postgres schema applied successfully.");
} finally {
  await pool.end();
}
